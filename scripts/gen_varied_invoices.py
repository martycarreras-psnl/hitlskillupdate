#!/usr/bin/env python3
"""Generate 20 invoice PDFs with genuinely different layouts.

Unlike gen_testfiles.py (one recolored template), this produces a spread of
visually distinct invoice formats — modern banded, minimalist, classic ruled,
two-tone sidebar, letterhead, dense corporate, handwritten-style, etc. — for
operations at Nemours Children's Health. Vendors/amounts are fictional.

Output: testfiles/invoices_varied/*.pdf
Run:    python3 scripts/gen_varied_invoices.py
"""

from __future__ import annotations

import os
import random

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "testfiles", "invoices_varied")

W, H = LETTER

BILL_TO = [
    "Nemours Children's Health",
    "Accounts Payable",
    "1600 Rockland Road",
    "Wilmington, DE 19803",
]


def money(v: float) -> str:
    return f"${v:,.2f}"


def totals(items, tax_rate=0.0, shipping=0.0, discount=0.0):
    sub = sum(q * p for _, q, p in items)
    tax = round(sub * tax_rate, 2)
    total = round(sub - discount + tax + shipping, 2)
    return sub, tax, total


# --------------------------------------------------------------------------- #
# 20 invoices — varied vendors, terms, complexity
# --------------------------------------------------------------------------- #
INVOICES = [
    # 1
    {
        "vendor": "MedSupply Logistics, Inc.", "addr": ["4820 Distribution Pkwy", "Tampa, FL 33619"],
        "phone": "(813) 555-0142", "email": "ar@medsupplylog.com",
        "number": "MSL-2026-08841", "date": "2026-05-04", "due": "2026-06-03",
        "po": "PO-NCH-44120", "terms": "Net 30",
        "items": [
            ("Nitrile exam gloves, medium (case/1000)", 60, 78.50),
            ("Disposable isolation gowns (case/100)", 24, 145.00),
            ("Alcohol prep pads (box/200)", 120, 6.25),
        ],
        "tax_rate": 0.0, "notes": "Pediatric supply replenishment - Wilmington campus.",
    },
    # 2
    {
        "vendor": "Atlantic Biomedical Services", "addr": ["220 Innovation Way", "Newark, DE 19711"],
        "phone": "(302) 555-0188", "email": "billing@atlanticbiomed.com",
        "number": "ABS-19042", "date": "2026-05-09", "due": "2026-06-23",
        "po": "PO-NCH-44188", "terms": "Net 45",
        "items": [
            ("Infusion pump preventive maintenance", 35, 95.00),
            ("Pulse oximeter calibration", 18, 60.00),
            ("Biomedical labor - on-site (hrs)", 12, 135.00),
            ("Replacement sensor cables", 40, 22.75),
        ],
        "tax_rate": 0.0, "notes": "Quarterly biomedical equipment service contract.",
    },
    # 3
    {
        "vendor": "Brightview Facility Solutions", "addr": ["7 Commerce Center Dr", "Orlando, FL 32801"],
        "phone": "(407) 555-0119", "email": "invoices@brightviewfs.com",
        "number": "BV-2026-3310", "date": "2026-04-28", "due": "2026-05-28",
        "po": "", "terms": "Net 30",
        "items": [
            ("Monthly janitorial service - clinical wing", 1, 8450.00),
            ("Biohazard waste disposal", 1, 1275.00),
            ("Floor refinishing - lobby", 1, 940.00),
        ],
        "tax_rate": 0.0, "notes": "April facilities service. No PO on file - please verify.",
    },
    # 4
    {
        "vendor": "Pediatric Pharma Distributors", "addr": ["91 Galen Court", "Philadelphia, PA 19104"],
        "phone": "(215) 555-0173", "email": "ar@pedpharma.com",
        "number": "PPD-557214", "date": "2026-05-12", "due": "2026-05-27",
        "po": "PO-NCH-44231", "terms": "Net 15",
        "items": [
            ("Amoxicillin oral suspension 250mg/5mL", 200, 4.85),
            ("Acetaminophen pediatric drops", 150, 3.20),
            ("Albuterol inhalation solution (box/25)", 48, 18.40),
            ("Ondansetron ODT 4mg (box/30)", 60, 12.10),
            ("Pharmacy cold-chain handling fee", 1, 85.00),
        ],
        "tax_rate": 0.0, "notes": "Refrigerated shipment. Signature required on delivery.",
    },
    # 5
    {
        "vendor": "Sunrise Catering Co.", "addr": ["318 Maple Ave", "Wilmington, DE 19805"],
        "phone": "(302) 555-0150", "email": "events@sunrisecatering.com",
        "number": "SC-4471", "date": "2026-05-15", "due": "2026-06-14",
        "po": "", "terms": "Net 30",
        "items": [
            ("Boxed lunches - staff training (per person)", 85, 14.50),
            ("Beverage service", 1, 175.00),
            ("Delivery & setup", 1, 120.00),
        ],
        "tax_rate": 0.07, "notes": "Nursing staff in-service event, Conference Room B.",
    },
    # 6
    {
        "vendor": "Helix Imaging Systems", "addr": ["1450 Radiology Blvd", "Atlanta, GA 30303"],
        "phone": "(404) 555-0166", "email": "accounts@heliximaging.com",
        "number": "HIS-2026-00729", "date": "2026-05-02", "due": "2026-07-01",
        "po": "PO-NCH-43990", "terms": "Net 60",
        "items": [
            ("Portable ultrasound unit - pediatric config", 2, 28500.00),
            ("Extended warranty (3 yr, per unit)", 2, 3200.00),
            ("On-site clinical training (day)", 3, 1500.00),
            ("Freight & insured delivery", 1, 850.00),
        ],
        "tax_rate": 0.0, "shipping": 0.0, "notes": "Capital equipment. Asset tagging required upon receipt.",
    },
    # 7
    {
        "vendor": "Keystone Office Products", "addr": ["88 Ledger St", "Dover, DE 19901"],
        "phone": "(302) 555-0107", "email": "ar@keystoneoffice.com",
        "number": "KOP-88231", "date": "2026-05-18", "due": "2026-06-17",
        "po": "PO-NCH-44260", "terms": "Net 30",
        "items": [
            ("Multipurpose paper (case/10 reams)", 30, 42.00),
            ("Toner cartridge HC (black)", 12, 89.99),
            ("Patient intake clipboards", 50, 4.25),
            ("Sticky notes (pack/12)", 25, 7.80),
            ("Ballpoint pens (box/60)", 15, 9.50),
        ],
        "tax_rate": 0.0, "discount": 35.00, "notes": "Standing office supply order - 5% loyalty discount applied.",
    },
    # 8
    {
        "vendor": "Greenfield Landscaping LLC", "addr": ["55 Orchard Lane", "Jacksonville, FL 32202"],
        "phone": "(904) 555-0193", "email": "billing@greenfieldland.com",
        "number": "GFL-2026-271", "date": "2026-05-20", "due": "2026-06-19",
        "po": "", "terms": "Net 30",
        "items": [
            ("Grounds maintenance - monthly", 1, 1850.00),
            ("Seasonal flower beds - healing garden", 1, 620.00),
            ("Irrigation repair", 1, 340.00),
        ],
        "tax_rate": 0.065, "notes": "Estero campus grounds. Healing garden enhancement.",
    },
    # 9
    {
        "vendor": "TechBridge IT Consulting", "addr": ["900 Network Dr, Ste 410", "Reston, VA 20190"],
        "phone": "(703) 555-0128", "email": "ar@techbridge.io",
        "number": "TB-INV-100542", "date": "2026-05-22", "due": "2026-07-06",
        "po": "PO-NCH-44301", "terms": "Net 45",
        "items": [
            ("EHR integration consulting (hrs)", 64, 165.00),
            ("Senior architect - security review (hrs)", 16, 210.00),
            ("Project management (hrs)", 20, 120.00),
            ("After-hours migration support (hrs)", 8, 247.50),
            ("Travel & expenses", 1, 1340.75),
        ],
        "tax_rate": 0.0, "notes": "Phase 2 EHR interface work. Approved change order CO-3.",
    },
    # 10
    {
        "vendor": "Coastal Linen & Uniform", "addr": ["402 Harbor Rd", "Pensacola, FL 32502"],
        "phone": "(850) 555-0177", "email": "service@coastallinen.com",
        "number": "CLU-7790", "date": "2026-05-25", "due": "2026-06-24",
        "po": "PO-NCH-44318", "terms": "Net 30",
        "items": [
            ("Scrub set rental & laundering (per set/wk)", 240, 3.10),
            ("Patient gown laundering (per lb)", 1800, 0.62),
            ("Microfiber towels (case/200)", 10, 64.00),
            ("Lost/damaged item fee", 1, 45.00),
        ],
        "tax_rate": 0.0, "notes": "Weekly linen service - month of May.",
    },
    # 11
    {
        "vendor": "Cardinal Diagnostics Lab", "addr": ["12 Specimen Way", "Baltimore, MD 21201"],
        "phone": "(410) 555-0144", "email": "ar@cardinaldx.com",
        "number": "CDX-2026-5519", "date": "2026-05-06", "due": "2026-06-05",
        "po": "PO-NCH-44150", "terms": "Net 30",
        "items": [
            ("Comprehensive metabolic panel (per test)", 320, 12.40),
            ("CBC with differential (per test)", 410, 9.85),
            ("Rapid strep A (per test)", 180, 7.20),
            ("Specimen courier service", 1, 450.00),
            ("Reference lab handling", 1, 220.00),
        ],
        "tax_rate": 0.0, "notes": "Outpatient lab volume - April cycle.",
    },
    # 12
    {
        "vendor": "Bright Beginnings Toys & Therapy", "addr": ["77 Playful Ln", "Charlotte, NC 28202"],
        "phone": "(704) 555-0161", "email": "orders@brightbeginnings.com",
        "number": "BB-3021", "date": "2026-05-19", "due": "2026-06-18",
        "po": "", "terms": "Net 30",
        "items": [
            ("Sensory therapy kit", 12, 84.00),
            ("Waiting room activity table", 3, 320.00),
            ("Washable building blocks (set)", 20, 28.50),
            ("Picture communication boards", 15, 19.95),
        ],
        "tax_rate": 0.0725, "notes": "Child life program - playroom refresh.",
    },
    # 13
    {
        "vendor": "Summit Medical Gases", "addr": ["3300 Cylinder Ct", "Houston, TX 77002"],
        "phone": "(713) 555-0188", "email": "billing@summitgases.com",
        "number": "SMG-2026-0912", "date": "2026-05-11", "due": "2026-06-10",
        "po": "PO-NCH-44205", "terms": "Net 30",
        "items": [
            ("Medical oxygen (per cylinder)", 48, 42.00),
            ("Nitrous oxide (per cylinder)", 12, 88.00),
            ("Cylinder rental", 60, 6.50),
            ("Hazmat delivery surcharge", 1, 125.00),
        ],
        "tax_rate": 0.0, "notes": "Respiratory therapy supply. Cylinders returnable.",
    },
    # 14
    {
        "vendor": "Apex Security & Fire", "addr": ["210 Sentinel Blvd", "Richmond, VA 23219"],
        "phone": "(804) 555-0150", "email": "ar@apexsecurity.com",
        "number": "ASF-44120", "date": "2026-05-03", "due": "2026-06-17",
        "po": "PO-NCH-44099", "terms": "Net 45",
        "items": [
            ("Fire alarm inspection - quarterly", 1, 1450.00),
            ("Sprinkler system test", 1, 980.00),
            ("Access control maintenance", 1, 640.00),
            ("Replacement smoke detectors", 18, 34.00),
        ],
        "tax_rate": 0.0, "notes": "Life-safety compliance inspection. Report attached.",
    },
    # 15
    {
        "vendor": "Riverside Printing & Signage", "addr": ["9 Press Alley", "Wilmington, DE 19801"],
        "phone": "(302) 555-0133", "email": "ar@riversideprint.com",
        "number": "RPS-2026-781", "date": "2026-05-24", "due": "2026-06-23",
        "po": "", "terms": "Net 30",
        "items": [
            ("Patient education brochures (5000)", 1, 1240.00),
            ("Wayfinding signage - vinyl", 8, 95.00),
            ("Appointment reminder cards (10000)", 1, 480.00),
            ("Design & proofing", 1, 350.00),
        ],
        "tax_rate": 0.0, "discount": 100.00, "notes": "New-patient welcome packet refresh.",
    },
    # 16
    {
        "vendor": "Evergreen Pharmacy Wholesale", "addr": ["480 Remedy Rd", "Columbus, OH 43215"],
        "phone": "(614) 555-0177", "email": "ar@evergreenrx.com",
        "number": "EPW-2026-66410", "date": "2026-05-08", "due": "2026-05-23",
        "po": "PO-NCH-44170", "terms": "Net 15",
        "items": [
            ("Ibuprofen pediatric susp 100mg/5mL", 240, 3.95),
            ("Cetirizine oral solution", 96, 5.40),
            ("Amoxicillin/clavulanate susp", 120, 9.80),
            ("Oseltamivir 30mg caps (box/10)", 60, 22.50),
            ("Prednisolone oral solution", 80, 7.15),
            ("Cold-chain & DEA handling", 1, 145.00),
        ],
        "tax_rate": 0.0, "notes": "Formulary restock. Some items DEA-scheduled.",
    },
    # 17
    {
        "vendor": "Liberty Medical Transport", "addr": ["55 Transit Way", "Dover, DE 19904"],
        "phone": "(302) 555-0199", "email": "billing@libertymedtransport.com",
        "number": "LMT-2026-2240", "date": "2026-05-16", "due": "2026-06-15",
        "po": "", "terms": "Net 30",
        "items": [
            ("Non-emergency patient transport (trip)", 42, 145.00),
            ("Wheelchair van service (trip)", 18, 95.00),
            ("Wait time (per 15 min)", 36, 12.00),
            ("Fuel surcharge", 1, 220.00),
        ],
        "tax_rate": 0.0, "notes": "Outpatient transport - May. Trip log attached.",
    },
    # 18
    {
        "vendor": "Northstar Furniture Contract", "addr": ["1200 Outfitter Dr", "Minneapolis, MN 55401"],
        "phone": "(612) 555-0124", "email": "ar@northstarcontract.com",
        "number": "NFC-2026-3380", "date": "2026-05-21", "due": "2026-07-20",
        "po": "PO-NCH-44330", "terms": "Net 60",
        "items": [
            ("Exam room stool - pneumatic", 24, 138.00),
            ("Pediatric waiting chairs", 40, 96.00),
            ("Bariatric guest chair", 8, 410.00),
            ("Reception desk - modular", 2, 2450.00),
            ("White-glove delivery & assembly", 1, 1200.00),
        ],
        "tax_rate": 0.0, "shipping": 0.0, "notes": "Capital furnishing - new outpatient suite.",
    },
    # 19
    {
        "vendor": "Quill & Quartz Legal Services", "addr": ["400 Statute St, Ste 900", "Wilmington, DE 19801"],
        "phone": "(302) 555-0166", "email": "billing@quillquartz.law",
        "number": "QQ-2026-118", "date": "2026-05-27", "due": "2026-06-26",
        "po": "", "terms": "Due on Receipt",
        "items": [
            ("Contract review - vendor MSA (hrs)", 6.5, 385.00),
            ("Regulatory consultation - HIPAA (hrs)", 4.0, 425.00),
            ("Document preparation (hrs)", 3.0, 250.00),
            ("Filing fees", 1, 175.00),
        ],
        "tax_rate": 0.0, "notes": "Matter #2026-0412. Privileged & confidential.",
    },
    # 20
    {
        "vendor": "Helios Solar & Electrical", "addr": ["88 Voltage Ave", "Phoenix, AZ 85003"],
        "phone": "(602) 555-0150", "email": "ar@heliossolar.com",
        "number": "HSE-2026-4471", "date": "2026-05-13", "due": "2026-07-12",
        "po": "PO-NCH-44240", "terms": "Net 60",
        "items": [
            ("Rooftop solar panel (per unit)", 60, 285.00),
            ("Inverter system", 4, 1850.00),
            ("Electrical labor (hrs)", 120, 95.00),
            ("Permitting & inspection", 1, 1450.00),
            ("Battery backup module", 2, 3200.00),
        ],
        "tax_rate": 0.056, "shipping": 0.0, "notes": "Sustainability initiative - parking structure array.",
    },
]


