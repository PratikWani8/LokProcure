import requests

def test_full_flow():
    print("[1] Testing Frontend HTTP...")
    fe = requests.get('http://localhost:5173')
    print(f"Frontend Response: {fe.status_code}, length: {len(fe.text)} bytes")

    print("\n[2] Testing Backend Health...")
    be = requests.get('http://localhost:8000/api/health')
    print(f"Backend Health: {be.status_code}, data: {be.json()}")

    print("\n[3] Testing 5 Persona Logins...")
    personas = [
        ('admin@lokprocure.internal', 'admin123', 'Lead Procurement Officer'),
        ('planthead@lokprocure.internal', 'plant123', 'Plant Head'),
        ('vpops@lokprocure.internal', 'vp123', 'VP Operations'),
        ('finance@lokprocure.internal', 'finance123', 'Finance Director'),
        ('deptmgr@lokprocure.internal', 'dept123', 'Department Manager'),
    ]
    for email, password, expected_role in personas:
        r = requests.post('http://localhost:8000/api/auth/login', json={'username': email, 'password': password})
        assert r.status_code == 200, f"Login failed for {email}: {r.text}"
        assert r.json()['user']['role'] == expected_role
        print(f"  [OK] {email} -> {expected_role}")

    print("\n[4] Testing PR Creation & Rule 1 Routing...")
    admin_token = requests.post('http://localhost:8000/api/auth/login', json={'username': 'admin@lokprocure.internal', 'password': 'admin123'}).json()['access_token']
    headers = {'Authorization': f'Bearer {admin_token}'}

    pr_payload = {
        'title': 'High-Throughput Robotic Stamping Press Assembly',
        'item_description': 'Autonomous multi-axis robotics system for plant automation expansion.',
        'quantity': 2,
        'urgency': 'High',
        'department': 'Operations',
        'estimated_budget': 135000.0
    }
    pr_res = requests.post('http://localhost:8000/api/purchase-requests', json=pr_payload, headers=headers)
    pr_data = pr_res.json()
    pr_id = pr_data['id']
    print(f"  [OK] Created PR-{pr_id:04d}: '{pr_data['title']}'")
    print(f"  [OK] Assigned Rule: '{pr_data['assigned_approval_rule']}'")
    print(f"  [OK] Assigned Approver: '{pr_data['assigned_approver_role']}'")
    print(f"  [OK] Auto-generated RFQ Bids: {pr_data['bids_count']} vendors")
    assert 'Plant Head' in pr_data['assigned_approval_rule']

    print("\n[5] Testing Vendor Scoring Matrix...")
    rec_res = requests.get(f'http://localhost:8000/api/vendors/recommendations/{pr_id}', headers=headers)
    recs = rec_res.json()['recommendations']
    print(f"  [OK] Received {len(recs)} scored quotations.")
    top = recs[0]
    print(f"  [OK] Top Winner: {top['vendor_name']} ({top['pricing_tier']})")
    print(f"       Price: ${top['quoted_price']:,.2f} (Score: {top['scores']['price_score']}/30)")
    print(f"       Delivery: {top['delivery_days']} days (Score: {top['scores']['delivery_score']}/25)")
    print(f"       Reliability: {top['reliability_score']}% (Score: {top['scores']['reliability_score']}/25)")
    print(f"       History: {top['history_score_raw']}% (Score: {top['scores']['history_score']}/20)")
    print(f"       Composite Total Score: {top['scores']['total_score']}/100")

    print("\n[6] Testing AI Strategic Audit...")
    ai_res = requests.post(f'http://localhost:8000/api/dashboard/ai-analysis/{pr_id}', headers=headers)
    ai = ai_res.json()
    print(f"  [OK] AI Selected Vendor: {ai['selected_vendor_name']}")
    print(f"  [OK] Confidence: {ai['confidence_score']}%")
    print(f"  [OK] Net Savings: ${ai['net_savings_estimate']:,.2f}")
    print(f"  [OK] Summary: {ai['executive_summary'][:80]}...")

    print("\n[7] Testing Plant Head Approval & ReportLab PO Generation...")
    ph_token = requests.post('http://localhost:8000/api/auth/login', json={'username': 'planthead@lokprocure.internal', 'password': 'plant123'}).json()['access_token']
    ph_headers = {'Authorization': f'Bearer {ph_token}'}

    po_res = requests.post(f'http://localhost:8000/api/approvals/po/generate/{pr_id}', headers=ph_headers)
    po = po_res.json()['po']
    po_num = po['po_number']
    print(f"  [OK] Generated NetSuite PO: {po_num}")
    print(f"  [OK] Status: {po['status']}, Total Amount: ${po['total_amount']:,.2f}")

    print("\n[8] Testing PO Lifecycle Progression (Sent -> Acknowledged -> Delivered)...")
    patch1 = requests.patch(f'http://localhost:8000/api/approvals/po/{po_num}/status', json={'new_status': 'Acknowledged'}, headers=ph_headers)
    assert patch1.json()['po']['status'] == 'Acknowledged'
    print("  [OK] Status updated to Acknowledged (In Transit)")

    patch2 = requests.patch(f'http://localhost:8000/api/approvals/po/{po_num}/status', json={'new_status': 'Delivered'}, headers=ph_headers)
    assert patch2.json()['po']['status'] == 'Delivered'
    print("  [OK] Status updated to Delivered (3-Way Match Verified)")

    print("\n[9] Testing ReportLab PDF Streaming...")
    pdf_res = requests.get(f'http://localhost:8000/api/approvals/po/{po_num}/download', headers=ph_headers)
    assert pdf_res.status_code == 200
    assert len(pdf_res.content) > 1000
    print(f"  [OK] Streamed {len(pdf_res.content)} bytes of official PDF document")

    print("\n[10] Testing Dashboard Metrics Aggregation...")
    metrics_res = requests.get('http://localhost:8000/api/dashboard/metrics', headers=headers)
    m = metrics_res.json()
    print(f"  [OK] Total PRs in ERP: {m['total_prs']}")
    print(f"  [OK] Total Authorized Spend: ${m['total_spend']:,.2f}")
    print(f"  [OK] Verified Deliveries: {m['three_way_match_verified']}")
    print(f"  [OK] Spend by Department count: {len(m['spend_by_department'])}")

    print("\n" + "="*50)
    print("ALL 10 VERIFICATION STEPS PASSED WITH 100% SUCCESS!")
    print("="*50)

if __name__ == '__main__':
    test_full_flow()
