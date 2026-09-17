import time

NEGOTIATION_LOCKS = {}
NEGOTIATION_COOLDOWN = 10
import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_gov_role
from app.database import get_db
from app.models import (
    GovNegotiationState,
    NegotiationEscalation,
    NegotiationEvent,
    NegotiationSession,
    PolicyDecision,
    PurchaseRequest,
    Vendor,
    VendorBid,
    VendorNegotiationState,
    VendorPerformance,
)
from app.negotiation.graph import run_bilateral_negotiation
from app.negotiation.state import GraphNegotiationState
from app.schemas import (
    NegotiationCounterRequest,
    NegotiationEscalationAction,
    NegotiationEventOut,
    NegotiationHistoryResponse,
    NegotiationResponse,
    RecommendationsResponse,
    ScoreBreakdown,
    VendorRecommendation,
    VendorNegotiationResultOut,
    VendorOut,
    VendorRecommendation,
)

logger = logging.getLogger("routers.vendors")

# Router prefix is "/vendors" so app.main can include it at /api/gov and /api without doubling
router = APIRouter(
    dependencies=[Depends(require_gov_role)],
    prefix="/vendors",
    tags=["Gov - Vendors"],
)


def calculate_bid_score(bid: VendorBid, vendor: Vendor, budget: float) -> float:
    price_score = 0.0
    reliability_score = max(0.0, min(100.0, float(vendor.reliability_score or 0)))

    if budget > 0:
        price_score = max(0.0, min(100.0, (budget / max(bid.quoted_price, 1)) * 100))
    else:
        price_score = max(0.0, min(100.0, 100 - (bid.quoted_price / max(bid.quoted_price, 1) * 50)))

    avg_days = vendor.avg_delivery_days or bid.delivery_days
    delivery_score = max(
        0.0,
        min(100.0, 100 - ((bid.delivery_days - avg_days) * 5)),
    )

    return round(
        price_score * 0.50
        + delivery_score * 0.20
        + reliability_score * 0.30,
        2,
    )


def compute_vendor_score(
    vendor: Vendor,
    quoted_price: float,
    bid_days: int,
    budget: float,
    performances: Optional[List[VendorPerformance]] = None,
) -> Dict[str, Any]:
    """
    Computes vendor score breakdown (out of 100).
    Preserves exact compatibility for dashboard and purchase-request callers.
    """
    safe_budget = max(budget, 1.0)
    price_variance_ratio = (quoted_price - safe_budget) / safe_budget
    raw_price_score = 30.0 * (1.0 - price_variance_ratio)
    price_score = min(30.0, max(0.0, raw_price_score))
    price_variance_pct = round(price_variance_ratio * 100.0, 2)

    avg_days = max(1, getattr(vendor, "avg_delivery_days", 1) or 1)
    raw_delivery_score = 25.0 * (1.0 - (bid_days - avg_days) / avg_days)
    delivery_score = min(25.0, max(5.0, raw_delivery_score))

    rel_score = float(getattr(vendor, "reliability_score", 0.0) or 0.0)
    rel_pct = max(0.0, min(100.0, rel_score))
    reliability_score = 25.0 * (rel_pct / 100.0)

    is_incubator = bool(getattr(vendor, "is_incubator", False) or getattr(vendor, "is_local_vendor", False))
    nearshoring_bonus = 0.0

    if performances:
        mean_perf = sum(p.value for p in performances) / len(performances)
    elif is_incubator:
        mean_perf = 80.0
        nearshoring_bonus = 3.0
    else:
        mean_perf = rel_score

    mean_perf = max(0.0, min(100.0, mean_perf))
    history_score = 20.0 * (mean_perf / 100.0)

    total_score = round(
        min(100.0, price_score + delivery_score + reliability_score + history_score + nearshoring_bonus),
        2,
    )

    history_score_raw = round(history_score * 5.0, 1)
    scores_dict = {
        "price_score": round(price_score, 1),
        "delivery_score": round(delivery_score, 1),
        "reliability_score": round(reliability_score, 1),
        "history_score": round(history_score, 1),
        "nearshoring_bonus": round(nearshoring_bonus, 1),
        "total_score": total_score,
        "price_variance_pct": price_variance_pct,
    }
    return {
        **scores_dict,
        "scores": scores_dict,
        "history_score_raw": history_score_raw,
    }


