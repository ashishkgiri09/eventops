from datetime import datetime
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import current_user, event_access
from app.models import EventModuleRecord, User

router = APIRouter(prefix="/events/{event_id}/modules", tags=["Event Operations"])

CAPABILITY = {"sessions": "sessions", "venues": "venues", "sponsors": "sponsors", "budget": "budget", "incidents": "incidents", "staff": "staff", "volunteers": "volunteers", "resources": "resources", "announcements": "communication", "feedback": "feedback", "evaluations": "judging", "tasks": "tasks", "rounds": "rounds"}
ADMIN_ROLES = {"organization_admin", "event_admin", "coordinator", "personal_owner"}
WRITE_ROLES = {"venues": ADMIN_ROLES, "sessions": ADMIN_ROLES, "sponsors": ADMIN_ROLES, "budget": ADMIN_ROLES | {"resource_manager"}, "incidents": ADMIN_ROLES | {"technical_staff", "volunteer"}, "staff": ADMIN_ROLES, "volunteers": ADMIN_ROLES, "resources": ADMIN_ROLES | {"resource_manager"}, "announcements": ADMIN_ROLES, "feedback": ADMIN_ROLES, "evaluations": ADMIN_ROLES | {"judge", "evaluator"}, "tasks": ADMIN_ROLES | {"volunteer"}, "rounds": ADMIN_ROLES}


def canonical(module: str) -> str:
    value = module.lower().rstrip("s") if module.lower() == "budgets" else module.lower()
    if value not in CAPABILITY:
        raise HTTPException(status_code=404, detail="Unknown event module")
    return value


def check_module(event, module: str) -> str:
    module = canonical(module)
    available = {str(value).lower() for value in (event.capabilities or [])}
    expected = CAPABILITY[module]
    aliases = {"communication": {"communication", "reminders"}, "sessions": {"sessions", "schedule"}, "staff": {"staff", "volunteers"}, "volunteers": {"staff", "volunteers"}, "tasks": {"staff", "tasks"}, "budget": {"budget"}, "evaluations": {"judging", "judges", "allocation"}}
    allowed = aliases.get(expected, {expected})
    if not available.intersection(allowed):
        raise HTTPException(status_code=403, detail=f"The {module} module is not enabled for this event")
    return module


def ensure_write(role: str, module: str):
    if role not in WRITE_ROLES[module]:
        raise HTTPException(status_code=403, detail="Your event role cannot change this module")


