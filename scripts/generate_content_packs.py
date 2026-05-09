"""
TradeReady Co. — Content Pack Generator
Generates Files 5, 7, 8 as PDFs and File 6 as .xlsx.

Run: python3 scripts/generate_content_packs.py
Output: output/files/
"""

import os
import openpyxl
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side, numbers
)
from openpyxl.utils import get_column_letter
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

OUT = "output/files"
NAVY = HexColor("#1B3A5C")
ORANGE = HexColor("#E8500A")
LGREY = HexColor("#F5F5F5")


# ─────────────────────────────────────────────────────────────
# SHARED PDF HELPERS
# ─────────────────────────────────────────────────────────────

def base_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("TRTitle", fontName="Helvetica-Bold", fontSize=20,
                              textColor=NAVY, spaceAfter=4))
    styles.add(ParagraphStyle("TRSubtitle", fontName="Helvetica", fontSize=10,
                              textColor=HexColor("#666666"), spaceAfter=12))
    styles.add(ParagraphStyle("TRBody", fontName="Helvetica", fontSize=10,
                              leading=14, spaceAfter=4))
    styles.add(ParagraphStyle("TRBold", fontName="Helvetica-Bold", fontSize=10,
                              leading=14, spaceAfter=4))
    styles.add(ParagraphStyle("TRSmall", fontName="Helvetica", fontSize=8,
                              textColor=HexColor("#666666"), spaceAfter=2))
    styles.add(ParagraphStyle("TRFooter", fontName="Helvetica", fontSize=7,
                              textColor=HexColor("#999999"), alignment=TA_CENTER))
    styles.add(ParagraphStyle("TRSectionHead", fontName="Helvetica-Bold", fontSize=11,
                              textColor=NAVY, spaceBefore=10, spaceAfter=4))
    styles.add(ParagraphStyle("TRScriptLabel", fontName="Helvetica-Bold", fontSize=9,
                              textColor=ORANGE, spaceAfter=2, spaceBefore=8))
    styles.add(ParagraphStyle("TRScriptBody", fontName="Helvetica", fontSize=10,
                              leading=14, leftIndent=10, spaceAfter=4,
                              borderPadding=(6, 6, 6, 6)))
    styles.add(ParagraphStyle("TRCaption", fontName="Helvetica", fontSize=10,
                              leading=14, spaceAfter=4))
    styles.add(ParagraphStyle("TRHashtag", fontName="Helvetica-Oblique", fontSize=8,
                              textColor=HexColor("#3366CC"), spaceAfter=10))
    return styles


def pdf_header_table(styles):
    logo_cell = Paragraph(
        '<font color="#CCCCCC">[Insert Logo Here]</font>',
        ParagraphStyle("Logo", fontName="Helvetica", fontSize=8,
                       textColor=HexColor("#CCCCCC"), alignment=TA_CENTER)
    )
    company_cell = Paragraph(
        '<font color="white"><b>[Company Name]</b><br/>'
        'ABN/Company No: [ABN]&nbsp;&nbsp;|&nbsp;&nbsp;Ph: [Phone]<br/>'
        '[Email]&nbsp;&nbsp;|&nbsp;&nbsp;[Website]</font>',
        ParagraphStyle("CompanyHdr", fontName="Helvetica", fontSize=9,
                       textColor=white, alignment=TA_RIGHT)
    )
    hdr = Table([[logo_cell, company_cell]], colWidths=[4*cm, 13*cm], rowHeights=[2.2*cm])
    hdr.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return hdr


