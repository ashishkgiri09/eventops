from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import current_user, event_access
from app.models import AttendanceAudit, Registration, User

router = APIRouter(prefix="/events/{event_id}", tags=["Registrations & Attendance"])


def present(row: Registration) -> dict[str, Any]:
    result = dict(row.data or {})
    result.setdefault("leadName", result.get("name", row.name))
    result.setdefault("leadEmail", result.get("email", row.email))
    result.setdefault("members", [])
    result.setdefault("project", {"title": row.name, "abstract": "", "domain": "", "techStack": []})
    result.setdefault("assignedJudges", [])
    result.setdefault("currentRound", 1)
    result.setdefault("registrationStatus", row.status.upper())
    result.setdefault("checkInStatus", row.check_in_status.upper())
    result.update({"id": row.public_id, "eventId": row.event_id, "name": row.name, "email": row.email,
                   "registrationStatus": row.status.upper(), "checkInStatus": row.check_in_status.upper(),
                   "checkedIn": row.check_in_status == "checked_in", "checkedInAt": row.checked_in_at.isoformat() if row.checked_in_at else None,
                   "qrCodeToken": row.qr_token, "qrCode": row.qr_token})
    return result


def add_registration(event_id: str, kind: str, data: dict[str, Any], db: Session) -> Registration:
    if kind == "team":
        name = str(data.get("name") or "New team")
        email = str(data.get("leadEmail") or data.get("email") or "").lower()
    else:
        name = str(data.get("name") or "New guest")
        email = str(data.get("email") or "").lower()
    count = db.query(Registration).filter_by(event_id=event_id, kind=kind).count() + 1
    prefix = "T" if kind == "team" else "G"
    row = Registration(event_id=event_id, public_id=f"{prefix}{count:03d}", kind=kind, name=name, email=email,
                       status=str(data.get("registrationStatus", "APPROVED")).lower(), qr_token=f"evops_{uuid4().hex}", data=data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/registrations")
def list_registrations(event_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user)
    rows = db.query(Registration).filter_by(event_id=event_id, kind="team").order_by(Registration.created_at.desc()).all()
    return [present(row) for row in rows]


@router.get("/registrations/{registration_id}")
def get_registration(event_id: str, registration_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user)
    row = db.query(Registration).filter_by(event_id=event_id, public_id=registration_id, kind="team").first()
    if not row:
        raise HTTPException(status_code=404, detail="Registration not found")
    return present(row)


@router.post("/registrations", status_code=201)
def create_registration(event_id: str, data: dict[str, Any] = Body(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user, write=True)
    data["eventId"] = event_id
    row = add_registration(event_id, "team", data, db)
    return present(row)


@router.get("/guests")
def list_guests(event_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user)
    rows = db.query(Registration).filter_by(event_id=event_id, kind="guest").order_by(Registration.created_at.desc()).all()
    return [present(row) for row in rows]


@router.post("/guests", status_code=201)
def create_guest(event_id: str, data: dict[str, Any] = Body(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user, write=True)
    data["eventId"] = event_id
    data.setdefault("rsvpStatus", "PENDING")
    row = add_registration(event_id, "guest", data, db)
    return present(row)


@router.post("/guests/{guest_id}/check-in")
def checkin_guest(event_id: str, guest_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user, write=True)
    row = db.query(Registration).filter_by(event_id=event_id, public_id=guest_id, kind="guest").first()
    if not row:
        raise HTTPException(status_code=404, detail="Guest not found")
    if row.check_in_status == "checked_in":
        return present(row)
    row.check_in_status = "checked_in"
    row.checked_in_at = datetime.now(timezone.utc)
    db.add(AttendanceAudit(registration_id=row.id, actor_id=user.id, action="checked_in", station="Guest desk"))
    db.commit()
    return present(row)


@router.patch("/guests/{guest_id}/rsvp")
def update_rsvp(event_id: str, guest_id: str, body: dict[str, str] = Body(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user, write=True)
    row = db.query(Registration).filter_by(event_id=event_id, public_id=guest_id, kind="guest").first()
    if not row:
        raise HTTPException(status_code=404, detail="Guest not found")
    data = dict(row.data or {})
    data["rsvpStatus"] = body.get("status", "PENDING").upper()
    row.data = data
    db.commit()
    return present(row)


@router.post("/attendance/scan")
def scan_ticket(event_id: str, body: dict[str, str] = Body(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user, write=True)
    token = body.get("token", "").strip()
    row = db.query(Registration).filter(Registration.event_id == event_id, (Registration.qr_token == token) | (Registration.public_id == token)).first()
    now = datetime.now(timezone.utc)
    if not row:
        return {"status": "INVALID", "message": "No matching registration was found for this event.", "scannedAt": now.isoformat()}
    if row.check_in_status == "checked_in":
        return {"status": "DUPLICATE", "team": present(row), "message": f"{row.name} was already checked in.", "scannedAt": now.isoformat(), "previousCheckInTime": row.checked_in_at.isoformat() if row.checked_in_at else None}
    row.check_in_status = "checked_in"
    row.checked_in_at = now
    db.add(AttendanceAudit(registration_id=row.id, actor_id=user.id, action="checked_in", station=body.get("station", "QR Scanner")))
    db.commit()
    return {"status": "SUCCESS", "team": present(row), "message": f"{row.name} checked in successfully.", "scannedAt": now.isoformat(), "stationName": body.get("station", "QR Scanner")}


@router.get("/attendance/summary")
def attendance_summary(event_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user)
    registrations = db.query(Registration).filter_by(event_id=event_id).all()
    total = len(registrations)
    checked = sum(row.check_in_status == "checked_in" for row in registrations)
    absent = sum(row.check_in_status == "absent" for row in registrations)
    return {"total": total, "checkedIn": checked, "absent": absent, "remaining": total - checked, "attendanceRatePct": round(checked * 100 / total) if total else 0}


@router.get("/attendance/audit-log")
def attendance_audit(event_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user)
    rows = db.query(AttendanceAudit, Registration).join(Registration).filter(Registration.event_id == event_id).order_by(AttendanceAudit.created_at.desc()).limit(500).all()
    return [{"id": audit.id, "teamId": registration.public_id, "teamName": registration.name, "status": audit.action.upper(), "timestamp": audit.created_at.isoformat(), "staffName": user.full_name, "station": audit.station, "notes": audit.notes or None} for audit, registration in rows]


@router.get("/attendance/search")
def search_registrations(event_id: str, q: str = Query(default=""), db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user)
    query = db.query(Registration).filter_by(event_id=event_id, kind="team")
    if q.strip():
        search = f"%{q.strip()}%"
        query = query.filter((Registration.name.ilike(search)) | (Registration.email.ilike(search)) | (Registration.public_id.ilike(search)))
    return [present(row) for row in query.limit(50).all()]


@router.post("/attendance/{registration_id}/manual")
def manual_checkin(event_id: str, registration_id: str, body: dict[str, str] = Body(default={}), db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user, write=True)
    row = db.query(Registration).filter_by(event_id=event_id, public_id=registration_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Registration not found")
    row.check_in_status = "checked_in"
    row.checked_in_at = datetime.now(timezone.utc)
    db.add(AttendanceAudit(registration_id=row.id, actor_id=user.id, action="manual_override", station=body.get("station", "Admin desk"), notes=body.get("notes", "")))
    db.commit()
    return present(row)


@router.post("/attendance/{registration_id}/revert")
def revert_checkin(event_id: str, registration_id: str, body: dict[str, str] = Body(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user, write=True)
    row = db.query(Registration).filter_by(event_id=event_id, public_id=registration_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Registration not found")
    row.check_in_status = "absent"
    row.checked_in_at = None
    db.add(AttendanceAudit(registration_id=row.id, actor_id=user.id, action="reverted", station="Admin desk", notes=body.get("reason", "")))
    db.commit()
    return present(row)
