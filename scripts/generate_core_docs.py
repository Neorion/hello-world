"""
TradeReady Co. — Core Document Generator
Generates Files 1, 2, 3 as .docx + PDF, and File 4 as PDF only.

Run: python3 scripts/generate_core_docs.py
Output: output/files/
"""

import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black, lightgrey
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

OUT = "output/files"
NAVY = HexColor("#1B3A5C")
ORANGE = HexColor("#E8500A")
LGREY = HexColor("#F5F5F5")
MGREY = HexColor("#CCCCCC")

# ─────────────────────────────────────────────────────────────
# HELPERS — DOCX
# ─────────────────────────────────────────────────────────────

def set_cell_bg(cell, hex_color):
    """Set background colour on a table cell."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color.lstrip("#"))
    tcPr.append(shd)

def set_cell_border(cell, **kwargs):
    """Set borders on a table cell. kwargs: top, bottom, left, right = 'single'/'none'."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        border = OxmlElement(f"w:{side}")
        val = kwargs.get(side, "none")
        border.set(qn("w:val"), val)
        border.set(qn("w:sz"), "4")
        border.set(qn("w:space"), "0")
        border.set(qn("w:color"), "CCCCCC" if val == "single" else "auto")
        tcBorders.append(border)
    tcPr.append(tcBorders)

def add_navy_header(doc, title, subtitle=None):
    """Add the navy-blue header bar to a .docx document."""
    # Header table: logo placeholder left, company info right
    hdr_table = doc.add_table(rows=1, cols=2)
    hdr_table.autofit = False
    hdr_table.columns[0].width = Cm(5)
    hdr_table.columns[1].width = Cm(12)

    left = hdr_table.cell(0, 0)
    right = hdr_table.cell(0, 1)
    for cell in [left, right]:
        set_cell_bg(cell, "#1B3A5C")

    # Logo placeholder box (we represent it as bracketed text in docx)
    p = left.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("[Insert Logo Here]")
    run.font.color.rgb = RGBColor(0xCC, 0xCC, 0xCC)
    run.font.size = Pt(8)
    run.font.name = "Arial"

    p2 = right.paragraphs[0]
    p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    for line in [
        "[Company Name]",
        "ABN/Company No: [ABN]  |  Ph: [Phone]",
        "[Email]  |  [Website]",
    ]:
        run2 = p2.add_run(line + "\n")
        run2.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        run2.font.size = Pt(9)
        run2.font.name = "Arial"

    doc.add_paragraph()

    # Document title
    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.LEFT
    t_run = title_para.add_run(title)
    t_run.font.name = "Arial"
    t_run.font.size = Pt(20)
    t_run.font.bold = True
    t_run.font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)

    if subtitle:
        sub_para = doc.add_paragraph()
        sub_run = sub_para.add_run(subtitle)
        sub_run.font.name = "Arial"
        sub_run.font.size = Pt(10)
        sub_run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)


def add_footer_docx(doc):
    """Add footer to every page of a .docx."""
    section = doc.sections[0]
    footer = section.footer
    para = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = para.add_run(
        "TradeReady Co.  |  tradereadyco.com  |  "
        "Template by TradeReady Co. — not legal advice"
    )
    run.font.size = Pt(7)
    run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
    run.font.name = "Arial"


def new_docx():
    """Create a new Document with A4 page size and narrow margins."""
    doc = Document()
    section = doc.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.5)
    section.bottom_margin = Cm(1.5)
    section.left_margin = Cm(2)
    section.right_margin = Cm(2)
    # Default font
    doc.styles["Normal"].font.name = "Arial"
    doc.styles["Normal"].font.size = Pt(10)
    return doc


def add_kv_row(doc, label, value=""):
    """Add a simple key: [value] row."""
    p = doc.add_paragraph()
    r1 = p.add_run(f"{label}:  ")
    r1.font.bold = True
    r1.font.name = "Arial"
    r1.font.size = Pt(10)
    r2 = p.add_run(value if value else f"[{label}]")
    r2.font.name = "Arial"
    r2.font.size = Pt(10)
    p.paragraph_format.space_after = Pt(2)