def build_pdf(filename, story):
    def footer_canvas(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(HexColor("#999999"))
        canvas.drawCentredString(
            A4[0] / 2, 1.2*cm,
            "TradeReady Co.  |  tradereadyco.com  |  "
            "Template by TradeReady Co. — not legal advice"
        )
        canvas.restoreState()

    doc = SimpleDocTemplate(
        filename, pagesize=A4,
        topMargin=1.5*cm, bottomMargin=2*cm,
        leftMargin=2*cm, rightMargin=2*cm
    )
    doc.build(story, onFirstPage=footer_canvas, onLaterPages=footer_canvas)


# ─────────────────────────────────────────────────────────────
# FILE 5 — CLIENT MESSAGE SCRIPTS
# ─────────────────────────────────────────────────────────────

SCRIPTS = [
    {
        "number": 1,
        "label": "Booking Confirmation",
        "when": "Send immediately after booking",
        "text": (
            "Hi [Client Name], it's [Your Name] from [Company Name]. "
            "Just confirming your booking for [Job Type] on [Job Date] at [Site Address]. "
            "I'll be there at [Arrival Time]. "
            "Any questions before then, just give me a call on [Phone]. Cheers!"
        )
    },
    {
        "number": 2,
        "label": "Day-Before Reminder",
        "when": "Send the evening before the job",
        "text": (
            "Hi [Client Name], just a quick reminder I'll be at [Site Address] tomorrow "
            "at [Arrival Time] for the [Job Type]. "
            "If anything's changed or you need to reach me, I'm on [Phone]. "
            "See you then!"
        )
    },
    {
        "number": 3,
        "label": "Running Late Notice",
        "when": "Send if arriving more than 15 minutes late",
        "text": (
            "Hi [Client Name], it's [Your Name]. I'm running about [X] minutes behind — "
            "should be with you by [New Arrival Time]. "
            "Sorry for the delay, I'm on my way. "
            "Call me on [Phone] if you need anything."
        )
    },
    {
        "number": 4,
        "label": "Job Complete — Payment Request",
        "when": "Send same day the job finishes",
        "text": (
            "Hi [Client Name], great to get that sorted for you today. "
            "I've sent through your invoice for $[Amount] — payment is due by [Due Date]. "
            "You can pay via bank transfer to [Bank Details] or let me know if you'd prefer another method. "
            "Thanks for having me!"
        )
    },
    {
        "number": 5,
        "label": "Invoice Follow-Up (Day 7)",
        "when": "Gentle first chase — send 7 days after invoice",
        "text": (
            "Hi [Client Name], just following up on invoice #[Invoice No.] for $[Amount] "
            "sent on [Invoice Date]. "
            "If you've already sorted it, please ignore this — otherwise feel free to call "
            "if you have any questions. "
            "Thanks!"
        )
    },
    {
        "number": 6,
        "label": "Invoice Follow-Up (Day 14)",
        "when": "Firmer second chase — send 14 days after invoice",
        "text": (
            "Hi [Client Name], this is a follow-up regarding invoice #[Invoice No.] for $[Amount], "
            "now 14 days overdue. "
            "Please arrange payment to [Bank Details] at your earliest convenience. "
            "If there's an issue with the invoice, please contact me directly on [Phone] "
            "so we can sort it out."
        )
    },
    {
        "number": 7,
        "label": "Invoice Follow-Up (Day 30)",
        "when": "Final notice — send 30 days after invoice",
        "text": (
            "Hi [Client Name], this is a final notice regarding invoice #[Invoice No.] for $[Amount], "
            "now 30 days overdue. "
            "Please note that under our payment terms, a 2% monthly late fee now applies. "
            "If payment is not received by [Final Date], I will need to pursue formal recovery options. "
            "Please contact me urgently on [Phone] to resolve this."
        )
    },
    {
        "number": 8,
        "label": "Google Review Request — Version A (Casual)",
        "when": "Send within 24 hours of completing a job",
        "text": (
            "Hi [Client Name], hope everything's looking good! "
            "If you were happy with the work, it'd mean a lot if you could leave us a quick Google review — "
            "it only takes 2 minutes and really helps other tradies find us. "
            "Here's the link: [Google Review Link]. Cheers!"
        )
    },
    {
        "number": 9,
        "label": "Google Review Request — Version B (Formal)",
        "when": "Alternative version — use for more formal clients",
        "text": (
            "Dear [Client Name], thank you for choosing [Company Name] for your recent [Job Type]. "
            "We hope you were satisfied with the result. "
            "If you have a moment, we'd greatly appreciate a Google review — your feedback helps us "
            "continue providing quality service. "
            "You can leave a review here: [Google Review Link]. "
            "Thank you sincerely, [Your Name]."
        )
    },
    {
        "number": 10,
        "label": "Referral Ask",
        "when": "Send 2 weeks after completing a job",
        "text": (
            "Hi [Client Name], just checking everything's still going well since the job. "
            "If you know anyone who could use a reliable [Trade Type] — a friend, neighbour, or family member — "
            "I'd really appreciate the referral. "
            "Happy to offer [Referral Incentive, e.g. '10% off their first job']. "
            "Word of mouth is how I keep the business running — thanks for your support!"
        )
    },
]


def generate_message_scripts_pdf():
    styles = base_styles()
    story = []

    story.append(pdf_header_table(styles))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("CLIENT MESSAGE SCRIPTS", styles["TRTitle"]))
    story.append(Paragraph(
        "10 ready-to-send SMS and WhatsApp scripts for every stage of the job.",
        styles["TRSubtitle"]
    ))
    story.append(Paragraph(
        "HOW TO USE: Copy the script, replace all [bracketed] fields with your details, "
        "and send via SMS, WhatsApp, or email. Keep it short and plain.",
        ParagraphStyle("Tip", fontName="Helvetica-Oblique", fontSize=9,
                       textColor=HexColor("#444444"), spaceAfter=10,
                       borderPadding=4)
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY))

    for script in SCRIPTS:
        block = []
        block.append(Paragraph(
            f"SCRIPT {script['number']} — {script['label'].upper()}",
            styles["TRScriptLabel"]
        ))
        block.append(Paragraph(
            f"<i>When to send: {script['when']}</i>",
            ParagraphStyle("When", fontName="Helvetica-Oblique", fontSize=8,
                           textColor=HexColor("#888888"), spaceAfter=4)
        ))
        msg_table = Table(
            [[Paragraph(script["text"], styles["TRBody"])]],
            colWidths=[17*cm]
        )
        msg_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LGREY),
            ("BOX", (0, 0), (-1, -1), 1, NAVY),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        block.append(msg_table)
        story.append(KeepTogether(block))

    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#CCCCCC")))
    story.append(Paragraph(
        "TIP: Ask within 24 hours of job completion — response rates drop significantly after 48 hours.",
        ParagraphStyle("FinalTip", fontName="Helvetica-Bold", fontSize=9,
                       textColor=ORANGE, spaceBefore=6, spaceAfter=4)
    ))

    path = f"{OUT}/05_TradeReady_Client_Message_Scripts.pdf"
    build_pdf(path, story)
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────
# FILE 6 — PRICING CALCULATOR (.xlsx)
# ─────────────────────────────────────────────────────────────

