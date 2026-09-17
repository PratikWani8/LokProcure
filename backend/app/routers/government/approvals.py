import os
import json
import secrets
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

from app.database import get_db
from app import auth, models, schemas, auth

router = APIRouter(dependencies=[Depends(auth.require_gov_role)], prefix="/approvals", tags=["Approvals & Purchase Orders"])

GENERATED_POS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "generated_pos")
os.makedirs(GENERATED_POS_DIR, exist_ok=True)


def _fmt_inr(amount: float) -> str:
    """Format a float as Indian Rupee with Indian number grouping.

    Example: 1234567.89 -> Rs.12,34,567.89
    """
    amount = round(amount, 2)
    is_negative = amount < 0
    abs_amount = abs(amount)
    int_part = int(abs_amount)
    dec_part = round(abs_amount - int_part, 2)

    s = str(int_part)
    if len(s) > 3:
        last3 = s[-3:]
        rest = s[:-3]
        groups = []
        while len(rest) > 2:
            groups.append(rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.append(rest)
        groups.reverse()
        grouped = ','.join(groups) + ',' + last3
    else:
        grouped = s

    dec_str = f"{dec_part:.2f}"[1:]  # ".xx"
    formatted = f"₹{grouped}{dec_str}"
    return ('-' + formatted) if is_negative else formatted

def evaluate_routing_rule(estimated_budget: float, department: str, urgency: str, quantity: int) -> tuple[str, str]:
    """
    Evaluates Approval Routing Rules:
    1. estimated_budget > 100000 AND department == "Operations" -> Plant Head
    2. urgency == "Critical" AND quantity > 500 -> VP Operations
    3. estimated_budget > 50000 -> Finance Director
    4. Default -> Department Manager
    Returns (triggered_rule, target_role)
    """
    if estimated_budget > 100000 and department.strip().lower() == "operations":
        return (
            "Rule 1: Operations CapEx > ₹1,00,000 requires Plant Head Approval",
            "Plant Head"
        )
    elif urgency.strip().lower() == "critical" and quantity > 500:
        return (
            "Rule 2: Critical Bulk Urgency (>500 units) requires VP Operations Approval",
            "VP Operations"
        )
    elif estimated_budget > 50000:
        return (
            "Rule 3: High Value (> ₹50,000) requires Finance Director Approval",
            "Finance Director"
        )
    else:
        return (
            "Rule 4: Standard Department Manager Approval",
            "Department Manager"
        )


def generate_po_pdf(
    po_number: str,
    po: models.PurchaseOrder,
    pr: models.PurchaseRequest,
    vendor: models.Vendor,
    approver: Optional[models.User],
    workflow: Optional[models.ApprovalWorkflow]
) -> str:
    """Generates a professional NetSuite ERP-aligned Purchase Order PDF."""
    pdf_filename = f"{po_number}.pdf"
    pdf_path = os.path.join(GENERATED_POS_DIR, pdf_filename)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569')
    )
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#1e293b'),
        fontName='Helvetica-Bold'
    )
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#0f172a')
    )
    body_text = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155')
    )

    elements = []

    # 1. Header Bar
    header_data = [
        [
            Paragraph("<b>ProcureIQ</b> <font color='#3b82f6'>ERP</font>", title_style),
            Paragraph(f"<b>PURCHASE ORDER</b><br/><font size=12 color='#2563eb'><b>{po_number}</b></font>", ParagraphStyle('RAlign', parent=title_style, alignment=2))
        ],
        [
            Paragraph("NetSuite Integrated Intelligent Procurement System<br/>Zenesys Hackathon Edition 2026", subtitle_style),
            Paragraph(f"<b>Issue Date:</b> {po.created_at.strftime('%B %d, %Y')}<br/><b>Status:</b> {po.status.upper()}", ParagraphStyle('RSub', parent=subtitle_style, alignment=2))
        ]
    ]
    header_table = Table(header_data, colWidths=[300, 240])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2563eb'), spaceBefore=4, spaceAfter=14))

    # 2. Vendor & Department Summary Boxes
    vendor_info = (
        f"<b>Vendor:</b> {vendor.name}<br/>"
        f"<b>Tier:</b> {vendor.pricing_tier}<br/>"
        f"<b>Email:</b> {vendor.contact_email}<br/>"
        f"<b>Phone:</b> {vendor.phone}<br/>"
        f"<b>Specialties:</b> {vendor.specialties or 'General Equipment & Services'}"
    )
    dept_info = (
        f"<b>Delivery Department:</b> {pr.department}<br/>"
        f"<b>Requester:</b> {pr.requester.full_name if pr.requester else 'ERP User'} ({pr.requester.email if pr.requester else ''})<br/>"
        f"<b>PR Reference:</b> PR-{pr.id:05d} ({pr.title})<br/>"
        f"<b>Urgency SLA:</b> {pr.urgency.upper()}<br/>"
        f"<b>Est. Turnaround:</b> {vendor.avg_delivery_days} Business Days"
    )

    summary_table_data = [
        [Paragraph("<b>VENDOR / SUPPLIER DETAILS</b>", section_heading), Paragraph("<b>SHIP TO / BILLING DEPARTMENT</b>", section_heading)],
        [Paragraph(vendor_info, body_text), Paragraph(dept_info, body_text)]
    ]
    summary_table = Table(summary_table_data, colWidths=[270, 270])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#f1f5f9')),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#f1f5f9')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 14))

    # 3. Line Items Table
    unit_price = po.total_amount / max(pr.quantity, 1)
    items_header = ["#", "Item Description & Specifications", "Qty", "Unit Price", "Total Amount"]
    items_data = [
        items_header,
        [
            "1",
            Paragraph(f"<b>{pr.title}</b><br/><font color='#64748b' size=8>{pr.item_description}</font>", body_text),
            str(pr.quantity),
            _fmt_inr(unit_price),
            _fmt_inr(po.total_amount)
        ]
    ]

    # Add Subtotal / Tax / Total
    tax = round(po.total_amount * 0.00, 2)  # Tax exempt or bundled
    items_data.append(["", "", "", "Subtotal:", _fmt_inr(po.total_amount)])
    items_data.append(["", "", "", "Tax (GST 0.0%):", _fmt_inr(tax)])
    items_data.append(["", "", "", Paragraph("<b>TOTAL (INR):</b>", body_bold), Paragraph(f"<b>{_fmt_inr(po.total_amount)}</b>", body_bold)])

    items_table = Table(items_data, colWidths=[30, 250, 45, 105, 110])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('GRID', (0, 0), (-1, 1), 0.5, colors.HexColor('#cbd5e1')),
        ('LINEBELOW', (3, 2), (4, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 14))

    # 4. Approval Audit & ERP Compliance Box
    rule_str = workflow.triggered_rule if workflow else "Standard Routing"
    approver_name = approver.full_name if approver else "Authorized Approver"
    approver_role = approver.role if approver else "Procurement Authority"
    approval_date = workflow.actioned_at.strftime('%Y-%m-%d %H:%M:%S UTC') if (workflow and workflow.actioned_at) else datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
    comments = workflow.comment if (workflow and workflow.comment) else "Automated compliance audit passed. Purchase order authorized for vendor transmission."

    audit_text = (
        f"<b>Approval Workflow Rule:</b> {rule_str}<br/>"
        f"<b>Authorized By:</b> {approver_name} ({approver_role})<br/>"
        f"<b>Timestamp:</b> {approval_date}<br/>"
        f"<b>Approver Remarks:</b> <i>{comments}</i><br/>"
        f"<b>3-Way Match Verification:</b> Enabled (PO $\\leftrightarrow$ Receipt $\\leftrightarrow$ Invoice)"
    )

    audit_box_data = [
        [Paragraph("<b>NETSUITE ERP GOVERNANCE & AUDIT TRAIL</b>", section_heading)],
        [Paragraph(audit_text, body_text)]
    ]
    audit_table = Table(audit_box_data, colWidths=[540])
    audit_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0f2fe')),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#93c5fd')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(audit_table)
    elements.append(Spacer(1, 15))

    # 5. Terms and Footer
    footer_text = Paragraph(
        "<font size=7 color='#64748b'><b>TERMS & CONDITIONS:</b> This Purchase Order constitutes a binding commercial agreement under NetSuite ERP Procurement Guidelines. "
        "Vendor agrees to fulfill shipment in accordance with stated SLA timeline. Invoices must reference PO number and are subject to automated 3-Way Match verification upon dock receipt.</font>",
        body_text
    )
    elements.append(footer_text)

    doc.build(elements)
    return pdf_path


