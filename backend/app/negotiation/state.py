from typing import List, Literal, TypedDict, Optional, Union
from pydantic import BaseModel

class NegotiationTurn(TypedDict, total=False):
    round: int
    speaker_role: str  # GOV_AGENT, VENDOR_AGENT, GOV_HUMAN, VENDOR_HUMAN, HUMAN_GOV, HUMAN_VENDOR, SYSTEM, POLICY_ENGINE
    event_type: str    # OFFER, COUNTER, ACCEPT, REJECT, ESCALATE, HUMAN_GOV_COUNTER, HUMAN_VENDOR_COUNTER, POLICY_ESCALATION, HUMAN_GOV_APPROVAL, HUMAN_VENDOR_APPROVAL, HUMAN_REJECTION, HUMAN_OVERRIDE, NEGOTIATION_RESUMED
    price: Optional[float]
    delivery_days: Optional[int]
    message: str

class SharedState(TypedDict):
    session_id: int
    pr_id: int
    pr_title: str
    item_description: str
    quantity: int
    current_round: int
    status: str  # INITIATED, NEGOTIATING, PENDING_GOV_APPROVAL, PENDING_VENDOR_APPROVAL, ACCEPTED, REJECTED, ESCALATED, RESUMED
    events: List[NegotiationTurn]

class GovAgentState(TypedDict):
    target_price: float
    max_authorized_price: float
    target_delivery: int
    max_delivery: int
    strategy: str

class VendorAgentState(TypedDict):
    target_price: float
    absolute_minimum_price: float
    feasible_delivery: int
    strategy: str

class GraphNegotiationState(TypedDict):
    shared: SharedState
    gov: GovAgentState
    vendor: VendorAgentState
    next_actor: str  # GOV_AGENT, VENDOR_AGENT, END
