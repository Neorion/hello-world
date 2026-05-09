"""
TradeReady Co. — Pro Tier Generator
Generates File 9 (Onboarding Pack) as .docx + PDF, and File 10 (Annual Checklist) as PDF.

Run: python3 scripts/generate_pro_tier.py
Output: output/files/
"""

import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
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
# SHARED HELPERS
# ─────────────────────────────────────────────────────────────

def set_cell_bg(cell, hex_color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color.lstrip("#"))
    tcPr.append(shd)


def new_docx():
    doc = Document()
    section = doc.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.5)
    section.bottom_margin = Cm(1.5)
    section.left_margin = Cm(2)
    section.right_margin = Cm(2)
    doc.styles["Normal"].font.name = "Arial"
    doc.styles["Normal"].font.size = Pt(10)
    return doc


def add_navy_header_docx(doc, title, subtitle=None):
    hdr_table = doc.add_table(rows=1, cols=2)
    hdr_table.autofit = False
    hdr_table.columns[0].width = Cm(5)
    hdr_table.columns[1].width = Cm(12)
    for cell in hdr_table.row_cells(0):
        set_cell_bg(cell, "#1B3A5C")

    p = hdr_table.cell(0, 0).paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("[Insert Logo Here]")
    r.font.color.rgb = RGBColor(0xCC, 0xCC, 0xCC)
    r.font.size = Pt(8)
    r.font.name = "Arial"

    p2 = hdr_table.cell(0, 1).paragraphs[0]
    p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    for line in ["[Company Name]", "ABN: [ABN]  |  Ph: [Phone]", "[Email]  |  [Website]"]:
        r2 = p2.add_run(line + "\n")
        r2.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        r2.font.size = Pt(9)
        r2.font.name = "Arial"

    doc.add_paragraph()

    tp = doc.add_paragraph()
    tr = tp.add_run(title)
    tr.font.name = "Arial"
    tr.font.size = Pt(18)
    tr.font.bold = True
    tr.font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)

    if subtitle:
        sp = doc.add_paragraph()
        sr = sp.add_run(subtitle)
        sr.font.name = "Arial"
        sr.font.size = Pt(10)
        sr.font.color.rgb = RGBColor(0x66, 0x66, 0x66)


def add_footer_docx(doc):
    section = doc.sections[0]
    footer = section.footer
    para = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = para.add_run(
        "TradeReady Co.  |  tradereadyco.com  |  Template by TradeReady Co. — not legal advice"
    )
    run.font.size = Pt(7)
    run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
    run.font.name = "Arial"


def section_heading_docx(doc, text):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.font.name = "Arial"
    r.font.size = Pt(12)
    r.font.bold = True
    r.font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)


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
    styles.add(ParagraphStyle("TRSectionHead", fontName="Helvetica-Bold", fontSize=12,
                              textColor=NAVY, spaceBefore=12, spaceAfter=4))
    styles.add(ParagraphStyle("TRPageTitle", fontName="Helvetica-Bold", fontSize=16,
                              textColor=NAVY, spaceAfter=6))
    styles.add(ParagraphStyle("TRChecked", fontName="Helvetica", fontSize=10,
                              leading=16, spaceAfter=2))
    return styles


