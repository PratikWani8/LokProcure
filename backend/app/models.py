import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)

    purchase_requests = relationship(
        "PurchaseRequest",
        back_populates="requester",
        foreign_keys="PurchaseRequest.requester_id",
    )
    approvals = relationship(
        "ApprovalWorkflow",
        back_populates="approver",
        foreign_keys="ApprovalWorkflow.approver_id",
    )


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    contact_email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    avg_delivery_days = Column(Integer, default=5, nullable=False)
    reliability_score = Column(Float, default=90.0, nullable=False)
    pricing_tier = Column(String(50), nullable=False)
    specialties = Column(Text, nullable=True)
    status = Column(String(50), default="Active", nullable=False)
    is_local_vendor = Column(Boolean, default=False, nullable=True)
    is_incubator = Column(Boolean, default=False, nullable=True)
    local_proximity_km = Column(Float, default=15.0, nullable=True)

    bids = relationship(
        "VendorBid",
        back_populates="vendor",
        cascade="all, delete-orphan",
    )
    performances = relationship(
        "VendorPerformance",
        back_populates="vendor",
        cascade="all, delete-orphan",
    )
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")


class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=True)
    item_description = Column(Text, nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    urgency = Column(String(50), default="Medium", nullable=False)
    status = Column(String(50), default="Pending Approval", nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department = Column(String(100), nullable=False)
    estimated_budget = Column(Float, default=0.0, nullable=False)
    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )

    requester = relationship(
        "User",
        back_populates="purchase_requests",
        foreign_keys=[requester_id],
    )
    bids = relationship(
        "VendorBid",
        back_populates="purchase_request",
        cascade="all, delete-orphan",
    )
    approval_workflows = relationship(
        "ApprovalWorkflow",
        back_populates="purchase_request",
        cascade="all, delete-orphan",
    )
    purchase_order = relationship(
        "PurchaseOrder",
        back_populates="purchase_request",
        uselist=False,
    )
    compliance_check = relationship(
        "ComplianceCheck",
        back_populates="purchase_request",
        uselist=False,
        cascade="all, delete-orphan",
    )


class VendorBid(Base):
    __tablename__ = "vendor_bids"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    pr_id = Column(Integer, ForeignKey("purchase_requests.id"), nullable=False)
    quoted_price = Column(Float, nullable=False)
    original_quoted_price = Column(Float, nullable=True)
    delivery_days = Column(Integer, nullable=False)
    original_delivery_days = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    bid_score = Column(Float, default=0.0, nullable=False)
    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )

    vendor = relationship("Vendor", back_populates="bids")
    purchase_request = relationship("PurchaseRequest", back_populates="bids")
    negotiation_sessions = relationship(
        "NegotiationSession",
        back_populates="vendor_bid",
        cascade="all, delete-orphan",
        order_by="NegotiationSession.session_number",
    )

class ApprovalWorkflow(Base):
    __tablename__ = "approval_workflows"

    id = Column(Integer, primary_key=True, index=True)
    pr_id = Column(Integer, ForeignKey("purchase_requests.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    triggered_rule = Column(String(255), nullable=False)
    status = Column(String(50), default="Pending", nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )
    actioned_at = Column(DateTime, nullable=True)

    purchase_request = relationship(
        "PurchaseRequest",
        back_populates="approval_workflows",
    )
    approver = relationship(
        "User",
        back_populates="approvals",
        foreign_keys=[approver_id],
    )


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    pr_id = Column(Integer, ForeignKey("purchase_requests.id"), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    po_number = Column(String(100), unique=True, index=True, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String(50), default="Sent", nullable=False)
    pdf_url = Column(String(255), nullable=False)
    netsuite_internal_id = Column(
        String(50),
        default="NS-REC-10482",
        nullable=True,
    )
    netsuite_sync_status = Column(
        String(50),
        default="Synced (SuiteTalk REST)",
        nullable=True,
    )
    netsuite_subsidiary = Column(
        String(100),
        default="TechCorp Americas (Sub 01)",
        nullable=True,
    )
    netsuite_gl_account = Column(
        String(100),
        default="6010 - Direct Sourcing & Material CapEx",
        nullable=True,
    )
    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )

    purchase_request = relationship(
        "PurchaseRequest",
        back_populates="purchase_order",
    )
    vendor = relationship("Vendor", back_populates="purchase_orders")


class VendorPerformance(Base):
    __tablename__ = "vendor_performances"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    metric_type = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    recorded_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )
    notes = Column(Text, nullable=True)

    vendor = relationship("Vendor", back_populates="performances")


class ComplianceCheck(Base):
    __tablename__ = "compliance_checks"

    id = Column(Integer, primary_key=True, index=True)
    pr_id = Column(
        Integer,
        ForeignKey("purchase_requests.id"),
        unique=True,
        nullable=False,
    )
    compliant = Column(Boolean, default=True, nullable=False)
    violations_json = Column(Text, default="[]", nullable=False)
    required_action = Column(Text, default="", nullable=False)
    checked_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )

    purchase_request = relationship(
        "PurchaseRequest",
        back_populates="compliance_check",
    )


