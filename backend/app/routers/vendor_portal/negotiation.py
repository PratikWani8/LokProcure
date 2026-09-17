import logging
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_vendor_role
from app.database import get_db
from app import models
from app.negotiation.graph import run_bilateral_negotiation
from app.negotiation.state import GraphNegotiationState
from app.schemas import (
    NegotiationCounterRequest,
    NegotiationEscalationAction,
)

logger = logging.getLogger("routers.vendor_negotiation")

router = APIRouter(dependencies=[Depends(require_vendor_role)])


class PublicNegotiationEvent(BaseModel):
    id: int
    round: int
    speaker_role: str
    event_type: str
    price: Optional[float] = None
    delivery_days: Optional[int] = None
    message: Optional[str] = None
    created_at: datetime


class VendorEscalationOut(BaseModel):
    id: int
    role: str
    reason: str
    requested_price: Optional[float] = None
    requested_delivery_days: Optional[int] = None
    status: str
    comment: Optional[str] = None
    created_at: datetime
    actioned_at: Optional[datetime] = None


class VendorPrivateStateOut(BaseModel):
    target_price: float
    absolute_minimum_price: float
    feasible_delivery: int
    strategy: str


class VendorNegotiationSessionOut(BaseModel):
    session_id: int
    pr_id: int
    pr_title: str
    vendor_id: int
    vendor_name: str
    status: str
    current_round: int
    current_price: float
    current_delivery_days: int
    events: List[PublicNegotiationEvent] = []
    vendor_state: Optional[VendorPrivateStateOut] = None
    escalations: List[VendorEscalationOut] = []
    created_at: datetime
    updated_at: datetime


def _format_vendor_session(
    session: models.NegotiationSession,
    vendor: models.Vendor,
    db: Session,
) -> VendorNegotiationSessionOut:
    bid = session.vendor_bid
    pr = bid.purchase_request if bid else None

    # Only public events
    events_out = [
        PublicNegotiationEvent(
            id=ev.id,
            round=ev.round,
            speaker_role=ev.speaker_role,
            event_type=ev.event_type,
            price=ev.price,
            delivery_days=ev.delivery_days,
            message=ev.message,
            created_at=ev.created_at,
        )
        for ev in session.events
    ]

    # Only vendor private state (NEVER government state)
    v_state_rec = (
        db.query(models.VendorNegotiationState)
        .filter(models.VendorNegotiationState.negotiation_session_id == session.id)
        .first()
    )
    vendor_state_out = None
    if v_state_rec:
        vendor_state_out = VendorPrivateStateOut(
            target_price=v_state_rec.target_price,
            absolute_minimum_price=v_state_rec.absolute_minimum_price,
            feasible_delivery=v_state_rec.feasible_delivery,
            strategy=v_state_rec.strategy,
        )

    # Only vendor-relevant escalations (role == 'VENDOR')
    escalations_out = [
        VendorEscalationOut(
            id=esc.id,
            role=esc.role,
            reason=esc.reason,
            requested_price=esc.requested_price,
            requested_delivery_days=esc.requested_delivery_days,
            status=esc.status,
            comment=esc.comment,
            created_at=esc.created_at,
            actioned_at=esc.actioned_at,
        )
        for esc in session.escalations
        if esc.role == "VENDOR"
    ]

    return VendorNegotiationSessionOut(
        session_id=session.id,
        pr_id=bid.pr_id if bid else 0,
        pr_title=pr.title if pr else f"PR-{bid.pr_id if bid else 0}",
        vendor_id=vendor.id if vendor else 0,
        vendor_name=vendor.name if vendor else "Vendor",
        status=session.status,
        current_round=session.current_round,
        current_price=session.current_price,
        current_delivery_days=session.current_delivery_days,
        events=events_out,
        vendor_state=vendor_state_out,
        escalations=escalations_out,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.get("", response_model=List[VendorNegotiationSessionOut])
@router.get("/", response_model=List[VendorNegotiationSessionOut])
def get_vendor_negotiations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.name == current_user.department)
        .first()
    )
    if not vendor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor profile not found or access denied")
    if not vendor:
        return []

    sessions = (
        db.query(models.NegotiationSession)
        .join(models.VendorBid)
        .filter(models.VendorBid.vendor_id == vendor.id)
        .order_by(models.NegotiationSession.id.desc())
        .all()
    )

    return [_format_vendor_session(s, vendor, db) for s in sessions]