def pdf_header_table(styles):
    logo_cell = Paragraph(
        '<font color="#CCCCCC">[Insert Logo Here]</font>',
        ParagraphStyle("Logo", fontName="Helvetica", fontSize=8,
                       textColor=HexColor("#CCCCCC"), alignment=TA_CENTER)
    )
    company_cell = Paragraph(
        '<font color="white"><b>[Company Name]</b><br/>'
        'ABN: [ABN]&nbsp;&nbsp;|&nbsp;&nbsp;Ph: [Phone]<br/>'
        '[Email]&nbsp;&nbsp;|&nbsp;&nbsp;[Website]</font>',
        ParagraphStyle("Hdr", fontName="Helvetica", fontSize=9,
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
# FILE 9 — EMPLOYEE ONBOARDING PACK
# ─────────────────────────────────────────────────────────────

def generate_onboarding_docx():
    doc = new_docx()
    add_footer_docx(doc)

    # ── PAGE 1: Welcome Letter ──────────────────────────────
    add_navy_header_docx(doc, "WELCOME TO THE TEAM", "First Employee Onboarding Pack")
    doc.add_paragraph()

    date_p = doc.add_paragraph()
    r = date_p.add_run("Date: [Start Date]")
    r.font.name = "Arial"
    r.font.size = Pt(10)
    r.font.color.rgb = RGBColor(0x44, 0x44, 0x44)

    doc.add_paragraph()

    greeting = doc.add_paragraph()
    r = greeting.add_run("Dear [Employee Name],")
    r.font.name = "Arial"
    r.font.size = Pt(11)
    r.font.bold = True

    doc.add_paragraph()

    welcome_text = [
        "Welcome to [Company Name]. We're glad to have you on board.",
        "We're a small, tight-knit operation and we take pride in doing quality work "
        "for our clients. You've been brought on because we believe you share that same attitude.",
        "Here's what we expect from you — and what you can expect from us.",
        "EXPECTATIONS OF YOU:",
        "• Show up on time, every time. If something comes up, call ahead — not five minutes after you were due.",
        "• Treat every client's home or workplace with respect. Pack up, clean up, leave it better than you found it.",
        "• Communicate. If there's a problem on site — with the job, with materials, with anything — tell us. "
        "No surprises.",
        "• Your phone is for business use on site. Quick checks are fine. Long calls and scrolling are not.",
        "• Represent [Company Name] professionally. What you say and do reflects on all of us.",
        "WHAT YOU CAN EXPECT FROM US:",
        "• Fair pay at the rate agreed: $[Pay Rate] per hour, paid [weekly/fortnightly] to [bank/cash].",
        "• Clear communication about your schedule. We'll give you as much notice as possible.",
        "• A team that has your back. Ask questions — there are no stupid ones.",
        "• A safe work environment. If something doesn't feel right, say so.",
        "Your first day is [Start Date]. Please arrive at [Location/Meeting Point] by [Start Time]. "
        "Your reporting manager is [Manager Name] — any questions before then, reach out on [Phone].",
        "We're glad you're here. Let's do good work.",
        "Regards,",
        "[Your Name]",
        "[Company Name]",
    ]

    for line in welcome_text:
        p = doc.add_paragraph()
        if line.startswith("EXPECTATIONS") or line.startswith("WHAT YOU"):
            r = p.add_run(line)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)
        else:
            r = p.add_run(line)
        r.font.name = "Arial"
        r.font.size = Pt(10)
        p.paragraph_format.space_after = Pt(3)

    doc.add_page_break()

    # ── PAGE 2: Day One Checklist ────────────────────────────
    add_navy_header_docx(doc, "DAY ONE CHECKLIST", "Complete on the employee's first day")
    doc.add_paragraph()

    checklist_items = [
        "PPE issued and fitting confirmed (hard hat, hi-vis, safety boots, gloves)",
        "Tools issued — see Equipment Form (Page 3)",
        "Emergency contact details collected and filed",
        "Site access procedures explained (keys, codes, sign-in/out process)",
        "Safety induction completed — site hazards reviewed",
        "Emergency exit locations identified on site",
        "Phone and communication policy explained",
        "Payroll details submitted (bank account, tax file number / TFN / NI number)",
        "Super / pension fund nominated and paperwork signed",
        "Employment agreement / contract signed and copy provided to employee",
        "Working hours, start/finish times, and break entitlements confirmed",
        "Overtime and call-out procedures explained",
        "Reporting structure explained — who to call with questions",
        "Company vehicle policy explained (if applicable)",
        "Client interaction standards reviewed (how to introduce yourself, what not to say)",
    ]

    chk_table = doc.add_table(rows=len(checklist_items), cols=2)
    chk_table.autofit = False
    chk_table.columns[0].width = Cm(1.5)
    chk_table.columns[1].width = Cm(15.5)

    for i, item in enumerate(checklist_items):
        cell_tick = chk_table.cell(i, 0)
        cell_text = chk_table.cell(i, 1)
        if i % 2 == 0:
            set_cell_bg(cell_tick, "#F5F5F5")
            set_cell_bg(cell_text, "#F5F5F5")
        p_tick = cell_tick.paragraphs[0]
        p_tick.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_tick = p_tick.add_run("☐")
        r_tick.font.size = Pt(14)
        r_tick.font.name = "Arial"
        r_tick.font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)

        p_text = cell_text.paragraphs[0]
        r_text = p_text.add_run(item)
        r_text.font.name = "Arial"
        r_text.font.size = Pt(10)

    doc.add_paragraph()
    sig_note = doc.add_paragraph()
    r = sig_note.add_run("Completed by: ________________________  Date: ______________")
    r.font.name = "Arial"
    r.font.size = Pt(10)

    doc.add_page_break()

    # ── PAGE 3: Equipment Responsibility Form ────────────────
    add_navy_header_docx(doc, "TOOLS & EQUIPMENT RESPONSIBILITY FORM", "")
    doc.add_paragraph()

    eq_table = doc.add_table(rows=12, cols=5)
    eq_table.autofit = False
    col_widths = [Cm(5), Cm(3), Cm(2.5), Cm(3), Cm(3.5)]
    headers = ["Item Description", "Serial / ID No.", "Condition", "Date Issued", "Employee Initials"]

    for c, (h, w) in enumerate(zip(headers, col_widths)):
        cell = eq_table.cell(0, c)
        cell.width = w
        set_cell_bg(cell, "#1B3A5C")
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        r.font.name = "Arial"
        r.font.size = Pt(9)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    for row_idx in range(1, 12):
        for c, w in enumerate(col_widths):
            cell = eq_table.cell(row_idx, c)
            cell.width = w
            if row_idx % 2 == 0:
                set_cell_bg(cell, "#F5F5F5")
            p = cell.paragraphs[0]
            r = p.add_run(" ")
            r.font.name = "Arial"
            r.font.size = Pt(10)

    doc.add_paragraph()
    stmt = doc.add_paragraph(
        "I acknowledge receipt of the above items in the described condition and accept "
        "responsibility for their care and safe return."
    )
    stmt.runs[0].font.name = "Arial"
    stmt.runs[0].font.size = Pt(9)
    stmt.runs[0].font.italic = True

    doc.add_paragraph()
    sig_table = doc.add_table(rows=2, cols=2)
    sig_table.autofit = False
    sig_table.columns[0].width = Cm(8.5)
    sig_table.columns[1].width = Cm(8.5)
    for c, lbl in enumerate(["Employee Signature", "Date"]):
        cell = sig_table.cell(0, c)
        p = cell.paragraphs[0]
        r = p.add_run(lbl)
        r.font.bold = True
        r.font.name = "Arial"
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)
        cell2 = sig_table.cell(1, c)
        p2 = cell2.paragraphs[0]
        r2 = p2.add_run("______________________________")
        r2.font.name = "Arial"
        r2.font.size = Pt(10)

    doc.add_page_break()

    # ── PAGE 4: Workplace Expectations ───────────────────────
    add_navy_header_docx(doc, "WORKPLACE EXPECTATIONS", "Read this. Keep it.")
    doc.add_paragraph()

    expectations = [
        ("Hours of Work",
         ["Standard hours are [Start Time] to [End Time], [Days].",
          "Overtime must be approved by [Manager Name] before being worked.",
          "If you're sick or can't make it in, call [Phone] before your start time — not after."]),
        ("Punctuality",
         ["Be on site and ready to work at your start time.",
          "Repeated lateness without good reason is grounds for a formal discussion.",
          "If you're running late, call ahead — always."]),
        ("PPE Requirements",
         ["You are required to wear appropriate PPE at all times on site.",
          "This includes: safety boots, hi-vis vest, hard hat (where required), and gloves.",
          "If your PPE is damaged, report it immediately and do not work without it."]),
        ("Phone Use on Site",
         ["Phones are for work-related communication during work hours.",
          "Personal calls should be taken during breaks only.",
          "Do not scroll social media while on a client's property."]),
        ("Client Interaction Standards",
         ["Greet clients professionally: 'Hi, I'm [Name] from [Company Name].'",
          "Do not discuss pricing or give verbal quotes — direct all cost questions to [Manager].",
          "Do not make negative comments about previous trades' work in front of clients.",
          "Always leave the work area clean and tidy."]),
        ("Reporting Near Misses & Incidents",
         ["If you witness or are involved in any incident or near miss, report it to [Manager Name] "
          "on the same day.",
          "Do not attempt to handle injuries or incidents without informing management.",
          "All incidents will be recorded — this protects you as much as it protects the company."]),
    ]

    for section_title, points in expectations:
        section_heading_docx(doc, section_title)
        for pt in points:
            p = doc.add_paragraph()
            r1 = p.add_run("• ")
            r1.font.color.rgb = RGBColor(0xE8, 0x50, 0x0A)
            r1.font.name = "Arial"
            r1.font.size = Pt(10)
            r2 = p.add_run(pt)
            r2.font.name = "Arial"
            r2.font.size = Pt(10)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.left_indent = Cm(0.5)

    path = f"{OUT}/09_TradeReady_Onboarding_Pack.docx"
    doc.save(path)
    print(f"  Saved: {path}")


