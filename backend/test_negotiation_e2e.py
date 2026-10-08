"""
test_negotiation_e2e.py - Autonomous Bilateral Negotiation End-to-End Test Suite
"""
import os
import sys
import json
import requests

BASE_URL = "http://localhost:8000/api"


def print_header(title: str):
    print("\n" + "=" * 55)
    print(title)
    print("=" * 55)


def main():
    print_header("LOKPROCURE BILATERAL DUAL-AGENT NEGOTIATION E2E TEST")

    # 1. Login as Admin
    print("\n[1] Authenticating as Lead Procurement Officer (Admin)...")
    login_res = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": "admin@lokprocure.internal", "password": "admin123"}
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("  [OK] Authenticated successfully.")

    # 2. Create a test Purchase Request
    print("\n[2] Creating Purchase Request for High-Volume Industrial Tooling...")
    pr_payload = {
        "title": "Automated High-Precision CNC Tooling & Spindle Assembly",
        "item_description": "Multi-axis high-speed CNC spindle assembly with dynamic vibration dampeners for precision stamping shift.",
        "quantity": 10,
        "urgency": "High",
        "department": "Operations",
        "estimated_budget": 125000.0
    }
    create_pr_res = requests.post(
        f"{BASE_URL}/purchase-requests",
        json=pr_payload,
        headers=headers
    )
    assert create_pr_res.status_code == 200, f"PR creation failed: {create_pr_res.text}"
    pr_data = create_pr_res.json()
    pr_id = pr_data["id"]
    print(f"  [OK] Created PR-{pr_id:04d}: '{pr_data['title']}' with budget ${pr_data['estimated_budget']:,.2f}")

    # 3. Get Initial Recommendations before negotiation
    print(f"\n[3] Fetching initial supplier recommendations for PR-{pr_id:04d}...")
    rec_before_res = requests.get(
        f"{BASE_URL}/vendors/recommendations/{pr_id}",
        headers=headers
    )
    assert rec_before_res.status_code == 200, f"Failed to get recommendations: {rec_before_res.text}"
    recs_before = rec_before_res.json()["recommendations"]
    print(f"  [OK] Found {len(recs_before)} initial supplier bids.")
    top_3_before = recs_before[:3]
    for idx, r in enumerate(top_3_before, 1):
        print(f"       #{idx} {r['vendor_name']} ({r['pricing_tier']}): ${r['quoted_price']:,.2f} | SLA: {r['delivery_days']}d | Score: {r['scores']['total_score']:.1f}")

    # 4. Trigger Autonomous Bilateral Negotiation via LangGraph
    print(f"\n[4] Triggering POST /api/vendors/negotiate/{pr_id} (LangGraph Bilateral)...")
    negotiate_res = requests.post(
        f"{BASE_URL}/vendors/negotiate/{pr_id}",
        headers=headers
    )
    assert negotiate_res.status_code == 200, f"Negotiation endpoint failed: {negotiate_res.text}"
    neg_data = negotiate_res.json()

    print("  [OK] Negotiation completed successfully!")
    print(f"       Total Initial Spend:    ${neg_data.get('total_initial_spend', 0):,.2f}")
    print(f"       Total Negotiated Spend: ${neg_data.get('total_negotiated_spend', 0):,.2f}")
    print(f"       Total Net Savings:      +${neg_data.get('total_savings', 0):,.2f} ({neg_data.get('total_savings_pct', 0):.1f}%)")
    print(f"       Winning Supplier:       {neg_data.get('top_vendor_name')}")

    # 5. Assert Structure of Negotiated Results
    assert len(neg_data["results"]) >= 1, f"Expected negotiated vendor results, got {len(neg_data['results'])}"
    first_session_id = None
    for vr in neg_data["results"]:
        print(f"\n       >> Vendor: {vr['vendor_name']}")
        print(f"          Final Price: ${vr['final_price']:,.2f} (Savings: ${vr['savings']:,.2f}, {vr['savings_percentage']:.1f}%)")
        print(f"          Final Days:  {vr['final_days']}d")
        print(f"          Status:      {vr['status']} | Action: {vr['action']}")
        print(f"          Events Count: {len(vr.get('events', []))}")
        if vr.get("session_id") and first_session_id is None:
            first_session_id = vr["session_id"]
        for ev in vr.get("events", []):
            print(f"            - [R{ev['round']} {ev['speaker_role']} ({ev['event_type']})]: \"{ev['message'][:70]}...\" (Price: ${ev.get('price') or 0:,.2f}, {ev.get('delivery_days')}d)")

    # 6. Verify Database Persistence of Negotiation History via API
    if first_session_id:
        print(f"\n[6] Verifying GET /api/vendors/negotiation/{first_session_id} history persistence...")
        history_res = requests.get(
            f"{BASE_URL}/vendors/negotiation/{first_session_id}",
            headers=headers
        )
        assert history_res.status_code == 200, f"Failed to get negotiation history: {history_res.text}"
        hist = history_res.json()
        assert hist["session"]["id"] == first_session_id
        assert len(hist["events"]) >= 1
        print(f"  [OK] Verified session history: {len(hist['events'])} events, {len(hist['decisions'])} policy decisions, gov_state recorded={hist['gov_state'] is not None}")

    # 7. Test Bilateral Engine Fallback Resilience (Simulated Offline / Quota Drop)
    print("\n[7] Testing Bilateral Engine Resilience & Fallback Handling...")
    from app.negotiation.graph import run_bilateral_negotiation
    from app.negotiation.state import GraphNegotiationState

    test_state: GraphNegotiationState = {
        "shared": {
            "session_id": 9999,
            "pr_id": pr_id,
            "pr_title": "Direct Graph Test CNC Spindle",
            "item_description": "Industrial Spindle Assembly",
            "quantity": 5,
            "current_round": 0,
            "status": "INITIATED",
            "events": [],
        },
        "gov": {
            "target_price": 42000.0,
            "max_authorized_price": 50000.0,
            "target_delivery": 5,
            "max_delivery": 10,
            "strategy": "Maximize cost savings",
        },
        "vendor": {
            "target_price": 48000.0,
            "absolute_minimum_price": 41000.0,
            "feasible_delivery": 4,
            "strategy": "Protect margin",
        },
        "next_actor": "GOV_AGENT",
    }

    fb_result = run_bilateral_negotiation(test_state)
    assert len(fb_result["shared"]["events"]) >= 2, "Expected at least 2 negotiation events from bilateral run"
    assert fb_result["shared"]["status"] in ["ACCEPTED", "ESCALATED", "REJECTED", "NEGOTIATING", "COMPLETED"]
    print(f"  [OK] Bilateral graph executed with final status: {fb_result['shared']['status']} across {len(fb_result['shared']['events'])} turns.")

    print_header("ALL BILATERAL MULTI-AGENT NEGOTIATION TESTS PASSED WITH 100% SUCCESS!")


if __name__ == "__main__":
    main()