class NegotiationSession(Base):
    __tablename__ = "negotiation_sessions"
    __table_args__ = (
        UniqueConstraint("vendor_bid_id", "session_number", name="uq_vendor_bid_session"),
    )

    id = Column(Integer, primary_key=True, index=True)
    vendor_bid_id = Column(Integer, ForeignKey("vendor_bids.id"), nullable=False, index=True)
    session_number = Column(Integer, nullable=False)
    status = Column(String(50), default="INITIATED", nullable=False)
    current_round = Column(Integer, default=0, nullable=False)
    current_price = Column(Float, nullable=False)
    current_delivery_days = Column(Integer, nullable=False)
    version = Column(Integer, default=1, nullable=False)

    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    vendor_bid = relationship("VendorBid", back_populates="negotiation_sessions")
    gov_state = relationship("GovNegotiationState", back_populates="negotiation_session", uselist=False, cascade="all, delete-orphan")
    vendor_state = relationship("VendorNegotiationState", back_populates="negotiation_session", uselist=False, cascade="all, delete-orphan")
    events = relationship("NegotiationEvent", back_populates="negotiation_session", cascade="all, delete-orphan")
    policy_decisions = relationship("PolicyDecision", back_populates="negotiation_session", cascade="all, delete-orphan")
    escalations = relationship("NegotiationEscalation", back_populates="negotiation_session", cascade="all, delete-orphan")


class GovNegotiationState(Base):
    __tablename__ = "gov_negotiation_states"

    id = Column(Integer, primary_key=True, index=True)
    negotiation_session_id = Column(Integer, ForeignKey("negotiation_sessions.id"), nullable=False, unique=True, index=True)
    target_price = Column(Float, nullable=False)
    max_authorized_price = Column(Float, nullable=False)
    target_delivery = Column(Integer, nullable=False)
    max_delivery = Column(Integer, nullable=False)
    strategy = Column(String(50), default="Standard", nullable=False)

    negotiation_session = relationship("NegotiationSession", back_populates="gov_state")


class VendorNegotiationState(Base):
    __tablename__ = "vendor_negotiation_states"

    id = Column(Integer, primary_key=True, index=True)
    negotiation_session_id = Column(Integer, ForeignKey("negotiation_sessions.id"), nullable=False, unique=True, index=True)
    target_price = Column(Float, nullable=False)
    absolute_minimum_price = Column(Float, nullable=False)
    feasible_delivery = Column(Integer, nullable=False)
    strategy = Column(String(50), default="Standard", nullable=False)

    negotiation_session = relationship("NegotiationSession", back_populates="vendor_state")


class NegotiationEvent(Base):
    __tablename__ = "negotiation_events"

    id = Column(Integer, primary_key=True, index=True)
    negotiation_session_id = Column(Integer, ForeignKey("negotiation_sessions.id"), nullable=False, index=True)
    round = Column(Integer, nullable=False)
    speaker_role = Column(String(50), nullable=False)
    event_type = Column(String(50), nullable=False)
    price = Column(Float, nullable=True)
    delivery_days = Column(Integer, nullable=True)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    negotiation_session = relationship("NegotiationSession", back_populates="events")


class PolicyDecision(Base):
    __tablename__ = "policy_decisions"

    id = Column(Integer, primary_key=True, index=True)
    negotiation_session_id = Column(Integer, ForeignKey("negotiation_sessions.id"), nullable=False, index=True)
    role = Column(String(50), nullable=False, default="GOVERNMENT")
    round = Column(Integer, nullable=False)

    evaluated_price = Column(Float, nullable=False)
    evaluated_delivery_days = Column(Integer, nullable=False)

    decision = Column(String(50), nullable=False)
    rule_triggered = Column(String(255), nullable=False)
    threshold_value = Column(String(100), nullable=True)
    actual_value = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    negotiation_session = relationship("NegotiationSession", back_populates="policy_decisions")


class NegotiationEscalation(Base):
    __tablename__ = "negotiation_escalations"

    id = Column(Integer, primary_key=True, index=True)
    negotiation_session_id = Column(Integer, ForeignKey("negotiation_sessions.id"), nullable=False, index=True)
    role = Column(String(50), nullable=False, default="GOVERNMENT")
    
    reason = Column(Text, nullable=False)
    requested_price = Column(Float, nullable=True)
    requested_delivery_days = Column(Integer, nullable=True)

    status = Column(String(50), default="PENDING", nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    comment = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    actioned_at = Column(DateTime, nullable=True)

    negotiation_session = relationship("NegotiationSession", back_populates="escalations")
    approver = relationship("User", foreign_keys=[approver_id])