def generate_onboarding_pdf():
    styles = base_styles()
    story = []

    # ── PAGE 1: Welcome Letter ──────────────────────────────
    story.append(pdf_header_table(styles))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("WELCOME TO THE TEAM", styles["TRPageTitle"]))
    story.append(Paragraph("First Employee Onboarding Pack", styles["TRSubtitle"]))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("Date: [Start Date]", styles["TRSmall"]))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph("<b>Dear [Employee Name],</b>", styles["TRBody"]))
    story.append(Spacer(1, 0.2*cm))

    welcome_paras = [
        "Welcome to [Company Name]. We're glad to have you on board.",
        "We're a small, tight-knit operation and we take pride in doing quality work for our clients. "
        "You've been brought on because we believe you share that same attitude.",
        "<b>EXPECTATIONS OF YOU:</b>",
        "• Show up on time, every time. If something comes up, call ahead — not five minutes after you were due.",
        "• Treat every client's home or workplace with respect. Pack up, clean up, leave it better than you found it.",
        "• Communicate. If there's a problem on site — with the job, with materials, with anything — tell us.",
        "• Your phone is for business use on site. Quick checks are fine. Long calls and scrolling are not.",
        "• Represent [Company Name] professionally. What you say and do reflects on all of us.",
        "<b>WHAT YOU CAN EXPECT FROM US:</b>",
        "• Fair pay at the rate agreed: $[Pay Rate] per hour, paid [weekly/fortnightly].",
        "• Clear communication about your schedule. We'll give you as much notice as possible.",
        "• A team that has your back. Ask questions — there are no stupid ones.",
        "• A safe work environment. If something doesn't feel right, say so.",
        "Your first day is [Start Date]. Please arrive at [Location] by [Start Time]. "
        "Your reporting manager is [Manager Name].",
        "We're glad you're here. Let's do good work.",
        "<br/><b>[Your Name]<br/>[Company Name]</b>",
    ]
    for para in welcome_paras:
        is_heading = para.startswith("<b>EXPECTATIONS") or para.startswith("<b>WHAT YOU")
        style = ParagraphStyle("WelcomeBold", fontName="Helvetica-Bold", fontSize=10,
                               textColor=NAVY, spaceAfter=4, spaceBefore=6) if is_heading else styles["TRBody"]
        story.append(Paragraph(para, style))

    story.append(PageBreak())

    # ── PAGE 2: Day One Checklist ────────────────────────────
    story.append(pdf_header_table(styles))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("DAY ONE CHECKLIST", styles["TRPageTitle"]))
    story.append(Paragraph("Complete on the employee's first day.", styles["TRSubtitle"]))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY))
    story.append(Spacer(1, 0.3*cm))

    checklist_items = [
        "PPE issued and fitting confirmed (hard hat, hi-vis, safety boots, gloves)",
        "Tools issued — see Equipment Form (Page 3)",
        "Emergency contact details collected and filed",
        "Site access procedures explained (keys, codes, sign-in/out process)",
        "Safety induction completed — site hazards reviewed",
        "Emergency exit locations identified on site",
        "Phone and communication policy explained",
        "Payroll details submitted (bank account, tax file number / TFN)",
        "Super / pension fund nominated and paperwork signed",
        "Employment agreement / contract signed and copy provided to employee",
        "Working hours, start/finish times, and break entitlements confirmed",
        "Overtime and call-out procedures explained",
        "Reporting structure explained — who to call with questions",
        "Company vehicle policy explained (if applicable)",
        "Client interaction standards reviewed",
    ]

    chk_data = []
    for i, item in enumerate(checklist_items):
        chk_data.append([
            Paragraph("☐", ParagraphStyle("Tick", fontName="Helvetica", fontSize=14,
                                          textColor=NAVY, alignment=TA_CENTER)),
            Paragraph(item, styles["TRBody"])
        ])

    chk_t = Table(chk_data, colWidths=[1.5*cm, 15.5*cm])
    chk_t.setStyle(TableStyle([
        ("ROWBACKGROUND", (0, 0), (-1, -1), [white, LGREY]),
        ("GRID", (0, 0), (-1, -1), 0.3, HexColor("#CCCCCC")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(chk_t)
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        "Completed by: ________________________  Date: ______________",
        styles["TRBody"]
    ))

    story.append(PageBreak())

    # ── PAGE 3: Equipment Form ───────────────────────────────
    story.append(pdf_header_table(styles))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("TOOLS & EQUIPMENT RESPONSIBILITY FORM", styles["TRPageTitle"]))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY))
    story.append(Spacer(1, 0.3*cm))

    eq_headers = ["Item Description", "Serial / ID No.", "Condition", "Date Issued", "Employee Initials"]
    eq_data = [eq_headers]
    for i in range(10):
        eq_data.append(["", "", "", "", ""])

    eq_t = Table(eq_data, colWidths=[5.5*cm, 3*cm, 2.5*cm, 3*cm, 3*cm])
    eq_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("ROWBACKGROUND", (0, 1), (-1, -1), [white, LGREY]),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(eq_t)
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph(
        "<i>I acknowledge receipt of the above items in the described condition and "
        "accept responsibility for their care and safe return.</i>",
        ParagraphStyle("EqStmt", fontName="Helvetica-Oblique", fontSize=9,
                       textColor=HexColor("#444444"), spaceAfter=10)
    ))

    sig_data = [
        [Paragraph("<b>Employee Signature</b>", styles["TRBold"]),
         Paragraph("<b>Date</b>", styles["TRBold"])],
        [Paragraph("______________________________", styles["TRBody"]),
         Paragraph("______________________________", styles["TRBody"])],
    ]
    sig_t = Table(sig_data, colWidths=[8.5*cm, 8.5*cm])
    sig_t.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TEXTCOLOR", (0, 0), (-1, 0), NAVY),
    ]))
    story.append(sig_t)

    story.append(PageBreak())

    # ── PAGE 4: Workplace Expectations ───────────────────────
    story.append(pdf_header_table(styles))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("WORKPLACE EXPECTATIONS", styles["TRPageTitle"]))
    story.append(Paragraph("Read this. Keep it.", styles["TRSubtitle"]))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY))
    story.append(Spacer(1, 0.3*cm))

    expectations = [
        ("Hours of Work", [
            "Standard hours are [Start Time] to [End Time], [Days].",
            "Overtime must be approved by [Manager Name] before being worked.",
            "If you're sick, call [Phone] before your start time.",
        ]),
        ("Punctuality", [
            "Be on site and ready to work at your start time.",
            "Repeated lateness without good reason is grounds for a formal discussion.",
            "If you're running late, call ahead — always.",
        ]),
        ("PPE Requirements", [
            "Wear appropriate PPE at all times: safety boots, hi-vis, hard hat (where required), gloves.",
            "If your PPE is damaged, report it immediately and do not work without it.",
        ]),
        ("Phone Use on Site", [
            "Phones are for work-related communication during work hours.",
            "Personal calls during breaks only.",
            "No social media scrolling on a client's property.",
        ]),
        ("Client Interaction Standards", [
            "Greet clients professionally: 'Hi, I'm [Name] from [Company Name].'",
            "Do not discuss pricing or give verbal quotes — direct cost questions to [Manager].",
            "Always leave the work area clean and tidy.",
        ]),
        ("Reporting Near Misses & Incidents", [
            "Report any incident or near miss to [Manager Name] on the same day.",
            "Do not handle injuries or incidents without informing management.",
            "All incidents will be recorded — this protects you as much as the company.",
        ]),
    ]

    for sec_title, points in expectations:
        story.append(Paragraph(sec_title, styles["TRSectionHead"]))
        for pt in points:
            story.append(Paragraph(
                f"<font color='#E8500A'>•</font>  {pt}",
                ParagraphStyle("ExpPoint", fontName="Helvetica", fontSize=10,
                               leading=14, leftIndent=10, spaceAfter=3)
            ))

    path = f"{OUT}/09_TradeReady_Onboarding_Pack.pdf"
    build_pdf(path, story)
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────
# FILE 10 — ANNUAL BUSINESS HEALTH CHECKLIST
# ─────────────────────────────────────────────────────────────

