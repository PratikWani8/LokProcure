from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=schemas.Token)
async def login(
    request: Request,
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"
    if not auth.check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many failed login attempts. Please try again later."
        )
    # Support both Form URL-encoded and JSON body
    username: Optional[str] = None
    password: Optional[str] = None

    content_type = request.headers.get("content-type", "")
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form_data = await request.form()
        username = form_data.get("username")
        password = form_data.get("password")
    else:
        try:
            json_data = await request.json()
            username = json_data.get("username") or json_data.get("email")
            password = json_data.get("password")
        except Exception:
            pass

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username (email) and password are required"
        )

    user = db.query(models.User).filter(models.User.email == username.strip().lower()).first()
    if not user or not auth.verify_password(password, user.password_hash):
        auth.record_failed_attempt(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=schemas.UserOut)
async def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
