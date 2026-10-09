from datetime import datetime, timedelta, timezone
from hashlib import sha256
import secrets

from jose import JWTError, jwt
from pwdlib import PasswordHash

from app.config import settings

ALGORITHM = "HS256"
password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def issue_access_token(user_id: str) -> str:
    expiry = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({"sub": user_id, "exp": expiry, "type": "access"}, settings.jwt_secret, algorithm=ALGORITHM)


def issue_refresh_token(user_id: str) -> tuple[str, datetime, str]:
    token = secrets.token_urlsafe(48)
    expiry = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_days)
    return token, expiry, sha256(token.encode()).hexdigest()


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        if payload.get("type") != "access" or not payload.get("sub"):
            raise ValueError("Invalid token")
        return payload["sub"]
    except (JWTError, ValueError) as exc:
        raise ValueError("Invalid or expired access token") from exc
