import os
import datetime
import bcrypt
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.database import get_db
from app import models, schemas

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or SECRET_KEY == "procureiq-zenesys-2026-secret-key-hackathon":
    raise ValueError("FATAL: SECRET_KEY environment variable is not securely set.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 60 minutes


import time
from collections import defaultdict

# Rate Limiting configuration
LOGIN_ATTEMPTS = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOGIN_RATE_LIMIT_WINDOW = 60  # seconds

def check_rate_limit(ip: str) -> bool:
    current_time = time.time()
    attempts = LOGIN_ATTEMPTS.get(ip, [])
    # Filter attempts within the window
    attempts = [t for t in attempts if current_time - t < LOGIN_RATE_LIMIT_WINDOW]
    LOGIN_ATTEMPTS[ip] = attempts
    return len(attempts) < MAX_LOGIN_ATTEMPTS

def record_failed_attempt(ip: str):
    LOGIN_ATTEMPTS[ip].append(time.time())

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")



def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # truncate to 72 bytes if needed
        plain_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(plain_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    plain_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_bytes, salt).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


def require_roles(*roles: str):
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in roles and "Admin" not in current_user.role and "Lead Procurement Officer" not in current_user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of roles: {', '.join(roles)}"
            )
        return current_user
    return role_checker


def require_gov_role(current_user: models.User = Depends(get_current_user)):
    if current_user.role == "Vendor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Government access required"
        )
    return current_user


def require_vendor_role(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "Vendor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Vendor access required"
        )
    return current_user
