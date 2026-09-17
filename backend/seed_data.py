import os
import sys
import datetime
from sqlalchemy.orm import Session

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.database import engine, Base, SessionLocal
from app import models, auth
from app.routers.government.approvals import (
    evaluate_routing_rule,
    generate_po_pdf
)

from app.routers.government.vendors import compute_vendor_score
from app.routers.government.purchase_requests import auto_generate_rfq_bids

def seed_database():
    print("[INFO] Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # Ensure SQLite columns exist
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            res_v = conn.execute(text("PRAGMA table_info(vendors);")).fetchall()
            cols_v = [r[1] for r in res_v]
            if "is_local_vendor" not in cols_v:
                conn.execute(text("ALTER TABLE vendors ADD COLUMN is_local_vendor BOOLEAN DEFAULT 0;"))
            if "is_incubator" not in cols_v:
                conn.execute(text("ALTER TABLE vendors ADD COLUMN is_incubator BOOLEAN DEFAULT 0;"))
            if "local_proximity_km" not in cols_v:
                conn.execute(text("ALTER TABLE vendors ADD COLUMN local_proximity_km FLOAT DEFAULT 15.0;"))

            res_po = conn.execute(text("PRAGMA table_info(purchase_orders);")).fetchall()
            cols_po = [r[1] for r in res_po]
            if "netsuite_internal_id" not in cols_po:
                conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN netsuite_internal_id VARCHAR(50) DEFAULT 'NS-REC-10482';"))
            if "netsuite_sync_status" not in cols_po:
                conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN netsuite_sync_status VARCHAR(50) DEFAULT 'Synced (SuiteTalk REST)';"))
            if "netsuite_subsidiary" not in cols_po:
                conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN netsuite_subsidiary VARCHAR(100) DEFAULT 'TechCorp Americas (Sub 01)';"))
            if "netsuite_gl_account" not in cols_po:
                conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN netsuite_gl_account VARCHAR(100) DEFAULT '6010 - Direct Sourcing & Material CapEx';"))
            conn.commit()
    except Exception as e:
        pass

    db: Session = SessionLocal()

    try:
        # Check if users already exist
        if db.query(models.User).first():
            print("[INFO] Database already contains data. Clearing old records for a fresh seed...")
            db.query(models.PurchaseOrder).delete()
            db.query(models.ApprovalWorkflow).delete()
            db.query(models.ComplianceCheck).delete()
            db.query(models.VendorBid).delete()
            db.query(models.PurchaseRequest).delete()
            db.query(models.VendorPerformance).delete()
            db.query(models.Vendor).delete()
            db.query(models.User).delete()
            db.commit()

        print("[INFO] Seeding User Personas...")
        users = [
            models.User(
                email="admin@procureiq.internal",
                password_hash=auth.get_password_hash("admin123"),
                full_name="Priya Sharma",
                role="Lead Procurement Officer",
                department="Supply Chain"
            ),
            models.User(
                email="planthead@procureiq.internal",
                password_hash=auth.get_password_hash("plant123"),
                full_name="Rajesh Verma",
                role="Plant Head",
                department="Operations"
            ),
            models.User(
                email="vpops@procureiq.internal",
                password_hash=auth.get_password_hash("vp123"),
                full_name="Kavita Reddy",
                role="VP Operations",
                department="Operations"
            ),
            models.User(
                email="finance@procureiq.internal",
                password_hash=auth.get_password_hash("finance123"),
                full_name="Arjun Patel",
                role="Finance Director",
                department="Finance"
            ),
            models.User(
                email="deptmgr@procureiq.internal",
                password_hash=auth.get_password_hash("dept123"),
                full_name="Rohan Mehta",
                role="Department Manager",
                department="Engineering"
            )
        ]
        db.add_all(users)
        db.commit()

        # Refresh users map
        user_map = {u.role: u for u in db.query(models.User).all()}

        print("[INFO] Seeding Vendors...")
        vendors = [
            models.Vendor(
                name="Apex Global Industrial",
                contact_email="bids@apexindustrial.com",
                phone="+1 (800) 555-0191",
                avg_delivery_days=3,
                reliability_score=98.5,
                pricing_tier="Enterprise Tier-1",
                specialties="Heavy Industrial Machinery, Plant Automation & Safety Systems",
                status="Active"
            ),
            models.Vendor(
                name="Nexus Tech Supplies",
                contact_email="enterprise@nexustech.io",
                phone="+1 (800) 555-0144",
                avg_delivery_days=2,
                reliability_score=96.0,
                pricing_tier="Enterprise Tier-1",
                specialties="Server Hardware, Cloud Infrastructure, Industrial IoT",
                status="Active"
            ),
            models.Vendor(
                name="Titan Precision Works",
                contact_email="sales@titanprecision.com",
                phone="+1 (800) 555-0182",
                avg_delivery_days=3,
                reliability_score=97.0,
                pricing_tier="Enterprise Tier-1",
                specialties="Precision CNC, Aerospace Tooling, Custom Fabrication",
                status="Active"
            ),
            models.Vendor(
                name="ProSource Logistics",
                contact_email="quotes@prosource-logistics.net",
                phone="+1 (800) 555-0177",
                avg_delivery_days=5,
                reliability_score=89.5,
                pricing_tier="Mid-Tier",
                specialties="Office Hardware, Commercial Equipment, Warehouse Logistics",
                status="Active"
            ),
            models.Vendor(
                name="Vanguard Components",
                contact_email="procure@vanguardcomp.com",
                phone="+1 (800) 555-0129",
                avg_delivery_days=4,
                reliability_score=91.0,
                pricing_tier="Mid-Tier",
                specialties="Electrical Panels, Automation Sensors, Hydraulic Valves",
                status="Active"
            ),
            models.Vendor(
                name="Global Logistics & MRO",
                contact_email="supply@globallogisticsmro.com",
                phone="+1 (800) 555-0163",
                avg_delivery_days=5,
                reliability_score=88.0,
                pricing_tier="Mid-Tier",
                specialties="Facility Maintenance, Mechanical Parts, Janitorial MRO",
                status="Active"
            ),
            models.Vendor(
                name="SwiftSupply Co.",
                contact_email="orders@swiftsupplyco.com",
                phone="+1 (800) 555-0155",
                avg_delivery_days=7,
                reliability_score=82.5,
                pricing_tier="Economy Tier",
                specialties="Bulk Raw Materials, Packaging, Corrugated Paper, General Fasteners",
                status="Active"
            ),
            models.Vendor(
                name="ValueCraft Enterprises",
                contact_email="support@valuecraft.biz",
                phone="+1 (800) 555-0138",
                avg_delivery_days=6,
                reliability_score=84.0,
                pricing_tier="Economy Tier",
                specialties="Standard Tooling, Bulk PPE, Basic Consumables",
                status="Active"
            ),
            models.Vendor(
                name="Metro Local Precision & Fab (Local SMB)",
                contact_email="bids@metrolocal.io",
                phone="+1 (800) 555-0188",
                avg_delivery_days=2,
                reliability_score=85.0,
                pricing_tier="Economy Tier",
                specialties="Local Precision CNC Stamping, Same-Day Emergency Prototyping & Nearshore Fab",
                status="Active",
                is_local_vendor=True,
                is_incubator=True,
                local_proximity_km=8.5
            )
        ]
        db.add_all(vendors)
        db.commit()

        vendor_records = db.query(models.Vendor).all()

        print("[INFO] Seeding Vendor Performance History (delivery_time, order_accuracy, quality)...")
        performances = []
        for v in vendor_records:
            if getattr(v, "is_incubator", False):
                # New Local Supplier: Zero legacy ERP transactions. Evaluated via Bayesian Cold-Start Prior & ESG bonus
                continue
            base_rel = v.reliability_score
            # Add delivery_time metric
            performances.append(models.VendorPerformance(
                vendor_id=v.id,
                metric_type="delivery_time",
                value=round(min(100.0, base_rel + 1.5), 1),
                recorded_at=datetime.datetime.utcnow() - datetime.timedelta(days=15),
                notes="On-time dock arrival verified against purchase order SLA."
            ))
            # Add order_accuracy metric
            performances.append(models.VendorPerformance(
                vendor_id=v.id,
                metric_type="order_accuracy",
                value=round(min(100.0, base_rel - 0.5), 1),
                recorded_at=datetime.datetime.utcnow() - datetime.timedelta(days=10),
                notes="100% SKU match during NetSuite barcode scanning."
            ))
            # Add quality metric
            performances.append(models.VendorPerformance(
                vendor_id=v.id,
                metric_type="quality",
                value=round(min(100.0, base_rel + 0.5), 1),
                recorded_at=datetime.datetime.utcnow() - datetime.timedelta(days=5),
                notes="Incoming QA inspection passed zero-defect tolerance."
            ))
        db.add_all(performances)
        db.commit()

        print("[INFO] Seeding Realistic Sample Purchase Requests & Bids...")

        # PR 1: Rule 1 Trigger (Budget > ₹1,00,000 AND Operations -> Plant Head) -> PO Created & Delivered (3-Way Match)
        admin_user = user_map["Lead Procurement Officer"]
        plant_head = user_map["Plant Head"]
        vp_ops = user_map["VP Operations"]
        fin_dir = user_map["Finance Director"]
        dept_mgr = user_map["Department Manager"]

        pr1 = models.PurchaseRequest(
            title="High-Throughput Automated Robotic Conveyor System",
            item_description="Automated modular conveyor assembly with integrated PLC controllers and optic sensors for Plant #4 expansion.",
            quantity=2,
            urgency="High",
            status="PO Created",
            requester_id=admin_user.id,
            department="Operations",
            estimated_budget=145000.0,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=12)
        )
        db.add(pr1)
        db.commit()
        db.refresh(pr1)
        auto_generate_rfq_bids(pr1, db)

        wf1 = models.ApprovalWorkflow(
            pr_id=pr1.id,
            approver_id=plant_head.id,
            triggered_rule="Rule 1: Operations CapEx > ₹1,00,000 requires Plant Head Approval",
            status="Approved",
            comment="Approved. Plant expansion Capex budget verified against Q3 operational plan.",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=12),
            actioned_at=datetime.datetime.utcnow() - datetime.timedelta(days=11)
        )
        db.add(wf1)

        apex_vendor = db.query(models.Vendor).filter(models.Vendor.name == "Apex Global Industrial").first()
        po1 = models.PurchaseOrder(
            pr_id=pr1.id,
            vendor_id=apex_vendor.id,
            po_number="PO-20260810-7B42",
            total_amount=139200.0,
            status="Delivered",
            pdf_url="/api/approvals/po/PO-20260810-7B42/download",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=11)
        )
        db.add(po1)
        db.commit()
        generate_po_pdf("PO-20260810-7B42", po1, pr1, apex_vendor, plant_head, wf1)

        # PR 2: Rule 2 Trigger (Critical urgency AND quantity > 500 -> VP Operations) -> Pending Approval
        pr2 = models.PurchaseRequest(
            title="Emergency High-Grade Hydraulic Actuators & Valve Seals",
            item_description="Precision hydraulic seal packs for immediate emergency overhaul of heavy stamping presses.",
            quantity=650,
            urgency="Critical",
            status="Pending Approval",
            requester_id=plant_head.id,
            department="Operations",
            estimated_budget=68000.0,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
        )
        db.add(pr2)
        db.commit()
        db.refresh(pr2)
        auto_generate_rfq_bids(pr2, db)

        wf2 = models.ApprovalWorkflow(
            pr_id=pr2.id,
            approver_id=vp_ops.id,
            triggered_rule="Rule 2: Critical Bulk Urgency (>500 units) requires VP Operations Approval",
            status="Pending",
            comment="Pending critical production line contingency sign-off.",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
        )
        db.add(wf2)
        db.commit()

        # PR 3: Rule 3 Trigger (Budget > ₹50,000 -> Finance Director) -> Pending Approval
        pr3 = models.PurchaseRequest(
            title="Enterprise Cloud Server Blade Cluster & Fibre SAN Switch",
            item_description="Redundant high-availability cluster servers for ERP NetSuite database migration and disaster recovery.",
            quantity=8,
            urgency="Medium",
            status="Pending Approval",
            requester_id=dept_mgr.id,
            department="IT",
            estimated_budget=92000.0,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=18)
        )
        db.add(pr3)
        db.commit()
        db.refresh(pr3)
        auto_generate_rfq_bids(pr3, db)

        wf3 = models.ApprovalWorkflow(
            pr_id=pr3.id,
            approver_id=fin_dir.id,
            triggered_rule="Rule 3: High Value (> ₹50,000) requires Finance Director Approval",
            status="Pending",
            comment="Pending IT infrastructure Capex budget allocation verification.",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=18)
        )
        db.add(wf3)
        db.commit()

        # PR 4: Rule 4 Trigger (Default -> Department Manager) -> PO Created & Acknowledged (In Transit)
        pr4 = models.PurchaseRequest(
            title="Precision CNC Tooling Calibration Sensor Heads",
            item_description="High-precision laser interferometry sensor heads for sub-micron CNC machine calibration.",
            quantity=6,
            urgency="Medium",
            status="PO Created",
            requester_id=dept_mgr.id,
            department="Manufacturing",
            estimated_budget=28500.0,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=4)
        )
        db.add(pr4)
        db.commit()
        db.refresh(pr4)
        auto_generate_rfq_bids(pr4, db)

        wf4 = models.ApprovalWorkflow(
            pr_id=pr4.id,
            approver_id=dept_mgr.id,
            triggered_rule="Rule 4: Standard Department Manager Approval",
            status="Approved",
            comment="Authorized for immediate calibration cycle.",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=4),
            actioned_at=datetime.datetime.utcnow() - datetime.timedelta(days=3)
        )
        db.add(wf4)

        titan_vendor = db.query(models.Vendor).filter(models.Vendor.name == "Titan Precision Works").first()
        po4 = models.PurchaseOrder(
            pr_id=pr4.id,
            vendor_id=titan_vendor.id,
            po_number="PO-20260818-E910",
            total_amount=27100.0,
            status="Acknowledged",
            pdf_url="/api/approvals/po/PO-20260818-E910/download",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=3)
        )
        db.add(po4)
        db.commit()
        generate_po_pdf("PO-20260818-E910", po4, pr4, titan_vendor, dept_mgr, wf4)

        # PR 5: Standard Facilities MRO & PPE Supplies
        pr5 = models.PurchaseRequest(
            title="Quarterly Facility Industrial PPE & Safety Kits",
            item_description="Bulk safety helmets, cut-resistant gloves, arc-flash face shields, and spill containment kits.",
            quantity=250,
            urgency="Low",
            status="Pending Approval",
            requester_id=admin_user.id,
            department="Supply Chain",
            estimated_budget=14200.0,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=6)
        )
        db.add(pr5)
        db.commit()
        db.refresh(pr5)
        auto_generate_rfq_bids(pr5, db)

        wf5 = models.ApprovalWorkflow(
            pr_id=pr5.id,
            approver_id=admin_user.id,
            triggered_rule="Rule 4: Standard Department Manager Approval",
            status="Pending",
            comment="Routine quarterly replenishment batch.",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=6)
        )
        db.add(wf5)
        db.commit()

        # Seed compliance checks for all PRs
        import json
        from app.compliance.compliance_service import evaluate_compliance
        from app.compliance.ingest import init_policy_db

        init_policy_db()
        print("[INFO] Evaluating and seeding compliance checks for all PRs...")
        for pr in [pr1, pr2, pr3, pr4, pr5]:
            bids_cnt = db.query(models.VendorBid).filter(models.VendorBid.pr_id == pr.id).count()
            comp_res = evaluate_compliance({
                "id": pr.id,
                "title": pr.title,
                "item_description": pr.item_description,
                "department": pr.department,
                "estimated_budget": pr.estimated_budget,
                "urgency": pr.urgency,
                "quantity": pr.quantity,
                "bids_count": bids_cnt
            })
            c_check = models.ComplianceCheck(
                pr_id=pr.id,
                compliant=bool(comp_res.get("compliant", True)),
                violations_json=json.dumps(comp_res.get("violations", [])),
                required_action=comp_res.get("required_action", "")
            )
            db.add(c_check)
        db.commit()

        print("[SUCCESS] Database seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during database seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