def generate_pricing_calculator():
    wb = openpyxl.Workbook()

    # ── Colours
    NAVY_HEX = "1B3A5C"
    ORANGE_HEX = "E8500A"
    YELLOW_HEX = "FFF9C4"
    GREEN_HEX = "C8E6C9"
    LGREY_HEX = "F5F5F5"
    WHITE_HEX = "FFFFFF"

    navy_fill = PatternFill("solid", fgColor=NAVY_HEX)
    orange_fill = PatternFill("solid", fgColor=ORANGE_HEX)
    yellow_fill = PatternFill("solid", fgColor=YELLOW_HEX)
    green_fill = PatternFill("solid", fgColor=GREEN_HEX)
    grey_fill = PatternFill("solid", fgColor=LGREY_HEX)

    white_bold = Font(name="Arial", bold=True, color="FFFFFF", size=11)
    navy_bold = Font(name="Arial", bold=True, color=NAVY_HEX, size=11)
    orange_bold = Font(name="Arial", bold=True, color=ORANGE_HEX, size=12)
    normal = Font(name="Arial", size=10)
    bold_10 = Font(name="Arial", bold=True, size=10)
    centre = Alignment(horizontal="center", vertical="center")
    right = Alignment(horizontal="right", vertical="center")
    left = Alignment(horizontal="left", vertical="center")
    thin = Side(style="thin", color="CCCCCC")
    thin_border = Border(left=thin, right=thin, top=thin, bottom=thin)

    def hdr_cell(ws, row, col, text, span_end=None):
        cell = ws.cell(row=row, column=col, value=text)
        cell.fill = navy_fill
        cell.font = white_bold
        cell.alignment = centre
        if span_end:
            ws.merge_cells(start_row=row, start_column=col,
                           end_row=row, end_column=span_end)

    def label_cell(ws, row, col, text):
        c = ws.cell(row=row, column=col, value=text)
        c.font = bold_10
        c.alignment = left
        c.fill = grey_fill
        c.border = thin_border
        return c

    def input_cell(ws, row, col, value=None):
        c = ws.cell(row=row, column=col, value=value)
        c.fill = yellow_fill
        c.font = normal
        c.alignment = right
        c.border = thin_border
        c.number_format = "#,##0.00"
        return c

    def output_cell(ws, row, col, formula=None, value=None):
        c = ws.cell(row=row, column=col, value=formula or value)
        c.fill = green_fill
        c.font = bold_10
        c.alignment = right
        c.border = thin_border
        c.number_format = "#,##0.00"
        return c

    # ──────────────────────────────────────────────
    # SHEET 1: Job Estimator
    # ──────────────────────────────────────────────
    ws1 = wb.active
    ws1.title = "Job Estimator"
    ws1.column_dimensions["A"].width = 36
    ws1.column_dimensions["B"].width = 18
    ws1.column_dimensions["C"].width = 14
    ws1.row_dimensions[1].height = 30

    # Title
    ws1.merge_cells("A1:C1")
    t = ws1.cell(row=1, column=1, value="TradeReady Co. — Job Estimator")
    t.fill = navy_fill
    t.font = Font(name="Arial", bold=True, color="FFFFFF", size=14)
    t.alignment = centre

    ws1.merge_cells("A2:C2")
    sub = ws1.cell(row=2, column=1,
                   value="Yellow cells = enter your numbers  |  Green cells = calculated outputs")
    sub.fill = PatternFill("solid", fgColor="E3EAF2")
    sub.font = Font(name="Arial", italic=True, size=9, color="444444")
    sub.alignment = centre

    # Section: Inputs
    hdr_cell(ws1, 4, 1, "INPUTS — Enter Your Job Details", span_end=3)

    input_rows = [
        ("Hourly Labour Rate ($)", 85.00),
        ("Number of Hours", 4),
        ("Number of Workers", 1),
        ("Materials Cost ($)", 0.00),
        ("Travel / Fuel Allowance ($)", 0.00),
        ("Markup on Materials (%)", 20),
        ("GST / VAT Rate (%)", 10),
    ]
    row = 5
    input_refs = {}
    for label, default in input_rows:
        label_cell(ws1, row, 1, label)
        c = input_cell(ws1, row, 2, default)
        input_refs[label] = f"B{row}"
        ws1.cell(row=row, column=3, value="← edit this").font = Font(
            name="Arial", italic=True, size=8, color="888888"
        )
        ws1.cell(row=row, column=3).alignment = left
        row += 1

    # Named references for readability
    labour_rate = input_refs["Hourly Labour Rate ($)"]
    hours = input_refs["Number of Hours"]
    workers = input_refs["Number of Workers"]
    materials = input_refs["Materials Cost ($)"]
    travel = input_refs["Travel / Fuel Allowance ($)"]
    markup_pct = input_refs["Markup on Materials (%)"]
    gst_pct = input_refs["GST / VAT Rate (%)"]

    labour_rate_row = 5
    hours_row = 6
    workers_row = 7
    materials_row = 8
    travel_row = 9
    markup_row = 10
    gst_row = 11

    # Section: Outputs
    row += 1
    hdr_cell(ws1, row, 1, "OUTPUTS — Your Quote Breakdown", span_end=3)
    row += 1

    output_rows_def = [
        ("Total Labour Cost ($)", f"=B{labour_rate_row}*B{hours_row}*B{workers_row}"),
        ("Materials + Markup ($)", f"=B{materials_row}*(1+B{markup_row}/100)"),
        ("Travel / Fuel ($)", f"=B{travel_row}"),
        ("Subtotal (before tax) ($)", f"=B{row}+B{row+1}+B{row+2}"),
        (f"GST / VAT ($)", f"=B{row+3}*B{gst_row}/100"),
    ]

    out_refs = {}
    output_start = row
    for label, formula in output_rows_def:
        label_cell(ws1, row, 1, label)
        output_cell(ws1, row, 2, formula=formula)
        out_refs[label] = f"B{row}"
        row += 1

    subtotal_row = output_start + 3
    gst_amount_row = output_start + 4

    # Fix subtotal formula now we know row numbers
    ws1.cell(row=subtotal_row, column=2).value = (
        f"=B{output_start}+B{output_start+1}+B{output_start+2}"
    )
    ws1.cell(row=gst_amount_row, column=2).value = (
        f"=B{subtotal_row}*B{gst_row}/100"
    )

    # Recommended quote
    row += 1
    ws1.merge_cells(start_row=row, start_column=1, end_row=row, end_column=1)
    rc = ws1.cell(row=row, column=1, value="RECOMMENDED QUOTE PRICE ($)")
    rc.fill = orange_fill
    rc.font = Font(name="Arial", bold=True, color="FFFFFF", size=13)
    rc.alignment = left
    rc.border = thin_border

    rqp = ws1.cell(row=row, column=2,
                   value=f"=B{subtotal_row}+B{gst_amount_row}")
    rqp.fill = orange_fill
    rqp.font = Font(name="Arial", bold=True, color="FFFFFF", size=13)
    rqp.alignment = right
    rqp.border = thin_border
    rqp.number_format = '"$"#,##0.00'
    recommended_row = row

    row += 1
    ws1.merge_cells(start_row=row, start_column=1, end_row=row, end_column=1)
    ml = ws1.cell(row=row, column=1, value="Your Profit Margin (%)")
    ml.fill = green_fill
    ml.font = bold_10
    ml.alignment = left
    ml.border = thin_border

    margin_formula = (
        f"=IF(B{recommended_row}>0,"
        f"(B{recommended_row}-B{subtotal_row}-B{gst_amount_row})/B{recommended_row}*100,0)"
    )
    mc = ws1.cell(row=row, column=2, value=margin_formula)
    mc.fill = green_fill
    mc.font = bold_10
    mc.alignment = right
    mc.border = thin_border
    mc.number_format = '0.0"%"'
    margin_row = row

    row += 2
    ws1.merge_cells(start_row=row, start_column=1, end_row=row, end_column=3)
    tip = ws1.cell(row=row, column=1,
                   value='TIP: Always quote slightly above your minimum — clients rarely negotiate down on fair quotes.')
    tip.fill = PatternFill("solid", fgColor="FFF3E0")
    tip.font = Font(name="Arial", italic=True, size=9, color=ORANGE_HEX)
    tip.alignment = Alignment(horizontal="left", wrap_text=True)
    ws1.row_dimensions[row].height = 24

    # ──────────────────────────────────────────────
    # SHEET 2: Hourly Rate Calculator
    # ──────────────────────────────────────────────
    ws2 = wb.create_sheet("Hourly Rate Calculator")
    ws2.column_dimensions["A"].width = 38
    ws2.column_dimensions["B"].width = 18
    ws2.column_dimensions["C"].width = 14
    ws2.row_dimensions[1].height = 30

    ws2.merge_cells("A1:C1")
    t2 = ws2.cell(row=1, column=1, value="TradeReady Co. — Hourly Rate Calculator")
    t2.fill = navy_fill
    t2.font = Font(name="Arial", bold=True, color="FFFFFF", size=14)
    t2.alignment = centre

    ws2.merge_cells("A2:C2")
    sub2 = ws2.cell(row=2, column=1,
                    value="Work out the minimum hourly rate you need to charge to hit your income target.")
    sub2.fill = PatternFill("solid", fgColor="E3EAF2")
    sub2.font = Font(name="Arial", italic=True, size=9, color="444444")
    sub2.alignment = centre

    hdr_cell(ws2, 4, 1, "INPUTS — Your Business Numbers", span_end=3)

    hr_inputs = [
        ("Annual Target Income (take-home, $)", 80000),
        ("Billable Hours per Week", 30),
        ("Working Weeks per Year", 46),
        ("Annual Overhead Costs ($, e.g. insurance, tools, rego)", 8000),
        ("Super / Pension Contribution (%)", 11),
    ]
    row2 = 5
    for label, default in hr_inputs:
        label_cell(ws2, row2, 1, label)
        input_cell(ws2, row2, 2, default)
        row2 += 1

    target_row = 5
    bh_week_row = 6
    weeks_row = 7
    overhead_row = 8
    super_row = 9

    row2 += 1
    hdr_cell(ws2, row2, 1, "OUTPUTS — Your Minimum Hourly Rate", span_end=3)
    row2 += 1

    hr_out_rows = [
        ("Total Annual Billable Hours", f"=B{bh_week_row}*B{weeks_row}"),
        ("Gross Income Required (inc. super)", f"=B{target_row}*(1+B{super_row}/100)"),
        ("Total Annual Costs ($)", f"=B{overhead_row}+B{target_row}*(B{super_row}/100)"),
    ]
    for label, formula in hr_out_rows:
        label_cell(ws2, row2, 1, label)
        output_cell(ws2, row2, 2, formula=formula)
        row2 += 1

    ann_hours_row = row2 - 3
    gross_row = row2 - 2
    costs_row = row2 - 1

    row2 += 1
    ws2.merge_cells(start_row=row2, start_column=1, end_row=row2, end_column=1)
    mhr_label = ws2.cell(row=row2, column=1, value="MINIMUM HOURLY RATE ($)")
    mhr_label.fill = orange_fill
    mhr_label.font = Font(name="Arial", bold=True, color="FFFFFF", size=13)
    mhr_label.alignment = left
    mhr_label.border = thin_border

    mhr = ws2.cell(row=row2, column=2,
                   value=f"=(B{gross_row}+B{overhead_row})/B{ann_hours_row}")
    mhr.fill = orange_fill
    mhr.font = Font(name="Arial", bold=True, color="FFFFFF", size=13)
    mhr.alignment = right
    mhr.border = thin_border
    mhr.number_format = '"$"#,##0.00'

    row2 += 2
    ws2.merge_cells(start_row=row2, start_column=1, end_row=row2, end_column=3)
    tip2 = ws2.cell(row=row2, column=1,
                    value="TIP: Add 20–30% to this minimum rate when quoting — this gives you negotiation room and covers unexpected costs.")
    tip2.fill = PatternFill("solid", fgColor="FFF3E0")
    tip2.font = Font(name="Arial", italic=True, size=9, color=ORANGE_HEX)
    tip2.alignment = Alignment(horizontal="left", wrap_text=True)
    ws2.row_dimensions[row2].height = 24

    # ──────────────────────────────────────────────
    # SHEET 3: Instructions
    # ──────────────────────────────────────────────
    ws3 = wb.create_sheet("Instructions")
    ws3.column_dimensions["A"].width = 80
    ws3.row_dimensions[1].height = 32

    ws3.merge_cells("A1:A1")
    t3 = ws3.cell(row=1, column=1, value="TradeReady Co. — How to Use This Calculator")
    t3.fill = navy_fill
    t3.font = Font(name="Arial", bold=True, color="FFFFFF", size=14)
    t3.alignment = centre

    instructions = [
        ("JOB ESTIMATOR (Tab 1)", [
            "Go to the 'Job Estimator' tab.",
            "Enter your numbers in the YELLOW cells — hourly rate, hours, workers, materials, travel, markup %, and GST %.",
            "The GREEN cells calculate automatically — do not type in green cells.",
            "Your RECOMMENDED QUOTE PRICE appears in orange — this is what to charge the client.",
            "The profit margin % tells you how much you're making on this job after costs.",
            "TIP: Always quote slightly above your minimum — clients rarely negotiate down on fair quotes.",
        ]),
        ("HOURLY RATE CALCULATOR (Tab 2)", [
            "Go to the 'Hourly Rate Calculator' tab.",
            "Enter your target take-home income, how many hours you bill per week, and your overhead costs.",
            "The calculator tells you the MINIMUM hourly rate you need to charge to hit your income goal.",
            "Add 20–30% to this figure when quoting — gives you room to negotiate and cover surprises.",
            "Review and update this calculator at least once a year as your costs change.",
        ]),
        ("GOOGLE SHEETS COMPATIBILITY", [
            "This file works in Google Sheets. Upload via: Google Drive → New → File Upload.",
            "All formulas are compatible with Google Sheets.",
            "Tip: Make a copy of the original file each time you quote a job so you keep a record.",
        ]),
    ]

    row3 = 3
    for section_title, points in instructions:
        hdr_cell(ws3, row3, 1, section_title)
        ws3.row_dimensions[row3].height = 22
        row3 += 1
        for point in points:
            c = ws3.cell(row=row3, column=1, value=f"  •  {point}")
            c.font = Font(name="Arial", size=10)
            c.alignment = Alignment(horizontal="left", wrap_text=True)
            c.fill = PatternFill("solid", fgColor=LGREY_HEX if row3 % 2 == 0 else WHITE_HEX)
            ws3.row_dimensions[row3].height = 18
            row3 += 1
        row3 += 1

    path = f"{OUT}/06_TradeReady_Pricing_Calculator.xlsx"
    wb.save(path)
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────
# FILE 7 — SOCIAL MEDIA CAPTION PACK
# ─────────────────────────────────────────────────────────────

