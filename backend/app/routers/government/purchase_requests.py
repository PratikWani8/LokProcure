import random
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app import auth, models, schemas, auth
from app.routers.government.approvals import evaluate_routing_rule
from app.routers.government.vendors import compute_vendor_score
from app.compliance.compliance_service import evaluate_compliance

router = APIRouter(dependencies=[Depends(auth.require_gov_role)], prefix="/purchase-requests", tags=["Purchase Requests"])


def parse_compliance_out(check: Optional[models.ComplianceCheck]) -> Optional[schemas.ComplianceCheckOut]:
    if not check:
        return None
    try:
        violations_raw = json.loads(check.violations_json) if check.violations_json else []
    except Exception:
        violations_raw = []
    return schemas.ComplianceCheckOut(
        id=check.id,
        pr_id=check.pr_id,
        compliant=bool(check.compliant),
        violations=[schemas.ViolationItem(**v) for v in violations_raw],
        required_action=check.required_action or "",
        checked_at=check.checked_at
    )


def auto_generate_rfq_bids(pr: models.PurchaseRequest, db: Session):
    """
    Auto-generates RFQ bids from all active vendors based on their tier and specialties.
    """
    vendors = db.query(models.Vendor).filter(models.Vendor.status == "Active").all()
    if not vendors:
        return

    for vendor in vendors:
        # Tier-based price multiplier
        if getattr(vendor, "is_incubator", False) or getattr(vendor, "is_local_vendor", False):
            multiplier = random.uniform(0.72, 0.88)
            spec_note = f"🌱 Local Incubator SMB ({getattr(vendor, 'local_proximity_km', 12.0)}km proximity). ISO-9001 local fabrication with same-day emergency dispatch and zero cross-country freight delay."
        elif vendor.pricing_tier == "Enterprise Tier-1":
            multiplier = random.uniform(0.92, 1.06)
            spec_note = f"Enterprise Tier-1 SLA. ISO-9001 certified batch testing included. Direct factory delivery."
        elif vendor.pricing_tier == "Mid-Tier":
            multiplier = random.uniform(0.84, 0.98)
            spec_note = f"Standard Commercial SLA with verified quality inspection and warranty coverage."
        else:  # Economy Tier
            multiplier = random.uniform(0.70, 0.90)
            spec_note = f"Economy bulk pricing. Standard packaging and surface logistics."

        quoted_price = round(pr.estimated_budget * multiplier, 2)
        variance_days = random.choice([-1, 0, 1, 2])
        delivery_days = max(1, vendor.avg_delivery_days + variance_days)

        performances = db.query(models.VendorPerformance).filter(
            models.VendorPerformance.vendor_id == vendor.id
        ).all()

        score_res = compute_vendor_score(
            vendor=vendor,
            quoted_price=quoted_price,
            bid_days=delivery_days,
            budget=pr.estimated_budget,
            performances=performances
        )

        bid = models.VendorBid(
            vendor_id=vendor.id,
            pr_id=pr.id,
            quoted_price=quoted_price,
            delivery_days=delivery_days,
            notes=spec_note,
            bid_score=score_res["scores"]["total_score"]
        )
        db.add(bid)

    db.commit()


