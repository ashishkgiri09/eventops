from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Event, Registration
from app.routes.registrations import add_registration, present
from app.security import hash_password, verify_password

router = APIRouter(prefix="/public", tags=["Public Event Registration"])


def _registration_kind(event: Event) -> str:
    capabilities = {str(item).lower() for item in (event.capabilities or [])}
    if "teams" in capabilities:
        return "team"
    if capabilities.intersection({"attendees", "guests", "rsvp"}):
        return "guest"
    raise HTTPException(status_code=403, detail="Public registration is not enabled for this event")


def _ensure_open(event: Event) -> str:
    kind = _registration_kind(event)
    now = datetime.now(timezone.utc)
    status = str(event.status).lower()
    ends_at = event.ends_at
    if ends_at and ends_at.tzinfo is None:
        ends_at = ends_at.replace(tzinfo=timezone.utc)
    # Some legacy events have a stale "completed" status even though their
    # scheduled end date and registration deadline are still in the future.
    # Treat the schedule as authoritative for those records. Cancelled events
    # always remain closed.
    if status == "cancelled" or (status == "completed" and (not ends_at or ends_at <= now)):
        raise HTTPException(status_code=410, detail="Registration is closed for this event")
    deadline = event.registration_deadline
    if deadline:
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if deadline <= now:
            raise HTTPException(status_code=410, detail="The registration deadline has passed")
    return kind


@router.get("/events/{event_id}/registration")
def get_public_registration_info(event_id: str, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    try:
        kind = _ensure_open(event)
        open_for_registration = True
        message = "Registration is open."
    except HTTPException as exc:
        if exc.status_code not in {403, 410}:
            raise
        kind = "team" if "teams" in {str(item).lower() for item in (event.capabilities or [])} else "guest"
        open_for_registration = False
        message = exc.detail
    return {
        "id": event.id,
        "name": event.name,
        "type": event.event_type,
        "description": event.description,
        "startDate": event.starts_at.isoformat() if event.starts_at else None,
        "registrationKind": kind,
        "registrationOpen": open_for_registration,
        "registrationMessage": message,
    }


@router.post("/events/{event_id}/registrations", status_code=201)
def create_public_registration(event_id: str, payload: dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    kind = _ensure_open(event)
    name = str(payload.get("name") or "").strip()
    email = str(payload.get("leadEmail" if kind == "team" else "email") or "").strip().lower()
    if len(name) < 2 or len(name) > 180:
        raise HTTPException(status_code=422, detail="Enter a name between 2 and 180 characters")
    if len(email) > 320 or "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=422, detail="Enter a valid email address")
    if kind == "team" and not str(payload.get("leadName") or "").strip():
        raise HTTPException(status_code=422, detail="Enter the team lead name")
    password = str(payload.pop("password", "")) if kind == "team" else ""
    if kind == "team" and len(password) < 10:
        raise HTTPException(status_code=422, detail="Student password must be at least 10 characters")
    existing = db.query(Registration).filter_by(event_id=event_id, kind="team", email=email).first() if kind == "team" else None
    if existing and existing.password_hash:
        raise HTTPException(status_code=409, detail="This email is already registered for this event. Sign in to the student portal instead.")
    payload["name"] = name
    if kind == "team":
        payload["leadEmail"] = email
    else:
        payload["email"] = email
        payload.setdefault("rsvpStatus", "CONFIRMED")
    payload["eventId"] = event_id
    if existing:
        # Allow a team registered before password sign-in was introduced to
        # finish account setup without creating a duplicate team.
        existing.name = name
        existing.data = payload
        existing.password_hash = hash_password(password)
        db.commit()
        db.refresh(existing)
        row = existing
    else:
        row = add_registration(event_id, kind, payload, db)
    if kind == "team":
        if not row.password_hash:
            row.password_hash = hash_password(password)
            db.commit()
            db.refresh(row)
    result = present(row)
    result["kind"] = kind
    result["eventName"] = event.name
    return result


@router.post("/student-login")
def student_login(payload: dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    email = str(payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")
    event_id = str(payload.get("eventId") or "").strip()
    if not email or not password:
        raise HTTPException(status_code=422, detail="Enter your registration email and password")
    query = db.query(Registration).filter(Registration.kind == "team", Registration.email == email, Registration.password_hash.is_not(None))
    if event_id:
        query = query.filter(Registration.event_id == event_id)
    rows = query.order_by(Registration.created_at.desc()).all()
    registration = next((row for row in rows if verify_password(password, row.password_hash or "")), None)
    if not registration:
        raise HTTPException(status_code=401, detail="Email or password is incorrect for this event")
    return {"token": registration.qr_token, "eventId": registration.event_id}


@router.get("/registrations/{qr_token}")
def get_student_portal(qr_token: str, db: Session = Depends(get_db)):
    row = db.query(Registration).filter_by(qr_token=qr_token).first()
    if not row:
        raise HTTPException(status_code=404, detail="Registration pass not found")
    event = db.get(Event, row.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    registration = present(row)
    # The unguessable QR token is the student's capability link. Return only this
    # registration's own record and fields needed for their event portal.
    return {
        "event": {"id": event.id, "name": event.name, "type": event.event_type, "startDate": event.starts_at.isoformat() if event.starts_at else None, "location": event.location},
        "registration": {key: registration.get(key) for key in ("id", "eventId", "name", "email", "leadName", "leadEmail", "members", "project", "registrationStatus", "checkInStatus", "checkedInAt", "qrCodeToken", "assignedJudges", "assignedVenue", "assignedVenueName", "assignedBench", "currentRound", "totalScore", "rank")},
    }