CAPTIONS = [
    # Before/After (5)
    {
        "category": "Before & After Reveals",
        "n": 1,
        "text": (
            "Just finished this one and I'm pretty happy with how it turned out. "
            "[Before/after] — what a difference a day's work makes. "
            "If your [problem, e.g. leaking pipes / dodgy wiring / old fit-out] is driving you mad, "
            "give me a call. Let's sort it."
        ),
        "tags": "#tradesman #beforeandafter #[YourTrade] #qualitywork #[YourCity] #smallbusiness #tradelife #tradie"
    },
    {
        "category": "Before & After Reveals",
        "n": 2,
        "text": (
            "Started the morning with this mess. Left it looking like this. "
            "That's why you call a professional. "
            "Licensed, insured, and I actually show up on time."
        ),
        "tags": "#tradie #beforeandafter #[YourTrade]life #licensed #insured #[YourCity]trades #qualitycraftsmanship #smallbiz"
    },
    {
        "category": "Before & After Reveals",
        "n": 3,
        "text": (
            "Client called me about this [problem] that had been sitting there for months. "
            "Two hours later — done. "
            "Don't let small jobs turn into big bills. "
            "DM or call [Phone] for a free quote."
        ),
        "tags": "#[YourTrade] #fixitright #tradie #localtradesmen #[YourCity] #nojobtosmall #beforeandafter #getitdone"
    },
    {
        "category": "Before & After Reveals",
        "n": 4,
        "text": (
            "Another happy one ✓. This job took [X hours] and the client couldn't believe "
            "how quick the turnaround was. "
            "That's what happens when you've been doing this for [X] years. "
            "Book in via the link in bio."
        ),
        "tags": "#tradie #[YourTrade]work #proudofmywork #qualityfirst #[YourCity]local #smallbusiness #tradeready #beforeafter"
    },
    {
        "category": "Before & After Reveals",
        "n": 5,
        "text": (
            "Swipe to see the before → after. "
            "This is what [specific service, e.g. a full rewire / replumb / repaint] looks like "
            "when it's done properly. "
            "Not the cheapest in [YourCity] — but you get what you pay for."
        ),
        "tags": "#[YourTrade] #beforeandafter #swipetosee #[YourCity]tradie #licensedtrades #homeimprovement #qualitywork #tradesman"
    },
    # Trust builders (5)
    {
        "category": "Trust Builders",
        "n": 6,
        "text": (
            "Been in the [trade] trade for [X] years. "
            "Still show up when I say I will. "
            "Still charge what I quoted. "
            "Funny how that's considered rare these days."
        ),
        "tags": "#tradie #trustworthy #licensed #insured #[YourCity]trades #smallbusiness #solidwork #tradelife"
    },
    {
        "category": "Trust Builders",
        "n": 7,
        "text": (
            "Licensed. Insured. On time. No surprise bills. "
            "That's not a guarantee — it's just how I operate. "
            "If you're tired of chasing tradies who don't show, give me a call."
        ),
        "tags": "#licensedtrades #insured #reliabletradie #[YourCity] #[YourTrade] #nohiddencharges #professionaltradie #tradie"
    },
    {
        "category": "Trust Builders",
        "n": 8,
        "text": (
            "[X]-star average on Google. [Number] jobs completed this year alone. "
            "I'll let the reviews speak for themselves. "
            "Link in bio if you want to check."
        ),
        "tags": "#googlereviews #5star #tradie #[YourTrade] #[YourCity]local #trustedtrades #qualityservice #smallbusiness"
    },
    {
        "category": "Trust Builders",
        "n": 9,
        "text": (
            "Every job gets a written quote before I start. "
            "No hidden extras. No 'I'll sort out the invoice later'. "
            "Just clean, honest work at a fair price. "
            "The way it should be."
        ),
        "tags": "#honesttradie #writtenquote #[YourTrade] #fairprice #[YourCity] #tradesman #noexcuses #professional"
    },
    {
        "category": "Trust Builders",
        "n": 10,
        "text": (
            "Sole trader. Local. This is my livelihood — not just a side gig. "
            "When you call me, you get me. "
            "That's the difference."
        ),
        "tags": "#soletrader #localtradie #[YourTrade] #smallbusiness #[YourCity]local #communitymatters #tradie #personalservice"
    },
    # Seasonal promos (5)
    {
        "category": "Seasonal Promotions",
        "n": 11,
        "text": (
            "Summer's coming. "
            "Now's the time to get your air conditioning serviced before everyone else does "
            "and waits three weeks for a booking. "
            "I have spots available in [Month]. DM or call [Phone] to lock in."
        ),
        "tags": "#airconditioningservice #HVAC #summer #[YourCity] #tradie #bookingsopen #aircon #earlybird"
    },
    {
        "category": "Seasonal Promotions",
        "n": 12,
        "text": (
            "Winter reminder: get your [heating system, e.g. gas heater / ducted heating] "
            "checked before you actually need it. "
            "A service call now is a lot cheaper than an emergency call on the coldest night of the year."
        ),
        "tags": "#winterready #heatingservice #gasfitting #[YourCity]tradie #tradie #preventivemaintenance #[YourTrade] #staywarmandsafe"
    },
    {
        "category": "Seasonal Promotions",
        "n": 13,
        "text": (
            "Spring is the best time to tackle the jobs you've been ignoring all year. "
            "Gutters? Leaks? Wiring that's been playing up? "
            "Get in early before the summer rush. "
            "Limited slots in [Month] — DM to book."
        ),
        "tags": "#springmaintenance #[YourTrade] #homerepairs #[YourCity] #tradie #limitedslots #bookingsopen #fixitright"
    },
    {
        "category": "Seasonal Promotions",
        "n": 14,
        "text": (
            "End of financial year coming up. "
            "Get any work done before 30 June and it's potentially tax-deductible for your business. "
            "Give me a call if you've been sitting on a quote."
        ),
        "tags": "#EOFY #taxdeduction #smallbusiness #[YourTrade] #[YourCity] #tradie #getitdone #businessowners"
    },
    {
        "category": "Seasonal Promotions",
        "n": 15,
        "text": (
            "School holidays = everyone's home = every little problem becomes obvious. "
            "Perfect time to get it sorted. "
            "Book in for [Month] now before the diary fills up."
        ),
        "tags": "#schoolholidays #homeimprovement #[YourTrade] #[YourCity]local #tradie #fixnow #bookingsavailable #homerepairs"
    },
    # Review shares (5)
    {
        "category": "Review Shares",
        "n": 16,
        "text": (
            "Another happy customer. "
            "[Paste review text here or describe the job] "
            "This is why I do this. "
            "Thanks [Client First Name if OK] — really appreciated!"
        ),
        "tags": "#happycustomer #5starreview #googlereview #[YourTrade] #[YourCity] #tradie #clientfeedback #wordofmouth"
    },
    {
        "category": "Review Shares",
        "n": 17,
        "text": (
            "Got a cracker of a review this week. "
            "I don't do this job for the compliments — but it doesn't hurt. "
            "If you've worked with me and haven't left a review yet, the link's in the bio."
        ),
        "tags": "#googlereviews #[YourTrade] #tradie #smallbusiness #[YourCity] #thankyou #clientlove #leaveareview"
    },
    {
        "category": "Review Shares",
        "n": 18,
        "text": (
            "[X] five-star reviews and counting. "
            "Every single one from a real job, a real customer. "
            "Check them out on Google — link in bio. "
            "Happy to add yours to the list."
        ),
        "tags": "#5stars #reviews #tradesman #[YourCity]local #trusted #[YourTrade] #qualityservice #booknow"
    },
    {
        "category": "Review Shares",
        "n": 19,
        "text": (
            "Didn't ask for a review. [Client Name / 'The client'] just left one anyway. "
            "That's the best kind. "
            "Going above and beyond isn't extra — it's just how I work."
        ),
        "tags": "#aboveandbeyond #tradesman #[YourTrade] #clientsatisfaction #[YourCity] #reviews #qualitywork #wordofmouth"
    },
    {
        "category": "Review Shares",
        "n": 20,
        "text": (
            "When a client takes 5 minutes to leave a review, it genuinely makes a difference "
            "for a small business. "
            "Thank you. You know who you are."
        ),
        "tags": "#smallbusiness #[YourTrade] #thankyou #googlereviews #tradie #[YourCity] #communitymatters #grateful"
    },
    # Service spotlights (5)
    {
        "category": "Service Spotlights",
        "n": 21,
        "text": (
            "Did you know I do [specific service, e.g. hot water system replacements]? "
            "A lot of people don't think to call me for this one. "
            "If yours is playing up or you want to upgrade to a more efficient system, "
            "I can give you a free quote. Just ask."
        ),
        "tags": "#[SpecificService] #[YourTrade] #[YourCity] #tradie #freequote #homeimprovement #didyouknow #localtradesmen"
    },
    {
        "category": "Service Spotlights",
        "n": 22,
        "text": (
            "Spotlight on: [Service Name]. "
            "This is one of my most common call-outs — and one of the most misunderstood. "
            "Here's what it actually involves: [1-2 sentence explanation]. "
            "Cost range: approximately $[X]–$[X] depending on the job. "
            "DM for a quote."
        ),
        "tags": "#[ServiceName] #[YourTrade] #tradie #howmuchdoesitcost #[YourCity] #transparent #pricing #getaquote"
    },
    {
        "category": "Service Spotlights",
        "n": 23,
        "text": (
            "I specialise in [niche or service]. "
            "Not every tradie does — so if you've struggled to find someone, I'm your person. "
            "Call or DM to have a chat about what you need."
        ),
        "tags": "#specialist #[YourTrade] #[niche] #[YourCity]tradie #hardtofind #localexpert #callme #qualitywork"
    },
    {
        "category": "Service Spotlights",
        "n": 24,
        "text": (
            "Emergency call-outs — yes, I do them. "
            "I understand that some things can't wait. "
            "If you're in [YourCity] and you've got an urgent [trade] issue, "
            "call [Phone] and I'll tell you honestly if I can get to you today."
        ),
        "tags": "#emergencycallout #[YourTrade] #[YourCity] #urgentrepairs #tradie #available #callfirst #24hours"
    },
    {
        "category": "Service Spotlights",
        "n": 25,
        "text": (
            "Free quotes — always. "
            "I'll come out, have a look, and give you a written price before any work starts. "
            "No obligation, no awkward conversation, no surprises. "
            "Book via the link in bio."
        ),
        "tags": "#freequote #[YourTrade] #[YourCity] #noobligation #writtenquote #transparency #tradie #booktoday"
    },
    # Referral/word of mouth (3)
    {
        "category": "Referral & Word of Mouth",
        "n": 26,
        "text": (
            "Know someone who needs a reliable [trade]? "
            "Send them my way — I'll look after them the same way I look after you. "
            "And if you refer someone who books a job, I'll shout you [incentive, e.g. 'a $50 thank-you voucher']."
        ),
        "tags": "#referral #[YourTrade] #wordofmouth #[YourCity] #smallbusiness #tradie #spreadtheword #thankyou"
    },
    {
        "category": "Referral & Word of Mouth",
        "n": 27,
        "text": (
            "My best clients come from referrals. "
            "If you've worked with me before and know someone who could use my help, "
            "a quick word goes a long way. "
            "I appreciate every single recommendation."
        ),
        "tags": "#referrals #[YourTrade] #wordofmouth #grateful #smallbusiness #[YourCity]local #tradie #trustedtradesman"
    },
    {
        "category": "Referral & Word of Mouth",
        "n": 28,
        "text": (
            "Tag a mate who's been putting off that [job type] for too long. "
            "You know who they are."
        ),
        "tags": "#tagamate #[YourTrade] #getitdone #[YourCity] #tradie #callme #nomoreprocrastinating #fixitright"
    },
    # Humour/relatable (2)
    {
        "category": "Humour & Relatable",
        "n": 29,
        "text": (
            "Client: 'Can you do it for cash and knock $500 off?' "
            "Me: '...' "
            "Happy to chat about pricing. "
            "Not quite like that though."
        ),
        "tags": "#tradiereality #tradie #tradelife #funnybutreal #[YourTrade] #smallbusiness #noflybynight #fairprice"
    },
    {
        "category": "Humour & Relatable",
        "n": 30,
        "text": (
            "Me at 6am: totally fine. "
            "Me at 4pm on a job that 'should only take an hour': [your face here]. "
            "Every. Single. Time. "
            "Love this job though."
        ),
        "tags": "#tradelife #tradie #[YourTrade]problems #funnytradie #realtalk #smallbusiness #stilllovedit #workhumour"
    },
]


