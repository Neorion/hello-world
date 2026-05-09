"""
TradeReady Co. — README Generator + ZIP Packager
Generates README_Start_Here.pdf and creates the 3 product ZIP bundles.

Run: python3 scripts/package_zips.py
Output: output/zips/
"""

import os
import zipfile
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

FILES_DIR = "output/files"
ZIPS_DIR = "output/zips"
NAVY = HexColor("#1B3A5C")
ORANGE = HexColor("#E8500A")
LGREY = HexColor("#F5F5F5")


# ─────────────────────────────────────────────────────────────
# README PDF
# ─────────────────────────────────────────────────────────────

def generate_readme_pdf():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("TRTitle", fontName="Helvetica-Bold", fontSize=22,
                              textColor=NAVY, spaceAfter=6, alignment=TA_CENTER))
    styles.add(ParagraphStyle("TRSubtitle", fontName="Helvetica", fontSize=11,
                              textColor=HexColor("#444444"), spaceAfter=16, alignment=TA_CENTER))
    styles.add(ParagraphStyle("TRBody", fontName="Helvetica", fontSize=10,
                              leading=15, spaceAfter=6))
    styles.add(ParagraphStyle("TRBold", fontName="Helvetica-Bold", fontSize=10,
                              leading=15, spaceAfter=4))
    styles.add(ParagraphStyle("TRSectionHead", fontName="Helvetica-Bold", fontSize=12,
                              textColor=NAVY, spaceBefore=14, spaceAfter=4))
    styles.add(ParagraphStyle("TRSmall", fontName="Helvetica", fontSize=8,
                              textColor=HexColor("#888888"), spaceAfter=2))
    styles.add(ParagraphStyle("TRCentre", fontName="Helvetica", fontSize=10,
                              alignment=TA_CENTER, spaceAfter=6))

    story = []

    def footer_canvas(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(HexColor("#999999"))
        canvas.drawCentredString(
            A4[0] / 2, 1.2*cm,
            "TradeReady Co.  |  tradereadyco.com  |  contact@tradereadyco.com"
        )
        canvas.restoreState()

    # Header banner
    hdr_t = Table(
        [[Paragraph(
            '<font color="white"><b>TRADEREADY CO.</b></font>',
            ParagraphStyle("Brand", fontName="Helvetica-Bold", fontSize=24,
                           textColor=white, alignment=TA_CENTER)
        )]],
        colWidths=[17*cm], rowHeights=[2.5*cm]
    )
    hdr_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(hdr_t)
    story.append(Spacer(1, 0.5*cm))

    story.append(Paragraph(
        "Thanks for purchasing the TradeReady Business Pack",
        styles["TRTitle"]
    ))
    story.append(Paragraph(
        "Everything a tradesman needs to run a professional business — downloaded in minutes.",
        styles["TRSubtitle"]
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=NAVY))
    story.append(Spacer(1, 0.4*cm))

    # What's included
    story.append(Paragraph("WHAT'S IN YOUR PACK", styles["TRSectionHead"]))

    files_table_data = [
        ["#", "File", "Format", "What It's For"],
        ["1", "Job Quote Template", "PDF + Word", "Send professional quotes before any job starts"],
        ["2", "Invoice Template", "PDF + Word", "Invoice clients — with deposit, balance, and bank details"],
        ["3", "Job Completion Certificate", "PDF + Word", "Sign-off document when a job is done"],
        ["4", "Licence Terms", "PDF", "Legal terms for use of this pack"],
        ["5", "Client Message Scripts", "PDF", "10 SMS/WhatsApp scripts for every stage of the job"],
        ["6", "Job Pricing Calculator", "Excel (.xlsx)", "Calculate your quote price and hourly rate"],
        ["7", "Social Media Caption Pack", "PDF", "30 ready-to-post Facebook and Instagram captions"],
        ["8", "Google Review Request Kit", "PDF", "Scripts, QR code guide, and review card template"],
        ["9", "First Employee Onboarding Pack", "PDF + Word", "Welcome letter, day-one checklist, equipment form"],
        ["10", "Annual Business Health Checklist", "PDF", "Year-end review across finances, ops, and growth"],
    ]

    col_w = [0.8*cm, 5.5*cm, 3*cm, 7.7*cm]
    ft = Table(files_table_data, colWidths=col_w)
    ft.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUND", (0, 1), (-1, -1), [white, LGREY]),
        ("GRID", (0, 0), (-1, -1), 0.3, HexColor("#CCCCCC")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
    ]))
    story.append(ft)
    story.append(Spacer(1, 0.4*cm))

    # How to use Word docs
    story.append(Paragraph("HOW TO EDIT THE WORD (.docx) FILES", styles["TRSectionHead"]))
    word_tips = [
        "Open the .docx file in Microsoft Word or upload it to Google Docs (File → Open).",
        "Use Find & Replace (Ctrl+H / Cmd+H) to replace all [bracketed placeholders] at once — "
        "e.g. replace [Company Name] with your actual business name throughout the document.",
        "To add your logo: click the grey 'Insert Logo Here' box and insert your image.",
        "To change font colours or styles: select the text and use the Home tab formatting tools.",
        "Save a master copy with your details filled in — then duplicate it for each new job.",
    ]
    for tip in word_tips:
        story.append(Paragraph(f"• {tip}", styles["TRBody"]))

    story.append(Spacer(1, 0.3*cm))

    # How to use the calculator
    story.append(Paragraph("HOW TO USE THE PRICING CALCULATOR (.xlsx)", styles["TRSectionHead"]))
    xl_tips = [
        "Open in Microsoft Excel, or upload to Google Sheets via Google Drive → New → File Upload.",
        "Go to the 'Job Estimator' tab. Enter your numbers in the YELLOW cells.",
        "The GREEN cells calculate automatically — do not type in green cells.",
        "Your recommended quote price appears in ORANGE.",
        "The 'Hourly Rate Calculator' tab helps you figure out what to charge per hour.",
        "The 'Instructions' tab has a full plain-English guide.",
    ]
    for tip in xl_tips:
        story.append(Paragraph(f"• {tip}", styles["TRBody"]))

    story.append(Spacer(1, 0.4*cm))

    # Call to action
    cta_t = Table(
        [[Paragraph(
            '<font color="white"><b>Found the pack useful? Leave a quick review on Gumroad.</b><br/>'
            'It helps other tradesmen find this resource — and it only takes 2 minutes.</font>',
            ParagraphStyle("CTA", fontName="Helvetica-Bold", fontSize=10,
                           textColor=white, alignment=TA_CENTER, leading=16)
        )]],
        colWidths=[17*cm]
    )
    cta_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ORANGE),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(cta_t)
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph(
        "Questions? contact@tradereadyco.com",
        ParagraphStyle("Contact", fontName="Helvetica-Bold", fontSize=11,
                       textColor=NAVY, alignment=TA_CENTER, spaceAfter=4)
    ))
    story.append(Paragraph(
        "tradereadyco.com",
        ParagraphStyle("Website", fontName="Helvetica", fontSize=10,
                       textColor=HexColor("#3366CC"), alignment=TA_CENTER, spaceAfter=4)
    ))

    path = f"{FILES_DIR}/README_Start_Here.pdf"
    doc = SimpleDocTemplate(
        path, pagesize=A4,
        topMargin=1.5*cm, bottomMargin=2*cm,
        leftMargin=2*cm, rightMargin=2*cm
    )
    doc.build(story, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
    print(f"  Saved: {path}")


# ─────────────────────────────────────────────────────────────
# ZIP BUNDLES
# ─────────────────────────────────────────────────────────────

BASE_FILES = [
    "01_TradeReady_Quote_Template.docx",
    "01_TradeReady_Quote_Template.pdf",
    "02_TradeReady_Invoice_Template.docx",
    "02_TradeReady_Invoice_Template.pdf",
    "03_TradeReady_Completion_Certificate.docx",
    "03_TradeReady_Completion_Certificate.pdf",
    "04_TradeReady_Licence_Terms.pdf",
    "README_Start_Here.pdf",
]

DEAL_FILES = BASE_FILES + [
    "05_TradeReady_Client_Message_Scripts.pdf",
    "06_TradeReady_Pricing_Calculator.xlsx",
    "07_TradeReady_Social_Caption_Pack.pdf",
    "08_TradeReady_Google_Review_Kit.pdf",
]

PRO_FILES = DEAL_FILES + [
    "09_TradeReady_Onboarding_Pack.docx",
    "09_TradeReady_Onboarding_Pack.pdf",
    "10_TradeReady_Annual_Checklist.pdf",
]


def create_zip(zip_name, file_list):
    zip_path = os.path.join(ZIPS_DIR, zip_name)
    missing = []
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename in file_list:
            filepath = os.path.join(FILES_DIR, filename)
            if os.path.exists(filepath):
                zf.write(filepath, arcname=filename)
            else:
                missing.append(filename)
    if missing:
        print(f"  WARNING: Missing files not included in {zip_name}: {missing}")
    size_kb = os.path.getsize(zip_path) / 1024
    print(f"  Created: {zip_path} ({size_kb:.1f} KB, {len(file_list) - len(missing)} files)")
    return len(missing) == 0


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== Phase 4: README + Packaging ===")
    print("README_Start_Here.pdf")
    generate_readme_pdf()

    print("\nCreating ZIP bundles...")
    create_zip("TradeReady-Base-Pack.zip", BASE_FILES)
    create_zip("TradeReady-Deal-Pack.zip", DEAL_FILES)
    create_zip("TradeReady-Pro-Pack.zip", PRO_FILES)

    print("\n=== Phase 4 complete ===")
    print("\nFinal file list:")
    for f in sorted(os.listdir(FILES_DIR)):
        size = os.path.getsize(os.path.join(FILES_DIR, f))
        print(f"  {f}  ({size/1024:.1f} KB)")
    print("\nZIP bundles:")
    for z in sorted(os.listdir(ZIPS_DIR)):
        size = os.path.getsize(os.path.join(ZIPS_DIR, z))
        print(f"  {z}  ({size/1024:.1f} KB)")
