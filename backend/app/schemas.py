from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# --- USER & AUTHENTICATION SCHEMAS ---
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    department: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[UserOut] = None


class TokenData(BaseModel):
    email: Optional[str] = None


# --- VENDOR SCHEMAS ---
class VendorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    pricing_tier: str
    reliability_score: float
    avg_delivery_days: int


class VendorBidOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vendor_id: int
    pr_id: int
    quoted_price: float
    delivery_days: int
    notes: Optional[str] = None
    bid_score: float
    vendor: Optional[VendorOut] = None


class ScoreBreakdown(BaseModel):
    price_score: float
    delivery_score: float
    reliability_score: float
    history_score: float
    nearshoring_bonus: float
    total_score: float
    price_variance_pct: float


class VendorRecommendation(BaseModel):
    bid_id: int
    vendor_id: int
    vendor_name: str
    pricing_tier: str
    contact_email: Optional[str] = ""
    quoted_price: float
    original_quoted_price: Optional[float] = None
    estimated_budget: float
    delivery_days: int
    original_delivery_days: Optional[int] = None
    avg_delivery_days: Optional[int] = 5
    reliability_score: float
    history_score_raw: float
    notes: Optional[str] = None
    scores: ScoreBreakdown
    rank: Optional[int] = 0
    bid_score: Optional[float] = None
    is_local_vendor: Optional[bool] = False
    is_incubator: Optional[bool] = False
    local_proximity_km: Optional[float] = 15.0
    negotiation_transcript: Optional[List[Dict[str, Any]]] = None


# --- COMPLIANCE SCHEMAS ---
class ViolationItem(BaseModel):
    rule_name: str
    explanation: str
    severity: str = Field(default="Medium", pattern="^(Low|Medium|High)$")


class ComplianceCheckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pr_id: int
    compliant: bool
    violations: List[ViolationItem] = []
    violations_json: Optional[str] = "[]"
    required_action: str = ""
    checked_at: datetime


# --- APPROVAL WORKFLOW SCHEMAS ---
class ApprovalWorkflowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pr_id: int
    approver_id: Optional[int] = None
    triggered_rule: str
    status: str
    comment: Optional[str] = None
    created_at: datetime
    actioned_at: Optional[datetime] = None
    approver: Optional[UserOut] = None


class ApprovalActionRequest(BaseModel):
    action: Optional[str] = None
    decision: Optional[Literal["APPROVE", "REJECT"]] = None
    comment: Optional[str] = None
    vendor_id: Optional[int] = None


# --- PURCHASE ORDER SCHEMAS ---
class PurchaseOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pr_id: int
    vendor_id: int
    po_number: str
    total_amount: float
    status: str
    pdf_url: str
    netsuite_internal_id: Optional[str] = "NS-REC-10482"
    netsuite_sync_status: Optional[str] = "Synced (SuiteTalk REST)"
    netsuite_subsidiary: Optional[str] = "TechCorp Americas (Sub 01)"
    netsuite_gl_account: Optional[str] = "6010 - Direct Sourcing & Material CapEx"
    created_at: datetime
    vendor: Optional[VendorOut] = None


class NetSuiteSyncResponse(BaseModel):
    po_id: int
    po_number: str
    netsuite_internal_id: str
    sync_status: str
    subsidiary: str
    gl_account: str
    currency: str = "INR"
    three_way_match_status: str
    suitetalk_rest_payload: Dict[str, Any]
    last_synced_at: datetime


class PurchaseOrderStatusUpdate(BaseModel):
    new_status: str = Field(..., pattern="^(Sent|Acknowledged|Delivered)$")


# --- PURCHASE REQUEST SCHEMAS ---
class PurchaseRequestCreate(BaseModel):
    title: str
    item_description: str
    category: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    urgency: str = Field(default="Medium", pattern="^(Low|Medium|High|Critical)$")
    department: str
    estimated_budget: float = Field(..., gt=0)


class PurchaseRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    item_description: str
    category: Optional[str] = None
    quantity: int
    urgency: str
    status: str
    requester_id: int
    department: str
    estimated_budget: float
    created_at: datetime
    requester: Optional[UserOut] = None
    bids_count: int = 0
    assigned_approval_rule: Optional[str] = None
    assigned_approver_role: Optional[str] = None
    approval_status: Optional[str] = None
    po_number: Optional[str] = None
    winning_vendor: Optional[str] = None
    compliance: Optional[ComplianceCheckOut] = None


class PurchaseRequestDetail(PurchaseRequestOut):
    bids: List[VendorBidOut] = []
    approval_workflows: List[ApprovalWorkflowOut] = []
    purchase_order: Optional[PurchaseOrderOut] = None


# --- AI AUDIT SCHEMAS ---
class RiskAssessment(BaseModel):
    risk_level: str  # Low | Moderate | High
    risk_factors: List[str]
    mitigation_advice: str


class AIAuditResponse(BaseModel):
    recommendation: Optional[str] = None
    confidence: Optional[float] = None
    risk_assessment: Optional[Any] = None
    reasoning: Optional[str] = None
    pr_id: Optional[int] = None
    selected_vendor_name: Optional[str] = None
    confidence_score: Optional[float] = None
    executive_summary: Optional[str] = None
    key_advantages: Optional[List[str]] = None
    net_savings_estimate: Optional[float] = None
    is_live_gemini: bool = False