def line_item_table_docx(doc, num_rows=8):
    """Add the standard line-item table to a .docx."""
    headers = ["Description", "Qty", "Unit", "Rate ($)", "Total ($)"]
    col_widths = [Cm(8), Cm(2), Cm(2), Cm(2.5), Cm(2.5)]

    table = doc.add_table(rows=1 + num_rows + 3, cols=5)
    table.style = "Table Grid"
    table.autofit = False
    for i, w in enumerate(col_widths):
        for row in table.rows:
            row.cells[i].width = w

    # Header row
    hdr = table.rows[0]
    for i, h in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_bg(cell, "#1B3A5C")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(h)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        run.font.size = Pt(9)
        run.font.name = "Arial"

    # Data rows
    for row_idx in range(num_rows):
        row = table.rows[row_idx + 1]
        if row_idx % 2 == 1:
            for cell in row.cells:
                set_cell_bg(cell, "#F5F5F5")
        for cell in row.cells:
            p = cell.paragraphs[0]
            run = p.add_run(" ")
            run.font.size = Pt(10)
            run.font.name = "Arial"

    # Subtotal, GST, Total rows
    labels = [
        ("Subtotal", ""),
        ("GST / VAT (10%)", ""),
        ("TOTAL", ""),
    ]
    for i, (lbl, val) in enumerate(labels):
        row = table.rows[num_rows + 1 + i]
        # Merge first 4 cells for label
        merged = row.cells[0].merge(row.cells[1]).merge(row.cells[2]).merge(row.cells[3])
        p = merged.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        run = p.add_run(lbl)
        run.font.bold = (lbl == "TOTAL")
        run.font.name = "Arial"
        run.font.size = Pt(10)
        if lbl == "TOTAL":
            set_cell_bg(merged, "#1B3A5C")
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

        total_cell = row.cells[4]
        p2 = total_cell.paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        run2 = p2.add_run("$")
        run2.font.name = "Arial"
        run2.font.size = Pt(10)
        if lbl == "TOTAL":
            set_cell_bg(total_cell, "#1B3A5C")
            run2.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            run2.font.bold = True


# ─────────────────────────────────────────────────────────────
# HELPERS — PDF (ReportLab)
# ─────────────────────────────────────────────────────────────

def base_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "TRTitle", fontName="Helvetica-Bold", fontSize=20,
        textColor=NAVY, spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        "TRSubtitle", fontName="Helvetica", fontSize=10,
        textColor=HexColor("#666666"), spaceAfter=12
    ))
    styles.add(ParagraphStyle(
        "TRBody", fontName="Helvetica", fontSize=10,
        leading=14, spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        "TRBold", fontName="Helvetica-Bold", fontSize=10,
        leading=14, spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        "TRSmall", fontName="Helvetica", fontSize=8,
        textColor=HexColor("#666666"), spaceAfter=2
    ))
    styles.add(ParagraphStyle(
        "TRFooter", fontName="Helvetica", fontSize=7,
        textColor=HexColor("#999999"), alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        "TRSectionHead", fontName="Helvetica-Bold", fontSize=11,
        textColor=NAVY, spaceBefore=10, spaceAfter=4
    ))
    return styles


def pdf_header_table(styles):
    """Return the navy header table for PDF docs."""
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
    hdr = Table(
        [[logo_cell, company_cell]],
        colWidths=[4*cm, 13*cm],
        rowHeights=[2.2*cm]
    )
    hdr.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return hdr


def pdf_line_item_table(num_rows=8):
    """Return the standard line-item table for PDF docs."""
    col_w = [8.5*cm, 1.5*cm, 1.5*cm, 2.5*cm, 2.5*cm]
    headers = ["Description", "Qty", "Unit", "Rate ($)", "Total ($)"]
    data = [headers]
    for i in range(num_rows):
        data.append(["", "", "", "", ""])
    data.append(["", "", "", "Subtotal", "$"])
    data.append(["", "", "", "GST / VAT (10%)", "$"])
    data.append(["", "", "", "TOTAL", "$"])

    style = TableStyle([
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        # Alternating rows
        ("BACKGROUND", (0, 2), (-1, 2), LGREY),
        ("BACKGROUND", (0, 4), (-1, 4), LGREY),
        ("BACKGROUND", (0, 6), (-1, 6), LGREY),
        ("BACKGROUND", (0, 8), (-1, 8), LGREY),
        # Subtotal rows — right align label
        ("ALIGN", (3, num_rows+1), (4, num_rows+3), "RIGHT"),
        ("FONTNAME", (3, num_rows+3), (4, num_rows+3), "Helvetica-Bold"),
        ("BACKGROUND", (3, num_rows+3), (4, num_rows+3), NAVY),
        ("TEXTCOLOR", (3, num_rows+3), (4, num_rows+3), white),
        # General
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 10),
        ("ROWBACKGROUND", (0, 1), (-1, num_rows), [white, LGREY]),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ])
    t = Table(data, colWidths=col_w)
    t.setStyle(style)
    return t


