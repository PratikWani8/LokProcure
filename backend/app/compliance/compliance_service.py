import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from dotenv import load_dotenv

from app.compliance.ingest import get_policy_collection, init_policy_db

load_dotenv()
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def run_heuristic_compliance_guard(pr_data: Dict[str, Any], retrieved_policies: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Deterministic anti-hallucination compliance audit grounded strictly in the 5 procurement policies.
    """
    title = pr_data.get("title", "")
    description = pr_data.get("item_description", "")
    department = pr_data.get("department", "Operations")
    budget = float(pr_data.get("estimated_budget", 0.0))
    urgency = pr_data.get("urgency", "Medium")
    quantity = int(pr_data.get("quantity", 1))
    bids_count = int(pr_data.get("bids_count", 8))

    full_text = f"{title} {description}".lower()
    violations = []
    actions = []

    # 1. Department Spend Cap Rule (Supply Chain & Operations: ₹1,50,000, Others: ₹75,000)
    has_vp_signoff = "vp operations" in full_text or "vp sign-off" in full_text or "approved by vp" in full_text
    if department in ["Supply Chain", "Operations"]:
        if budget > 150000 and not has_vp_signoff:
            violations.append({
                "rule_name": "Department Spend Cap Rule",
                "explanation": f"Request amount of ₹{budget:,.2f} exceeds the {department} departmental cap of ₹1,50,000 without explicit VP Operations sign-off noted.",
                "severity": "High"
            })
            actions.append("Obtain and record explicit VP Operations sign-off in the purchase request description.")
    else:
        if budget > 75000 and not has_vp_signoff:
            violations.append({
                "rule_name": "Department Spend Cap Rule",
                "explanation": f"Request amount of ₹{budget:,.2f} exceeds the {department} departmental cap of ₹75,000 without explicit VP Operations sign-off noted.",
                "severity": "High"
            })
            actions.append(f"Obtain VP Operations authorization for {department} expenditure exceeding ₹75,000 threshold.")

    # 2. Vendor Contract Auto-Renewal Disclosure Rule
    recurring_keywords = ["recurring", "subscription", "annual", "retainer", "ongoing"]
    is_recurring = any(kw in full_text for kw in recurring_keywords)
    discloses_renewal = "auto-renewal" in full_text or "renewal terms" in full_text or "non-renewing" in full_text or "no auto-renewal" in full_text

    if is_recurring and not discloses_renewal:
        violations.append({
            "rule_name": "Vendor Contract Auto-Renewal Disclosure Rule",
            "explanation": "Purchase request implies a recurring or subscription engagement but fails to disclose whether the vendor contract includes an auto-renewal clause.",
            "severity": "Medium"
        })
        actions.append("Disclose whether the engagement contains an auto-renewal clause and specify the termination notice window.")

    # 3. Urgent Procurement Documentation Rule
    if urgency == "Critical":
        words = description.strip().split()
        is_vague = len(words) < 7 or any(vague in full_text for vague in ["asap", "needed fast", "urgent need", "just buy"]) and len(words) < 10
        if is_vague:
            violations.append({
                "rule_name": "Urgent Procurement Documentation Rule",
                "explanation": "Purchase request is marked as 'Critical' urgency but contains a vague or insufficient operational explanation for the urgency.",
                "severity": "Medium"
            })
            actions.append("Update item description with specific business and operational justification explaining the critical timeline constraint.")

    # 4. Budget Threshold Sourcing Rule (> ₹50,000 requires 2+ bids)
    if budget > 50000 and bids_count < 2:
        violations.append({
            "rule_name": "Budget Threshold Sourcing Rule",
            "explanation": f"Estimated budget of ₹{budget:,.2f} exceeds ₹50,000 threshold but has fewer than two competing vendor bids.",
            "severity": "High"
        })
        actions.append("Solicit at least two competitive vendor quotations before routing to Finance Director for approval.")

    # 5. Single-Vendor Sole-Sourcing Restriction
    sole_keywords = ["sole source", "sole-sourced", "exclusive vendor", "only supplier", "no other vendor", "only vendor"]
    is_sole_sourced = any(sk in full_text for sk in sole_keywords)
    if is_sole_sourced and budget >= 10000 and urgency != "Critical":
        violations.append({
            "rule_name": "Single-Vendor Sole-Sourcing Restriction",
            "explanation": f"Sole-sourcing is restricted for budgets of ₹10,000 or higher (₹{budget:,.2f} requested) without critical urgency and delivery justification.",
            "severity": "High"
        })
        actions.append("Submit formal written sole-sourcing justification or initiate competitive RFQ distribution.")

    is_compliant = len(violations) == 0
    required_action = " | ".join(actions) if actions else ""

    return {
        "compliant": is_compliant,
        "violations": violations,
        "required_action": required_action,
        "is_live_gemini": False
    }


def evaluate_compliance(pr_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retrieves the top 3 relevant policy documents from ChromaDB,
    and prompts Gemini 2.5 Flash with strict anti-hallucination guardrails to evaluate compliance.
    """
    # 1. Retrieve top 3 policy chunks from ChromaDB
    try:
        collection = get_policy_collection()
        if collection.count() == 0:
            init_policy_db()
            collection = get_policy_collection()

        query_text = (
            f"Title: {pr_data.get('title')} | Description: {pr_data.get('item_description')} | "
            f"Department: {pr_data.get('department')} | Budget: ₹{pr_data.get('estimated_budget')} | "
            f"Urgency: {pr_data.get('urgency')} | Quantity: {pr_data.get('quantity')}"
        )

        results = collection.query(
            query_texts=[query_text],
            n_results=min(3, max(1, collection.count()))
        )

        retrieved_docs = results.get("documents", [[]])[0]
        retrieved_metas = results.get("metadatas", [[]])[0]
    except Exception as e:
        logger.warning(f"ChromaDB retrieval error: {e}. Ingesting and retrying...")
        init_policy_db()
        retrieved_docs = []
        retrieved_metas = []

    # Prepare context
    policy_context = "\n\n---\n\n".join(retrieved_docs) if retrieved_docs else "Standard Corporate Procurement Guidelines"

    # 2. Check if live Gemini API is configured
    api_key = GEMINI_API_KEY.strip()
    if not api_key or "your_gemini_api_key" in api_key.lower():
        return run_heuristic_compliance_guard(pr_data, [{"doc": d, "meta": m} for d, m in zip(retrieved_docs, retrieved_metas)])

    try:
        from google import genai

        client = genai.Client(api_key=api_key)

        prompt = f"""
You are the Autonomous Procurement Policy Compliance Guard in an enterprise NetSuite ERP system.
Evaluate this Purchase Request (PR) against the RETRIEVED COMPANY POLICIES below.

### RETRIEVED COMPANY PROCUREMENT POLICIES:
{policy_context}

### PURCHASE REQUEST TO AUDIT:
- Title: {pr_data.get('title')}
- Description: {pr_data.get('item_description')}
- Department: {pr_data.get('department')}
- Estimated Budget: ₹{pr_data.get('estimated_budget')}
- Urgency: {pr_data.get('urgency')}
- Quantity: {pr_data.get('quantity')}
- Active Vendor Bids Count: {pr_data.get('bids_count', 8)}

### STRICT ANTI-HALLUCINATION GUARDRAILS:
1. You must ONLY cite policy violations that are DIRECTLY and EXPLICITLY violated based on the retrieved policy text.
2. If none of the retrieved policies are violated by this PR, you MUST return "compliant": true, "violations": [], "required_action": "".
3. Do not invent or assume rules not stated in the retrieved text.

### REQUIRED JSON OUTPUT FORMAT:
Return ONLY a valid, raw JSON object matching this schema:
{{
  "compliant": true | false,
  "violations": [
    {{
      "rule_name": "<exact rule title from policy>",
      "explanation": "<clear explanation citing why the PR violates the rule>",
      "severity": "Low" | "Medium" | "High"
    }}
  ],
  "required_action": "<concise required remediation action if non-compliant, or empty string if compliant>"
}}
"""

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )

        response_text = response.text.strip()
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
        logger.warning(f"Gemini compliance evaluation error: {e}. Using deterministic guard.")
        res = run_heuristic_compliance_guard(pr_data, [{"doc": d, "meta": m} for d, m in zip(retrieved_docs, retrieved_metas)])
        res["is_live_gemini"] = False
        return res
