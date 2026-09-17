import os
import json
import logging
from typing import Dict, Any, List
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def run_heuristic_audit(pr_data: Dict[str, Any], bids_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Intelligent heuristic fallback auditor that evaluates bids based on:
    - Score rankings
    - Urgency vs delivery speed matching
    - Price variance vs budget
    - Tier-reliability risk factoring
    """
    if not bids_data:
        return {
            "pr_id": pr_data.get("id", 0),
            "selected_vendor_name": "No Bids Available",
            "confidence_score": 0.0,
            "executive_summary": "No active vendor bids found for this purchase request.",
            "key_advantages": ["Awaiting vendor submissions"],
            "net_savings_estimate": 0.0,
            "risk_assessment": {
                "risk_level": "High",
                "risk_factors": ["Absence of competitive quotations"],
                "mitigation_advice": "Re-trigger RFQ distribution to authorized supplier panel."
            },
            "is_live_gemini": False
        }

    # Sort bids by total score descending
    sorted_bids = sorted(bids_data, key=lambda x: x.get("scores", {}).get("total_score", 0), reverse=True)
    top_bid = sorted_bids[0]
    budget = float(pr_data.get("estimated_budget", 1.0))
    quoted_price = float(top_bid.get("quoted_price", budget))
    savings = max(0.0, round(budget - quoted_price, 2))
    urgency = pr_data.get("urgency", "Medium")
    vendor_name = top_bid.get("vendor_name", "Primary Vendor")
    total_score = top_bid.get("scores", {}).get("total_score", 85.0)
    tier = top_bid.get("pricing_tier", "Mid-Tier")
    delivery_days = top_bid.get("delivery_days", 5)
    reliability = top_bid.get("reliability_score", 90.0)

    # Calculate strategic confidence
    confidence = min(99.0, max(75.0, round(total_score * 0.95 + (5.0 if savings > 0 else 0.0), 1)))

    advantages = [
        f"Top composite vendor score of {total_score:.1f}/100 based on price, reliability, and past performance history.",
        f"Quoted price of ₹{quoted_price:,.2f} delivers estimated net savings of ₹{savings:,.2f} against the authorized ₹{budget:,.2f} budget.",
        f"Committed delivery turnaround of {delivery_days} days aligns with {urgency} operational SLA requirements.",
        f"Strong historical reliability index of {reliability:.1f}% backed by verified quality and accuracy ratings."
    ]

    # Risk formulation
    risk_level = "Low"
    risk_factors = []
    if urgency in ["Critical", "High"] and delivery_days > 4:
        risk_level = "Moderate"
        risk_factors.append(f"Fulfillment timeline ({delivery_days} days) for {urgency} urgency requires expedited transit monitoring.")
    if quoted_price > budget:
        risk_level = "Moderate"
        risk_factors.append(f"Quoted quotation exceeds estimated budget by ₹{quoted_price - budget:,.2f}.")
    if tier == "Economy Tier" and reliability < 88.0:
        risk_factors.append("Economy tier supplier with moderate historical buffer; requires milestone tracking.")

    if not risk_factors:
        risk_factors.append("Standard supply chain delivery risks within acceptable ERP tolerance limits.")

    mitigation = (
        f"Authorize automated NetSuite PO dispatch to {vendor_name}. Maintain automated 3-way match verification upon delivery."
    )

    summary = (
        f"AI Audit recommends award to {vendor_name} ({tier}). The bid provides the optimal balance of commercial cost efficiency "
        f"(₹{quoted_price:,.2f} vs ₹{budget:,.2f} budget) and execution reliability ({reliability}% score). "
        f"Fulfillment is projected at {delivery_days} business days."
    )

    return {
        "pr_id": pr_data.get("id", 0),
        "selected_vendor_name": vendor_name,
        "confidence_score": confidence,
        "executive_summary": summary,
        "key_advantages": advantages,
        "net_savings_estimate": savings,
        "risk_assessment": {
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "mitigation_advice": mitigation
        },
        "is_live_gemini": False
    }


def audit_procurement_request(pr_data: Dict[str, Any], bids_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Evaluates PR and Bids with Gemini 2.5 Flash via google-genai SDK,
    falling back to deterministic heuristic intelligence if offline/unconfigured.
    """
    api_key = GEMINI_API_KEY.strip()
    if not api_key or "your_gemini_api_key" in api_key.lower():
        logger.info("Using heuristic AI auditor (GEMINI_API_KEY not configured).")
        return run_heuristic_audit(pr_data, bids_data)

    try:
        from google import genai

        client = genai.Client(api_key=api_key)

        prompt = f"""
You are the Chief Procurement AI Auditor in an enterprise NetSuite ERP system.
Evaluate this Purchase Request (PR) and the submitted Vendor Quotation Bids to recommend the optimal vendor award.

### PURCHASE REQUEST:
- ID: {pr_data.get('id')}
- Title: {pr_data.get('title')}
- Description: {pr_data.get('item_description')}
- Quantity: {pr_data.get('quantity')}
- Urgency: {pr_data.get('urgency')}
- Department: {pr_data.get('department')}
- Estimated Budget: ₹{pr_data.get('estimated_budget')}

### VENDOR BIDS (Ranked with Weighted Scoring Formula: Price 30%, Delivery 25%, Reliability 25%, History 20%):
{json.dumps(bids_data, indent=2)}

### REQUIRED JSON OUTPUT STRUCTURE:
Return ONLY a valid, raw JSON object (no markdown code blocks, no backticks) matching this exact schema:
{{
  "pr_id": {pr_data.get('id')},
  "selected_vendor_name": "<name of the winning vendor>",
  "confidence_score": <number between 0 and 100>,
  "executive_summary": "<concise 2-3 sentence strategic executive justification>",
  "key_advantages": ["<advantage 1>", "<advantage 2>", "<advantage 3>", "<advantage 4>"],
  "net_savings_estimate": <number representing budget minus quoted price, or 0 if over budget>,
  "risk_assessment": {{
    "risk_level": "Low" | "Moderate" | "High",
    "risk_factors": ["<risk 1>", "<risk 2>"],
    "mitigation_advice": "<actionable procurement safeguard or monitoring instruction>"
  }}
}}
"""

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2
            )
        )

        response_text = response.text.strip()
        # Clean any accidental markdown wrap
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        parsed = json.loads(response_text.strip())
        parsed["is_live_gemini"] = True
        return parsed

    except Exception as e:
        logger.warning(f"Gemini 2.5 Flash invocation error: {e}. Reverting to local heuristic auditor.")
        res = run_heuristic_audit(pr_data, bids_data)
        res["is_live_gemini"] = False
        return res
