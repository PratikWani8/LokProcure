import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"

def run_tests():
    print("\n==================================================")
    print("LOKPROCURE RAG POLICY COMPLIANCE GUARD E2E TEST")
    print("==================================================\n")

    # 1. Login as Admin / Lead Procurement Officer
    print("[1] Logging in as admin@lokprocure.internal...")
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "admin@lokprocure.internal",
        "password": "admin123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("  [OK] Authenticated successfully.")

    # 2. Test Compliant PR Creation
    print("\n[2] Testing Compliant PR Creation (Operations $95k)...")
    comp_payload = {
        "title": "Industrial CNC Coolant Filtration and Chip Recovery Unit",
        "item_description": "High-efficiency coolant recycling and magnetic separator unit for machining cell Line #4 with documented 2-year warranty.",
        "quantity": 2,
        "department": "Operations",
        "urgency": "Medium",
        "estimated_budget": 95000.0
    }
    pr_res1 = requests.post(f"{BASE_URL}/purchase-requests", json=comp_payload, headers=headers)
    assert pr_res1.status_code == 200, f"PR creation failed: {pr_res1.text}"
    pr1_data = pr_res1.json()
    print(f"  [OK] Created PR-{pr1_data['id']:04d}: '{pr1_data['title']}'")
    print(f"  [OK] Compliance Status: {'COMPLIANT' if pr1_data.get('compliance', {}).get('compliant') else 'NON-COMPLIANT'}")
    assert pr1_data.get("compliance", {}).get("compliant") is True, f"Expected compliant, got: {pr1_data.get('compliance')}"

    # 3. Test Department Spend Cap Violation PR (> $150k for Operations)
    print("\n[3] Testing Spend Cap Violation PR (Operations $185k without VP sign-off)...")
    non_comp_payload1 = {
        "title": "Automated High-Capacity Robotic Palletizer Unit",
        "item_description": "Turnkey palletizing robotic arm with safety fencing and conveyor integration.",
        "quantity": 1,
        "department": "Operations",
        "urgency": "High",
        "estimated_budget": 185000.0
    }
    pr_res2 = requests.post(f"{BASE_URL}/purchase-requests", json=non_comp_payload1, headers=headers)
    assert pr_res2.status_code == 200, f"PR creation failed: {pr_res2.text}"
    pr2_data = pr_res2.json()
    comp2 = pr2_data.get("compliance", {})
    print(f"  [OK] Created PR-{pr2_data['id']:04d}: '{pr2_data['title']}'")
    print(f"  [OK] Compliance Status: {'COMPLIANT' if comp2.get('compliant') else 'NON-COMPLIANT'}")
    print(f"  [OK] Violations Detected: {len(comp2.get('violations', []))}")
    for v in comp2.get("violations", []):
        print(f"       - {v['rule_name']} ({v['severity']}): {v['explanation']}")
    assert comp2.get("compliant") is False, "Expected non-compliant spend cap violation!"

    # 4. Test Recurring Engagement without Auto-Renewal Disclosure
    print("\n[4] Testing Contract Auto-Renewal Disclosure Policy (Recurring without disclosure)...")
    non_comp_payload2 = {
        "title": "Enterprise Cloud Database Hosting & Managed Support Subscription",
        "item_description": "Annual recurring subscription for managed cloud infrastructure and database telemetry.",
        "quantity": 1,
        "department": "IT",
        "urgency": "Medium",
        "estimated_budget": 45000.0
    }
    pr_res3 = requests.post(f"{BASE_URL}/purchase-requests", json=non_comp_payload2, headers=headers)
    assert pr_res3.status_code == 200, f"PR creation failed: {pr_res3.text}"
    pr3_data = pr_res3.json()
    comp3 = pr3_data.get("compliance", {})
    print(f"  [OK] Created PR-{pr3_data['id']:04d}: '{pr3_data['title']}'")
    print(f"  [OK] Compliance Status: {'COMPLIANT' if comp3.get('compliant') else 'NON-COMPLIANT'}")
    print(f"  [OK] Violations Detected: {len(comp3.get('violations', []))}")
    for v in comp3.get("violations", []):
        print(f"       - {v['rule_name']} ({v['severity']}): {v['explanation']}")
    assert comp3.get("compliant") is False, "Expected non-compliant contract disclosure violation!"

    # 5. Test Dedicated GET /api/purchase-requests/{pr_id}/compliance endpoint
    print(f"\n[5] Testing GET /api/purchase-requests/{pr3_data['id']}/compliance...")
    comp_endpoint_res = requests.get(f"{BASE_URL}/purchase-requests/{pr3_data['id']}/compliance", headers=headers)
    assert comp_endpoint_res.status_code == 200, f"GET /compliance failed: {comp_endpoint_res.text}"
    comp_endpoint_data = comp_endpoint_res.json()
    print(f"  [OK] Response: Compliant={comp_endpoint_data['compliant']}, Violations={len(comp_endpoint_data['violations'])}")
    assert comp_endpoint_data['pr_id'] == pr3_data['id']

    # 6. Test GET /api/approvals/queue contains compliance status
    print("\n[6] Testing GET /api/approvals/queue compliance badge payload...")
    queue_res = requests.get(f"{BASE_URL}/approvals/queue", headers=headers)
    assert queue_res.status_code == 200, f"Queue failed: {queue_res.text}"
    queue_items = queue_res.json()
    print(f"  [OK] Retrieved {len(queue_items)} approval queue items.")
    checked_count = 0
    for item in queue_items:
        if item.get("compliance"):
            checked_count += 1
    print(f"  [OK] {checked_count}/{len(queue_items)} items have active RAG compliance telemetry attached.")

    print("\n==================================================")
    print("ALL RAG COMPLIANCE E2E TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================\n")

if __name__ == "__main__":
    run_tests()