def build_recommendations(db: Session, pr: PurchaseRequest) -> List[VendorRecommendation]:
    bids = db.query(VendorBid).filter(VendorBid.pr_id == pr.id).all()
    recommendations = []

    for bid in bids:
        vendor = db.query(Vendor).filter(Vendor.id == bid.vendor_id).first()
        if not vendor:
            continue

        perfs = db.query(VendorPerformance).filter(VendorPerformance.vendor_id == vendor.id).all()
        scores = compute_vendor_score(
            vendor=vendor,
            quoted_price=bid.quoted_price,
            bid_days=bid.delivery_days,
            budget=pr.estimated_budget,
            performances=perfs,
        )

        history_raw = scores.get("history_score_raw", round(scores["history_score"] * 5.0, 1))

        transcript_list = None
        if getattr(bid, "negotiation_transcript", None):
            try:
                transcript_list = json.loads(bid.negotiation_transcript)
            except Exception:
                transcript_list = None

        recommendations.append(
            VendorRecommendation(
                bid_id=bid.id,
                vendor_id=vendor.id,
                vendor_name=vendor.name,
                pricing_tier=vendor.pricing_tier,
                contact_email=vendor.contact_email or "",
                quoted_price=bid.quoted_price,
                original_quoted_price=getattr(bid, "original_quoted_price", None),
                estimated_budget=pr.estimated_budget,
                delivery_days=bid.delivery_days,
                original_delivery_days=getattr(bid, "original_delivery_days", None),
                avg_delivery_days=vendor.avg_delivery_days,
                reliability_score=vendor.reliability_score or 0.0,
                history_score_raw=history_raw,
                notes=bid.notes,
                scores=ScoreBreakdown(**scores["scores"]),
                rank=0,
                bid_score=scores["total_score"],
                is_incubator=bool(getattr(vendor, "is_incubator", False)),
                is_local_vendor=bool(getattr(vendor, "is_local_vendor", False)),
                local_proximity_km=getattr(vendor, "local_proximity_km", 15.0),
                negotiation_transcript=transcript_list,
            )
        )

    recommendations.sort(key=lambda r: r.scores.total_score, reverse=True)
    for idx, rec in enumerate(recommendations, start=1):
        rec.rank = idx
    return recommendations


@router.get("", response_model=List[VendorOut])
def get_vendors(db: Session = Depends(get_db)):
    return db.query(Vendor).all()


@router.get("/recommendations/{pr_id}", response_model=RecommendationsResponse)
def get_vendor_recommendations(
    pr_id: int,
    db: Session = Depends(get_db),
):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    recommendations = build_recommendations(db, pr)
    return RecommendationsResponse(
        pr_id=pr.id,
        pr_title=pr.title,
        estimated_budget=pr.estimated_budget,
        urgency=pr.urgency,
        department=pr.department,
        recommendations=recommendations,
    )


