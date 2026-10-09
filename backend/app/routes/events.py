from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import current_user, event_access
from app.models import Event, Membership, Organization, Registration, User
from app.schemas import EventCreate, EventOut, EventPatch

router = APIRouter(prefix="/events", tags=["Events"])

DEFAULT_CAPABILITIES = {
    "hackathon": ["teams", "check_in", "venues", "judging", "rounds", "volunteers", "resources", "incidents", "analytics"],
    "college fest": ["attendees", "check_in", "sessions", "venues", "volunteers", "resources", "incidents", "analytics"],
    "conference": ["attendees", "check_in", "sessions", "speakers", "venues", "staff", "sponsors", "feedback", "analytics"],
    "corporate event": ["attendees", "check_in", "sessions", "speakers", "venues", "staff", "sponsors", "feedback", "budget", "analytics"],
    "personal event": ["guests", "rsvp", "schedule", "budget", "tasks", "reminders"],
}


@router.post("", response_model=EventOut, status_code=201)
def create_event(payload: EventCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if payload.organization_id:
        membership = db.query(Membership).filter_by(organization_id=payload.organization_id, user_id=user.id).first()
        if not membership:
            raise HTTPException(status_code=404, detail="Organization not found")
        if membership.role not in {"organization_admin", "event_admin"}:
            raise HTTPException(status_code=403, detail="You cannot create events in this organization")
    if payload.capabilities is not None:
        capabilities = payload.capabilities
    elif payload.organization_id is None:
        capabilities = DEFAULT_CAPABILITIES.get("personal event", ["guests", "rsvp", "schedule", "budget", "tasks", "reminders"])
    else:
        capabilities = DEFAULT_CAPABILITIES.get(payload.event_type.lower(), ["attendees", "check_in", "schedule", "tasks", "analytics"])
    values = payload.model_dump(exclude={"capabilities", "rounds", "time_slots", "rules"})
    values["status"] = str(values["status"]).lower()
    event = Event(**values, owner_id=user.id, capabilities=[str(item).lower() for item in capabilities], settings={"rounds": payload.rounds, "time_slots": payload.time_slots, "rules": payload.rules})
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db), user: User = Depends(current_user)):
    org_ids = db.query(Membership.organization_id).filter(Membership.user_id == user.id)
    return db.query(Event).filter(or_(Event.owner_id == user.id, Event.organization_id.in_(org_ids))).order_by(Event.created_at.desc()).all()


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event, _ = event_access(db, event_id, user)
    return event


