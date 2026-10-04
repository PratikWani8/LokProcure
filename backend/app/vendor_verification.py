import re
import os
import json
import logging
from typing import Dict, Any, List, Tuple
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("vendor_verification")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def validate_gstin(gstin: str) -> Tuple[bool, str]:
    """Validates Indian 15-character GSTIN structure."""
    if not gstin:
        return False, "GSTIN is missing"
    gstin = gstin.strip().upper()
    pattern = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
    if not re.match(pattern, gstin):
        return False, "Invalid GSTIN format (must be 15 alphanumeric characters: 2-digit state, 10-char PAN, 1 entity code, 'Z', 1 checksum)"
    state_code = int(gstin[:2])
    if state_code < 1 or state_code > 38:
        return False, f"Invalid state code '{gstin[:2]}' in GSTIN"
    return True, "Valid GSTIN format and state jurisdiction"


def validate_pan(pan: str, business_type: str = "") -> Tuple[bool, str]:
    """Validates 10-character Indian PAN structure and cross-checks entity type."""
    if not pan:
        return False, "PAN is missing"
    pan = pan.strip().upper()
    pattern = r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$"
    if not re.match(pattern, pan):
        return False, "Invalid PAN format (must be 5 letters, 4 digits, 1 letter)"

    entity_code = pan[3]
    entity_map = {
        "C": "Company / Corporation",
        "P": "Individual / Proprietorship",
        "F": "Partnership / Limited Liability Partnership (LLP)",
        "H": "Hindu Undivided Family",
        "T": "Trust",
        "A": "Association of Persons",
        "B": "Body of Individuals",
        "G": "Government Agency",
        "J": "Artificial Juridical Person",
        "L": "Local Authority"
    }
    entity_desc = entity_map.get(entity_code, "Other Legal Entity")

    # Cross check with business type if provided
    btype_lower = (business_type or "").lower()
    if "private limited" in btype_lower or "public limited" in btype_lower or "corporation" in btype_lower:
        if entity_code != "C":
            return True, f"Valid PAN format. Warning: 4th character '{entity_code}' indicates {entity_desc}, expected 'C' for Company"
    elif "proprietor" in btype_lower:
        if entity_code != "P":
            return True, f"Valid PAN format. Warning: 4th character '{entity_code}' indicates {entity_desc}, expected 'P' for Proprietorship"
    elif "partnership" in btype_lower or "llp" in btype_lower:
        if entity_code != "F":
            return True, f"Valid PAN format. Warning: 4th character '{entity_code}' indicates {entity_desc}, expected 'F' for Partnership/LLP"

    return True, f"Valid PAN ({entity_desc})"


def validate_gstin_pan_match(gstin: str, pan: str) -> Tuple[bool, str]:
    """Ensures characters 3 to 12 of GSTIN strictly match the 10-digit PAN."""
    if not gstin or not pan:
        return False, "GSTIN or PAN missing for cross-validation"
    gstin = gstin.strip().upper()
    pan = pan.strip().upper()
    if len(gstin) >= 12:
        extracted_pan = gstin[2:12]
        if extracted_pan == pan:
            return True, f"GSTIN and PAN perfectly match ({pan})"
        return False, f"GSTIN-PAN Mismatch: GSTIN contains PAN '{extracted_pan}' but provided PAN is '{pan}'"
    return False, "GSTIN length insufficient for cross-validation"


def validate_ifsc(ifsc: str) -> Tuple[bool, str]:
    """Validates 11-character Indian Financial System Code (IFSC)."""
    if not ifsc:
        return False, "Bank IFSC code is missing"
    ifsc = ifsc.strip().upper()
    pattern = r"^[A-Z]{4}0[A-Z0-9]{6}$"
    if not re.match(pattern, ifsc):
        return False, "Invalid IFSC format (must be 4 letters, '0', and 6 alphanumeric characters)"
    return True, f"Valid RBI IFSC format ({ifsc[:4]} branch)"