def build_pdf(filename, story):
    """Build a PDF with standard page footer."""
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
# FILE 1 — QUOTE TEMPLATE
# ─────────────────────────────────────────────────────────────

def generate_quote_docx():
    doc = new_docx()
    add_navy_header(doc, "JOB QUOTE", "QTE-[YYYY]-[####]")
    add_footer_docx(doc)

    doc.add_paragraph()

    # Meta fields
    meta = doc.add_table(rows=4, cols=4)
    meta.autofit = False
    col_w = [Cm(3), Cm(5), Cm(3), Cm(5)]
    fields = [
        ("Quote No.", "QTE-[YYYY]-[####]", "Quote Date", "[DD/MM/YYYY]"),
        ("Valid Until", "[DD/MM/YYYY (+30 days)]", "Prepared By", "[Your Name]"),
        ("Client Name", "[Client Full Name]", "Site Address", "[Site Address]"),
        ("Client Phone", "[Client Phone]", "Client Email", "[Client Email]"),
    ]
    for r, row_data in enumerate(fields):
        for c, text in enumerate(row_data):
            cell = meta.cell(r, c)
            cell.width = col_w[c]
            p = cell.paragraphs[0]
            run = p.add_run(text)
            run.font.name = "Arial"
            run.font.size = Pt(9)
            run.font.bold = (c % 2 == 0)
            if c % 2 == 0:
                run.font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)

    doc.add_paragraph()

    # Section heading
    sh = doc.add_paragraph("SCOPE OF WORKS")
    sh.runs[0].font.bold = True
    sh.runs[0].font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)
    sh.runs[0].font.name = "Arial"
    sh.runs[0].font.size = Pt(11)

    line_item_table_docx(doc, num_rows=8)
    doc.add_paragraph()

    # Payment terms
    pt_head = doc.add_paragraph("PAYMENT TERMS")
    pt_head.runs[0].font.bold = True
    pt_head.runs[0].font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)
    pt_head.runs[0].font.name = "Arial"
    pt_head.runs[0].font.size = Pt(11)

    pt = doc.add_paragraph(
        "50% deposit required to secure booking. Balance due within 14 days of job completion."
    )
    pt.runs[0].font.name = "Arial"
    pt.runs[0].font.size = Pt(10)

    # T&Cs
    tc_head = doc.add_paragraph("TERMS & CONDITIONS")
    tc_head.runs[0].font.bold = True
    tc_head.runs[0].font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)
    tc_head.runs[0].font.name = "Arial"
    tc_head.runs[0].font.size = Pt(11)

    tc_text = doc.add_paragraph(
        "This quote covers the scope of works described above only. Any additional works "
        "requested outside this scope will be subject to a variation quote prior to commencement. "
        "All materials supplied remain the property of [Company Name] until payment is received in full. "
        "This quote is valid for 30 days from the date above."
    )
    tc_text.runs[0].font.name = "Arial"
    tc_text.runs[0].font.size = Pt(9)
    tc_text.runs[0].font.color.rgb = RGBColor(0x44, 0x44, 0x44)

    doc.add_paragraph()

    # Acceptance block
    acc_head = doc.add_paragraph("CLIENT ACCEPTANCE")
    acc_head.runs[0].font.bold = True
    acc_head.runs[0].font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)
    acc_head.runs[0].font.name = "Arial"
    acc_head.runs[0].font.size = Pt(11)

    acc_table = doc.add_table(rows=2, cols=3)
    acc_table.autofit = False
    for i, (lbl, w) in enumerate([("Client Name", Cm(5.5)), ("Signature", Cm(6)), ("Date", Cm(4))]):
        cell = acc_table.cell(0, i)
        cell.width = w
        p = cell.paragraphs[0]
        run = p.add_run(lbl)
        run.font.bold = True
        run.font.name = "Arial"
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)

        cell2 = acc_table.cell(1, i)
        cell2.width = w
        p2 = cell2.paragraphs[0]
        run2 = p2.add_run("______________________")
        run2.font.name = "Arial"
        run2.font.size = Pt(10)

    path = f"{OUT}/01_TradeReady_Quote_Template.docx"
    doc.save(path)
    print(f"  Saved: {path}")