def generate_social_captions_pdf():
    styles = base_styles()
    story = []

    story.append(pdf_header_table(styles))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("SOCIAL MEDIA CAPTION PACK", styles["TRTitle"]))
    story.append(Paragraph(
        "30 ready-to-use captions for Facebook and Instagram. "
        "Replace [bracketed] fields with your own details.",
        styles["TRSubtitle"]
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY))

    current_cat = None
    for cap in CAPTIONS:
        if cap["category"] != current_cat:
            current_cat = cap["category"]
            story.append(Spacer(1, 0.5*cm))
            story.append(Paragraph(f"── {current_cat.upper()} ──", styles["TRSectionHead"]))

        block = []
        block.append(Paragraph(
            f"Caption {cap['n']}",
            ParagraphStyle("CapNum", fontName="Helvetica-Bold", fontSize=9,
                           textColor=ORANGE, spaceAfter=2, spaceBefore=6)
        ))
        cap_table = Table(
            [[Paragraph(cap["text"], styles["TRBody"])],
             [Paragraph(cap["tags"], styles["TRHashtag"])]],
            colWidths=[17*cm]
        )
        cap_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), LGREY),
            ("BACKGROUND", (0, 1), (-1, 1), HexColor("#EEF2FF")),
            ("BOX", (0, 0), (-1, -1), 0.5, NAVY),
            ("LINEABOVE", (0, 1), (-1, 1), 0.5, HexColor("#CCCCCC")),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        block.append(cap_table)
        story.append(KeepTogether(block))

    path = f"{OUT}/07_TradeReady_Social_Caption_Pack.pdf"
    build_pdf(path, story)
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────
# FILE 8 — GOOGLE REVIEW REQUEST KIT
# ─────────────────────────────────────────────────────────────

