from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel, Field

from app.auth import require_vendor_role, get_current_user
from app.database import get_db
from app import models
from app.routers.government.vendors import compute_vendor_score

router = APIRouter(dependencies=[Depends(require_vendor_role)])


class BidSubmitIn(BaseModel):
    pr_id: Optional[int] = None
    purchase_request_id: Optional[int] = None
    quoted_price: float = Field(..., gt=0)
    delivery_days: int = Field(..., ge=1)
    notes: Optional[str] = None


class VendorBidOut(BaseModel):
    id: int
    pr_id: int
    pr_title: str
    vendor_id: int
    vendor_name: str
    quoted_price: float
    delivery_days: int
    bid_score: float
    notes: Optional[str] = None
    created_at: datetime
    negotiation_session_id: Optional[int] = None
    negotiation_status: Optional[str] = None


@router.get("", response_model=List[VendorBidOut])
@router.get("/", response_model=List[VendorBidOut])
def get_my_bids(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    vendor = db.query(models.Vendor).filter(models.Vendor.name == current_user.department).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor profile not found or access denied")
    if not vendor:
        return []

    bids = db.query(models.VendorBid).filter(models.VendorBid.vendor_id == vendor.id).order_by(models.VendorBid.id.desc()).all()
    out = []
    for b in bids:
        pr = b.purchase_request
        latest_session = (
            db.query(models.NegotiationSession)
            .filter(models.NegotiationSession.vendor_bid_id == b.id)
            .order_by(models.NegotiationSession.id.desc())
            .first()
        )
        out.append(
            VendorBidOut(
                id=b.id,
                pr_id=b.pr_id,
                pr_title=pr.title if pr else f"PR-{b.pr_id}",
                vendor_id=vendor.id,
                vendor_name=vendor.name,
                quoted_price=b.quoted_price,
                delivery_days=b.delivery_days,
                bid_score=b.bid_score,
                notes=b.notes,
                created_at=b.created_at,
                negotiation_session_id=latest_session.id if latest_session else None,
                negotiation_status=latest_session.status if latest_session else None,
            )
        )
    return out


@router.post("", response_model=VendorBidOut)
@router.post("/", response_model=VendorBidOut)
def submit_bid(
    payload: BidSubmitIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    vendor = db.query(models.Vendor).filter(models.Vendor.name == current_user.department).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor profile not found or access denied")
    if not vendor:
        raise HTTPException(status_code=400, detail="No vendor profile associated with user")

    target_pr_id = payload.pr_id or payload.purchase_request_id
    if not target_pr_id:
        raise HTTPException(status_code=422, detail="pr_id or purchase_request_id required")
    pr = db.query(models.PurchaseRequest).filter(models.PurchaseRequest.id == target_pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    # Check if bid already exists
    bid = db.query(models.VendorBid).filter(
        models.VendorBid.vendor_id == vendor.id,
        models.VendorBid.pr_id == pr.id
    ).first()

    perfs = db.query(models.VendorPerformance).filter(models.VendorPerformance.vendor_id == vendor.id).all()
    score_res = compute_vendor_score(
        vendor=vendor,
        quoted_price=payload.quoted_price,
        bid_days=payload.delivery_days,
        budget=pr.estimated_budget,
        performances=perfs
    )
    score = score_res["total_score"]

    if bid:
        bid.quoted_price = payload.quoted_price
        bid.delivery_days = payload.delivery_days
        bid.notes = payload.notes
        bid.bid_score = score
    else:
        bid = models.VendorBid(
            vendor_id=vendor.id,
            pr_id=pr.id,
            quoted_price=payload.quoted_price,
            original_quoted_price=payload.quoted_price,
            delivery_days=payload.delivery_days,
            original_delivery_days=payload.delivery_days,
            notes=payload.notes,
            bid_score=score
        )
        db.add(bid)

    db.commit()
    db.refresh(bid)

    latest_session = (
        db.query(models.NegotiationSession)
        .filter(models.NegotiationSession.vendor_bid_id == bid.id)
        .order_by(models.NegotiationSession.id.desc())
        .first()
    )

    return VendorBidOut(
        id=bid.id,
        pr_id=bid.pr_id,
        pr_title=pr.title,
        vendor_id=vendor.id,
        vendor_name=vendor.name,
        quoted_price=bid.quoted_price,
        delivery_days=bid.delivery_days,
        bid_score=bid.bid_score,
        notes=bid.notes,
        created_at=bid.created_at,
        negotiation_session_id=latest_session.id if latest_session else None,
        negotiation_status=latest_session.status if latest_session else None,
    )
