import os
import sys
import glob

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.database import engine, Base, SessionLocal
from app import models

def reset_records():
    print("=" * 55)
    print("LOKPROCURE - CLEAN DATABASE RESET (PRs, POs, APPROVALS)")
    print("=" * 55)

    db = SessionLocal()
    try:
        # Delete dependent operational records
        num_pos = db.query(models.PurchaseOrder).delete()
        num_workflows = db.query(models.ApprovalWorkflow).delete()
        num_compliance = db.query(models.ComplianceCheck).delete()
        num_bids = db.query(models.VendorBid).delete()
        num_prs = db.query(models.PurchaseRequest).delete()

        db.commit()

        print(f"[OK] Removed {num_pos} Purchase Orders")
        print(f"[OK] Removed {num_workflows} Approval Workflows")
        print(f"[OK] Removed {num_compliance} Compliance Checks")
        print(f"[OK] Removed {num_bids} Vendor Bids")
        print(f"[OK] Removed {num_prs} Purchase Requests")

        # Clean generated PDFs
        pos_dir = os.path.join(backend_dir, "generated_pos")
        if os.path.exists(pos_dir):
            pdf_files = glob.glob(os.path.join(pos_dir, "*.pdf"))
            for f in pdf_files:
                try:
                    os.remove(f)
                except Exception as e:
                    pass
            print(f"[OK] Cleaned {len(pdf_files)} PDF files in generated_pos/")

        # Verify users and vendors are intact
        user_count = db.query(models.User).count()
        vendor_count = db.query(models.Vendor).count()
        perf_count = db.query(models.VendorPerformance).count()

        print("\n[PRESERVED CORE SETUP]")
        print(f"  - User Personas:     {user_count} Active (Priya, Rajesh, Kavita, Arjun, Rohan)")
        print(f"  - Qualified Vendors: {vendor_count} Active (Apex, Nexus, Titan, Vanguard, etc.)")
        print(f"  - Historical Metrics:{perf_count} Records")
        print("\n" + "=" * 55)
        print("DATABASE IS CLEAN & READY FOR FRESH DEMO RECORDS!")
        print("=" * 55)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database reset failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_records()