def generate_quote_pdf():
    styles = base_styles()
    story = []

    story.append(pdf_header_table(styles))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("JOB QUOTE", styles["TRTitle"]))
    story.append(Paragraph("Quote No: QTE-[YYYY]-[####]", styles["TRSubtitle"]))

    # Meta table
    meta_data = [
        [Paragraph("<b>Quote Date:</b>", styles["TRBody"]), Paragraph("[DD/MM/YYYY]", styles["TRBody"]),
         Paragraph("<b>Valid Until:</b>", styles["TRBody"]), Paragraph("[DD/MM/YYYY (+30 days)]", styles["TRBody"])],
        [Paragraph("<b>Client Name:</b>", styles["TRBody"]), Paragraph("[Client Full Name]", styles["TRBody"]),
         Paragraph("<b>Client Phone:</b>", styles["TRBody"]), Paragraph("[Client Phone]", styles["TRBody"])],
        [Paragraph("<b>Client Address:</b>", styles["TRBody"]), Paragraph("[Client Address]", styles["TRBody"]),
         Paragraph("<b>Site Address:</b>", styles["TRBody"]), Paragraph("[Site Address]", styles["TRBody"])],
        [Paragraph("<b>Prepared By:</b>", styles["TRBody"]), Paragraph("[Your Name]", styles["TRBody"]),
         Paragraph("<b>Client Email:</b>", styles["TRBody"]), Paragraph("[Client Email]", styles["TRBody"])],
    ]
    meta_t = Table(meta_data, colWidths=[3.5*cm, 5.5*cm, 3.5*cm, 5.5*cm])
    meta_t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
        ("BACKGROUND", (0, 0), (-1, -1), LGREY),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    story.append(meta_t)
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("SCOPE OF WORKS", styles["TRSectionHead"]))
    story.append(pdf_line_item_table(num_rows=8))
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("PAYMENT TERMS", styles["TRSectionHead"]))
    story.append(Paragraph(
        "50% deposit required to secure booking. Balance due within 14 days of job completion.",
        styles["TRBody"]
    ))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("TERMS & CONDITIONS", styles["TRSectionHead"]))
    story.append(Paragraph(
        "This quote covers the scope of works described above only. Any additional works "
        "requested outside this scope will be subject to a variation quote prior to commencement. "
        "All materials supplied remain the property of [Company Name] until payment is received in full. "
        "This quote is valid for 30 days from the date above.",
        styles["TRSmall"]
    ))
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("CLIENT ACCEPTANCE", styles["TRSectionHead"]))
    acc_data = [
        ["Client Name", "Signature", "Date"],
        ["______________________", "______________________", "______________________"],
    ]
    acc_t = Table(acc_data, colWidths=[5.5*cm, 6*cm, 4*cm])
    acc_t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (-1, 0), NAVY),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(acc_t)

    path = f"{OUT}/01_TradeReady_Quote_Template.pdf"
    build_pdf(path, story)
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────
# FILE 2 — INVOICE TEMPLATE
# ─────────────────────────────────────────────────────────────