def generate_annual_checklist_pdf():
    styles = base_styles()
    story = []

    story.append(pdf_header_table(styles))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("ANNUAL BUSINESS HEALTH CHECKLIST", styles["TRTitle"]))
    story.append(Paragraph(
        "Run through this once a year — end of financial year is the ideal time.",
        styles["TRSubtitle"]
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY))
    story.append(Spacer(1, 0.3*cm))

    sections = [
        ("FINANCIAL (EOFY)", [
            ("All invoices issued and outstanding ones followed up", True),
            ("Receipts organised by category: fuel, materials, tools, PPE, insurance, subscriptions", True),
            ("Mileage / vehicle log is up to date", True),
            ("Super / pension contributions checked and on track", True),
            ("Accountant or bookkeeper meeting booked", True),
            ("BAS / VAT return prepared and lodged", True),
            ("Reviewed income vs. last year — did revenue grow?", True),
            ("Checked if any debts are still outstanding — chased or written off", True),
        ]),
        ("INSURANCE & LICENCES", [
            ("Public liability insurance renewal date: _______________", False),
            ("Trade licence renewal date: _______________", False),
            ("Vehicle registration date: _______________", False),
            ("Tool insurance renewal date: _______________", False),
            ("Confirmed all policies still appropriate for business size and scope", True),
        ]),
        ("OPERATIONS", [
            ("Reviewed pricing — have your costs gone up this year?", True),
            ("Google Business Profile updated (photos, hours, services)", True),
            ("Key suppliers reviewed — are you getting competitive rates?", True),
            ("Slow-paying or difficult clients flagged — decide whether to continue", True),
            ("Equipment serviced and in safe working order", True),
            ("Reviewed whether any tools or vehicles need replacing", True),
        ]),
        ("GROWTH", [
            ("Written down your top 3 goals for next year", True),
            ("Identified your best jobs this year — what made them great?", True),
            ("Identified your top referral sources — who sent the most work?", True),
            ("Reviewed Google and social media presence — anything to improve?", True),
            ("Considered whether you need additional help (employees, subcontractors)", True),
            ("Thought about one new service or market to explore next year", True),
        ]),
    ]

    for sec_title, items in sections:
        # Section header
        hdr_t = Table(
            [[Paragraph(
                f'<font color="white"><b>{sec_title}</b></font>',
                ParagraphStyle("SecHdr", fontName="Helvetica-Bold", fontSize=11,
                               textColor=white)
            )]],
            colWidths=[17*cm]
        )
        hdr_t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), NAVY),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(hdr_t)

        chk_data = []
        for i, (item, show_box) in enumerate(items):
            tick = "☐" if show_box else ""
            chk_data.append([
                Paragraph(tick, ParagraphStyle("Tick2", fontName="Helvetica", fontSize=13,
                                               textColor=NAVY, alignment=TA_CENTER)),
                Paragraph(item, styles["TRBody"])
            ])

        chk_t = Table(chk_data, colWidths=[1.2*cm, 15.8*cm])
        chk_t.setStyle(TableStyle([
            ("ROWBACKGROUND", (0, 0), (-1, -1), [white, LGREY]),
            ("GRID", (0, 0), (-1, -1), 0.3, HexColor("#CCCCCC")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(chk_t)
        story.append(Spacer(1, 0.4*cm))

    # Notes section
    story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#CCCCCC")))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("NOTES & GOALS FOR NEXT YEAR", styles["TRSectionHead"]))
    notes_t = Table(
        [[""]],
        colWidths=[17*cm], rowHeights=[4*cm]
    )
    notes_t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
        ("BACKGROUND", (0, 0), (-1, -1), LGREY),
    ]))
    story.append(notes_t)

    path = f"{OUT}/10_TradeReady_Annual_Checklist.pdf"
    build_pdf(path, story)
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== Phase 3: Pro Tier Additions ===")
    print("File 9 — Employee Onboarding Pack")
    generate_onboarding_docx()
    generate_onboarding_pdf()
    print("File 10 — Annual Business Health Checklist")
    generate_annual_checklist_pdf()
    print("=== Phase 3 complete ===")
