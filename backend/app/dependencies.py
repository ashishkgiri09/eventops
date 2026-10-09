from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Event, Membership, User
from app.security import decode_access_token

bearer = HTTPBearer(auto_error=False)


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        user_id = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Account unavailable")
    return user


def event_access(db: Session, event_id: str, user: User, write: bool = False) -> tuple[Event, str]:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organization_id:
        membership = db.query(Membership).filter_by(organization_id=event.organization_id, user_id=user.id).first()
        if not membership:
            raise HTTPException(status_code=404, detail="Event not found")
        role = membership.role
    elif event.owner_id == user.id:
        role = "personal_owner"
    else:
        raise HTTPException(status_code=404, detail="Event not found")
    if write and role not in {"organization_admin", "event_admin", "coordinator", "judge", "evaluator", "volunteer", "technical_staff", "resource_manager", "personal_owner"}:
        raise HTTPException(status_code=403, detail="You do not have permission to change this event")
    return event, role