def generate_invoice_docx():
    doc = new_docx()
    add_navy_header(doc, "TAX INVOICE", "INV-[YYYY]-[####]")
    add_footer_docx(doc)

    doc.add_paragraph()

    meta = doc.add_table(rows=4, cols=4)
    meta.autofit = False
    col_w = [Cm(3), Cm(5), Cm(3), Cm(5)]
    fields = [
        ("Invoice No.", "INV-[YYYY]-[####]", "Invoice Date", "[DD/MM/YYYY]"),
        ("Reference Quote #", "[QTE-YYYY-####]", "Payment Due", "[DD/MM/YYYY (+14 days)]"),
        ("Client Name", "[Client Full Name]", "Client Phone", "[Client Phone]"),
        ("Client Address", "[Client Address]", "Client Email", "[Client Email]"),
    ]
    for r, row_data in enumerate(fields):
        for c, text in enumerate(row_data):
            cell = meta.cell(r, c)
            cell.width = col_w[c]
            p = cell.paragraphs[0]
            run = p.add_run(text)
            run.font.name = "Arial"
            run.font.size = Pt(9)
            run.font.bold = (c % 2 == 0)
            if c % 2 == 0:
                run.font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)

    doc.add_paragraph()

    sh = doc.add_paragraph("INVOICE ITEMS")
    sh.runs[0].font.bold = True
    sh.runs[0].font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)
    sh.runs[0].font.name = "Arial"
    sh.runs[0].font.size = Pt(11)

    line_item_table_docx(doc, num_rows=8)
    doc.add_paragraph()

    # Deposit & balance
    dep_table = doc.add_table(rows=2, cols=2)
    dep_table.autofit = False
    dep_table.columns[0].width = Cm(13)
    dep_table.columns[1].width = Cm(4)
    labels = [("Amount Paid (Deposit)", "$"), ("BALANCE DUE", "$")]
    for i, (lbl, val) in enumerate(labels):
        cell_l = dep_table.cell(i, 0)
        cell_r = dep_table.cell(i, 1)
        p = cell_l.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        run = p.add_run(lbl)
        run.font.bold = (i == 1)
        run.font.name = "Arial"
        run.font.size = Pt(10)
        if i == 1:
            set_cell_bg(cell_l, "#E8500A")
            set_cell_bg(cell_r, "#E8500A")
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        p2 = cell_r.paragraphs[0]
        run2 = p2.add_run(val)
        run2.font.bold = (i == 1)
        run2.font.name = "Arial"
        run2.font.size = Pt(10)
        if i == 1:
            run2.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    doc.add_paragraph()

    # Bank details
    bk = doc.add_paragraph("PAYMENT DETAILS")
    bk.runs[0].font.bold = True
    bk.runs[0].font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)
    bk.runs[0].font.name = "Arial"
    bk.runs[0].font.size = Pt(11)

    for line in ["Bank: [Bank Name]", "Account Name: [Company Name]",
                 "BSB: [BSB Number]  |  Account: [Account Number]",
                 "— or IBAN: [IBAN] / BIC: [BIC] (international)"]:
        p = doc.add_paragraph(line)
        p.runs[0].font.name = "Arial"
        p.runs[0].font.size = Pt(9)
        p.paragraph_format.space_after = Pt(1)

    doc.add_paragraph()

    late = doc.add_paragraph(
        "Late payment: Invoices unpaid after 30 days incur a 2% monthly late payment fee."
    )
    late.runs[0].font.name = "Arial"
    late.runs[0].font.size = Pt(9)
    late.runs[0].font.italic = True
    late.runs[0].font.color.rgb = RGBColor(0x88, 0x00, 0x00)

    doc.add_paragraph()
    paid_note = doc.add_paragraph(
        "TIP: To show PAID watermark, change the colour of the word PAID below from white to red and enlarge."
    )
    paid_note.runs[0].font.size = Pt(8)
    paid_note.runs[0].font.color.rgb = RGBColor(0xBB, 0xBB, 0xBB)
    paid_note.runs[0].font.name = "Arial"
    p_paid = doc.add_paragraph()
    r_paid = p_paid.add_run("PAID")
    r_paid.font.size = Pt(60)
    r_paid.font.bold = True
    r_paid.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)  # white = hidden
    r_paid.font.name = "Arial"

    path = f"{OUT}/02_TradeReady_Invoice_Template.docx"
    doc.save(path)
    print(f"  Saved: {path}")


def generate_invoice_pdf():
    styles = base_styles()
    story = []

    story.append(pdf_header_table(styles))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("TAX INVOICE", styles["TRTitle"]))
    story.append(Paragraph("Invoice No: INV-[YYYY]-[####]", styles["TRSubtitle"]))

    meta_data = [
        [Paragraph("<b>Invoice Date:</b>", styles["TRBody"]), Paragraph("[DD/MM/YYYY]", styles["TRBody"]),
         Paragraph("<b>Payment Due:</b>", styles["TRBody"]), Paragraph("[DD/MM/YYYY (+14 days)]", styles["TRBody"])],
        [Paragraph("<b>Reference Quote #:</b>", styles["TRBody"]), Paragraph("[QTE-YYYY-####]", styles["TRBody"]),
         Paragraph("<b>Client Phone:</b>", styles["TRBody"]), Paragraph("[Client Phone]", styles["TRBody"])],
        [Paragraph("<b>Client Name:</b>", styles["TRBody"]), Paragraph("[Client Full Name]", styles["TRBody"]),
         Paragraph("<b>Client Email:</b>", styles["TRBody"]), Paragraph("[Client Email]", styles["TRBody"])],
        [Paragraph("<b>Client Address:</b>", styles["TRBody"]), Paragraph("[Client Address]", styles["TRBody"]),
         Paragraph("<b>Site Address:</b>", styles["TRBody"]), Paragraph("[Site Address]", styles["TRBody"])],
    ]
    meta_t = Table(meta_data, colWidths=[3.5*cm, 5.5*cm, 3.5*cm, 5.5*cm])
    meta_t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
        ("BACKGROUND", (0, 0), (-1, -1), LGREY),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    story.append(meta_t)
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("INVOICE ITEMS", styles["TRSectionHead"]))
    story.append(pdf_line_item_table(num_rows=8))
    story.append(Spacer(1, 0.3*cm))

    # Deposit & balance
    dep_data = [
        ["Amount Paid (Deposit)", "$___________"],
        ["BALANCE DUE", "$___________"],
    ]
    dep_t = Table(dep_data, colWidths=[13*cm, 4*cm])
    dep_t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("BACKGROUND", (0, 1), (-1, 1), ORANGE),
        ("TEXTCOLOR", (0, 1), (-1, 1), white),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(dep_t)
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("PAYMENT DETAILS", styles["TRSectionHead"]))
    for line in ["Bank: [Bank Name]", "Account Name: [Company Name]",
                 "BSB: [BSB Number]  |  Account: [Account Number]",
                 "— or IBAN: [IBAN] / BIC: [BIC] (international)"]:
        story.append(Paragraph(line, styles["TRSmall"]))

    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        "<i>Invoices unpaid after 30 days incur a 2% monthly late payment fee.</i>",
        ParagraphStyle("Warning", fontName="Helvetica-Oblique", fontSize=9,
                       textColor=HexColor("#880000"), spaceAfter=6)
    ))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        "<i>TIP: Print this invoice and stamp or write PAID in red when payment is received.</i>",
        styles["TRSmall"]
    ))

    path = f"{OUT}/02_TradeReady_Invoice_Template.pdf"
    build_pdf(path, story)
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────
# FILE 3 — JOB COMPLETION CERTIFICATE
# ─────────────────────────────────────────────────────────────