@router.post("/negotiate/{pr_id}", response_model=NegotiationResponse)
def run_autonomous_negotiation_endpoint(
    pr_id: int,
    db: Session = Depends(get_db),
):
    current_time = time.time()
    lock_info = NEGOTIATION_LOCKS.get(pr_id)
    if lock_info:
        status_state, timestamp = lock_info
        if status_state == 'RUNNING':
            raise HTTPException(status_code=409, detail='A negotiation for this PR is already in progress.')
        elif status_state == 'COOLDOWN' and current_time - timestamp < NEGOTIATION_COOLDOWN:
            raise HTTPException(status_code=409, detail='A negotiation for this PR recently completed. Please wait.')

    NEGOTIATION_LOCKS[pr_id] = ('RUNNING', current_time)
    try:
        pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
        if not pr:
            raise HTTPException(status_code=404, detail="Purchase request not found")

        bids = (
            db.query(VendorBid)
            .filter(VendorBid.pr_id == pr_id)
            .order_by(VendorBid.bid_score.desc())
            .all()
        )
        if not bids:
            raise HTTPException(status_code=404, detail="No vendor bids found")

        candidates = []
        for bid in bids:
            active_session = (
                db.query(NegotiationSession)
                .filter(
                    NegotiationSession.vendor_bid_id == bid.id,
                    NegotiationSession.status.in_(
                        ["INITIATED", "NEGOTIATING", "ESCALATED", "PENDING_APPROVAL", "RESUMED", "PENDING_GOV_APPROVAL", "PENDING_VENDOR_APPROVAL"]
                    ),
                )
                .first()
            )
            if active_session:
                continue

            vendor = db.query(Vendor).filter(Vendor.id == bid.vendor_id).first()
            if not vendor:
                continue

            candidates.append((bid, vendor))
            if len(candidates) == 3:
                break

        if not candidates:
            raise HTTPException(
                status_code=409,
                detail="All eligible vendor bids already have active negotiation sessions",
            )

        results: List[VendorNegotiationResultOut] = []
        sessions: List[NegotiationSession] = []
        any_escalated = False
        all_completed = True

        total_initial_spend = 0.0
        total_negotiated_spend = 0.0

        for bid, vendor in candidates:
            if bid.original_quoted_price is None:
                bid.original_quoted_price = bid.quoted_price
            if bid.original_delivery_days is None:
                bid.original_delivery_days = bid.delivery_days

            session_count = (
                db.query(NegotiationSession)
                .filter(NegotiationSession.vendor_bid_id == bid.id)
                .count()
            )

            # 1. Persist NegotiationSession using only existing models.py fields
            session = NegotiationSession(
                vendor_bid_id=bid.id,
                session_number=session_count + 1,
                status="INITIATED",
                current_round=0,
                current_price=bid.quoted_price,
                current_delivery_days=bid.delivery_days,
                version=1,
            )
            db.add(session)
            db.flush()

            # 2. Persist GovNegotiationState
            budget = float(pr.estimated_budget)
            gov_target = round(min(float(bid.quoted_price) * 0.85, budget * 0.95), 2)
            gov_max = budget
            gov_target_days = max(1, int(bid.delivery_days) - 3)
            gov_max_days = int(bid.delivery_days) + 5

            gov_state_record = GovNegotiationState(
                negotiation_session_id=session.id,
                target_price=gov_target,
                max_authorized_price=gov_max,
                target_delivery=gov_target_days,
                max_delivery=gov_max_days,
                strategy="Maximize cost savings within department budget ceiling",
            )
            db.add(gov_state_record)

            # 3. Persist VendorNegotiationState
            vendor_target = float(bid.quoted_price)
            vendor_floor = round(float(bid.quoted_price) * 0.80, 2)
            vendor_fastest = max(1, int(vendor.avg_delivery_days or bid.delivery_days))

            vendor_state_record = VendorNegotiationState(
                negotiation_session_id=session.id,
                target_price=vendor_target,
                absolute_minimum_price=vendor_floor,
                feasible_delivery=vendor_fastest,
                strategy="Protect profit margin and guarantee feasible delivery timeline",
            )
            db.add(vendor_state_record)
            db.flush()

            # 4. Construct bilateral graph state
            initial_state: GraphNegotiationState = {
                "shared": {
                    "session_id": session.id,
                    "pr_id": pr.id,
                    "pr_title": pr.title,
                    "item_description": pr.item_description or "",
                    "quantity": pr.quantity,
                    "current_round": 0,
                    "status": "INITIATED",
                    "events": [],
                },
                "gov": {
                    "target_price": gov_target,
                    "max_authorized_price": gov_max,
                    "target_delivery": gov_target_days,
                    "max_delivery": gov_max_days,
                    "strategy": gov_state_record.strategy,
                },
                "vendor": {
                    "target_price": vendor_target,
                    "absolute_minimum_price": vendor_floor,
                    "feasible_delivery": vendor_fastest,
                    "strategy": vendor_state_record.strategy,
                },
                "next_actor": "GOV_AGENT",
            }

            # 5. Execute LangGraph bilateral negotiation
            final_state = run_bilateral_negotiation(initial_state)

            # 6. Persist NegotiationEvent records with exact model fields
            event_outs: List[NegotiationEventOut] = []
            last_price = float(bid.quoted_price)
            last_days = int(bid.delivery_days)

            for ev in final_state["shared"]["events"]:
                ev_price = ev.get("price")
                ev_days = ev.get("delivery_days")
                if ev_price is not None:
                    last_price = float(ev_price)
                if ev_days is not None:
                    last_days = int(ev_days)

                event_record = NegotiationEvent(
                    negotiation_session_id=session.id,
                    round=int(ev.get("round", 0)),
                    speaker_role=str(ev.get("speaker_role", "SYSTEM")),
                    event_type=str(ev.get("event_type", "OFFER")),
                    price=float(ev_price) if ev_price is not None else None,
                    delivery_days=int(ev_days) if ev_days is not None else None,
                    message=str(ev.get("message", "")),
                )
                db.add(event_record)
                db.flush()

                event_outs.append(
                    NegotiationEventOut(
                        id=event_record.id,
                        round=event_record.round,
                        speaker_role=event_record.speaker_role,
                        event_type=event_record.event_type,
                        price=event_record.price,
                        delivery_days=event_record.delivery_days,
                        message=event_record.message,
                        created_at=event_record.created_at,
                    )
                )

            # 7. Update session status and record policy decisions
            raw_status = final_state["shared"].get("status", "NEGOTIATING")
            if raw_status in ["ACCEPTED", "ACCEPT"]:
                final_status = "ACCEPTED"
                action = "ACCEPT"
            elif raw_status in ["PENDING_GOV_APPROVAL", "ESCALATED", "ESCALATE"]:
                final_status = "PENDING_GOV_APPROVAL"
                action = "ESCALATE"
            elif raw_status == "PENDING_VENDOR_APPROVAL":
                final_status = "PENDING_VENDOR_APPROVAL"
                action = "ESCALATE"
            elif raw_status in ["REJECTED", "REJECT"]:
                final_status = "REJECTED"
                action = "REJECT"
            else:
                final_status = "NEGOTIATING"
                action = "CONTINUE"

            session.status = final_status
            session.current_round = final_state["shared"].get("current_round", 0)
            session.current_price = last_price
            session.current_delivery_days = last_days

            esc_role = "VENDOR" if final_status == "PENDING_VENDOR_APPROVAL" else "GOVERNMENT"
            rule_desc = "VENDOR_MIN_PRICE_FLOOR" if final_status == "PENDING_VENDOR_APPROVAL" else "GOV_MAX_PRICE_CEILING"

            policy_decision = PolicyDecision(
                negotiation_session_id=session.id,
                role=esc_role if action == "ESCALATE" else "GOVERNMENT",
                round=session.current_round,
                evaluated_price=last_price,
                evaluated_delivery_days=last_days,
                decision=action,
                rule_triggered=f"{rule_desc if action == 'ESCALATE' else 'Bilateral policy outcome'}: {final_status}",
                threshold_value=str(gov_max if esc_role == 'GOVERNMENT' else vendor_floor),
                actual_value=str(last_price),
            )
            db.add(policy_decision)

            escalation_id = None
            if action == "ESCALATE":
                any_escalated = True
                all_completed = False
                esc_reason = (
                    f"Government proposal of ₹{last_price:,.2f} ({last_days} days) crosses vendor commercial authorization boundary."
                    if final_status == "PENDING_VENDOR_APPROVAL"
                    else f"Vendor proposal of ₹{last_price:,.2f} ({last_days} days) exceeds government procurement ceiling."
                )
                escalation = NegotiationEscalation(
                    negotiation_session_id=session.id,
                    role=esc_role,
                    reason=esc_reason,
                    requested_price=last_price,
                    requested_delivery_days=last_days,
                    status="PENDING",
                )
                db.add(escalation)
                db.flush()
                escalation_id = escalation.id
            elif action == "ACCEPT":
                bid.quoted_price = last_price
                bid.delivery_days = last_days
                bid.bid_score = calculate_bid_score(bid, vendor, pr.estimated_budget)
            elif action == "CONTINUE":
                all_completed = False

            initial_p = float(bid.original_quoted_price)
            savings = max(0.0, initial_p - float(last_price))
            savings_pct = (savings / initial_p * 100.0) if initial_p > 0 else 0.0

            total_initial_spend += initial_p
            total_negotiated_spend += float(last_price)

            results.append(
                VendorNegotiationResultOut(
                    vendor_id=vendor.id,
                    vendor_name=vendor.name,
                    final_price=round(last_price, 2),
                    final_days=int(last_days),
                    savings=round(savings, 2),
                    savings_percentage=round(savings_pct, 2),
                    status=session.status,
                    action=action,
                    is_fallback=False,
                    events=event_outs,
                    session_id=session.id,
                    escalation_id=escalation_id,
                )
            )
            sessions.append(session)

        db.commit()

        total_net_savings = max(0.0, total_initial_spend - total_negotiated_spend)
        total_savings_pct = (total_net_savings / total_initial_spend * 100.0) if total_initial_spend > 0 else 0.0

        # Determine top vendor from updated recommendations
        fresh_recs = build_recommendations(db, pr)
        top_v_id = fresh_recs[0].vendor_id if fresh_recs else None
        top_v_name = fresh_recs[0].vendor_name if fresh_recs else None

        return NegotiationResponse(
            pr_id=pr.id,
            pr_title=pr.title,
            estimated_budget=pr.estimated_budget,
            total_initial_spend=round(total_initial_spend, 2),
            total_negotiated_spend=round(total_negotiated_spend, 2),
            total_savings=round(total_net_savings, 2),
            total_savings_pct=round(total_savings_pct, 2),
            top_vendor_id=top_v_id,
            top_vendor_name=top_v_name,
            results=results,
            recommendations=fresh_recs,
            completed=all_completed and not any_escalated,
            escalated=any_escalated,
            sessions=sessions,
        )


    finally:
        NEGOTIATION_LOCKS[pr_id] = ('COOLDOWN', time.time())