def generate_google_review_kit_pdf():
    styles = base_styles()
    story = []

    story.append(pdf_header_table(styles))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("GOOGLE REVIEW REQUEST KIT", styles["TRTitle"]))
    story.append(Paragraph(
        "Everything you need to collect more Google reviews — the single most powerful "
        "free marketing tool for a trade business.",
        styles["TRSubtitle"]
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY))
    story.append(Spacer(1, 0.3*cm))

    # Stat callout
    stat_t = Table(
        [[Paragraph(
            '<font color="white"><b>Ask within 24 hours of job completion — '
            'reviews drop 60% if you wait a week.</b></font>',
            ParagraphStyle("StatCall", fontName="Helvetica-Bold", fontSize=11,
                           textColor=white, alignment=TA_CENTER)
        )]],
        colWidths=[17*cm]
    )
    stat_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ORANGE),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(stat_t)
    story.append(Spacer(1, 0.5*cm))

    # Section 1: SMS Scripts
    story.append(Paragraph("SECTION 1 — SMS SCRIPTS", styles["TRSectionHead"]))
    sms_scripts = [
        {
            "label": "SMS Script A — Casual (send immediately after job)",
            "text": (
                "Hi [Client Name], thanks for having me today! If you were happy with the work, "
                "it'd mean a lot if you could leave a quick Google review — "
                "only takes 2 mins. Here's the link: [Your Google Review Link]. Cheers, [Your Name]"
            )
        },
        {
            "label": "SMS Script B — Formal (alternative version)",
            "text": (
                "Dear [Client Name], thank you for choosing [Company Name] for your recent "
                "[Job Type]. If you're satisfied with the result, a Google review would be "
                "greatly appreciated: [Your Google Review Link]. Many thanks, [Your Name]."
            )
        },
        {
            "label": "SMS Script C — Follow-up (send 3 days later if no review yet)",
            "text": (
                "Hi [Client Name], [Your Name] here — just following up in case my review "
                "request got lost. It really helps my small business grow. Link here: "
                "[Your Google Review Link]. Thanks so much!"
            )
        },
    ]
    for s in sms_scripts:
        block = [Paragraph(s["label"], styles["TRScriptLabel"])]
        sms_t = Table(
            [[Paragraph(s["text"], styles["TRBody"])]],
            colWidths=[17*cm]
        )
        sms_t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LGREY),
            ("BOX", (0, 0), (-1, -1), 1, NAVY),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        block.append(sms_t)
        story.append(KeepTogether(block))

    story.append(Spacer(1, 0.5*cm))

    # Section 2: QR Code Instructions
    story.append(Paragraph("SECTION 2 — QR CODE SETUP (FREE, 5 MINUTES)", styles["TRSectionHead"]))
    steps = [
        ("STEP 1 — Find your Google review link",
         "Search Google for your business name. On your Google Business Profile, "
         "click 'Get more reviews'. Copy the link provided — it will look like: "
         "https://g.page/r/[your-business-id]/review"),
        ("STEP 2 — Generate a free QR code",
         "Go to qr-code-generator.com (free). Select 'URL'. Paste your Google review link. "
         "Choose a design if you like (keep it simple — black on white works best for printing). "
         "Click 'Download' and save as a PNG or SVG file."),
        ("STEP 3 — Add it to your invoice",
         "Open your invoice template in Word or Google Docs. "
         "Insert → Image → upload your QR code PNG. "
         "Resize to approximately 3cm x 3cm and place it near the bottom of the invoice. "
         'Add a short line above it: "Happy with our work? Scan to leave a Google review!"'),
        ("STEP 4 — Add it to your business cards",
         "In Canva (free at canva.com), open your business card design. "
         "Upload the QR code PNG and add it to the back of the card with the text: "
         '"Scan to review us on Google"'),
    ]
    for title, body in steps:
        story.append(Paragraph(title, styles["TRBold"]))
        story.append(Paragraph(body, styles["TRBody"]))
        story.append(Spacer(1, 0.2*cm))

    story.append(Spacer(1, 0.5*cm))

    # Section 3: Canva card brief
    story.append(Paragraph('SECTION 3 — "PLEASE REVIEW US" CARD (CANVA DESIGN BRIEF)',
                            styles["TRSectionHead"]))
    story.append(Paragraph(
        "Give this brief to a Canva designer or follow it yourself using Canva's free tools.",
        styles["TRSmall"]
    ))

    card_specs = [
        ["Dimensions", "85mm x 55mm (standard business card size)"],
        ["Front — Background", "Navy blue (#1B3A5C) — full bleed"],
        ["Front — Line 1", "[Company Name] — white, bold, centred, large font"],
        ["Front — Line 2", "[Phone] | [Email] — white, smaller, centred"],
        ["Front — Line 3 (optional)", "[Logo] — centred, bottom half of card"],
        ["Back — Background", "White"],
        ["Back — Top text", '"Enjoyed our service?" — Navy, bold, centred'],
        ["Back — Sub text", '"Leave us a Google review" — dark grey, centred'],
        ["Back — QR code", "Insert your QR code PNG here, centred, approx 30mm x 30mm"],
        ["Back — Bottom text", '"It only takes 2 minutes — we read every one." — small, grey, italic'],
        ["Font suggestion", "Montserrat or Open Sans (both free in Canva)"],
    ]
    card_t = Table(card_specs, colWidths=[5*cm, 12*cm])
    card_t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
        ("ROWBACKGROUND", (0, 0), (-1, -1), [LGREY, white]),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("TEXTCOLOR", (0, 0), (0, -1), NAVY),
    ]))
    story.append(card_t)

    path = f"{OUT}/08_TradeReady_Google_Review_Kit.pdf"
    build_pdf(path, story)
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== Phase 2: Content Packs ===")
    print("File 5 — Client Message Scripts")
    generate_message_scripts_pdf()
    print("File 6 — Pricing Calculator")
    generate_pricing_calculator()
    print("File 7 — Social Caption Pack")
    generate_social_captions_pdf()
    print("File 8 — Google Review Kit")
    generate_google_review_kit_pdf()
    print("=== Phase 2 complete ===")