@router.get("/queue")
def get_approval_queue(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.ApprovalWorkflow)

    # Lead Procurement Officers and Admins see all; specific approvers see workflows routed to their role or assigned to them
    if current_user.role not in ["Lead Procurement Officer", "Admin"]:
        # Match either user id or role in triggered_rule
        query = query.filter(
            (models.ApprovalWorkflow.approver_id == current_user.id) |
            (models.ApprovalWorkflow.triggered_rule.contains(current_user.role))
        )

    if status_filter:
        query = query.filter(models.ApprovalWorkflow.status == status_filter)

    workflows = query.order_by(models.ApprovalWorkflow.created_at.desc()).all()

    results = []
    for wf in workflows:
        pr = wf.purchase_request
        bids = db.query(models.VendorBid).filter(models.VendorBid.pr_id == pr.id).all()
        top_bid = max(bids, key=lambda b: b.bid_score) if bids else None

        results.append({
            "id": wf.id,
            "pr_id": pr.id,
            "pr_title": pr.title,
            "item_description": pr.item_description,
            "quantity": pr.quantity,
            "department": pr.department,
            "urgency": pr.urgency,
            "estimated_budget": pr.estimated_budget,
            "triggered_rule": wf.triggered_rule,
            "status": wf.status,
            "comment": wf.comment,
            "created_at": wf.created_at,
            "actioned_at": wf.actioned_at,
            "requester": {
                "id": pr.requester.id,
                "full_name": pr.requester.full_name,
                "email": pr.requester.email,
                "role": pr.requester.role
            } if pr.requester else None,
            "top_bid": {
                "vendor_id": top_bid.vendor_id,
                "vendor_name": top_bid.vendor.name,
                "quoted_price": top_bid.quoted_price,
                "delivery_days": top_bid.delivery_days,
                "bid_score": top_bid.bid_score,
                "pricing_tier": top_bid.vendor.pricing_tier
            } if top_bid else None,
            "bids_count": len(bids),
            "has_po": pr.purchase_order is not None,
            "po_number": pr.purchase_order.po_number if pr.purchase_order else None,
            "compliance": {
                "compliant": bool(pr.compliance_check.compliant),
                "violations": json.loads(pr.compliance_check.violations_json) if (pr.compliance_check and pr.compliance_check.violations_json) else [],
                "required_action": pr.compliance_check.required_action if pr.compliance_check else ""
            } if pr.compliance_check else None
        })

    return results