@router.get("/negotiations")
def list_all_negotiations(db: Session = Depends(get_db)):
    sessions = db.query(NegotiationSession).order_by(NegotiationSession.id.desc()).all()
    out = []
    for s in sessions:
        bid = db.query(VendorBid).filter(VendorBid.id == s.vendor_bid_id).first()
        pr_id = bid.pr_id if bid else None
        pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first() if pr_id else None
        vendor = db.query(Vendor).filter(Vendor.id == bid.vendor_id).first() if bid else None
        event_count = db.query(NegotiationEvent).filter(NegotiationEvent.negotiation_session_id == s.id).count()
        escalation = db.query(NegotiationEscalation).filter(NegotiationEscalation.negotiation_session_id == s.id).order_by(NegotiationEscalation.id.desc()).first()
        out.append({
            "id": s.id,
            "session_id": s.id,
            "purchase_request_id": pr_id,
            "pr_title": pr.title if pr else f"PR #{pr_id}",
            "vendor_id": vendor.id if vendor else None,
            "vendor_name": vendor.name if vendor else "Vendor",
            "status": s.status,
            "current_round": s.current_round,
            "current_price": s.current_price,
            "current_delivery_days": s.current_delivery_days,
            "event_count": event_count,
            "escalation_id": escalation.id if escalation and escalation.status == "PENDING" else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        })
    return out


