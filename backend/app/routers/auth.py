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

    clean_email = username.strip().lower()
    user = db.query(models.User).filter(models.User.email == clean_email).first()

    if not user or not auth.verify_password(password, user.password_hash):
        auth.record_failed_attempt(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check vendor authorization status
    if user.role == "Vendor" and not getattr(user, "is_active", True):
        reg = db.query(models.VendorRegistration).filter(models.VendorRegistration.email == user.email).first()
        if reg:
            if reg.status == "REJECTED":
                reason = reg.reviewer_notes or "Application does not meet statutory procurement criteria."
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Vendor Registration Rejected: {reason}"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Vendor account pending verification & authorization by Lead Procurement Officer (Application #{reg.application_number}). You will receive portal access upon approval."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vendor account is currently inactive. Please contact LokProcure administration."
            )

    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/register-vendor", response_model=schemas.VendorRegistrationOut, status_code=status.HTTP_201_CREATED)
def register_vendor(
    payload: schemas.VendorRegisterIn,
    db: Session = Depends(get_db)
):
    clean_email = payload.email.strip().lower()
    clean_gstin = payload.gstin.strip().upper()
    clean_pan = payload.pan.strip().upper()

    # 1. Uniqueness checks
    existing_user = db.query(models.User).filter(models.User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{clean_email}' already exists in LokProcure."
        )

    existing_reg = db.query(models.VendorRegistration).filter(
        (models.VendorRegistration.email == clean_email) |
        (models.VendorRegistration.gstin == clean_gstin) |
        (models.VendorRegistration.pan == clean_pan)
    ).first()
    if existing_reg:
        if existing_reg.email == clean_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")
        if existing_reg.gstin == clean_gstin:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"GSTIN '{clean_gstin}' is already registered with Application #{existing_reg.application_number}.")
        if existing_reg.pan == clean_pan:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"PAN '{clean_pan}' is already registered with Application #{existing_reg.application_number}.")

    # 2. Run automated verification & AI credibility audit
    import json
    import secrets
    from app.vendor_verification import audit_vendor_registration

    audit_result = audit_vendor_registration(payload.model_dump())

    # Generate sequential or random application number
    app_num = f"VREG-2026-{secrets.token_hex(3).upper()}"

    # 3. Create User account (is_active=False until Lead Procurement Officer accepts)
    hashed_pwd = auth.get_password_hash(payload.password)
    user = models.User(
        email=clean_email,
        password_hash=hashed_pwd,
        full_name=payload.contact_person,
        role="Vendor",
        department=payload.company_name,
        is_active=False,
    )
    db.add(user)
    db.flush()

    # 4. Create VendorRegistration application record
    registration = models.VendorRegistration(
        application_number=app_num,
        company_name=payload.company_name,
        business_type=payload.business_type,
        cin_llpin=payload.cin_llpin,
        contact_person=payload.contact_person,
        email=clean_email,
        phone=payload.phone,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        gstin=clean_gstin,
        pan=clean_pan,
        is_msme=payload.is_msme,
        msme_reg_no=payload.msme_reg_no,
        is_incubator=payload.is_incubator,
        category=payload.category,
        specialties=payload.specialties,
        annual_turnover=payload.annual_turnover,
        avg_delivery_days=payload.avg_delivery_days,
        local_proximity_km=payload.local_proximity_km,
        quality_certifications=payload.quality_certifications,
        bank_account_number=payload.bank_account_number,
        bank_ifsc=payload.bank_ifsc.strip().upper(),
        bank_name=payload.bank_name,
        password_hash=hashed_pwd,
        status="PENDING_VERIFICATION",
        verification_score=audit_result["verification_score"],
        verification_risk_level=audit_result["verification_risk_level"],
        verification_flags_json=json.dumps(audit_result["verification_flags"]),
        ai_verification_summary=json.dumps(audit_result["ai_summary"]),
        user_id=user.id,
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)

    return registration


@router.get("/me", response_model=schemas.UserOut)
async def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
