
from typing import Optional, Literal
from pydantic import BaseModel
from app.negotiation.state import GraphNegotiationState

class PolicyResult(BaseModel):
    is_authorized: bool
    reason: str
    action: Literal["ALLOW", "ESCALATE", "REJECT"]

def check_gov_policy(price: float, days: int, gov_state: dict) -> PolicyResult:
    if price > gov_state["max_authorized_price"]:
        return PolicyResult(is_authorized=False, reason="Price exceeds max authority.", action="ESCALATE")
    if days > gov_state["max_delivery"]:
        return PolicyResult(is_authorized=False, reason="Delivery exceeds max authority.", action="ESCALATE")
    return PolicyResult(is_authorized=True, reason="Within limits.", action="ALLOW")

def check_vendor_policy(price: float, days: int, vendor_state: dict) -> PolicyResult:
    if price < vendor_state["absolute_minimum_price"]:
        return PolicyResult(is_authorized=False, reason="Price is below absolute minimum.", action="ESCALATE")
    if days < vendor_state["feasible_delivery"]:
        return PolicyResult(is_authorized=False, reason="Delivery is faster than feasible.", action="ESCALATE")
    return PolicyResult(is_authorized=True, reason="Within limits.", action="ALLOW")