@router.get(
    "/negotiation/{session_id}",
    response_model=NegotiationHistoryResponse,
)
def get_negotiation_history(
    session_id: int,
    db: Session = Depends(get_db),
):
    session = (
        db.query(NegotiationSession)
        .filter(NegotiationSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Negotiation session not found")

    gov_state = (
        db.query(GovNegotiationState)
        .filter(GovNegotiationState.negotiation_session_id == session.id)
        .first()
    )

    events = (
        db.query(NegotiationEvent)
        .filter(NegotiationEvent.negotiation_session_id == session.id)
        .order_by(NegotiationEvent.round.asc(), NegotiationEvent.id.asc())
        .all()
    )

    decisions = (
        db.query(PolicyDecision)
        .filter(PolicyDecision.negotiation_session_id == session.id)
        .order_by(PolicyDecision.round.asc())
        .all()
    )

    # Sanitize vendor decisions to prevent leaking vendor floor price
    for decision in decisions:
        if decision.role == "VENDOR":
            decision.threshold_value = None

    escalations = (
        db.query(NegotiationEscalation)
        .filter(NegotiationEscalation.negotiation_session_id == session.id)
        .all()
    )

    return NegotiationHistoryResponse(
        session=session,
        gov_state=gov_state,
        events=events,
        decisions=decisions,
        escalations=escalations,
    )


@router.post(
    "/negotiation/{session_id}/escalation",
)
def action_negotiation_escalation(
    session_id: int,
    action: NegotiationEscalationAction,
    db: Session = Depends(get_db),
):
    session = (
        db.query(NegotiationSession)
        .filter(NegotiationSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Negotiation session not found")

    escalation = (
        db.query(NegotiationEscalation)
        .filter(
            NegotiationEscalation.negotiation_session_id == session_id,
            NegotiationEscalation.role == "GOVERNMENT",
        )
        .order_by(NegotiationEscalation.id.desc())
        .first()
    )
    if not escalation:
        escalation = (
            db.query(NegotiationEscalation)
            .filter(NegotiationEscalation.negotiation_session_id == session_id)
            .order_by(NegotiationEscalation.id.desc())
            .first()
        )
    if not escalation:
        raise HTTPException(status_code=404, detail="No escalation found for this session")

    if action.decision == "APPROVE":
        escalation.status = "APPROVED"
        session.status = "RESUMED"

        # Modify Gov private authorization / ceiling
        gov_state = (
            db.query(GovNegotiationState)
            .filter(GovNegotiationState.negotiation_session_id == session.id)
            .first()
        )
        if gov_state:
            if escalation.requested_price and escalation.requested_price > gov_state.max_authorized_price:
                gov_state.max_authorized_price = float(escalation.requested_price)
            if escalation.requested_delivery_days and escalation.requested_delivery_days > gov_state.max_delivery:
                gov_state.max_delivery = int(escalation.requested_delivery_days)

        # Audit Event 1: HUMAN_GOV_APPROVAL
        db.add(
            NegotiationEvent(
                negotiation_session_id=session.id,
                round=session.current_round,
                speaker_role="GOV_HUMAN",
                event_type="HUMAN_GOV_APPROVAL",
                price=escalation.requested_price,
                delivery_days=escalation.requested_delivery_days,
                message=action.comment or "Government procurement authority approved escalation.",
            )
        )
        # Audit Event 2: HUMAN_OVERRIDE
        db.add(
            NegotiationEvent(
                negotiation_session_id=session.id,
                round=session.current_round,
                speaker_role="GOV_HUMAN",
                event_type="HUMAN_OVERRIDE",
                price=escalation.requested_price,
                delivery_days=escalation.requested_delivery_days,
                message=f"Government authority ceiling override applied for session #{session.id}.",
            )
        )
    else:
        escalation.status = "REJECTED"
        session.status = "REJECTED"
        db.add(
            NegotiationEvent(
                negotiation_session_id=session.id,
                round=session.current_round,
                speaker_role="GOV_HUMAN",
                event_type="HUMAN_REJECTION",
                price=session.current_price,
                delivery_days=session.current_delivery_days,
                message=action.comment or "Proposal rejected by government procurement authority.",
            )
        )

    escalation.comment = action.comment
    escalation.actioned_at = datetime.utcnow()
    db.commit()

    return {
        "session_id": session.id,
        "escalation_id": escalation.id,
        "status": escalation.status,
        "message": f"Negotiation escalation {action.decision.lower()}ed",
    }


@router.post(
    "/negotiation/{session_id}/counter",
    response_model=NegotiationResponse,
)
def counter_negotiation_endpoint(
    session_id: int,
    body: NegotiationCounterRequest,
    db: Session = Depends(get_db),
):
    session = (
        db.query(NegotiationSession)
        .filter(NegotiationSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Negotiation session not found")

    bid = db.query(VendorBid).filter(VendorBid.id == session.vendor_bid_id).first()
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == bid.pr_id).first()
    vendor = db.query(Vendor).filter(Vendor.id == bid.vendor_id).first()

    gov_state_rec = (
        db.query(GovNegotiationState)
        .filter(GovNegotiationState.negotiation_session_id == session.id)
        .first()
    )
    vendor_state_rec = (
        db.query(VendorNegotiationState)
        .filter(VendorNegotiationState.negotiation_session_id == session.id)
        .first()
    )

    # 1. Action any pending government escalation
    pending_esc = (
        db.query(NegotiationEscalation)
        .filter(
            NegotiationEscalation.negotiation_session_id == session_id,
            NegotiationEscalation.role == "GOVERNMENT",
            NegotiationEscalation.status == "PENDING",
        )
        .first()
    )
    if pending_esc:
        pending_esc.status = "APPROVED"
        pending_esc.comment = f"Resolved via manual government counteroffer: ₹{body.price:,.2f}"
        pending_esc.actioned_at = datetime.utcnow()

    # 2. Adjust Government private ceiling if counteroffer exceeds current ceiling (override)
    if gov_state_rec and body.price > gov_state_rec.max_authorized_price:
        gov_state_rec.max_authorized_price = float(body.price)
        db.add(
            NegotiationEvent(
                negotiation_session_id=session.id,
                round=session.current_round,
                speaker_role="GOV_HUMAN",
                event_type="HUMAN_OVERRIDE",
                price=body.price,
                delivery_days=body.delivery_days,
                message="Government authority budget ceiling updated to accommodate manual counteroffer.",
            )
        )

    # 3. Record HUMAN_GOV_COUNTER event
    human_event = NegotiationEvent(
        negotiation_session_id=session.id,
        round=session.current_round,
        speaker_role="GOV_HUMAN",
        event_type="HUMAN_GOV_COUNTER",
        price=float(body.price),
        delivery_days=int(body.delivery_days),
        message=body.message or f"Government human authority counteroffer: ₹{body.price:,.2f} ({body.delivery_days} days).",
    )
    db.add(human_event)
    session.current_price = float(body.price)
    session.current_delivery_days = int(body.delivery_days)
    session.status = "NEGOTIATING"
    db.flush()

    # 4. Reconstruct history for bilateral continuation
    existing_events = (
        db.query(NegotiationEvent)
        .filter(NegotiationEvent.negotiation_session_id == session.id)
        .order_by(NegotiationEvent.round.asc(), NegotiationEvent.id.asc())
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
            "max_authorized_price": gov_state_rec.max_authorized_price if gov_state_rec else float(body.price),
            "target_delivery": gov_state_rec.target_delivery if gov_state_rec else int(body.delivery_days),
            "max_delivery": gov_state_rec.max_delivery if gov_state_rec else int(body.delivery_days) + 5,
            "strategy": "Human counteroffer submitted. Conclude agreement.",
        },
        "vendor": {
            "target_price": vendor_state_rec.target_price if vendor_state_rec else float(bid.quoted_price),
            "absolute_minimum_price": vendor_state_rec.absolute_minimum_price if vendor_state_rec else float(bid.quoted_price) * 0.80,
            "feasible_delivery": vendor_state_rec.feasible_delivery if vendor_state_rec else int(bid.delivery_days),
            "strategy": vendor_state_rec.strategy if vendor_state_rec else "Protect margin and feasible delivery.",
        },
        "next_actor": "VENDOR_AGENT",  # Government human countered -> Vendor Agent responds!
    }

    final_state = run_bilateral_negotiation(initial_state)

    # Save newly generated events
    event_outs: List[NegotiationEventOut] = []
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

        event_rec = NegotiationEvent(
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
        bid.bid_score = calculate_bid_score(bid, vendor, pr.estimated_budget)
    elif raw_status == "PENDING_VENDOR_APPROVAL":
        final_status = "PENDING_VENDOR_APPROVAL"
        action = "ESCALATE"
        db.add(
            NegotiationEscalation(
                negotiation_session_id=session.id,
                role="VENDOR",
                reason=f"Government human counteroffer of ₹{last_price:,.2f} ({last_days} days) crosses vendor commercial limits.",
                requested_price=last_price,
                requested_delivery_days=last_days,
                status="PENDING",
            )
        )
    elif raw_status in ["PENDING_GOV_APPROVAL", "ESCALATED", "ESCALATE"]:
        final_status = "PENDING_GOV_APPROVAL"
        action = "ESCALATE"
        db.add(
            NegotiationEscalation(
                negotiation_session_id=session.id,
                role="GOVERNMENT",
                reason=f"Counter-response of ₹{last_price:,.2f} ({last_days} days) exceeds authorized budget ceiling.",
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
        PolicyDecision(
            negotiation_session_id=session.id,
            role="GOVERNMENT",
            round=session.current_round,
            evaluated_price=last_price,
            evaluated_delivery_days=last_days,
            decision=action,
            rule_triggered=f"Government manual counter outcome: {final_status}",
            threshold_value=str(gov_state_rec.max_authorized_price if gov_state_rec else last_price),
            actual_value=str(last_price),
        )
    )
    db.commit()

    all_events = (
        db.query(NegotiationEvent)
        .filter(NegotiationEvent.negotiation_session_id == session.id)
        .order_by(NegotiationEvent.round.asc(), NegotiationEvent.id.asc())
        .all()
    )
    for e in all_events:
        event_outs.append(
            NegotiationEventOut(
                id=e.id,
                round=e.round,
                speaker_role=e.speaker_role,
                event_type=e.event_type,
                price=e.price,
                delivery_days=e.delivery_days,
                message=e.message,
                created_at=e.created_at,
            )
        )

    initial_p = float(bid.original_quoted_price or bid.quoted_price)
    savings = max(0.0, initial_p - float(last_price))
    savings_pct = (savings / initial_p * 100.0) if initial_p > 0 else 0.0

    result_out = VendorNegotiationResultOut(
        vendor_id=vendor.id,
        vendor_name=vendor.name,
        final_price=round(last_price, 2),
        final_days=int(last_days),
        savings=round(savings, 2),
        savings_percentage=round(savings_pct, 2),
        status=session.status,
        action=action,
        is_fallback=False,
        events=event_outs,
        session_id=session.id,
        escalation_id=None,
    )

    fresh_recs = build_recommendations(db, pr)

    return NegotiationResponse(
        pr_id=pr.id,
        pr_title=pr.title,
        estimated_budget=pr.estimated_budget,
        total_initial_spend=round(initial_p, 2),
        total_negotiated_spend=round(last_price, 2),
        total_savings=round(savings, 2),
        total_savings_pct=round(savings_pct, 2),
        top_vendor_id=vendor.id,
        top_vendor_name=vendor.name,
        results=[result_out],
        recommendations=fresh_recs,
        completed=final_status == "ACCEPTED",
        escalated=final_status in ["PENDING_GOV_APPROVAL", "PENDING_VENDOR_APPROVAL", "PENDING_APPROVAL"],
        sessions=[session],
    )


@router.post(
    "/negotiation/{session_id}/resume",
    response_model=NegotiationResponse,
)
def resume_negotiation_endpoint(
    session_id: int,
    db: Session = Depends(get_db),
):
    session = (
        db.query(NegotiationSession)
        .filter(NegotiationSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Negotiation session not found")

    escalation = (
        db.query(NegotiationEscalation)
        .filter(
            NegotiationEscalation.negotiation_session_id == session_id,
            NegotiationEscalation.status == "APPROVED",
        )
        .order_by(NegotiationEscalation.id.desc())
        .first()
    )
    if not escalation:
        raise HTTPException(
            status_code=400,
            detail="Negotiation cannot resume without an approved escalation",
        )

    bid = db.query(VendorBid).filter(VendorBid.id == session.vendor_bid_id).first()
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == bid.pr_id).first()
    vendor = db.query(Vendor).filter(Vendor.id == bid.vendor_id).first()

    gov_state_rec = (
        db.query(GovNegotiationState)
        .filter(GovNegotiationState.negotiation_session_id == session.id)
        .first()
    )
    vendor_state_rec = (
        db.query(VendorNegotiationState)
        .filter(VendorNegotiationState.negotiation_session_id == session.id)
        .first()
    )

    # Reconstruct previous events
    existing_events = (
        db.query(NegotiationEvent)
        .filter(NegotiationEvent.negotiation_session_id == session.id)
        .order_by(NegotiationEvent.round.asc(), NegotiationEvent.id.asc())
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

    # Audit event for resume
    db.add(
        NegotiationEvent(
            negotiation_session_id=session.id,
            round=session.current_round,
            speaker_role="SYSTEM",
            event_type="NEGOTIATION_RESUMED",
            price=session.current_price,
            delivery_days=session.current_delivery_days,
            message="Negotiation resumed following supervisory approval.",
        )
    )
    db.flush()

    # Determine next actor from last commercial proposal speaker
    last_proposal = None
    for ev in reversed(existing_events):
        if ev.event_type in ["OFFER", "COUNTER", "AGENT_OFFER", "AGENT_COUNTER", "HUMAN_GOV_COUNTER", "HUMAN_VENDOR_COUNTER"]:
            last_proposal = ev
            break

    if last_proposal and ("VENDOR" in last_proposal.speaker_role):
        next_actor = "GOV_AGENT"
    else:
        next_actor = "VENDOR_AGENT"

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
            "max_authorized_price": gov_state_rec.max_authorized_price if gov_state_rec else float(escalation.requested_price or session.current_price),
            "target_delivery": gov_state_rec.target_delivery if gov_state_rec else int(session.current_delivery_days),
            "max_delivery": gov_state_rec.max_delivery if gov_state_rec else int(session.current_delivery_days) + 5,
            "strategy": "Supervisory approval granted. Conclude agreement within approved limits.",
        },
        "vendor": {
            "target_price": vendor_state_rec.target_price if vendor_state_rec else float(session.current_price),
            "absolute_minimum_price": vendor_state_rec.absolute_minimum_price if vendor_state_rec else float(session.current_price) * 0.85,
            "feasible_delivery": vendor_state_rec.feasible_delivery if vendor_state_rec else int(session.current_delivery_days),
            "strategy": vendor_state_rec.strategy if vendor_state_rec else "Conclude agreement reliably.",
        },
        "next_actor": next_actor,
    }

    final_state = run_bilateral_negotiation(initial_state)

    # Save newly generated events
    event_outs: List[NegotiationEventOut] = []
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

        event_rec = NegotiationEvent(
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
        bid.bid_score = calculate_bid_score(bid, vendor, pr.estimated_budget)
    elif raw_status == "PENDING_VENDOR_APPROVAL":
        final_status = "PENDING_VENDOR_APPROVAL"
        action = "ESCALATE"
    elif raw_status in ["PENDING_GOV_APPROVAL", "ESCALATED", "ESCALATE"]:
        final_status = "PENDING_GOV_APPROVAL"
        action = "ESCALATE"
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

    policy_decision = PolicyDecision(
        negotiation_session_id=session.id,
        role="GOVERNMENT",
        round=session.current_round,
        evaluated_price=last_price,
        evaluated_delivery_days=last_days,
        decision=action,
        rule_triggered=f"Bilateral resumed outcome: {final_status}",
        threshold_value=str(escalation.requested_price),
        actual_value=str(last_price),
    )
    db.add(policy_decision)
    db.commit()

    all_events = (
        db.query(NegotiationEvent)
        .filter(NegotiationEvent.negotiation_session_id == session.id)
        .order_by(NegotiationEvent.round.asc(), NegotiationEvent.id.asc())
        .all()
    )
    for e in all_events:
        event_outs.append(
            NegotiationEventOut(
                id=e.id,
                round=e.round,
                speaker_role=e.speaker_role,
                event_type=e.event_type,
                price=e.price,
                delivery_days=e.delivery_days,
                message=e.message,
                created_at=e.created_at,
            )
        )

    initial_p = float(bid.original_quoted_price or bid.quoted_price)
    savings = max(0.0, initial_p - float(last_price))
    savings_pct = (savings / initial_p * 100.0) if initial_p > 0 else 0.0

    result_out = VendorNegotiationResultOut(
        vendor_id=vendor.id,
        vendor_name=vendor.name,
        final_price=round(last_price, 2),
        final_days=int(last_days),
        savings=round(savings, 2),
        savings_percentage=round(savings_pct, 2),
        status=session.status,
        action=action,
        is_fallback=False,
        events=event_outs,
        session_id=session.id,
        escalation_id=None,
    )

    fresh_recs = build_recommendations(db, pr)

    return NegotiationResponse(
        pr_id=pr.id,
        pr_title=pr.title,
        estimated_budget=pr.estimated_budget,
        total_initial_spend=round(initial_p, 2),
        total_negotiated_spend=round(last_price, 2),
        total_savings=round(savings, 2),
        total_savings_pct=round(savings_pct, 2),
        top_vendor_id=vendor.id,
        top_vendor_name=vendor.name,
        results=[result_out],
        recommendations=fresh_recs,
        completed=final_status == "ACCEPTED",
        escalated=final_status in ["PENDING_GOV_APPROVAL", "PENDING_VENDOR_APPROVAL", "PENDING_APPROVAL"],
        sessions=[session],
    )