def validate_msme(is_msme: bool, reg_no: str) -> Tuple[bool, str]:
    """Validates MSME / Udyam registration if claimed."""
    if not is_msme:
        return True, "Non-MSME general enterprise"
    if not reg_no:
        return False, "MSME claimed but Udyam Registration number missing"
    reg_no = reg_no.strip().upper()
    pattern = r"^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$"
    if re.match(pattern, reg_no):
        return True, f"Valid Udyam Registration ({reg_no}) - Eligible for Public Procurement Policy concessions"
    # Allow other registered formats with mild warning
    if len(reg_no) >= 8:
        return True, f"MSME Registration recorded ({reg_no})"
    return False, "Invalid Udyam registration format (expected UDYAM-XX-00-0000000)"


def run_deterministic_verification(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Runs multi-layer deterministic checks on vendor data and computes
    an objective Verification Score (0-100) and risk level.
    """
    flags = []
    score = 0.0

    gstin = (data.get("gstin") or "").strip().upper()
    pan = (data.get("pan") or "").strip().upper()
    business_type = data.get("business_type", "")
    is_msme = bool(data.get("is_msme", False))
    msme_reg = data.get("msme_reg_no", "")
    ifsc = (data.get("bank_ifsc") or "").strip().upper()
    account_no = (data.get("bank_account_number") or "").strip()
    turnover = float(data.get("annual_turnover", 0.0) or 0.0)
    lead_days = int(data.get("avg_delivery_days", 7) or 7)
    proximity_km = float(data.get("local_proximity_km", 15.0) or 15.0)
    certifications = (data.get("quality_certifications") or "").strip()

    # 1. GSTIN Check (15 pts)
    gstin_ok, gstin_msg = validate_gstin(gstin)
    if gstin_ok:
        score += 15.0
        flags.append({"name": "GSTIN Structure", "status": "PASSED", "points": 15, "detail": gstin_msg})
    else:
        flags.append({"name": "GSTIN Structure", "status": "FAILED", "points": 0, "detail": gstin_msg})

    # 2. PAN Check (15 pts)
    pan_ok, pan_msg = validate_pan(pan, business_type)
    if pan_ok:
        score += 15.0
        flags.append({"name": "PAN Structure & Entity", "status": "PASSED", "points": 15, "detail": pan_msg})
    else:
        flags.append({"name": "PAN Structure & Entity", "status": "FAILED", "points": 0, "detail": pan_msg})

    # 3. GSTIN-PAN Cross Check (15 pts)
    match_ok, match_msg = validate_gstin_pan_match(gstin, pan)
    if match_ok:
        score += 15.0
        flags.append({"name": "GSTIN-PAN Tax Linkage", "status": "PASSED", "points": 15, "detail": match_msg})
    else:
        flags.append({"name": "GSTIN-PAN Tax Linkage", "status": "FAILED", "points": 0, "detail": match_msg})

    # 4. Bank & IFSC Check (15 pts)
    ifsc_ok, ifsc_msg = validate_ifsc(ifsc)
    acct_ok = len(account_no) >= 9 and account_no.isdigit()
    if ifsc_ok and acct_ok:
        score += 15.0
        flags.append({"name": "Banking & IFSC Verification", "status": "PASSED", "points": 15, "detail": f"{ifsc_msg}, Account valid ({len(account_no)} digits)"})
    elif ifsc_ok:
        score += 10.0
        flags.append({"name": "Banking & IFSC Verification", "status": "WARNING", "points": 10, "detail": f"{ifsc_msg}, Account number format questionable"})
    else:
        flags.append({"name": "Banking & IFSC Verification", "status": "FAILED", "points": 0, "detail": ifsc_msg})

    # 5. Quality Certifications (15 pts)
    recognized_certs = ["iso", "bis", "ce", "rohs", "as9100", "iatf", "gmp"]
    has_recognized_cert = any(c in certifications.lower() for c in recognized_certs) if certifications else False
    if has_recognized_cert:
        score += 15.0
        flags.append({"name": "Quality Standards Certification", "status": "PASSED", "points": 15, "detail": f"Recognized quality certification: {certifications}"})
    elif certifications:
        score += 10.0
        flags.append({"name": "Quality Standards Certification", "status": "PASSED", "points": 10, "detail": f"Custom certification: {certifications}"})
    else:
        flags.append({"name": "Quality Standards Certification", "status": "WARNING", "points": 5, "detail": "No formal ISO/quality certifications declared"})
        score += 5.0

    # 6. MSME & Local Proximity Advantage (10 pts)
    msme_ok, msme_msg = validate_msme(is_msme, msme_reg)
    is_local = proximity_km <= 50.0
    msme_pts = 0.0
    if is_msme and msme_ok:
        msme_pts += 5.0
    elif not is_msme:
        msme_pts += 3.0  # general quota

    if is_local:
        msme_pts += 5.0
        flags.append({"name": "Public Procurement Policy & Proximity", "status": "PASSED", "points": int(msme_pts), "detail": f"{msme_msg}; Local manufacturer ({proximity_km} km) qualifying for Nearshoring Priority"})
    else:
        msme_pts += 2.0
        flags.append({"name": "Public Procurement Policy & Proximity", "status": "PASSED", "points": int(msme_pts), "detail": f"{msme_msg}; Regional logistics ({proximity_km} km)"})
    score += msme_pts

    # 7. Operational Capacity & Delivery (15 pts)
    cap_pts = 0.0
    cap_details = []
    if turnover >= 10000000:  # >= 1 Crore
        cap_pts += 8.0
        cap_details.append(f"High annual turnover (₹{turnover:,.2f})")
    elif turnover >= 2000000:  # >= 20 Lakhs
        cap_pts += 6.0
        cap_details.append(f"Stable turnover (₹{turnover:,.2f})")
    else:
        cap_pts += 4.0
        cap_details.append(f"Turnover: ₹{turnover:,.2f}")

    if lead_days <= 5:
        cap_pts += 7.0
        cap_details.append(f"Rapid lead turnaround ({lead_days} days)")
    elif lead_days <= 10:
        cap_pts += 5.0
        cap_details.append(f"Standard lead time ({lead_days} days)")
    else:
        cap_pts += 2.0
        cap_details.append(f"Extended lead time ({lead_days} days)")

    score += cap_pts
    flags.append({"name": "Operational Capacity & SLA", "status": "PASSED" if cap_pts >= 11 else "WARNING", "points": int(cap_pts), "detail": "; ".join(cap_details)})

    score = min(100.0, max(0.0, round(score, 1)))

    if score >= 80.0:
        risk_level = "Low"
    elif score >= 60.0:
        risk_level = "Moderate"
    else:
        risk_level = "High"

    return {
        "verification_score": score,
        "verification_risk_level": risk_level,
        "verification_flags": flags,
        "is_gstin_valid": gstin_ok,
        "is_pan_valid": pan_ok,
        "is_pan_gstin_matched": match_ok,
        "is_local_vendor": is_local,
    }


def generate_heuristic_ai_summary(data: Dict[str, Any], det_result: Dict[str, Any]) -> Dict[str, Any]:
    """Generates deterministic heuristic AI evaluation when LLM is unavailable."""
    company_name = data.get("company_name", "Prospective Supplier")
    btype = data.get("business_type", "Enterprise")
    category = data.get("category", "General Goods")
    score = det_result["verification_score"]
    risk = det_result["verification_risk_level"]
    is_local = det_result.get("is_local_vendor", False)
    certs = data.get("quality_certifications", "None")

    strengths = []
    if det_result.get("is_pan_gstin_matched"):
        strengths.append(f"Verified statutory tax compliance: PAN and GSTIN cross-validated without discrepancies.")
    if is_local:
        strengths.append(f"Strategic proximity ({data.get('local_proximity_km', 15)} km) provides nearshoring cost reduction and faster emergency turnaround.")
    if "iso" in (certs or "").lower():
        strengths.append(f"Certified quality management framework ({certs}) meets government procurement standards.")
    if float(data.get("annual_turnover", 0)) >= 5000000:
        strengths.append(f"Financial stability demonstrated with an annual turnover of ₹{float(data.get('annual_turnover', 0)):,.2f}.")
    if not strengths:
        strengths.append("Standard business identity parameters registered.")

    warnings = []
    if not det_result.get("is_pan_gstin_matched"):
        warnings.append("Critical: Discrepancy detected between submitted PAN and entity code embedded in GSTIN.")
    if not det_result.get("is_gstin_valid"):
        warnings.append("GSTIN format could not be verified against standard state jurisdiction masks.")
    if int(data.get("avg_delivery_days", 7)) > 12:
        warnings.append(f"Committed delivery turnaround of {data.get('avg_delivery_days')} days exceeds preferred 10-day benchmark.")
    if not warnings:
        warnings.append("No material statutory or compliance red flags identified during automated audit.")

    if score >= 80:
        recommendation = "RECOMMENDED_APPROVAL"
        suggested_tier = "Preferred Partner" if score >= 90 else "Standard Supplier"
        summary = (
            f"{company_name} demonstrates excellent compliance and operational readiness as a {btype} in {category}. "
            f"Statutory credentials (GSTIN/PAN/Bank) are fully consistent with a high verification index of {score}/100. "
            f"Recommended for immediate authorization by the Lead Procurement Officer."
        )
    elif score >= 60:
        recommendation = "NEEDS_MANUAL_REVIEW"
        suggested_tier = "Standard Supplier"
        summary = (
            f"{company_name} meets foundational statutory criteria with a moderate verification score of {score}/100. "
            f"Lead Procurement Officer should verify delivery capabilities and certification proof before awarding high-value contracts."
        )
    else:
        recommendation = "HIGH_RISK_REJECT"
        suggested_tier = "Unclassified"
        summary = (
            f"{company_name} scored {score}/100 with significant compliance alerts. "
            f"Discrepancies in statutory tax documents or missing operational parameters require rectification prior to authorization."
        )

    return {
        "executive_summary": summary,
        "key_strengths": strengths,
        "risk_flags": warnings,
        "recommendation": recommendation,
        "suggested_tier": suggested_tier,
        "is_live_gemini": False
    }


def audit_vendor_registration(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Complete vendor verification pipeline:
    1. Deterministic statutory & capacity checks (score 0-100, risk rating, flags)
    2. Gemini LLM Credibility Audit (with robust heuristic fallback)
    """
    det = run_deterministic_verification(data)
    ai_summary = None

    api_key = GEMINI_API_KEY.strip()
    if api_key and "your_gemini_api_key" not in api_key.lower():
        try:
            from google import genai
            client = genai.Client(api_key=api_key)

            prompt = f"""
You are the Chief AI Procurement Auditor for LokProcure, an intelligent Indian Government Procurement ERP.
Evaluate this newly submitted Vendor Registration Dossier:

Vendor Company: {data.get('company_name')}
Business Structure: {data.get('business_type')}
Category: {data.get('category')}
Specialties: {data.get('specialties')}
GSTIN: {data.get('gstin')}
PAN: {data.get('pan')}
MSME Status: {data.get('is_msme')} (Udyam: {data.get('msme_reg_no', 'N/A')})
Local Proximity: {data.get('local_proximity_km')} km
Annual Turnover: ₹{data.get('annual_turnover', 0):,.2f}
Average Delivery Days: {data.get('avg_delivery_days')} days
Quality Certifications: {data.get('quality_certifications', 'None')}
Bank IFSC: {data.get('bank_ifsc')} (Bank: {data.get('bank_name')})

Automated Check Results:
- Deterministic Verification Score: {det['verification_score']}/100
- Risk Rating: {det['verification_risk_level']}
- PAN-GSTIN Match: {det['is_pan_gstin_matched']}
- Checklist Flags: {json.dumps(det['verification_flags'])}

Respond STRICTLY with a valid JSON object matching this schema:
{{
  "executive_summary": "Comprehensive 2-3 sentence assessment of the applicant vendor",
  "key_strengths": ["string", "string"],
  "risk_flags": ["string"],
  "recommendation": "RECOMMENDED_APPROVAL" | "NEEDS_MANUAL_REVIEW" | "HIGH_RISK_REJECT",
  "suggested_tier": "Tier 1 - Enterprise" | "Preferred Partner" | "Standard Supplier"
}}
"""
            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2
                )
            )
            parsed = json.loads(response.text)
            parsed["is_live_gemini"] = True
            ai_summary = parsed
        except Exception as e:
            logger.warning(f"Gemini vendor audit failed: {e}. Falling back to deterministic auditor.")
            ai_summary = generate_heuristic_ai_summary(data, det)
    else:
        ai_summary = generate_heuristic_ai_summary(data, det)

    return {
        **det,
        "ai_summary": ai_summary
    }
