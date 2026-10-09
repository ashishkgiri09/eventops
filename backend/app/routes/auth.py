from datetime import datetime, timezone
from hashlib import sha256
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.dependencies import current_user
from app.models import Invitation, JudgeProfile, Membership, PasswordResetCode, RefreshSession, User
from app.schemas import ForgotPasswordIn, LoginIn, RefreshIn, RegisterIn, ResetPasswordIn, TokenPair, UserOut, VerifyPasswordResetCodeIn
from app.security import hash_password, issue_access_token, issue_refresh_token, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


def token_pair(db: Session, user: User) -> TokenPair:
    refresh, expires, digest = issue_refresh_token(user.id)
    db.add(RefreshSession(user_id=user.id, token_hash=digest, expires_at=expires))
    db.commit()
    # Role is organization-scoped in Membership, not stored on User. Resolve it
    # here so the frontend opens the correct role portal after authentication.
    membership = db.query(Membership).filter_by(user_id=user.id).order_by(Membership.id).first()
    if membership:
        role = membership.role.upper()
    elif db.query(JudgeProfile).filter_by(user_id=user.id, is_active=True).first():
        role = "JUDGE"
    else:
        # A newly registered account has no organization membership until it
        # creates or joins one; retain the organizer onboarding experience.
        role = "ORGANIZATION_ADMIN"
    user_out = UserOut.model_validate(user).model_copy(update={"role": role})
    return TokenPair(access_token=issue_access_token(user.id), refresh_token=refresh, user=user_out)


def is_expired(value: datetime) -> bool:
    # SQLite may return a naive datetime even when the column is timezone-aware.
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value <= datetime.now(timezone.utc)


def reset_code_digest(email: str, code: str) -> str:
    return sha256(f"{email.lower()}:{code}:{settings.jwt_secret}".encode()).hexdigest()


@router.post("/register", response_model=TokenPair, status_code=201)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(User).filter_by(email=email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    invitation = None
    if payload.invitation_code:
        invitation = db.query(Invitation).filter_by(code=payload.invitation_code.strip()).first()
        if not invitation or is_expired(invitation.expires_at):
            raise HTTPException(status_code=400, detail="This invitation link is invalid or expired")
        if invitation.email and invitation.email.lower() != email:
            raise HTTPException(status_code=403, detail="This invitation was issued to a different email address")
    user = User(email=email, full_name=payload.full_name.strip(), password_hash=hash_password(payload.password))
    db.add(user)
    db.flush()
    if invitation:
        db.add(Membership(organization_id=invitation.organization_id, user_id=user.id, role=invitation.role))
        if invitation.role.lower() == "judge":
            profiles = db.query(JudgeProfile).filter(JudgeProfile.email.ilike(email), JudgeProfile.user_id.is_(None)).all()
            for profile in profiles:
                profile.user_id = user.id
        invitation.expires_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return token_pair(db, user)


@router.post("/login", response_model=TokenPair)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash) or not user.is_active:
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    return token_pair(db, user)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    # Never reveal whether an email address has an account. In local development
    # only, return the code because no outbound email provider is configured.
    response = {"success": True, "message": "If an active account matches that email, a reset code has been created."}
    email = str(payload.email).lower()
    user = db.query(User).filter_by(email=email, is_active=True).first()
    if not user:
        return response

    db.query(PasswordResetCode).filter_by(user_id=user.id, consumed=False).delete(synchronize_session=False)
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(PasswordResetCode(
        user_id=user.id,
        email=email,
        code_hash=reset_code_digest(email, code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    ))
    db.commit()
    if settings.app_env.lower() in {"development", "dev", "local"}:
        response["debugCode"] = code
        response["message"] = "Local reset code created. It expires in 10 minutes."
    return response


@router.post("/verify-reset-code")
def verify_password_reset_code(payload: VerifyPasswordResetCodeIn, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    row = db.query(PasswordResetCode).filter_by(email=email, consumed=False).order_by(PasswordResetCode.created_at.desc()).first()
    if not row or is_expired(row.expires_at) or row.attempts >= 5:
        raise HTTPException(status_code=400, detail="Reset code is invalid or expired. Request a new code.")
    if row.code_hash != reset_code_digest(email, payload.code):
        row.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Reset code is invalid or expired. Request a new code.")
    row.verified_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    row = db.query(PasswordResetCode).filter_by(
        email=email,
        code_hash=reset_code_digest(email, payload.code),
        consumed=False,
    ).order_by(PasswordResetCode.created_at.desc()).first()
    if not row or not row.verified_at or is_expired(row.expires_at):
        raise HTTPException(status_code=400, detail="Verify a valid reset code before choosing a new password.")
    user = db.get(User, row.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Account unavailable.")
    user.password_hash = hash_password(payload.new_password)
    row.consumed = True
    db.query(RefreshSession).filter_by(user_id=user.id, revoked=False).update({"revoked": True}, synchronize_session=False)
    db.commit()
    return {"success": True}


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshIn, db: Session = Depends(get_db)):
    digest = sha256(payload.refresh_token.encode()).hexdigest()
    session = db.query(RefreshSession).filter_by(token_hash=digest, revoked=False).first()
    if not session or is_expired(session.expires_at):
        raise HTTPException(status_code=401, detail="Refresh token is invalid or expired")
    session.revoked = True
    user = db.get(User, session.user_id)
    if not user or not user.is_active:
        db.commit()
        raise HTTPException(status_code=401, detail="Account unavailable")
    db.commit()
    return token_pair(db, user)


@router.post("/logout", status_code=204)
def logout(payload: RefreshIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    digest = sha256(payload.refresh_token.encode()).hexdigest()
    session = db.query(RefreshSession).filter_by(token_hash=digest, user_id=user.id, revoked=False).first()
    if session:
        session.revoked = True
        db.commit()


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user