def hdr_meta(data):
    rows = [("Invoice #", data["number"]), ("Date", data["date"]),
            ("Due", data["due"]), ("Terms", data["terms"])]
    if data.get("po"):
        rows.append(("PO #", data["po"]))
    return rows


# --------------------------------------------------------------------------- #
# Layout 0 — Modern color band, right-aligned totals card
# --------------------------------------------------------------------------- #
def layout_band(c, data, accent):
    c.setFillColor(accent)
    c.rect(0, H - 1.4 * inch, W, 1.4 * inch, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(0.7 * inch, H - 0.95 * inch, data["vendor"])
    c.setFont("Helvetica", 10)
    c.drawString(0.7 * inch, H - 1.2 * inch, "  •  ".join(data["addr"]) + "  •  " + data["phone"])
    c.setFont("Helvetica-Bold", 30)
    c.drawRightString(W - 0.7 * inch, H - 0.95 * inch, "INVOICE")

    y = H - 1.9 * inch
    c.setFillColor(colors.HexColor("#444444"))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(0.7 * inch, y, "BILL TO")
    c.setFont("Helvetica", 10)
    for i, line in enumerate(BILL_TO):
        c.drawString(0.7 * inch, y - 0.2 * inch - i * 0.18 * inch, line)

    mx = W - 3.0 * inch
    for i, (k, v) in enumerate(hdr_meta(data)):
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#888888"))
        c.drawString(mx, y - i * 0.2 * inch, k)
        c.setFillColor(colors.HexColor("#222222"))
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(W - 0.7 * inch, y - i * 0.2 * inch, str(v))

    table_top = y - 1.5 * inch
    _items_table(c, data, accent, 0.7 * inch, table_top, W - 1.4 * inch,
                 header_bg=accent, zebra=True)


# --------------------------------------------------------------------------- #
# Layout 1 — Minimalist, hairline rules, no color
# --------------------------------------------------------------------------- #
def layout_minimal(c, data, accent):
    c.setFillColor(colors.black)
    c.setFont("Helvetica", 8)
    c.drawString(0.9 * inch, H - 0.8 * inch, data["vendor"].upper())
    c.setFont("Helvetica-Bold", 40)
    c.drawString(0.9 * inch, H - 1.7 * inch, "Invoice")
    c.setLineWidth(0.5)
    c.line(0.9 * inch, H - 1.9 * inch, W - 0.9 * inch, H - 1.9 * inch)

    c.setFont("Helvetica", 9)
    for i, line in enumerate(data["addr"] + [data["phone"], data["email"]]):
        c.drawString(0.9 * inch, H - 2.3 * inch - i * 0.16 * inch, line)

    mx = W - 3.2 * inch
    for i, (k, v) in enumerate(hdr_meta(data)):
        c.setFont("Helvetica", 9)
        c.drawString(mx, H - 2.3 * inch - i * 0.2 * inch, f"{k}")
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(W - 0.9 * inch, H - 2.3 * inch - i * 0.2 * inch, str(v))

    c.setFont("Helvetica", 8)
    c.drawString(0.9 * inch, H - 3.7 * inch, "BILLED TO  " + " / ".join(BILL_TO))
    _items_table(c, data, colors.black, 0.9 * inch, H - 4.0 * inch, W - 1.8 * inch,
                 header_bg=None, zebra=False, rule_only=True)


# --------------------------------------------------------------------------- #
# Layout 2 — Two-tone left sidebar
# --------------------------------------------------------------------------- #
def layout_sidebar(c, data, accent):
    bar = 2.3 * inch
    c.setFillColor(accent)
    c.rect(0, 0, bar, H, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 16)
    _wrapped(c, data["vendor"], 0.3 * inch, H - 0.9 * inch, bar - 0.5 * inch, 16, colors.white)
    c.setFont("Helvetica", 8)
    yy = H - 1.8 * inch
    for line in data["addr"] + [data["phone"], data["email"]]:
        c.drawString(0.3 * inch, yy, line)
        yy -= 0.16 * inch
    yy -= 0.2 * inch
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.3 * inch, yy, "BILL TO")
    c.setFont("Helvetica", 8)
    for line in BILL_TO:
        yy -= 0.16 * inch
        c.drawString(0.3 * inch, yy, line)

    cx = bar + 0.3 * inch
    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 34)
    c.drawString(cx, H - 1.0 * inch, "INVOICE")
    c.setFillColor(colors.HexColor("#333333"))
    for i, (k, v) in enumerate(hdr_meta(data)):
        c.setFont("Helvetica", 9)
        c.drawString(cx, H - 1.5 * inch - i * 0.2 * inch, k)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(cx + 1.1 * inch, H - 1.5 * inch - i * 0.2 * inch, str(v))

    _items_table(c, data, accent, cx, H - 3.0 * inch, W - cx - 0.4 * inch,
                 header_bg=accent, zebra=True)


