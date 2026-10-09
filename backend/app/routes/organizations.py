from datetime import datetime, timedelta, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import current_user
from app.models import Event, Invitation, Membership, Organization, User
from app.schemas import InvitationCreate, JoinOrganizationIn, OrganizationCreate, OrganizationOut

router = APIRouter(prefix="/organizations", tags=["Organizations"])


def is_expired(value: datetime) -> bool:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value <= datetime.now(timezone.utc)


@router.get("", response_model=list[OrganizationOut])
def list_organizations(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.query(Organization, Membership.role).join(Membership).filter(Membership.user_id == user.id).all()
    return [org_out(o, role, db) for o, role in rows]


def org_out(org: Organization, role: str, db: Session) -> OrganizationOut:
    role = role.upper()
    return OrganizationOut(
        id=org.id, name=org.name, organization_type=org.organization_type,
        country=org.country, city=org.city, role=role, subtype=org.subtype,
        website=org.website, size=org.size, description=org.description,
        logo_data=org.logo_data,
        active_events_count=db.query(Event).filter_by(organization_id=org.id).count(),
        members_count=db.query(Membership).filter_by(organization_id=org.id).count(), created_at=org.created_at,
    )


@router.get("/{organization_id}", response_model=OrganizationOut)
def get_organization(organization_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    membership = db.query(Membership).filter_by(organization_id=organization_id, user_id=user.id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Organization not found")
    org = db.get(Organization, organization_id)
    return org_out(org, membership.role, db)


@router.get("/{organization_id}/members")
def list_members(organization_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    current = db.query(Membership).filter_by(organization_id=organization_id, user_id=user.id).first()
    if not current:
        raise HTTPException(status_code=404, detail="Organization not found")
    rows = db.query(Membership, User).join(User, User.id == Membership.user_id).filter(Membership.organization_id == organization_id).all()
    return [{"id": membership.id, "userId": member.id, "organizationId": organization_id, "name": member.full_name, "email": member.email, "role": membership.role.upper(), "status": "ACTIVE"} for membership, member in rows]


@router.post("", response_model=OrganizationOut, status_code=201)
def create_organization(payload: OrganizationCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    org = Organization(**payload.model_dump(), created_by=user.id)
    db.add(org)
    db.flush()
    db.add(Membership(organization_id=org.id, user_id=user.id, role="organization_admin"))
    db.commit()
    return org_out(org, "ORGANIZATION_ADMIN", db)


@router.post("/{organization_id}/invitations", status_code=201)
def create_invitation(organization_id: str, payload: InvitationCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    membership = db.query(Membership).filter_by(organization_id=organization_id, user_id=user.id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Organization not found")
    if membership.role not in {"organization_admin", "event_admin"}:
        raise HTTPException(status_code=403, detail="Only organization or event admins can invite members")
    code = secrets.token_urlsafe(9)
    role = payload.role.lower()
    if role not in {"coordinator", "event_admin", "judge", "volunteer", "participant", "technical_staff", "resource_manager"}:
        raise HTTPException(status_code=422, detail="Unsupported organization role")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    db.add(Invitation(organization_id=organization_id, code=code, role=role, email=payload.email.lower(), expires_at=expires_at))
    db.commit()
    return {"code": code, "inviteCode": code, "expiresAt": expires_at.isoformat(), "expires_in_days": 7}


@router.post("/join")
def join_organization(payload: JoinOrganizationIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    invitation = db.query(Invitation).filter_by(code=payload.code).first()
    if not invitation or is_expired(invitation.expires_at):
        raise HTTPException(status_code=404, detail="Invitation is invalid or expired")
    if invitation.email and invitation.email.lower() != user.email.lower():
        raise HTTPException(status_code=403, detail="This invitation was issued to a different email address")
    existing = db.query(Membership).filter_by(organization_id=invitation.organization_id, user_id=user.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="You already belong to this organization")
    org = db.get(Organization, invitation.organization_id)
    db.add(Membership(organization_id=org.id, user_id=user.id, role=invitation.role))
    db.commit()
    invitation.expires_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True, "organization": org_out(org, invitation.role.upper(), db), "role": invitation.role.upper(), "message": "Successfully joined the organization"}
