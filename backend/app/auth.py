"""Authentication utilities: simple token-based auth with bcrypt password hashing."""
import os
import bcrypt
import hashlib
import secrets
import json
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

SECRET_KEY = os.getenv("JWT_SECRET", "edutrace-hackathon-secret-key-change-in-prod")
ACCESS_TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer()

# Simple in-memory token store (fine for hackathon)
_token_store = {}  # token -> {"user_id": int, "exp": float}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a simple bearer token and store the mapping."""
    user_id = data.get("sub")
    exp = time.time() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)).total_seconds()
    # Generate a random token
    raw = f"{user_id}:{exp}:{secrets.token_hex(32)}"
    token = hashlib.sha256(raw.encode()).hexdigest()
    _token_store[token] = {"user_id": user_id, "exp": exp}
    print(f"[AUTH] Created token for user_id={user_id}, total_active_tokens={len(_token_store)}", flush=True)
    return token


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate the current user from bearer token."""
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token_data = _token_store.get(token)
    if not token_data:
        print(f"[AUTH] FAIL: Token not found in store (have {len(_token_store)} tokens)", flush=True)
        raise credentials_exception

    if time.time() > token_data["exp"]:
        print(f"[AUTH] FAIL: Token expired", flush=True)
        del _token_store[token]
        raise credentials_exception

    user = db.query(User).filter(User.id == token_data["user_id"]).first()
    if user is None:
        print(f"[AUTH] FAIL: No user with id={token_data['user_id']}", flush=True)
        raise credentials_exception

    print(f"[AUTH] OK: {user.email}", flush=True)
    return user


def require_role(role: str):
    """Dependency factory to require a specific role."""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires {role} role",
            )
        return current_user
    return role_checker