def generate_completion_docx():
    doc = new_docx()
    add_navy_header(doc, "CERTIFICATE OF JOB COMPLETION", "")
    add_footer_docx(doc)
    doc.add_paragraph()

    # Job details
    fields = [
        ("Job Reference No.", "[Matches Invoice No.]"),
        ("Date Works Completed", "[DD/MM/YYYY]"),
        ("Technician / Contractor Name", "[Full Name]"),
        ("Licence Number", "[Licence No.]"),
        ("Client Name", "[Client Full Name]"),
        ("Site Address", "[Site Address]"),
    ]
    detail_table = doc.add_table(rows=len(fields), cols=2)
    detail_table.autofit = False
    detail_table.columns[0].width = Cm(6)
    detail_table.columns[1].width = Cm(11)
    for r, (label, placeholder) in enumerate(fields):
        cell_l = detail_table.cell(r, 0)
        cell_r = detail_table.cell(r, 1)
        if r % 2 == 0:
            set_cell_bg(cell_l, "#F5F5F5")
            set_cell_bg(cell_r, "#F5F5F5")
        p = cell_l.paragraphs[0]
        run = p.add_run(label)
        run.font.bold = True
        run.font.name = "Arial"
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)
        p2 = cell_r.paragraphs[0]
        run2 = p2.add_run(placeholder)
        run2.font.name = "Arial"
        run2.font.size = Pt(10)

    doc.add_paragraph()

    desc_head = doc.add_paragraph("DESCRIPTION OF WORKS COMPLETED")
    desc_head.runs[0].font.bold = True
    desc_head.runs[0].font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)
    desc_head.runs[0].font.name = "Arial"
    desc_head.runs[0].font.size = Pt(11)

    desc_box = doc.add_table(rows=1, cols=1)
    desc_box.autofit = False
    desc_box.columns[0].width = Cm(17)
    cell = desc_box.cell(0, 0)
    cell.height = Cm(4)
    p = cell.paragraphs[0]
    run = p.add_run(
        "[Describe the works completed. Include specific tasks, areas, materials used, "
        "and any notable details relevant to the client.]"
    )
    run.font.name = "Arial"
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)

    doc.add_paragraph()

    # Statement
    stmt = doc.add_table(rows=1, cols=1)
    stmt.autofit = False
    stmt.columns[0].width = Cm(17)
    cell = stmt.cell(0, 0)
    set_cell_bg(cell, "#1B3A5C")
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(
        "The above works have been completed to the agreed specification "
        "and the client is satisfied with the outcome."
    )
    run.font.bold = True
    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    run.font.name = "Arial"
    run.font.size = Pt(10)

    doc.add_paragraph()

    # Defects clause
    defects = doc.add_paragraph(
        "DEFECTS LIABILITY: Any defects arising from workmanship within [90 days] "
        "of the date above will be rectified at no charge to the client."
    )
    defects.runs[0].font.name = "Arial"
    defects.runs[0].font.size = Pt(9)
    defects.runs[0].font.italic = True
    defects.runs[0].font.color.rgb = RGBColor(0x44, 0x44, 0x44)

    doc.add_paragraph()

    # Sign-off table
    sig_head = doc.add_paragraph("SIGN-OFF")
    sig_head.runs[0].font.bold = True
    sig_head.runs[0].font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)
    sig_head.runs[0].font.name = "Arial"
    sig_head.runs[0].font.size = Pt(11)

    sig_table = doc.add_table(rows=4, cols=4)
    sig_table.autofit = False
    col_w = [Cm(2.5), Cm(6), Cm(2.5), Cm(6)]
    headers_sig = ["", "CLIENT", "", "CONTRACTOR"]
    for c, h in enumerate(headers_sig):
        cell = sig_table.cell(0, c)
        cell.width = col_w[c]
        set_cell_bg(cell, "#1B3A5C")
        p = cell.paragraphs[0]
        run = p.add_run(h)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        run.font.name = "Arial"
        run.font.size = Pt(9)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    for r, lbl in enumerate(["Name", "Signature", "Date"]):
        for c in range(4):
            cell = sig_table.cell(r + 1, c)
            cell.width = col_w[c]
            if r % 2 == 1:
                set_cell_bg(cell, "#F5F5F5")
            p = cell.paragraphs[0]
            if c in (0, 2):
                run = p.add_run(lbl)
                run.font.bold = True
                run.font.name = "Arial"
                run.font.size = Pt(9)
                run.font.color.rgb = RGBColor(0x1B, 0x3A, 0x5C)
            else:
                run = p.add_run("______________________________")
                run.font.name = "Arial"
                run.font.size = Pt(10)

    path = f"{OUT}/03_TradeReady_Completion_Certificate.docx"
    doc.save(path)
    print(f"  Saved: {path}")


