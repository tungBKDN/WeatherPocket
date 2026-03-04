from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
import bcrypt

from app.core.config import get_settings


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    # Truncate password to 72 bytes as required by bcrypt
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash using bcrypt."""
    # Truncate password to 72 bytes as required by bcrypt
    password_bytes = password.encode('utf-8')[:72]
    return bcrypt.checkpw(password_bytes, password_hash.encode('utf-8'))


def create_access_token(subject: str) -> str:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def is_token_valid(token: str) -> bool:
    try:
        decode_access_token(token)
        return True
    except JWTError:
        return False