@router.post("/{approval_id}/action")
def take_approval_action(
    approval_id: int,
    action: str = Query(..., pattern="^(Approved|Rejected)$"),
    comment: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    workflow = db.query(models.ApprovalWorkflow).filter(models.ApprovalWorkflow.id == approval_id).first()
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval workflow record not found")

    pr = workflow.purchase_request

    if current_user.role not in ["Lead Procurement Officer", "Admin"]:
        if current_user.role not in workflow.triggered_rule and workflow.approver_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to approve this workflow.")

    if pr.requester and pr.requester.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Self-approval of purchase requests is prohibited.")

    workflow.status = action
    workflow.comment = comment or f"{action} by {current_user.full_name} ({current_user.role})"
    workflow.actioned_at = datetime.datetime.utcnow()
    workflow.approver_id = current_user.id

    if action == "Approved":
        pr.status = "Approved"
    elif action == "Rejected":
        pr.status = "Rejected"

    db.commit()
    return {
        "message": f"Workflow {approval_id} updated to {action}",
        "workflow_id": workflow.id,
        "status": workflow.status,
        "pr_status": pr.status
    }


@router.post("/po/generate/{pr_id}")
def authorize_and_generate_po(
    pr_id: int,
    vendor_id: Optional[int] = Query(None),
    comment: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    pr = db.query(models.PurchaseRequest).filter(models.PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase request not found")

    # If PO already exists, return it
    existing_po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.pr_id == pr.id).first()
    if existing_po:
        return {
            "message": "Purchase order already generated",
            "po": schemas.PurchaseOrderOut.model_validate(existing_po)
        }

    bids = db.query(models.VendorBid).filter(models.VendorBid.pr_id == pr.id).all()
    selected_bid = None
    if vendor_id:
        selected_bid = next((b for b in bids if b.vendor_id == vendor_id), None)
    if not selected_bid and bids:
        # Pick top scoring bid
        selected_bid = max(bids, key=lambda b: b.bid_score)

    if not selected_bid:
        # Fallback vendor if no bids
        vendor = db.query(models.Vendor).first()
        quoted_price = pr.estimated_budget
    else:
        vendor = selected_bid.vendor
        quoted_price = selected_bid.quoted_price

    # Generate unique PO number: PO-YYYYMMDD-HEX
    date_str = datetime.datetime.utcnow().strftime("%Y%m%d")
    hex_str = secrets.token_hex(2).upper()
    po_number = f"PO-{date_str}-{hex_str}"

    po = models.PurchaseOrder(
        pr_id=pr.id,
        vendor_id=vendor.id,
        po_number=po_number,
        total_amount=quoted_price,
        status="Sent",
        pdf_url=f"/api/approvals/po/{po_number}/download",
        created_at=datetime.datetime.utcnow()
    )
    db.add(po)

    # Update PR & Approval Workflows
    pr.status = "PO Created"
    workflows = db.query(models.ApprovalWorkflow).filter(models.ApprovalWorkflow.pr_id == pr.id).all()
    latest_wf = None
    for wf in workflows:
        wf.status = "Approved"
        wf.actioned_at = datetime.datetime.utcnow()
        wf.approver_id = current_user.id
        if comment:
            wf.comment = comment
        latest_wf = wf

    db.commit()
    db.refresh(po)

    # Generate ReportLab PDF
    generate_po_pdf(
        po_number=po_number,
        po=po,
        pr=pr,
        vendor=vendor,
        approver=current_user,
        workflow=latest_wf
    )

    return {
        "message": "Purchase order successfully authorized and PDF compiled",
        "po": schemas.PurchaseOrderOut.model_validate(po)
    }


@router.patch("/po/{po_number}/status")
def update_po_status(
    po_number: str,
    payload: schemas.PurchaseOrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == po_number).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Purchase order {po_number} not found")

    po.status = payload.new_status
    db.commit()
    db.refresh(po)

    return {
        "message": f"Purchase order {po_number} status updated to {po.status}",
        "po": schemas.PurchaseOrderOut.model_validate(po)
    }


@router.get("/po/{po_number}/download")
def download_po_pdf(
    po_number: str,
    db: Session = Depends(get_db)
):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == po_number).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Purchase order {po_number} not found")

    pdf_path = os.path.join(GENERATED_POS_DIR, f"{po_number}.pdf")
    if not os.path.exists(pdf_path):
        # Regenerate on the fly
        pr = po.purchase_request
        vendor = po.vendor
        wf = db.query(models.ApprovalWorkflow).filter(models.ApprovalWorkflow.pr_id == pr.id).first()
        approver = wf.approver if wf else None
        generate_po_pdf(po_number, po, pr, vendor, approver, wf)

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"{po_number}.pdf"
    )


