import time
import os
import json
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types

from app.negotiation.state import GraphNegotiationState
from app.negotiation.prompts import get_vendor_system_prompt
from app.negotiation.policy import check_vendor_policy

load_dotenv()
logger = logging.getLogger("negotiation.vendor_agent")
_gemini_exhausted_until = 0.0


def run_vendor_agent(state: GraphNegotiationState) -> GraphNegotiationState:
    """
    Vendor Sales AI Agent.
    Protects profit margin and delivery feasibility.
    Employs Gemini LLM with safe deterministic fallback on API issues.
    """
    shared = state["shared"]
    vendor = state["vendor"]
    current_round = shared["current_round"]

    if current_round >= 5:
        state["next_actor"] = "END"
        if shared.get("status") not in ["ACCEPTED", "PENDING_GOV_APPROVAL", "PENDING_VENDOR_APPROVAL", "REJECTED"]:
            shared["status"] = "NEGOTIATING"
        return state

    # Locate last government proposal (either from GOV_AGENT or GOV_HUMAN)
    last_gov_event = None
    for ev in reversed(shared["events"]):
        if ev.get("speaker_role") in ["GOV_AGENT", "GOV_HUMAN", "HUMAN_GOV", "GOVERNMENT"]:
            last_gov_event = ev
            break

    result = None
    api_key = os.getenv("GEMINI_API_KEY")

    global _gemini_exhausted_until
    if api_key and time.time() > _gemini_exhausted_until:
        try:
            client = genai.Client(api_key=api_key)
            prompt = get_vendor_system_prompt(shared, vendor)
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
            logger.warning(f"Vendor agent Gemini call failed, using deterministic fallback: {exc}")
            result = None

    # Deterministic fallback logic if LLM failed or returned invalid response
    if not result or not isinstance(result, dict):
        g_price = float(last_gov_event.get("price") if last_gov_event else vendor["target_price"])
        g_days = int(last_gov_event.get("delivery_days") if last_gov_event else vendor["feasible_delivery"])

        if g_price >= vendor["target_price"]:
            event_type = "ACCEPT"
            offered_price = g_price
            offered_days = g_days
            message = f"Quotation accepted at government proposed terms: ₹{g_price:,.2f} in {g_days} days."
        elif g_price >= vendor["absolute_minimum_price"]:
            has_vendor_approval = any(e.get("event_type") in ["HUMAN_VENDOR_APPROVAL", "HUMAN_OVERRIDE"] for e in shared["events"])
            if has_vendor_approval or current_round >= 2 or abs(g_price - vendor["absolute_minimum_price"]) < 100:
                event_type = "ACCEPT"
                offered_price = g_price
                offered_days = max(g_days, int(vendor["feasible_delivery"]))
                message = f"Commercial concession approved: Conceding to government offer of ₹{g_price:,.2f}." if has_vendor_approval else f"Agreement reached: Conceding to government offer of ₹{g_price:,.2f}."
            else:
                event_type = "OFFER"
                offered_price = round((g_price + vendor["target_price"]) / 2.0, 2)
                offered_days = max(g_days, int(vendor["feasible_delivery"]))
                message = f"Counter-offering ₹{offered_price:,.2f} with production scheduling of {offered_days} days."
        else:
            # Below absolute minimum floor or delivery faster than feasible
            if current_round >= 1 or (last_gov_event and last_gov_event.get("speaker_role") in ["GOV_HUMAN", "HUMAN_GOV"]):
                event_type = "ESCALATE"
                offered_price = g_price
                offered_days = g_days
                # Crucial for privacy: Never leak private floor in public event message
                message = f"Government proposal of ₹{g_price:,.2f} ({g_days} days) is below commercial authorization limits. Escalating to vendor management for concession review."
            else:
                event_type = "OFFER"
                offered_price = round(max(vendor["absolute_minimum_price"], vendor["target_price"] * 0.95), 2)
                offered_days = int(vendor["feasible_delivery"])
                message = f"Proposed terms require concession. Best possible counter-offer is ₹{offered_price:,.2f} at {offered_days} delivery days."

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
        policy_res = check_vendor_policy(price, days, vendor)
        if not policy_res.is_authorized:
            event_type = "ESCALATE"
            message = f"Internal Policy Exception: Proposal crosses vendor commercial boundary."

    shared["events"].append({
        "round": current_round,
        "speaker_role": "VENDOR_AGENT",
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
        shared["status"] = "PENDING_VENDOR_APPROVAL"
    elif event_type == "REJECT":
        state["next_actor"] = "END"
        shared["status"] = "REJECTED"
    elif current_round >= 4:
        state["next_actor"] = "END"
        shared["status"] = "NEGOTIATING"
    else:
        state["next_actor"] = "GOV_AGENT"
        shared["status"] = "NEGOTIATING"
        shared["current_round"] += 1

    return state
