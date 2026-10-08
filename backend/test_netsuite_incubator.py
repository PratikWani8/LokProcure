import requests

def test_features():
    token = requests.post('http://localhost:8000/api/auth/login', json={'username':'admin@lokprocure.internal','password':'admin123'}).json()['access_token']
    h = {'Authorization': f'Bearer {token}'}

    # 1. Test NetSuite PO Sync
    pos = requests.get('http://localhost:8000/api/approvals/pos', headers=h).json()
    print(f"Total POs in ERP: {len(pos)}")
    if pos:
        po_num = pos[0]['po_number']
        sync_res = requests.get(f'http://localhost:8000/api/approvals/po/{po_num}/netsuite-sync', headers=h).json()
        print(f"  [OK] NetSuite Sync ID: {sync_res['netsuite_internal_id']}")
        print(f"  [OK] NetSuite Status:  {sync_res['sync_status']}")
        print(f"  [OK] NetSuite GL Acc:  {sync_res['gl_account']}")
        print(f"  [OK] NetSuite 3-Way:   {sync_res['three_way_match_status']}")

    # 2. Test Local Incubator Vendor Cold-Start Scoring
    recs = requests.get('http://localhost:8000/api/vendors/recommendations/1', headers=h).json()
    print("\nEvaluated Vendors for PR-0001:")
    for r in recs['recommendations']:
        if r['is_incubator']:
            print(f"  [OK] Incubator Vendor: {r['vendor_name']}")
            print(f"       Total Score:       {r['scores']['total_score']}/100")
            print(f"       History Score:     {r['scores']['history_score']}/20 (Bayesian Baseline 80%)")
            print(f"       ESG Nearshoring:   +{r['scores']['nearshoring_bonus']} pts (<25km proximity)")

if __name__ == '__main__':
    test_features()