@router.patch("/{event_id}", response_model=EventOut)
def update_event(event_id: str, payload: EventPatch, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event, role = event_access(db, event_id, user, write=True)
    if role not in {"organization_admin", "event_admin", "personal_owner"}:
        raise HTTPException(status_code=403, detail="Only event admins can change event settings")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key in {"rounds", "time_slots", "rules"}:
            settings = dict(event.settings or {})
            settings[key] = value
            event.settings = settings
            continue
        if key == "status" and value is not None:
            value = value.lower()
        if key == "capabilities" and value is not None:
            value = [str(item).lower() for item in value]
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


@router.get("/{event_id}/dashboard")
def dashboard(event_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event, role = event_access(db, event_id, user)
    capability_catalog = {
        "teams": {"label": "Teams", "nav": "Teams", "kpis": ["registered_teams", "checked_in", "unallocated"]},
        "attendees": {"label": "Attendees", "nav": "Attendees", "kpis": ["registered_attendees", "checked_in"]},
        "guests": {"label": "Guests", "nav": "Guest list", "kpis": ["invited", "accepted", "pending_rsvp"]},
        "rsvp": {"label": "RSVPs", "nav": "RSVPs", "kpis": ["accepted", "declined", "pending_rsvp"]},
        "check_in": {"label": "Check-in", "nav": "Check-in", "kpis": ["checked_in", "expected"]},
        "sessions": {"label": "Sessions", "nav": "Sessions", "kpis": ["sessions_today", "attendee_capacity"]},
        "speakers": {"label": "Speakers", "nav": "Speakers", "kpis": ["speakers", "sessions_assigned"]},
        "judging": {"label": "Judging", "nav": "Evaluations", "kpis": ["active_judges", "pending_evaluations"]},
        "rounds": {"label": "Rounds", "nav": "Rounds", "kpis": ["current_round", "qualified"]},
        "venues": {"label": "Venues", "nav": "Venues", "kpis": ["occupied_spaces", "available_spaces"]},
        "volunteers": {"label": "Staff & volunteers", "nav": "Staff", "kpis": ["active_staff", "open_tasks"]},
        "staff": {"label": "Staff", "nav": "Staff", "kpis": ["active_staff", "open_tasks"]},
        "resources": {"label": "Resources", "nav": "Resources", "kpis": ["inventory_remaining"]},
        "incidents": {"label": "Incidents", "nav": "Incidents", "kpis": ["open_incidents"]},
        "sponsors": {"label": "Sponsors", "nav": "Sponsors", "kpis": ["sponsors", "deliverables_due"]},
        "feedback": {"label": "Feedback", "nav": "Feedback", "kpis": ["response_rate", "average_rating"]},
        "budget": {"label": "Budget", "nav": "Budget", "kpis": ["planned_budget", "actual_spend"]},
        "schedule": {"label": "Schedule", "nav": "Schedule", "kpis": ["upcoming_items"]},
        "tasks": {"label": "Tasks", "nav": "Tasks", "kpis": ["open_tasks", "completed_tasks"]},
        "reminders": {"label": "Reminders", "nav": "Reminders", "kpis": ["upcoming_reminders"]},
        "analytics": {"label": "Analytics", "nav": "Analytics", "kpis": ["attendance_rate", "completion"]},
    }
    aliases = {"judges": "judging", "allocation": "judging", "communication": "reminders"}
    normalized_caps = [aliases.get(str(item).lower(), str(item).lower()) for item in event.capabilities]
    enabled = [capability_catalog[item] for item in normalized_caps if item in capability_catalog]
    if role in {"judge", "evaluator"}:
        enabled = [item for item in enabled if item["label"] in {"Evaluations", "Rounds", "Schedule"}]
    elif role == "volunteer":
        enabled = [item for item in enabled if item["label"] in {"Check-in", "Staff & volunteers", "Staff", "Tasks", "Schedule"}]
    organization = db.get(Organization, event.organization_id) if event.organization_id else None
    if not event.organization_id:
        variant = "personal"
    elif organization and organization.organization_type.lower() in {"business", "business / corporate", "corporate"}:
        variant = "corporate"
    else:
        variant = "institutional"
    role_map = {"organization_admin": "ORGANIZATION_ADMIN", "event_admin": "EVENT_ADMIN", "coordinator": "COORDINATOR", "judge": "JUDGE", "evaluator": "JUDGE", "volunteer": "VOLUNTEER", "participant": "PARTICIPANT", "technical_staff": "TECHNICAL_STAFF", "resource_manager": "RESOURCE_MANAGER", "personal_owner": "EVENT_ADMIN"}
    module_map = {"teams": "TEAMS", "attendees": "GUESTS", "guests": "GUESTS", "rsvp": "GUESTS", "check_in": "CHECK_IN", "sessions": "SESSIONS", "speakers": "SESSIONS", "judging": "JUDGES", "rounds": "ROUNDS", "venues": "VENUES", "volunteers": "STAFF", "staff": "STAFF", "resources": "RESOURCES", "incidents": "INCIDENTS", "sponsors": "SPONSORS", "feedback": "ANALYTICS", "budget": "BUDGET", "schedule": "SESSIONS", "tasks": "STAFF", "reminders": "COMMUNICATION", "analytics": "ANALYTICS"}
    module_ids = list(dict.fromkeys(module_map[item] for item in normalized_caps if item in module_map))
    kpis = list(dict.fromkeys(kpi for module in enabled for kpi in module["kpis"]))
    kpi_map = {"registered_teams": "registered_count", "registered_attendees": "registered_count", "checked_in": "checked_in_count", "active_judges": "active_judges", "pending_evaluations": "pending_evaluations", "open_incidents": "open_incidents"}
    kpi_ids = list(dict.fromkeys(kpi_map.get(kpi, kpi) for kpi in kpis))
    return {"event": EventOut.model_validate(event).model_dump(mode="json", by_alias=True), "context": {"organizationId": event.organization_id, "workspaceMode": "PERSONAL" if not event.organization_id else "ORGANIZATION"}, "role": role_map.get(role, "COORDINATOR"), "dashboardVariant": variant, "enabledModules": module_ids, "kpiIdentifiers": kpi_ids}


@router.get("/{event_id}/rounds")
def get_rounds(event_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event, _ = event_access(db, event_id, user)
    return (event.settings or {}).get("rounds", [])


@router.get("/{event_id}/rounds/leaderboard")
def leaderboard(event_id: str, round_order: int = Query(default=1, alias="roundOrder", ge=1), db: Session = Depends(get_db), user: User = Depends(current_user)):
    event_access(db, event_id, user)
    rows = db.query(Registration).filter_by(event_id=event_id, kind="team").all()
    rows.sort(key=lambda row: float((row.data or {}).get("totalScore", 0)), reverse=True)
    output = []
    for rank, row in enumerate(rows, 1):
        item = {**(row.data or {}), "id": row.public_id, "eventId": event_id, "name": row.name, "rank": rank, "currentRound": (row.data or {}).get("currentRound", 1)}
        output.append(item)
    return output


@router.post("/{event_id}/rounds/advance")
def advance_round(event_id: str, body: dict = Body(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    event, role = event_access(db, event_id, user, write=True)
    if role not in {"organization_admin", "event_admin", "coordinator", "personal_owner"}:
        raise HTTPException(status_code=403, detail="Only event organizers can advance teams")
    qualifying_count = int(body.get("qualifyingCount", 48))
    if qualifying_count < 1:
        raise HTTPException(status_code=422, detail="qualifyingCount must be positive")
    rows = db.query(Registration).filter_by(event_id=event_id, kind="team").all()
    rows.sort(key=lambda row: float((row.data or {}).get("totalScore", 0)), reverse=True)
    rounds = (event.settings or {}).get("rounds", [])
    selected = next((item for item in rounds if item.get("id") == body.get("roundId")), None)
    next_round = int((selected or {}).get("order", 1)) + 1
    advanced = []
    for row in rows[:qualifying_count]:
        data = dict(row.data or {})
        data["currentRound"] = next_round
        row.data = data
        advanced.append({**data, "id": row.public_id, "eventId": event_id, "name": row.name})
    settings = dict(event.settings or {})
    settings["current_round"] = next_round
    event.settings = settings
    db.commit()
    return {"advancedTeams": advanced, "nextRound": next_round}
