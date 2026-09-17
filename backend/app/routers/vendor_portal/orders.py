from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from app.auth import require_vendor_role, get_current_user
from app.database import get_db
from app import models

router = APIRouter(dependencies=[Depends(require_vendor_role)])


class VendorOrderOut(BaseModel):
    id: int
    title: str
    category: Optional[str] = "Industrial Equipment"
    item_description: str
    quantity: int
    urgency: str
    department: str
    estimated_budget: float
    status: str
    created_at: datetime
    has_submitted_bid: bool = False
    my_bid_price: Optional[float] = None
    my_bid_days: Optional[int] = None


@router.get("", response_model=List[VendorOrderOut])
@router.get("/", response_model=List[VendorOrderOut])
def get_vendor_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Determine vendor identity
    vendor = db.query(models.Vendor).filter(models.Vendor.name == current_user.department).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor profile not found or access denied")

    vendor_id = vendor.id if vendor else None

    # Retrieve all active purchase requests
    prs = db.query(models.PurchaseRequest).order_by(models.PurchaseRequest.id.desc()).all()

    # Find which ones this vendor already bid on
    vendor_bids_map = {}
    if vendor_id:
        my_bids = db.query(models.VendorBid).filter(models.VendorBid.vendor_id == vendor_id).all()
        for b in my_bids:
            vendor_bids_map[b.pr_id] = b

    results = []
    for pr in prs:
        my_bid = vendor_bids_map.get(pr.id)
        results.append(
            VendorOrderOut(
                id=pr.id,
                title=pr.title,
                category=pr.category or "Industrial Equipment",
                item_description=pr.item_description,
                quantity=pr.quantity,
                urgency=pr.urgency,
                department=pr.department,
                estimated_budget=pr.estimated_budget,
                status=pr.status,
                created_at=pr.created_at,
                has_submitted_bid=my_bid is not None,
                my_bid_price=my_bid.quoted_price if my_bid else None,
                my_bid_days=my_bid.delivery_days if my_bid else None,
            )
        )
    return results
