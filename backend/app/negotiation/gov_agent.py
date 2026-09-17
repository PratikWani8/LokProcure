import time
import os
import json
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types

from app.negotiation.state import GraphNegotiationState
from app.negotiation.prompts import get_gov_system_prompt
from app.negotiation.policy import check_gov_policy

load_dotenv()
logger = logging.getLogger("negotiation.gov_agent")
_gemini_exhausted_until = 0.0


def run_gov_agent(state: GraphNegotiationState) -> GraphNegotiationState:
    """
    Government Procurement AI Agent.
    Protects budget limits and ensures fast delivery compliance.
    Employs Gemini LLM with safe deterministic fallback on API issues.
    """
    shared = state["shared"]
    gov = state["gov"]
    current_round = shared["current_round"]

    # Maximum rounds limit
    if current_round >= 5:
        state["next_actor"] = "END"
        if shared.get("status") not in ["ACCEPTED", "PENDING_GOV_APPROVAL", "PENDING_VENDOR_APPROVAL", "REJECTED"]:
            shared["status"] = "NEGOTIATING"
        return state

    # Locate last vendor proposal (either from VENDOR_AGENT or VENDOR_HUMAN)
    last_vendor_event = None
    for ev in reversed(shared["events"]):
        if ev.get("speaker_role") in ["VENDOR_AGENT", "VENDOR_HUMAN", "HUMAN_VENDOR", "VENDOR"]:
            last_vendor_event = ev
            break

    result = None
    api_key = os.getenv("GEMINI_API_KEY")

    global _gemini_exhausted_until
    if api_key and time.time() > _gemini_exhausted_until:
        try:
            client = genai.Client(api_key=api_key)
            prompt = get_gov_system_prompt(shared, gov)
            response = client.models.generate_content(
                model="models/gemini-3.6-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3,
                ),
            )
            if response and response.text:
                result = json.loads(response.text)
        except Exception as exc:
            if "429" in str(exc) or "RESOURCE_EXHAUSTED" in str(exc):
                _gemini_exhausted_until = time.time() + 60.0
            logger.warning(f"Gov agent Gemini call failed, using deterministic fallback: {exc}")
            result = None

    # Deterministic fallback logic if LLM failed or returned invalid response
    if not result or not isinstance(result, dict):
        if not last_vendor_event:
            # Round 0 Opening Bid: Offer slightly below target or at target
            event_type = "OFFER"
            offered_price = round(gov["target_price"], 2)
            offered_days = int(gov["target_delivery"])
            message = f"Opening bilateral offer: Proposing ₹{offered_price:,.2f} with delivery in {offered_days} days."
        else:
            v_price = float(last_vendor_event.get("price", gov["target_price"]))
            v_days = int(last_vendor_event.get("delivery_days", gov["target_delivery"]))

            has_gov_approval = any(e.get("event_type") in ["HUMAN_GOV_APPROVAL", "HUMAN_OVERRIDE"] for e in shared["events"])
            if (v_price <= gov["target_price"] * 1.05 or has_gov_approval) and v_price <= gov["max_authorized_price"] and v_days <= gov["max_delivery"]:
                event_type = "ACCEPT"
                offered_price = v_price
                offered_days = v_days
                message = f"Executive approval granted: Accepting vendor offer of ₹{v_price:,.2f} ({v_days} days)." if has_gov_approval else f"Agreement reached: Accepting vendor offer of ₹{v_price:,.2f} ({v_days} days)."
            elif v_price <= gov["max_authorized_price"]:
                event_type = "OFFER"
                offered_price = round(max(gov["target_price"], v_price * 0.95), 2)
                offered_days = min(v_days, gov["max_delivery"])
                message = f"Counter-offering ₹{offered_price:,.2f} with {offered_days} delivery days to meet department budget."
            else:
                event_type = "ESCALATE"
                offered_price = v_price
                offered_days = v_days
                # Crucial for privacy: Never leak private ceiling number in public event message
                message = f"Price ₹{v_price:,.2f} exceeds maximum authorized ceiling for this procurement. Escalating to procurement lead."

        result = {
            "event_type": event_type,
            "price": offered_price,
            "delivery_days": offered_days,
            "message": message,
        }

    event_type = result.get("event_type", "OFFER")
    price = result.get("price")
    days = result.get("delivery_days")
    message = result.get("message", "")

    if price is not None:
        price = float(price)
    if days is not None:
        days = int(days)

    # Enforce deterministic policy boundary check
    if event_type in ["OFFER", "ACCEPT"] and price is not None and days is not None:
        policy_res = check_gov_policy(price, days, gov)
        if not policy_res.is_authorized:
            event_type = "ESCALATE"
            message = f"Internal Policy Exception: Proposal exceeds Government authority boundary."

    shared["events"].append({
        "round": current_round,
        "speaker_role": "GOV_AGENT",
        "event_type": event_type,
        "price": price,
        "delivery_days": days,
        "message": message,
    })

    if event_type == "ACCEPT":
        state["next_actor"] = "END"
        shared["status"] = "ACCEPTED"
    elif event_type == "ESCALATE":
        state["next_actor"] = "END"
        shared["status"] = "PENDING_GOV_APPROVAL"
    elif event_type == "REJECT":
        state["next_actor"] = "END"
        shared["status"] = "REJECTED"
    elif current_round >= 4:
        state["next_actor"] = "END"
        shared["status"] = "NEGOTIATING"
    else:
        state["next_actor"] = "VENDOR_AGENT"
        shared["status"] = "NEGOTIATING"

    return state