def generate_completion_pdf():
    styles = base_styles()
    story = []

    story.append(pdf_header_table(styles))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("CERTIFICATE OF JOB COMPLETION", styles["TRTitle"]))
    story.append(Spacer(1, 0.3*cm))

    detail_data = [
        [Paragraph("<b>Job Reference No.</b>", styles["TRBody"]), Paragraph("[Matches Invoice No.]", styles["TRBody"])],
        [Paragraph("<b>Date Works Completed</b>", styles["TRBody"]), Paragraph("[DD/MM/YYYY]", styles["TRBody"])],
        [Paragraph("<b>Technician / Contractor Name</b>", styles["TRBody"]), Paragraph("[Full Name]", styles["TRBody"])],
        [Paragraph("<b>Licence Number</b>", styles["TRBody"]), Paragraph("[Licence No.]", styles["TRBody"])],
        [Paragraph("<b>Client Name</b>", styles["TRBody"]), Paragraph("[Client Full Name]", styles["TRBody"])],
        [Paragraph("<b>Site Address</b>", styles["TRBody"]), Paragraph("[Site Address]", styles["TRBody"])],
    ]
    detail_t = Table(detail_data, colWidths=[6*cm, 11*cm])
    detail_t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
        ("ROWBACKGROUND", (0, 0), (-1, -1), [LGREY, white]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
    ]))
    story.append(detail_t)
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("DESCRIPTION OF WORKS COMPLETED", styles["TRSectionHead"]))
    desc_t = Table(
        [[Paragraph(
            "[Describe the works completed. Include specific tasks, areas, materials used, "
            "and any notable details relevant to the client.]",
            ParagraphStyle("Grey", fontName="Helvetica", fontSize=10,
                           textColor=HexColor("#999999"))
        )]],
        colWidths=[17*cm], rowHeights=[3.5*cm]
    )
    desc_t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(desc_t)
    story.append(Spacer(1, 0.4*cm))

    stmt_t = Table(
        [[Paragraph(
            "<font color='white'><b>The above works have been completed to the agreed specification "
            "and the client is satisfied with the outcome.</b></font>",
            ParagraphStyle("Stmt", fontName="Helvetica-Bold", fontSize=10,
                           textColor=white, alignment=TA_CENTER)
        )]],
        colWidths=[17*cm]
    )
    stmt_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(stmt_t)
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph(
        "<i>DEFECTS LIABILITY: Any defects arising from workmanship within [90 days] "
        "of the date above will be rectified at no charge to the client.</i>",
        ParagraphStyle("Defects", fontName="Helvetica-Oblique", fontSize=9,
                       textColor=HexColor("#444444"), spaceAfter=8)
    ))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("SIGN-OFF", styles["TRSectionHead"]))
    sig_data = [
        [Paragraph("<font color='white'></font>", styles["TRBody"]),
         Paragraph("<font color='white'><b>CLIENT</b></font>",
                   ParagraphStyle("SigHdr", fontName="Helvetica-Bold", fontSize=10,
                                  textColor=white, alignment=TA_CENTER)),
         Paragraph("<font color='white'></font>", styles["TRBody"]),
         Paragraph("<font color='white'><b>CONTRACTOR</b></font>",
                   ParagraphStyle("SigHdr2", fontName="Helvetica-Bold", fontSize=10,
                                  textColor=white, alignment=TA_CENTER))],
        [Paragraph("<b>Name</b>", styles["TRBold"]),
         Paragraph("______________________________", styles["TRBody"]),
         Paragraph("<b>Name</b>", styles["TRBold"]),
         Paragraph("______________________________", styles["TRBody"])],
        [Paragraph("<b>Signature</b>", styles["TRBold"]),
         Paragraph("______________________________", styles["TRBody"]),
         Paragraph("<b>Signature</b>", styles["TRBold"]),
         Paragraph("______________________________", styles["TRBody"])],
        [Paragraph("<b>Date</b>", styles["TRBold"]),
         Paragraph("______________________________", styles["TRBody"]),
         Paragraph("<b>Date</b>", styles["TRBold"]),
         Paragraph("______________________________", styles["TRBody"])],
    ]
    sig_t = Table(sig_data, colWidths=[2.5*cm, 6*cm, 2.5*cm, 6*cm])
    sig_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
        ("ROWBACKGROUND", (0, 1), (-1, -1), [LGREY, white]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
    ]))
    story.append(sig_t)

    path = f"{OUT}/03_TradeReady_Completion_Certificate.pdf"
    build_pdf(path, story)
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────
# FILE 4 — LICENCE TERMS
# ─────────────────────────────────────────────────────────────