def validate_payload(module: str, payload: dict[str, Any]):
    required = {"sessions": ("title",), "venues": ("name",), "sponsors": ("name",), "budget": ("name",), "incidents": ("title",), "staff": ("name",), "volunteers": ("name",), "resources": ("name",), "announcements": ("title", "message"), "feedback": ("rating",), "evaluations": ("teamId", "judgeId"), "tasks": ("title",), "rounds": ("name",)}
    for key in required[module]:
        if key not in payload or payload[key] in (None, ""):
            raise HTTPException(status_code=422, detail=f"{module} record requires {key}")
    for key in ("capacity", "quantity", "plannedAmount", "actualAmount", "plusOnes"):
        if key in payload and payload[key] is not None:
            try:
                number = float(payload[key])
            except (TypeError, ValueError) as exc:
                raise HTTPException(status_code=422, detail=f"{key} must be numeric") from exc
            if number < 0:
                raise HTTPException(status_code=422, detail=f"{key} cannot be negative")
    if "rating" in payload:
        try:
            rating = float(payload["rating"])
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail="rating must be numeric") from exc
        if not 1 <= rating <= 5:
            raise HTTPException(status_code=422, detail="rating must be between 1 and 5")
    if module == "sessions" and payload.get("startTime") and payload.get("endTime"):
        try:
            start = datetime.fromisoformat(payload["startTime"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(payload["endTime"].replace("Z", "+00:00"))
        except (AttributeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail="Session times must be valid ISO dates") from exc
        if end <= start:
            raise HTTPException(status_code=422, detail="Session endTime must be after startTime")
    if module == "evaluations" and "score" in payload:
        try:
            score = float(payload["score"])
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail="Evaluation score must be numeric") from exc
        if not 0 <= score <= 100:
            raise HTTPException(status_code=422, detail="Evaluation score must be between 0 and 100")


def present(row: EventModuleRecord) -> dict[str, Any]:
    result = dict(row.payload or {})
    result.update({"id": row.public_id, "eventId": row.event_id, "name": row.name or result.get("name", ""), "status": str(result.get("status", row.status)).upper(), "createdAt": row.created_at.isoformat(), "updatedAt": row.updated_at.isoformat()})
    return result


@router.get("/{module}")
def list_records(event_id: str, module: str, q: str = Query(default=""), db: Session = Depends(get_db), user: User = Depends(current_user)):
    event, _ = event_access(db, event_id, user)
    module = check_module(event, module)
    query = db.query(EventModuleRecord).filter_by(event_id=event_id, module=module)
    if q.strip():
        query = query.filter(EventModuleRecord.name.ilike(f"%{q.strip()}%"))
    return [present(row) for row in query.order_by(EventModuleRecord.created_at.desc()).all()]


@router.post("/{module}", status_code=201)
def create_record(event_id: str, module: str, payload: dict[str, Any] = Body(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    event, role = event_access(db, event_id, user, write=True)
    module = check_module(event, module)
    ensure_write(role, module)
    validate_payload(module, payload)
    record = EventModuleRecord(event_id=event_id, module=module, public_id=str(uuid4()), name=str(payload.get("name") or payload.get("title") or ""), status=str(payload.get("status", "active")).lower(), payload=payload, created_by=user.id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return present(record)


@router.patch("/{module}/{record_id}")
def update_record(event_id: str, module: str, record_id: str, payload: dict[str, Any] = Body(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    event, role = event_access(db, event_id, user, write=True)
    module = check_module(event, module)
    ensure_write(role, module)
    record = db.query(EventModuleRecord).filter_by(event_id=event_id, module=module, public_id=record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Module record not found")
    merged = {**(record.payload or {}), **payload}
    validate_payload(module, merged)
    record.payload = merged
    record.name = str(merged.get("name") or merged.get("title") or record.name)
    record.status = str(merged.get("status", record.status)).lower()
    db.commit()
    db.refresh(record)
    return present(record)


@router.delete("/{module}/{record_id}", status_code=204)
def delete_record(event_id: str, module: str, record_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    event, role = event_access(db, event_id, user, write=True)
    module = check_module(event, module)
    ensure_write(role, module)
    record = db.query(EventModuleRecord).filter_by(event_id=event_id, module=module, public_id=record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Module record not found")
    db.delete(record)
    db.commit()


@router.post("/resources/{record_id}/consumption")
def change_consumption(event_id: str, record_id: str, payload: dict[str, float] = Body(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    event, role = event_access(db, event_id, user, write=True)
    check_module(event, "resources")
    ensure_write(role, "resources")
    record = db.query(EventModuleRecord).filter_by(event_id=event_id, module="resources", public_id=record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Resource not found")
    change = float(payload.get("quantity", 0))
    if change < 0:
        raise HTTPException(status_code=422, detail="quantity must be non-negative")
    data = dict(record.payload or {})
    consumed = float(data.get("consumedQuantity", 0))
    available = float(data.get("quantity", float(data.get("totalQuantity", 0)) - consumed))
    returning = payload.get("action") == "return"
    new_value = available + change if returning else available - change
    if new_value < 0:
        raise HTTPException(status_code=409, detail="Consumption exceeds the available resource quantity")
    data["quantity"] = new_value
    if "totalQuantity" in data:
        data["consumedQuantity"] = max(0, consumed - change) if returning else consumed + change
        data["status"] = "DEPLETED" if new_value <= 0 else "LOW_STOCK" if new_value <= float(data.get("lowStockThreshold", 0)) else "HEALTHY"
    record.payload = data
    db.commit()
    db.refresh(record)
    return present(record)