# --------------------------------------------------------------------------- #
# Layout 3 — Classic centered letterhead, ruled table
# --------------------------------------------------------------------------- #
def layout_classic(c, data, accent):
    c.setFillColor(colors.HexColor("#1a1a1a"))
    c.setFont("Times-Bold", 22)
    c.drawCentredString(W / 2, H - 0.9 * inch, data["vendor"])
    c.setFont("Times-Roman", 10)
    c.drawCentredString(W / 2, H - 1.12 * inch,
                        " · ".join(data["addr"]) + " · " + data["phone"])
    c.setLineWidth(1.2)
    c.line(0.8 * inch, H - 1.3 * inch, W - 0.8 * inch, H - 1.3 * inch)
    c.setFont("Times-Bold", 14)
    c.drawCentredString(W / 2, H - 1.6 * inch, "I N V O I C E")

    c.setFont("Times-Roman", 10)
    for i, line in enumerate(BILL_TO):
        c.drawString(0.8 * inch, H - 2.1 * inch - i * 0.18 * inch, line)
    mx = W - 3.0 * inch
    for i, (k, v) in enumerate(hdr_meta(data)):
        c.drawString(mx, H - 2.1 * inch - i * 0.18 * inch, f"{k}:")
        c.drawRightString(W - 0.8 * inch, H - 2.1 * inch - i * 0.18 * inch, str(v))

    _items_table(c, data, accent, 0.8 * inch, H - 3.5 * inch, W - 1.6 * inch,
                 header_bg=colors.HexColor("#dddddd"), zebra=False,
                 grid=True, font="Times-Roman", header_fg=colors.black)