@router.get("", response_model=List[schemas.PurchaseRequestOut])
def get_purchase_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    prs = db.query(models.PurchaseRequest).order_by(desc(models.PurchaseRequest.created_at)).all()
    results = []

    for pr in prs:
        bids_count = db.query(models.VendorBid).filter(models.VendorBid.pr_id == pr.id).count()
        wf = db.query(models.ApprovalWorkflow).filter(models.ApprovalWorkflow.pr_id == pr.id).order_by(desc(models.ApprovalWorkflow.id)).first()
        po = pr.purchase_order

        winning_vendor_name = None
        if po and po.vendor:
            winning_vendor_name = po.vendor.name
        elif pr.bids:
            top_bid = max(pr.bids, key=lambda b: b.bid_score)
            winning_vendor_name = f"Top Bid: {top_bid.vendor.name}"

        assigned_role = None
        if wf:
            if "Plant Head" in wf.triggered_rule:
                assigned_role = "Plant Head"
            elif "VP Operations" in wf.triggered_rule:
                assigned_role = "VP Operations"
            elif "Finance Director" in wf.triggered_rule:
                assigned_role = "Finance Director"
            else:
                assigned_role = "Department Manager"

        pr_out = schemas.PurchaseRequestOut(
            id=pr.id,
            title=pr.title,
            item_description=pr.item_description,
            quantity=pr.quantity,
            urgency=pr.urgency,
            status=pr.status,
            requester_id=pr.requester_id,
            department=pr.department,
            estimated_budget=pr.estimated_budget,
            created_at=pr.created_at,
            requester=schemas.UserOut.model_validate(pr.requester) if pr.requester else None,
            bids_count=bids_count,
            assigned_approval_rule=wf.triggered_rule if wf else "Standard Routing",
            assigned_approver_role=assigned_role,
            approval_status=wf.status if wf else "Pending",
            po_number=po.po_number if po else None,
            winning_vendor=winning_vendor_name,
            compliance=parse_compliance_out(pr.compliance_check)
        )
        results.append(pr_out)

    return results