# --- DASHBOARD SCHEMAS ---
class SpendByDepartment(BaseModel):
    department: str
    amount: float
    pr_count: int


class VendorScoreSummary(BaseModel):
    vendor_name: str
    pricing_tier: str
    reliability: float
    avg_delivery_days: int
    overall_score: float


class MonthlySpendItem(BaseModel):
    month: str
    spend: float
    count: int


class DashboardMetrics(BaseModel):
    total_prs: Optional[int] = None
    total_requests: Optional[int] = None
    pending_approvals: int = 0
    approved_requests: Optional[int] = None
    total_approved_pos: Optional[int] = None
    total_spend: float = 0.0
    avg_vendor_reliability: Optional[float] = None
    three_way_match_verified: Optional[int] = None
    spend_by_department: List[SpendByDepartment] = []
    vendor_performance_matrix: List[VendorScoreSummary] = []
    monthly_spend_flow: List[MonthlySpendItem] = []
    recent_prs: List[PurchaseRequestOut] = []


class GenericMessageResponse(BaseModel):
    message: str
    data: Optional[Dict[str, Any]] = None


# --- AUTONOMOUS NEGOTIATION SCHEMAS ---
class NegotiationTurnOut(BaseModel):
    round: int
    speaker: str
    speaker_role: str
    message: str
    offered_price: float
    offered_days: int
    is_fallback: bool = False


class NegotiationEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    round: int
    speaker_role: str
    event_type: str
    price: Optional[float] = None
    delivery_days: Optional[int] = None
    message: Optional[str] = None
    created_at: datetime


class NegotiationSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vendor_bid_id: int
    session_number: int
    status: str
    current_round: int
    current_price: float
    current_delivery_days: int
    version: int
    created_at: datetime
    updated_at: datetime


class GovNegotiationStateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_price: float
    max_authorized_price: float
    target_delivery: int
    max_delivery: int
    strategy: str


class VendorNegotiationStateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_price: float
    absolute_minimum_price: float
    feasible_delivery: int
    strategy: str


class PolicyDecisionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    negotiation_session_id: int
    role: str
    round: int
    evaluated_price: float
    evaluated_delivery_days: int
    decision: str
    rule_triggered: str
    threshold_value: Optional[str] = None
    actual_value: Optional[str] = None
    created_at: datetime


class NegotiationEscalationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    negotiation_session_id: int
    role: str
    reason: str
    requested_price: Optional[float] = None
    requested_delivery_days: Optional[int] = None
    status: str
    approver_id: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime
    actioned_at: Optional[datetime] = None


class NegotiationEscalationAction(BaseModel):
    decision: Literal["APPROVE", "REJECT"]
    comment: Optional[str] = None


class VendorNegotiationResultOut(BaseModel):
    vendor_id: int
    vendor_name: str
    final_price: float
    final_days: int
    savings: float
    savings_percentage: float
    status: str
    action: Literal["CONTINUE", "ACCEPT", "REJECT", "ESCALATE"]
    is_fallback: bool = False
    events: List[NegotiationEventOut] = []
    session_id: Optional[int] = None
    escalation_id: Optional[int] = None


class NegotiationResponse(BaseModel):
    pr_id: int
    pr_title: Optional[str] = None
    estimated_budget: Optional[float] = None
    total_initial_spend: Optional[float] = None
    total_negotiated_spend: Optional[float] = None
    total_savings: Optional[float] = None
    total_savings_pct: Optional[float] = None
    top_vendor_id: Optional[int] = None
    top_vendor_name: Optional[str] = None
    results: List[VendorNegotiationResultOut] = []
    recommendations: Optional[List[VendorRecommendation]] = None
    completed: bool = False
    escalated: bool = False
    sessions: List[NegotiationSessionOut] = []


class GovNegotiationHistoryResponse(BaseModel):
    session: NegotiationSessionOut
    gov_state: Optional[GovNegotiationStateOut] = None
    events: List[NegotiationEventOut] = []
    decisions: List[PolicyDecisionOut] = []
    escalations: List[NegotiationEscalationOut] = []


class VendorNegotiationHistoryResponse(BaseModel):
    session: NegotiationSessionOut
    vendor_state: Optional[VendorNegotiationStateOut] = None
    events: List[NegotiationEventOut] = []
    decisions: List[PolicyDecisionOut] = []
    escalations: List[NegotiationEscalationOut] = []


class NegotiationCounterRequest(BaseModel):
    price: float
    delivery_days: int
    message: Optional[str] = None


class NegotiationResumeRequest(BaseModel):
    price: Optional[float] = None
    delivery_days: Optional[int] = None
    comment: Optional[str] = None


NegotiationHistoryResponse = GovNegotiationHistoryResponse

class RecommendationsResponse(BaseModel):
    pr_id: Optional[int] = None
    pr_title: Optional[str] = None
    estimated_budget: Optional[float] = None
    urgency: Optional[str] = None
    department: Optional[str] = None
    recommendations: List[VendorRecommendation]