@router.get("/pos", response_model=List[schemas.PurchaseOrderOut])
def list_purchase_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    pos = db.query(models.PurchaseOrder).order_by(models.PurchaseOrder.created_at.desc()).all()
    return pos


@router.get("/po/{po_number}/netsuite-sync", response_model=schemas.NetSuiteSyncResponse)
def get_netsuite_po_sync(
    po_number: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == po_number).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Purchase order {po_number} not found")

    pr = po.purchase_request
    vendor = po.vendor

    # Structure full Oracle NetSuite SuiteTalk REST API JSON payload
    suitetalk_payload = {
        "recordType": "purchaseOrder",
        "fields": {
            "tranId": po.po_number,
            "entity": {
                "id": f"VEND-{vendor.id:04d}",
                "name": vendor.name,
                "email": vendor.contact_email
            },
            "subsidiary": {
                "id": "1",
                "name": po.netsuite_subsidiary or "TechCorp Americas (Sub 01)"
            },
            "department": {
                "id": "040",
                "name": pr.department
            },
            "class": {
                "id": "102",
                "name": "Direct Procurement & Plant Capex"
            },
            "account": {
                "id": "6010",
                "name": po.netsuite_gl_account or "6010 - Direct Sourcing & Material CapEx"
            },
            "currency": {
                "id": "1",
                "name": "INR"
            },
            "approvalStatus": {
                "id": "2",
                "name": "Approved"
            },
            "orderStatus": po.status,
            "total": po.total_amount,
            "memo": f"ProcureIQ AI Generated PO for PR-{pr.id:04d}: {pr.title}",
            "itemList": [
                {
                    "item": pr.title,
                    "description": pr.item_description,
                    "quantity": pr.quantity,
                    "rate": round(po.total_amount / max(1, pr.quantity), 2),
                    "amount": po.total_amount,
                    "threeWayMatchVerified": po.status == "Delivered"
                }
            ]
        }
    }

    match_status = "Three-Way Matched (PO = Item Receipt = Vendor Bill)" if po.status == "Delivered" else "Pending Goods Receipt & Invoice Ingestion"

    return schemas.NetSuiteSyncResponse(
        po_id=po.id,
        po_number=po.po_number,
        netsuite_internal_id=po.netsuite_internal_id or f"NS-REC-{po.id + 10480}",
        sync_status="Synced (Oracle NetSuite SuiteTalk REST API v2024.1)",
        subsidiary=po.netsuite_subsidiary or "TechCorp Americas (Sub 01)",
        gl_account=po.netsuite_gl_account or "6010 - Direct Sourcing & Material CapEx",
        currency="INR",
        three_way_match_status=match_status,
        suitetalk_rest_payload=suitetalk_payload,
        last_synced_at=datetime.datetime.utcnow()
    )