def generate_licence_pdf():
    styles = base_styles()
    story = []

    story.append(pdf_header_table(styles))
    story.append(Spacer(1, 0.6*cm))

    story.append(Paragraph("LICENCE AGREEMENT", styles["TRTitle"]))
    story.append(Paragraph("TradeReady Business Pack", styles["TRSubtitle"]))
    story.append(Paragraph(
        "© TradeReady Co. 2026. All rights reserved.",
        ParagraphStyle("Copyright", fontName="Helvetica-Bold", fontSize=10,
                       textColor=NAVY, spaceAfter=16)
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY))
    story.append(Spacer(1, 0.4*cm))

    sections = [
        ("PERMITTED USE", [
            "You may use, edit, and print these templates for your own business operations.",
            "Commercial use is permitted — you may use these templates when working with clients.",
        ]),
        ("PROHIBITED USE", [
            "You may not resell, redistribute, sublicense, or share these files with any third party.",
            "You may not upload these files to any marketplace, platform, or file-sharing service.",
            "You may not represent these templates as your own original work for resale purposes.",
        ]),
        ("NO WARRANTY", [
            "These templates are provided for general business use only and do not constitute "
            "legal, financial, or professional advice.",
            "Consult a qualified professional for advice specific to your circumstances.",
            "TradeReady Co. accepts no liability for the use or misuse of these templates.",
        ]),
        ("QUESTIONS", [
            "contact@tradereadyco.com",
        ]),
    ]

    for heading, points in sections:
        story.append(Paragraph(heading, styles["TRSectionHead"]))
        for point in points:
            story.append(Paragraph(f"• {point}", styles["TRBody"]))
        story.append(Spacer(1, 0.3*cm))

    story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#CCCCCC")))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        "TradeReady Co.  |  tradereadyco.com  |  contact@tradereadyco.com",
        ParagraphStyle("LicFooter", fontName="Helvetica", fontSize=9,
                       textColor=HexColor("#666666"), alignment=TA_CENTER)
    ))

    path = f"{OUT}/04_TradeReady_Licence_Terms.pdf"
    build_pdf(path, story)
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== Phase 1: Core Documents ===")
    print("File 1 — Quote Template")
    generate_quote_docx()
    generate_quote_pdf()
    print("File 2 — Invoice Template")
    generate_invoice_docx()
    generate_invoice_pdf()
    print("File 3 — Completion Certificate")
    generate_completion_docx()
    generate_completion_pdf()
    print("File 4 — Licence Terms")
    generate_licence_pdf()
    print("=== Phase 1 complete ===")