# --------------------------------------------------------------------------- #
# Layout 4 — Dense corporate, boxed header blocks
# --------------------------------------------------------------------------- #
def layout_corporate(c, data, accent):
    c.setStrokeColor(colors.HexColor("#999999"))
    c.setLineWidth(0.75)
    # vendor box
    c.rect(0.6 * inch, H - 1.7 * inch, 3.4 * inch, 1.0 * inch)
    c.setFillColor(colors.HexColor("#111111"))
    c.setFont("Helvetica-Bold", 13)
    c.drawString(0.75 * inch, H - 1.0 * inch, data["vendor"])
    c.setFont("Helvetica", 8)
    for i, line in enumerate(data["addr"] + [data["phone"]]):
        c.drawString(0.75 * inch, H - 1.2 * inch - i * 0.13 * inch, line)
    # invoice box
    c.rect(W - 3.4 * inch - 0.6 * inch, H - 1.7 * inch, 3.4 * inch, 1.0 * inch)
    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 20)
    c.drawRightString(W - 0.75 * inch, H - 1.05 * inch, "INVOICE")
    c.setFillColor(colors.HexColor("#222222"))
    c.setFont("Helvetica", 8)
    bx = W - 3.4 * inch - 0.45 * inch
    for i, (k, v) in enumerate(hdr_meta(data)):
        c.drawString(bx, H - 1.25 * inch - i * 0.13 * inch, k)
        c.setFont("Helvetica-Bold", 8)
        c.drawRightString(W - 0.75 * inch, H - 1.25 * inch - i * 0.13 * inch, str(v))
        c.setFont("Helvetica", 8)
    # bill-to band
    c.setFillColor(accent)
    c.rect(0.6 * inch, H - 2.15 * inch, W - 1.2 * inch, 0.28 * inch, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(0.75 * inch, H - 2.05 * inch, "BILL TO:  " + "  /  ".join(BILL_TO))

    _items_table(c, data, accent, 0.6 * inch, H - 2.5 * inch, W - 1.2 * inch,
                 header_bg=colors.HexColor("#333333"), zebra=True, grid=True,
                 compact=True)


# --------------------------------------------------------------------------- #
# Shared items table + totals
# --------------------------------------------------------------------------- #
def _items_table(c, data, accent, x, top, width, header_bg=None, zebra=False,
                 grid=False, rule_only=False, compact=False, font="Helvetica",
                 header_fg=colors.white):
    bold = font + "-Bold" if font == "Times" else ("Times-Bold" if font.startswith("Times") else "Helvetica-Bold")
    if font.startswith("Times"):
        bold = "Times-Bold"
    else:
        bold = "Helvetica-Bold"

    col_amt = 1.1 * inch
    col_price = 1.0 * inch
    col_qty = 0.7 * inch
    col_desc = width - col_amt - col_price - col_qty

    data_rows = [["Description", "Qty", "Unit Price", "Amount"]]
    for desc, qty, price in data["items"]:
        qd = f"{qty:g}"
        data_rows.append([desc, qd, money(price), money(qty * price)])

    sub, tax, total = totals(data["items"], data.get("tax_rate", 0.0),
                             data.get("shipping", 0.0), data.get("discount", 0.0))

    style = [
        ("FONT", (0, 0), (-1, 0), bold, 9 if not compact else 8),
        ("FONT", (0, 1), (-1, -1), font, 9 if not compact else 8),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5 if not compact else 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5 if not compact else 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    if header_bg is not None:
        style += [("BACKGROUND", (0, 0), (-1, 0), header_bg),
                  ("TEXTCOLOR", (0, 0), (-1, 0), header_fg)]
    if zebra:
        for r in range(1, len(data_rows)):
            if r % 2 == 0:
                style.append(("BACKGROUND", (0, r), (-1, r), colors.HexColor("#f4f4f4")))
    if grid:
        style.append(("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")))
    elif rule_only:
        style += [("LINEBELOW", (0, 0), (-1, 0), 1, colors.black),
                  ("LINEBELOW", (0, -1), (-1, -1), 0.5, colors.black)]
    else:
        style.append(("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#dddddd")))

    desc_style = ParagraphStyle("d", fontName=font, fontSize=9 if not compact else 8, leading=11)
    rows2 = [data_rows[0]] + [[Paragraph(r[0], desc_style), r[1], r[2], r[3]] for r in data_rows[1:]]

    t = Table(rows2, colWidths=[col_desc, col_qty, col_price, col_amt])
    t.setStyle(TableStyle(style))
    tw, th = t.wrap(width, top)
    t.drawOn(c, x, top - th)

    # totals block
    ty = top - th - 0.25 * inch
    rows = [("Subtotal", money(sub))]
    if data.get("discount"):
        rows.append(("Discount", "-" + money(data["discount"])))
    if data.get("tax_rate"):
        rows.append((f"Tax ({data['tax_rate']*100:.2f}%)", money(tax)))
    if data.get("shipping"):
        rows.append(("Shipping", money(data["shipping"])))
    tx = x + width - 2.6 * inch
    for k, v in rows:
        c.setFillColor(colors.HexColor("#555555"))
        c.setFont(font, 9)
        c.drawString(tx, ty, k)
        c.setFillColor(colors.HexColor("#222222"))
        c.drawRightString(x + width, ty, v)
        ty -= 0.2 * inch
    # extra gap so the TOTAL bar never overlaps the last subtotal/tax line
    ty -= 0.12 * inch
    c.setFillColor(accent)
    c.rect(tx - 0.1 * inch, ty - 0.06 * inch, (x + width) - tx + 0.1 * inch, 0.32 * inch,
           fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont(bold, 11)
    c.drawString(tx, ty + 0.04 * inch, "TOTAL")
    c.drawRightString(x + width, ty + 0.04 * inch, money(total))

    # notes / footer
    if data.get("notes"):
        c.setFillColor(colors.HexColor("#666666"))
        c.setFont(font, 8)
        c.drawString(x, 0.9 * inch, "Notes: " + data["notes"])
    c.setStrokeColor(colors.HexColor("#cccccc"))
    c.setLineWidth(0.5)
    c.line(x, 0.7 * inch, x + width, 0.7 * inch)
    c.setFillColor(colors.HexColor("#999999"))
    c.setFont(font, 7)
    c.drawString(x, 0.55 * inch, f"{data['vendor']}  ·  {data['email']}  ·  {data['phone']}")
    c.drawRightString(x + width, 0.55 * inch, "Thank you for your business.")


def _wrapped(c, text, x, y, maxw, size, color):
    c.setFillColor(color)
    words = text.split()
    line = ""
    yy = y
    c.setFont("Helvetica-Bold", size)
    for w in words:
        test = (line + " " + w).strip()
        if c.stringWidth(test, "Helvetica-Bold", size) > maxw and line:
            c.drawString(x, yy, line)
            yy -= (size + 3)
            line = w
        else:
            line = test
    if line:
        c.drawString(x, yy, line)


PALETTE = [
    colors.HexColor("#0F6CBD"), colors.HexColor("#2E7D32"), colors.HexColor("#8E44AD"),
    colors.HexColor("#C0392B"), colors.HexColor("#16A085"), colors.HexColor("#D35400"),
    colors.HexColor("#34495E"), colors.HexColor("#00695C"), colors.HexColor("#5D4037"),
    colors.HexColor("#1565C0"),
]

LAYOUTS = [layout_band, layout_minimal, layout_sidebar, layout_classic, layout_corporate]


def main():
    os.makedirs(OUT, exist_ok=True)
    random.seed(7)
    for i, inv in enumerate(INVOICES, start=1):
        layout = LAYOUTS[(i - 1) % len(LAYOUTS)]
        accent = PALETTE[(i - 1) % len(PALETTE)]
        slug = inv["vendor"].split(",")[0].split(" ")[0].lower().strip("&.")
        fname = f"invoice-{i:02d}-{layout.__name__.replace('layout_','')}-{slug}.pdf"
        path = os.path.join(OUT, fname)
        c = canvas.Canvas(path, pagesize=LETTER)
        layout(c, inv, accent)
        c.showPage()
        c.save()
        print(f"  {layout.__name__.replace('layout_',''):10s} -> testfiles/invoices_varied/{fname}")
    print(f"\nDone. {len(INVOICES)} varied invoice PDFs in testfiles/invoices_varied/")


if __name__ == "__main__":
    main()