@router.post("", response_model=schemas.PurchaseRequestOut)
def create_purchase_request(
    payload: schemas.PurchaseRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # 1. Create Purchase Request
    pr = models.PurchaseRequest(
        title=payload.title,
        category=payload.category or "Industrial Equipment",
        item_description=payload.item_description,
        quantity=payload.quantity,
        urgency=payload.urgency,
        status="Pending Approval",
        requester_id=current_user.id,
        department=payload.department,
        estimated_budget=payload.estimated_budget
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)

    # 2. Auto-generate RFQ bids from active vendors
    auto_generate_rfq_bids(pr, db)
    bids_count = db.query(models.VendorBid).filter(models.VendorBid.pr_id == pr.id).count()

    # 3. Autonomous RAG Policy Compliance Check (runs automatically upon PR creation)
    comp_result = evaluate_compliance({
        "id": pr.id,
        "title": pr.title,
        "item_description": pr.item_description,
        "department": pr.department,
        "estimated_budget": pr.estimated_budget,
        "urgency": pr.urgency,
        "quantity": pr.quantity,
        "bids_count": bids_count
    })

    compliance_record = models.ComplianceCheck(
        pr_id=pr.id,
        compliant=bool(comp_result.get("compliant", True)),
        violations_json=json.dumps(comp_result.get("violations", [])),
        required_action=comp_result.get("required_action", "")
    )
    db.add(compliance_record)
    db.commit()
    db.refresh(compliance_record)

    # 4. Dynamic Approval Routing
    rule_str, target_role = evaluate_routing_rule(
        estimated_budget=pr.estimated_budget,
        department=pr.department,
        urgency=pr.urgency,
        quantity=pr.quantity
    )

    # Find approver user with the matching role
    approver = db.query(models.User).filter(models.User.role == target_role).first()
    if not approver:
        # Fallback to any admin / procurement lead
        approver = db.query(models.User).filter(models.User.role == "Lead Procurement Officer").first()

    wf = models.ApprovalWorkflow(
        pr_id=pr.id,
        approver_id=approver.id if approver else None,
        triggered_rule=rule_str,
        status="Pending",
        comment=f"Auto-routed to {target_role} per {rule_str}"
    )
    db.add(wf)
    db.commit()
    db.refresh(pr)

    return schemas.PurchaseRequestOut(
        id=pr.id,
        title=pr.title,
        item_description=pr.item_description,
        quantity=pr.quantity,
        urgency=pr.urgency,
        status=pr.status,
        requester_id=pr.requester_id,
        department=pr.department,
        estimated_budget=pr.estimated_budget,
        created_at=pr.created_at,
        requester=schemas.UserOut.model_validate(pr.requester) if pr.requester else None,
        bids_count=bids_count,
        assigned_approval_rule=rule_str,
        assigned_approver_role=target_role,
        approval_status=wf.status,
        po_number=None,
        winning_vendor=None,
        compliance=parse_compliance_out(compliance_record)
    )


@router.get("/{pr_id}/compliance", response_model=schemas.ComplianceCheckOut)
def get_purchase_request_compliance(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    pr = db.query(models.PurchaseRequest).filter(models.PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase request not found")

    check = pr.compliance_check
    if not check:
        bids_count = db.query(models.VendorBid).filter(models.VendorBid.pr_id == pr.id).count()
        comp_result = evaluate_compliance({
            "id": pr.id,
            "title": pr.title,
            "item_description": pr.item_description,
            "department": pr.department,
            "estimated_budget": pr.estimated_budget,
            "urgency": pr.urgency,
            "quantity": pr.quantity,
            "bids_count": bids_count
        })
        check = models.ComplianceCheck(
            pr_id=pr.id,
            compliant=bool(comp_result.get("compliant", True)),
            violations_json=json.dumps(comp_result.get("violations", [])),
            required_action=comp_result.get("required_action", "")
        )
        db.add(check)
        db.commit()
        db.refresh(check)

    return parse_compliance_out(check)


@router.get("/{pr_id}", response_model=schemas.PurchaseRequestDetail)
def get_purchase_request_detail(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    pr = db.query(models.PurchaseRequest).filter(models.PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase request not found")

    wf = db.query(models.ApprovalWorkflow).filter(models.ApprovalWorkflow.pr_id == pr.id).order_by(desc(models.ApprovalWorkflow.id)).first()
    po = pr.purchase_order

    assigned_role = None
    if wf:
        if "Plant Head" in wf.triggered_rule:
            assigned_role = "Plant Head"
        elif "VP Operations" in wf.triggered_rule:
            assigned_role = "VP Operations"
        elif "Finance Director" in wf.triggered_rule:
            assigned_role = "Finance Director"
        else:
            assigned_role = "Department Manager"

    bids_out = []
    for bid in pr.bids:
        b_out = schemas.VendorBidOut.model_validate(bid)
        if bid.vendor:
            b_out.vendor = schemas.VendorOut.model_validate(bid.vendor)
        bids_out.append(b_out)

    workflows_out = []
    for w in pr.approval_workflows:
        w_out = schemas.ApprovalWorkflowOut.model_validate(w)
        if w.approver:
            w_out.approver = schemas.UserOut.model_validate(w.approver)
        workflows_out.append(w_out)

    po_out = None
    if po:
        po_out = schemas.PurchaseOrderOut.model_validate(po)
        if po.vendor:
            po_out.vendor = schemas.VendorOut.model_validate(po.vendor)

    return schemas.PurchaseRequestDetail(
        id=pr.id,
        title=pr.title,
        item_description=pr.item_description,
        quantity=pr.quantity,
        urgency=pr.urgency,
        status=pr.status,
        requester_id=pr.requester_id,
        department=pr.department,
        estimated_budget=pr.estimated_budget,
        created_at=pr.created_at,
        requester=schemas.UserOut.model_validate(pr.requester) if pr.requester else None,
        bids_count=len(pr.bids),
        assigned_approval_rule=wf.triggered_rule if wf else "Standard Routing",
        assigned_approver_role=assigned_role,
        approval_status=wf.status if wf else "Pending",
        po_number=po.po_number if po else None,
        winning_vendor=po.vendor.name if po and po.vendor else None,
        compliance=parse_compliance_out(pr.compliance_check),
        bids=bids_out,
        approval_workflows=workflows_out,
        purchase_order=po_out
    )