@router.get("/{session_id}", response_model=VendorNegotiationSessionOut)
def get_vendor_negotiation_detail(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.name == current_user.department)
        .first()
    )
    if not vendor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor profile not found or access denied")

    session = (
        db.query(models.NegotiationSession)
        .filter(models.NegotiationSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Negotiation session not found")

    bid = session.vendor_bid
    if vendor and bid and bid.vendor_id != vendor.id:
        raise HTTPException(status_code=403, detail="Access denied to this negotiation session")

    return _format_vendor_session(session, vendor, db)


@router.post("/{session_id}/escalation", response_model=VendorNegotiationSessionOut)
def action_vendor_escalation(
    session_id: int,
    action: NegotiationEscalationAction,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.name == current_user.department)
        .first()
    )
    if not vendor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor profile not found or access denied")

    session = (
        db.query(models.NegotiationSession)
        .filter(models.NegotiationSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Negotiation session not found")

    bid = session.vendor_bid
    if vendor and bid and bid.vendor_id != vendor.id:
        raise HTTPException(status_code=403, detail="Access denied to this negotiation session")

    escalation = (
        db.query(models.NegotiationEscalation)
        .filter(
            models.NegotiationEscalation.negotiation_session_id == session_id,
            models.NegotiationEscalation.role == "VENDOR",
        )
        .order_by(models.NegotiationEscalation.id.desc())
        .first()
    )
    if not escalation:
        # Fallback to latest pending escalation
        escalation = (
            db.query(models.NegotiationEscalation)
            .filter(models.NegotiationEscalation.negotiation_session_id == session_id)
            .order_by(models.NegotiationEscalation.id.desc())
            .first()
        )
    if not escalation:
        raise HTTPException(status_code=404, detail="No escalation found for this session")

    vendor_state = (
        db.query(models.VendorNegotiationState)
        .filter(models.VendorNegotiationState.negotiation_session_id == session.id)
        .first()
    )

    if action.decision == "APPROVE":
        escalation.status = "APPROVED"
        escalation.comment = action.comment or "Commercial concession approved by vendor authority."
        escalation.actioned_at = datetime.utcnow()

        # Update vendor private floor
        if vendor_state and escalation.requested_price:
            if escalation.requested_price < vendor_state.absolute_minimum_price:
                vendor_state.absolute_minimum_price = float(escalation.requested_price)
        if vendor_state and escalation.requested_delivery_days:
            if escalation.requested_delivery_days < vendor_state.feasible_delivery:
                vendor_state.feasible_delivery = int(escalation.requested_delivery_days)

        # Audit Event 1: HUMAN_VENDOR_APPROVAL
        db.add(
            models.NegotiationEvent(
                negotiation_session_id=session.id,
                round=session.current_round,
                speaker_role="VENDOR_HUMAN",
                event_type="HUMAN_VENDOR_APPROVAL",
                price=escalation.requested_price,
                delivery_days=escalation.requested_delivery_days,
                message=action.comment or "Vendor commercial authority approved concession.",
            )
        )
        # Audit Event 2: HUMAN_OVERRIDE
        db.add(
            models.NegotiationEvent(
                negotiation_session_id=session.id,
                round=session.current_round,
                speaker_role="VENDOR_HUMAN",
                event_type="HUMAN_OVERRIDE",
                price=escalation.requested_price,
                delivery_days=escalation.requested_delivery_days,
                message=f"Vendor floor override applied for session #{session.id}.",
            )
        )
        session.status = "RESUMED"
        db.flush()

        # Resume bilateral negotiation: Vendor Agent can now accept the government offer!
        pr = bid.purchase_request
        gov_state_rec = (
            db.query(models.GovNegotiationState)
            .filter(models.GovNegotiationState.negotiation_session_id == session.id)
            .first()
        )
        existing_events = (
            db.query(models.NegotiationEvent)
            .filter(models.NegotiationEvent.negotiation_session_id == session.id)
            .order_by(models.NegotiationEvent.round.asc(), models.NegotiationEvent.id.asc())
            .all()
        )
        events_list = [
            {
                "round": e.round,
                "speaker_role": e.speaker_role,
                "event_type": e.event_type,
                "price": e.price,
                "delivery_days": e.delivery_days,
                "message": e.message,
            }
            for e in existing_events
        ]

        initial_state: GraphNegotiationState = {
            "shared": {
                "session_id": session.id,
                "pr_id": pr.id,
                "pr_title": pr.title,
                "item_description": pr.item_description or "",
                "quantity": pr.quantity,
                "current_round": session.current_round,
                "status": "RESUMED",
                "events": events_list,
            },
            "gov": {
                "target_price": gov_state_rec.target_price if gov_state_rec else float(session.current_price),
                "max_authorized_price": gov_state_rec.max_authorized_price if gov_state_rec else float(session.current_price),
                "target_delivery": gov_state_rec.target_delivery if gov_state_rec else int(session.current_delivery_days),
                "max_delivery": gov_state_rec.max_delivery if gov_state_rec else int(session.current_delivery_days) + 5,
                "strategy": gov_state_rec.strategy if gov_state_rec else "Standard",
            },
            "vendor": {
                "target_price": vendor_state.target_price if vendor_state else float(session.current_price),
                "absolute_minimum_price": vendor_state.absolute_minimum_price if vendor_state else float(escalation.requested_price or session.current_price),
                "feasible_delivery": vendor_state.feasible_delivery if vendor_state else int(escalation.requested_delivery_days or session.current_delivery_days),
                "strategy": "Commercial approval granted. Accept government proposal within approved limits.",
            },
            "next_actor": "VENDOR_AGENT",
        }

        final_state = run_bilateral_negotiation(initial_state)

        last_price = float(session.current_price)
        last_days = int(session.current_delivery_days)
        new_events = final_state["shared"]["events"][len(existing_events):]
        for ev in new_events:
            ev_price = ev.get("price")
            ev_days = ev.get("delivery_days")
            if ev_price is not None:
                last_price = float(ev_price)
            if ev_days is not None:
                last_days = int(ev_days)

            event_rec = models.NegotiationEvent(
                negotiation_session_id=session.id,
                round=int(ev.get("round", session.current_round)),
                speaker_role=str(ev.get("speaker_role", "SYSTEM")),
                event_type=str(ev.get("event_type", "OFFER")),
                price=float(ev_price) if ev_price is not None else None,
                delivery_days=int(ev_days) if ev_days is not None else None,
                message=str(ev.get("message", "")),
            )
            db.add(event_rec)
            db.flush()

        raw_status = final_state["shared"].get("status", "ACCEPTED")
        if raw_status in ["ACCEPTED", "ACCEPT"]:
            final_status = "ACCEPTED"
            action = "ACCEPT"
            bid.quoted_price = last_price
            bid.delivery_days = last_days
        elif raw_status == "PENDING_GOV_APPROVAL":
            final_status = "PENDING_GOV_APPROVAL"
            action = "ESCALATE"
            db.add(
                models.NegotiationEscalation(
                    negotiation_session_id=session.id,
                    role="GOVERNMENT",
                    reason=f"Proposal of ₹{last_price:,.2f} requires government review.",
                    requested_price=last_price,
                    requested_delivery_days=last_days,
                    status="PENDING",
                )
            )
        else:
            final_status = "NEGOTIATING"
            action = "CONTINUE"

        session.status = final_status
        session.current_round = final_state["shared"].get("current_round", session.current_round)
        session.current_price = last_price
        session.current_delivery_days = last_days

        db.add(
            models.PolicyDecision(
                negotiation_session_id=session.id,
                role="VENDOR",
                round=session.current_round,
                evaluated_price=last_price,
                evaluated_delivery_days=last_days,
                decision=action,
                rule_triggered=f"Vendor resumed outcome: {final_status}",
                threshold_value=str(vendor_state.absolute_minimum_price if vendor_state else last_price),
                actual_value=str(last_price),
            )
        )
    else:
        escalation.status = "REJECTED"
        escalation.comment = action.comment or "Commercial concession declined by vendor authority."
        escalation.actioned_at = datetime.utcnow()
        session.status = "REJECTED"

        db.add(
            models.NegotiationEvent(
                negotiation_session_id=session.id,
                round=session.current_round,
                speaker_role="VENDOR_HUMAN",
                event_type="HUMAN_REJECTION",
                price=session.current_price,
                delivery_days=session.current_delivery_days,
                message=action.comment or "Vendor authority declined terms.",
            )
        )

    db.commit()
    db.refresh(session)
    return _format_vendor_session(session, vendor, db)


@router.post("/{session_id}/counter", response_model=VendorNegotiationSessionOut)
def counter_vendor_negotiation(
    session_id: int,
    body: NegotiationCounterRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.name == current_user.department)
        .first()
    )
    if not vendor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor profile not found or access denied")

    session = (
        db.query(models.NegotiationSession)
        .filter(models.NegotiationSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Negotiation session not found")

    bid = session.vendor_bid
    if vendor and bid and bid.vendor_id != vendor.id:
        raise HTTPException(status_code=403, detail="Access denied to this negotiation session")

    pr = bid.purchase_request
    gov_state_rec = (
        db.query(models.GovNegotiationState)
        .filter(models.GovNegotiationState.negotiation_session_id == session.id)
        .first()
    )
    vendor_state = (
        db.query(models.VendorNegotiationState)
        .filter(models.VendorNegotiationState.negotiation_session_id == session.id)
        .first()
    )

    # 1. Action any pending vendor escalation
    pending_esc = (
        db.query(models.NegotiationEscalation)
        .filter(
            models.NegotiationEscalation.negotiation_session_id == session_id,
            models.NegotiationEscalation.role == "VENDOR",
            models.NegotiationEscalation.status == "PENDING",
        )
        .first()
    )
    if pending_esc:
        pending_esc.status = "APPROVED"
        pending_esc.comment = f"Resolved via manual vendor counteroffer: ₹{body.price:,.2f}"
        pending_esc.actioned_at = datetime.utcnow()

    # 2. Adjust vendor private floor if counteroffer is below current floor (override)
    if vendor_state and body.price < vendor_state.absolute_minimum_price:
        vendor_state.absolute_minimum_price = float(body.price)
        db.add(
            models.NegotiationEvent(
                negotiation_session_id=session.id,
                round=session.current_round,
                speaker_role="VENDOR_HUMAN",
                event_type="HUMAN_OVERRIDE",
                price=body.price,
                delivery_days=body.delivery_days,
                message="Vendor authority minimum floor lowered for manual counteroffer.",
            )
        )

    # 3. Record HUMAN_VENDOR_COUNTER event
    human_event = models.NegotiationEvent(
        negotiation_session_id=session.id,
        round=session.current_round,
        speaker_role="VENDOR_HUMAN",
        event_type="HUMAN_VENDOR_COUNTER",
        price=float(body.price),
        delivery_days=int(body.delivery_days),
        message=body.message or f"Vendor human authority counteroffer: ₹{body.price:,.2f} ({body.delivery_days} days).",
    )
    db.add(human_event)
    session.current_price = float(body.price)
    session.current_delivery_days = int(body.delivery_days)
    session.status = "NEGOTIATING"
    db.flush()

    # 4. Reconstruct history for bilateral continuation
    existing_events = (
        db.query(models.NegotiationEvent)
        .filter(models.NegotiationEvent.negotiation_session_id == session.id)
        .order_by(models.NegotiationEvent.round.asc(), models.NegotiationEvent.id.asc())
        .all()
    )
    events_list = [
        {
            "round": e.round,
            "speaker_role": e.speaker_role,
            "event_type": e.event_type,
            "price": e.price,
            "delivery_days": e.delivery_days,
            "message": e.message,
        }
        for e in existing_events
    ]

    initial_state: GraphNegotiationState = {
        "shared": {
            "session_id": session.id,
            "pr_id": pr.id,
            "pr_title": pr.title,
            "item_description": pr.item_description or "",
            "quantity": pr.quantity,
            "current_round": session.current_round,
            "status": "NEGOTIATING",
            "events": events_list,
        },
        "gov": {
            "target_price": gov_state_rec.target_price if gov_state_rec else float(body.price),
            "max_authorized_price": gov_state_rec.max_authorized_price if gov_state_rec else float(pr.estimated_budget),
            "target_delivery": gov_state_rec.target_delivery if gov_state_rec else int(body.delivery_days),
            "max_delivery": gov_state_rec.max_delivery if gov_state_rec else int(body.delivery_days) + 5,
            "strategy": gov_state_rec.strategy if gov_state_rec else "Maximize savings within budget limit.",
        },
        "vendor": {
            "target_price": vendor_state.target_price if vendor_state else float(body.price),
            "absolute_minimum_price": vendor_state.absolute_minimum_price if vendor_state else float(body.price),
            "feasible_delivery": vendor_state.feasible_delivery if vendor_state else int(body.delivery_days),
            "strategy": "Manual counter submitted by vendor authority.",
        },
        "next_actor": "GOV_AGENT",  # Vendor human countered -> Government Agent responds!
    }

    final_state = run_bilateral_negotiation(initial_state)

    last_price = float(body.price)
    last_days = int(body.delivery_days)
    new_events = final_state["shared"]["events"][len(existing_events):]
    for ev in new_events:
        ev_price = ev.get("price")
        ev_days = ev.get("delivery_days")
        if ev_price is not None:
            last_price = float(ev_price)
        if ev_days is not None:
            last_days = int(ev_days)

        event_rec = models.NegotiationEvent(
            negotiation_session_id=session.id,
            round=int(ev.get("round", session.current_round)),
            speaker_role=str(ev.get("speaker_role", "SYSTEM")),
            event_type=str(ev.get("event_type", "OFFER")),
            price=float(ev_price) if ev_price is not None else None,
            delivery_days=int(ev_days) if ev_days is not None else None,
            message=str(ev.get("message", "")),
        )
        db.add(event_rec)
        db.flush()

    raw_status = final_state["shared"].get("status", "NEGOTIATING")
    if raw_status in ["ACCEPTED", "ACCEPT"]:
        final_status = "ACCEPTED"
        action = "ACCEPT"
        bid.quoted_price = last_price
        bid.delivery_days = last_days
    elif raw_status in ["PENDING_GOV_APPROVAL", "ESCALATED", "ESCALATE"]:
        final_status = "PENDING_GOV_APPROVAL"
        action = "ESCALATE"
        db.add(
            models.NegotiationEscalation(
                negotiation_session_id=session.id,
                role="GOVERNMENT",
                reason=f"Vendor human counteroffer of ₹{last_price:,.2f} ({last_days} days) exceeds authorized budget ceiling.",
                requested_price=last_price,
                requested_delivery_days=last_days,
                status="PENDING",
            )
        )
    elif raw_status == "PENDING_VENDOR_APPROVAL":
        final_status = "PENDING_VENDOR_APPROVAL"
        action = "ESCALATE"
        db.add(
            models.NegotiationEscalation(
                negotiation_session_id=session.id,
                role="VENDOR",
                reason=f"Counter-response of ₹{last_price:,.2f} ({last_days} days) crosses vendor commercial limits.",
                requested_price=last_price,
                requested_delivery_days=last_days,
                status="PENDING",
            )
        )
    elif raw_status in ["REJECTED", "REJECT"]:
        final_status = "REJECTED"
        action = "REJECT"
    else:
        final_status = "NEGOTIATING"
        action = "CONTINUE"

    session.status = final_status
    session.current_round = final_state["shared"].get("current_round", session.current_round)
    session.current_price = last_price
    session.current_delivery_days = last_days

    db.add(
        models.PolicyDecision(
            negotiation_session_id=session.id,
            role="VENDOR",
            round=session.current_round,
            evaluated_price=last_price,
            evaluated_delivery_days=last_days,
            decision=action,
            rule_triggered=f"Vendor manual counter outcome: {final_status}",
            threshold_value=str(vendor_state.absolute_minimum_price if vendor_state else last_price),
            actual_value=str(last_price),
        )
    )
    db.commit()
    db.refresh(session)
    return _format_vendor_session(session, vendor, db)


@router.post("/{session_id}/resume", response_model=VendorNegotiationSessionOut)
def resume_vendor_negotiation(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    vendor = (
        db.query(models.Vendor)
        .filter(models.Vendor.name == current_user.department)
        .first()
    )
    if not vendor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor profile not found or access denied")

    session = (
        db.query(models.NegotiationSession)
        .filter(models.NegotiationSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Negotiation session not found")

    bid = session.vendor_bid
    if vendor and bid and bid.vendor_id != vendor.id:
        raise HTTPException(status_code=403, detail="Access denied to this negotiation session")

    # Delegate to action_vendor_escalation with APPROVE if pending escalation
    return action_vendor_escalation(
        session_id=session_id,
        action=NegotiationEscalationAction(decision="APPROVE", comment="Resumed by vendor authority"),
        db=db,
        current_user=current_user,
    )
