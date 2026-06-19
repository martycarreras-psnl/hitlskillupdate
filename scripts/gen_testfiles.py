#!/usr/bin/env python3
"""Generate realistic test documents for the HITL review app.

Produces:
  - 10 invoices as JPG images  -> testfiles/invoices/
  - 10 receipts as PDF files   -> testfiles/receipts/

All vendors, amounts, and contacts are fictional but plausible for
operations at Nemours Children's Health. Run:

    python3 scripts/gen_testfiles.py
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INVOICE_DIR = os.path.join(ROOT, "testfiles", "invoices")
RECEIPT_DIR = os.path.join(ROOT, "testfiles", "receipts")

BILL_TO = [
    "Nemours Children's Health",
    "Accounts Payable",
    "1600 Rockland Road",
    "Wilmington, DE 19803",
]


# --------------------------------------------------------------------------- #
# Font loading (fall back to PIL default if system fonts are unavailable)
# --------------------------------------------------------------------------- #
def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = (
        [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/Library/Fonts/Arial Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
        if bold
        else [
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/Library/Fonts/Arial.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
    )
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def money(value: float) -> str:
    return f"${value:,.2f}"


# --------------------------------------------------------------------------- #
# Invoice data — varied vendors and complexity
# --------------------------------------------------------------------------- #
INVOICES = [
    {
        "vendor": "MedSupply Logistics, Inc.",
        "vendor_addr": ["4820 Distribution Pkwy", "Tampa, FL 33619", "(813) 555-0142"],
        "number": "MSL-2026-08841",
        "date": "2026-05-04",
        "due": "2026-06-03",
        "po": "PO-NCH-44120",
        "terms": "Net 30",
        "color": (0, 102, 153),
        "items": [
            ("Nitrile exam gloves, medium (case/1000)", 60, 78.50),
            ("Disposable isolation gowns (case/100)", 24, 145.00),
            ("Alcohol prep pads (box/200)", 120, 6.25),
        ],
        "tax_rate": 0.0,
        "notes": "Pediatric supply replenishment - Wilmington campus.",
    },
    {
        "vendor": "Atlantic Biomedical Services",
        "vendor_addr": ["220 Innovation Way", "Newark, DE 19711", "(302) 555-0188"],
        "number": "ABS-19042",
        "date": "2026-05-09",
        "due": "2026-06-23",
        "po": "PO-NCH-44188",
        "terms": "Net 45",
        "color": (40, 90, 60),
        "items": [
            ("Infusion pump preventive maintenance (per unit)", 35, 95.00),
            ("Pulse oximeter calibration", 18, 60.00),
            ("Biomedical labor - on-site (hours)", 12, 135.00),
            ("Replacement sensor cables", 40, 22.75),
        ],
        "tax_rate": 0.0,
        "notes": "Quarterly biomedical equipment service contract.",
    },
    {
        "vendor": "Brightview Facility Solutions",
        "vendor_addr": ["7 Commerce Center Dr", "Orlando, FL 32801", "(407) 555-0119"],
        "number": "BV-2026-3310",
        "date": "2026-04-28",
        "due": "2026-05-28",
        "po": "",
        "terms": "Net 30",
        "color": (120, 70, 30),
        "items": [
            ("Monthly janitorial service - clinical wing", 1, 8450.00),
            ("Biohazard waste disposal", 1, 1275.00),
            ("Floor refinishing - lobby", 1, 940.00),
        ],
        "tax_rate": 0.0,
        "notes": "April facilities service. No PO on file - please verify.",
    },
    {
        "vendor": "Pediatric Pharma Distributors",
        "vendor_addr": ["91 Galen Court", "Philadelphia, PA 19104", "(215) 555-0173"],
        "number": "PPD-557214",
        "date": "2026-05-12",
        "due": "2026-05-27",
        "po": "PO-NCH-44231",
        "terms": "Net 15",
        "color": (90, 30, 110),
        "items": [
            ("Amoxicillin oral suspension 250mg/5mL", 200, 4.85),
            ("Acetaminophen pediatric drops", 150, 3.20),
            ("Albuterol inhalation solution (box/25)", 48, 18.40),
            ("Ondansetron ODT 4mg (box/30)", 60, 12.10),
            ("Pharmacy cold-chain handling fee", 1, 85.00),
        ],
        "tax_rate": 0.0,
        "notes": "Refrigerated shipment. Signature required on delivery.",
    },
    {
        "vendor": "Sunrise Catering Co.",
        "vendor_addr": ["318 Maple Ave", "Wilmington, DE 19805", "(302) 555-0150"],
        "number": "SC-4471",
        "date": "2026-05-15",
        "due": "2026-06-14",
        "po": "",
        "terms": "Net 30",
        "color": (200, 120, 0),
        "items": [
            ("Boxed lunches - staff training (per person)", 85, 14.50),
            ("Beverage service", 1, 175.00),
            ("Delivery & setup", 1, 120.00),
        ],
        "tax_rate": 0.07,
        "notes": "Nursing staff in-service event, Conference Room B.",
    },
    {
        "vendor": "Helix Imaging Systems",
        "vendor_addr": ["1450 Radiology Blvd", "Atlanta, GA 30303", "(404) 555-0166"],
        "number": "HIS-2026-00729",
        "date": "2026-05-02",
        "due": "2026-07-01",
        "po": "PO-NCH-43990",
        "terms": "Net 60",
        "color": (30, 60, 120),
        "items": [
            ("Portable ultrasound unit - pediatric config", 2, 28500.00),
            ("Extended warranty (3 yr, per unit)", 2, 3200.00),
            ("On-site clinical training (day)", 3, 1500.00),
            ("Freight & insured delivery", 1, 850.00),
        ],
        "tax_rate": 0.0,
        "notes": "Capital equipment. Asset tagging required upon receipt.",
    },
    {
        "vendor": "Keystone Office Products",
        "vendor_addr": ["88 Ledger St", "Dover, DE 19901", "(302) 555-0107"],
        "number": "KOP-88231",
        "date": "2026-05-18",
        "due": "2026-06-17",
        "po": "PO-NCH-44260",
        "terms": "Net 30",
        "color": (50, 50, 50),
        "items": [
            ("Multipurpose paper (case/10 reams)", 30, 42.00),
            ("Toner cartridge HC (black)", 12, 89.99),
            ("Patient intake clipboards", 50, 4.25),
            ("Sticky notes (pack/12)", 25, 7.80),
            ("Ballpoint pens (box/60)", 15, 9.50),
        ],
        "tax_rate": 0.0,
        "notes": "Standing office supply order - administration.",
    },
    {
        "vendor": "Greenfield Landscaping LLC",
        "vendor_addr": ["55 Orchard Lane", "Jacksonville, FL 32202", "(904) 555-0193"],
        "number": "GFL-2026-271",
        "date": "2026-05-20",
        "due": "2026-06-19",
        "po": "",
        "terms": "Net 30",
        "color": (40, 110, 50),
        "items": [
            ("Grounds maintenance - monthly", 1, 1850.00),
            ("Seasonal flower beds - healing garden", 1, 620.00),
            ("Irrigation repair", 1, 340.00),
        ],
        "tax_rate": 0.065,
        "notes": "Estero campus grounds. Healing garden enhancement.",
    },
    {
        "vendor": "TechBridge IT Consulting",
        "vendor_addr": ["900 Network Dr, Ste 410", "Reston, VA 20190", "(703) 555-0128"],
        "number": "TB-INV-100542",
        "date": "2026-05-22",
        "due": "2026-07-06",
        "po": "PO-NCH-44301",
        "terms": "Net 45",
        "color": (10, 80, 130),
        "items": [
            ("EHR integration consulting (hours)", 64, 165.00),
            ("Senior architect - security review (hours)", 16, 210.00),
            ("Project management (hours)", 20, 120.00),
            ("After-hours migration support (hours)", 8, 247.50),
            ("Travel & expenses", 1, 1340.75),
        ],
        "tax_rate": 0.0,
        "notes": "Phase 2 EHR interface work. Approved change order CO-3.",
    },
    {
        "vendor": "Coastal Linen & Uniform",
        "vendor_addr": ["402 Harbor Rd", "Pensacola, FL 32502", "(850) 555-0177"],
        "number": "CLU-7790",
        "date": "2026-05-25",
        "due": "2026-06-24",
        "po": "PO-NCH-44318",
        "terms": "Net 30",
        "color": (0, 90, 110),
        "items": [
            ("Scrub set rental & laundering (per set/week)", 240, 3.10),
            ("Patient gown laundering (per lb)", 1800, 0.62),
            ("Microfiber towels (case/200)", 10, 64.00),
            ("Lost/damaged item fee", 1, 45.00),
        ],
        "tax_rate": 0.0,
        "notes": "Weekly linen service - month of May.",
    },
]


# --------------------------------------------------------------------------- #
# Receipt data — meals, equipment (no PO), and other operational spend
# --------------------------------------------------------------------------- #
RECEIPTS = [
    {
        "merchant": "The Brandywine Grill",
        "addr": ["1207 Market St", "Wilmington, DE 19801", "(302) 555-0211"],
        "type": "Meal",
        "ref": "Check #4471",
        "date": "2026-05-06",
        "time": "12:42 PM",
        "payment": "Corporate Card ****3318",
        "server": "Server: Dana",
        "items": [
            ("Grilled chicken sandwich", 1, 14.00),
            ("Caesar salad", 1, 11.50),
            ("Garden burger", 1, 13.00),
            ("Iced tea", 3, 3.00),
        ],
        "tax_rate": 0.07,
        "tip": 12.00,
        "footer": "Working lunch - recruiting candidate. No PO.",
    },
    {
        "merchant": "Office Depot #2241",
        "addr": ["3300 Concord Pike", "Wilmington, DE 19803", "(302) 555-0240"],
        "type": "Equipment",
        "ref": "Trans 8841-22",
        "date": "2026-05-08",
        "time": "09:15 AM",
        "payment": "Corporate Card ****3318",
        "server": "",
        "items": [
            ("Ergonomic office chair", 1, 189.99),
            ("Footrest", 1, 29.99),
            ("Monitor riser", 2, 24.50),
        ],
        "tax_rate": 0.0,
        "tip": 0.0,
        "footer": "Ergonomic accommodation request. Under PO threshold.",
    },
    {
        "merchant": "Sunshine Cafe & Bakery",
        "addr": ["88 Pine Ave", "Orlando, FL 32801", "(407) 555-0288"],
        "type": "Meal",
        "ref": "Order 5567",
        "date": "2026-05-11",
        "time": "07:58 AM",
        "payment": "Corporate Card ****9921",
        "server": "",
        "items": [
            ("Assorted muffins (dozen)", 2, 18.00),
            ("Coffee box (96 oz)", 3, 21.99),
            ("Fresh fruit tray", 1, 34.95),
        ],
        "tax_rate": 0.065,
        "tip": 0.0,
        "footer": "Morning rounds team huddle. No PO required.",
    },
    {
        "merchant": "Best Buy #318",
        "addr": ["4150 Millenia Blvd", "Orlando, FL 32839", "(407) 555-0301"],
        "type": "Equipment",
        "ref": "Receipt 0099-4412",
        "date": "2026-05-13",
        "time": "02:30 PM",
        "payment": "Corporate Card ****9921",
        "server": "",
        "items": [
            ("USB-C docking station", 3, 119.99),
            ("Wireless keyboard/mouse combo", 5, 39.99),
            ("HDMI cables (6 ft)", 10, 8.49),
            ("Webcam 1080p", 4, 59.99),
        ],
        "tax_rate": 0.065,
        "tip": 0.0,
        "footer": "Telehealth workstation setup. Below PO limit.",
    },
    {
        "merchant": "Riverside Pharmacy",
        "addr": ["210 River Rd", "Jacksonville, FL 32207", "(904) 555-0266"],
        "type": "Supplies",
        "ref": "Sale 77120",
        "date": "2026-05-14",
        "time": "04:05 PM",
        "payment": "Petty Cash",
        "server": "",
        "items": [
            ("First aid restock kit", 2, 27.50),
            ("Hand sanitizer 1L", 6, 6.99),
            ("Disposable masks (box/50)", 4, 9.99),
        ],
        "tax_rate": 0.0,
        "tip": 0.0,
        "footer": "Break room first-aid restock. Petty cash reimbursement.",
    },
    {
        "merchant": "Metro Rideshare",
        "addr": ["Trip - Wilmington, DE"],
        "type": "Travel",
        "ref": "Trip ID a8f3-2290",
        "date": "2026-05-16",
        "time": "06:20 PM",
        "payment": "Corporate Card ****3318",
        "server": "",
        "items": [
            ("Airport to Campus", 1, 38.40),
            ("Wait time", 1, 4.25),
        ],
        "tax_rate": 0.0,
        "tip": 7.00,
        "footer": "Ground transport - visiting specialist.",
    },
    {
        "merchant": "Costco Wholesale #1142",
        "addr": ["500 Costco Way", "Tampa, FL 33607", "(813) 555-0319"],
        "type": "Supplies",
        "ref": "Member 22119",
        "date": "2026-05-17",
        "time": "11:11 AM",
        "payment": "Corporate Card ****9921",
        "server": "",
        "items": [
            ("Bottled water (40 pk)", 6, 4.99),
            ("Paper towels (12 ct)", 4, 19.99),
            ("Disinfecting wipes (3 pk)", 8, 13.49),
            ("Coffee K-cups (72 ct)", 3, 32.99),
        ],
        "tax_rate": 0.07,
        "tip": 0.0,
        "footer": "Unit break room supplies. No PO - bulk run.",
    },
    {
        "merchant": "La Cocina Mexicana",
        "addr": ["77 Bayfront Dr", "Pensacola, FL 32502", "(850) 555-0277"],
        "type": "Meal",
        "ref": "Table 14 / Check 2231",
        "date": "2026-05-19",
        "time": "07:15 PM",
        "payment": "Corporate Card ****3318",
        "server": "Server: Miguel",
        "items": [
            ("Chicken fajitas", 2, 16.95),
            ("Veggie burrito", 1, 12.50),
            ("Chips & guacamole", 2, 7.95),
            ("Soft drinks", 4, 2.95),
        ],
        "tax_rate": 0.075,
        "tip": 20.00,
        "footer": "Team dinner - completed go-live weekend.",
    },
    {
        "merchant": "Home Depot #4490",
        "addr": ["1200 Hardware Rd", "Newark, DE 19702", "(302) 555-0288"],
        "type": "Equipment",
        "ref": "Receipt 5520-1183",
        "date": "2026-05-21",
        "time": "08:40 AM",
        "payment": "Corporate Card ****3318",
        "server": "",
        "items": [
            ("Storage shelving unit", 2, 84.00),
            ("Plastic storage bins (set)", 6, 18.50),
            ("Label maker", 1, 34.97),
            ("Label tape refills (3 pk)", 2, 21.99),
        ],
        "tax_rate": 0.0,
        "tip": 0.0,
        "footer": "Supply room organization. Under PO threshold.",
    },
    {
        "merchant": "City Parking Garage",
        "addr": ["400 Center St", "Wilmington, DE 19801"],
        "type": "Travel",
        "ref": "Ticket 99214",
        "date": "2026-05-23",
        "time": "05:55 PM",
        "payment": "Corporate Card ****9921",
        "server": "",
        "items": [
            ("Daily parking", 3, 18.00),
            ("Validation discount", 1, -9.00),
        ],
        "tax_rate": 0.0,
        "tip": 0.0,
        "footer": "Off-site conference parking - 3 days.",
    },
]


# --------------------------------------------------------------------------- #
# Invoice renderer (JPG)
# --------------------------------------------------------------------------- #
def render_invoice(data: dict, path: str) -> None:
    W, H = 1275, 1650  # ~150 DPI Letter
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)

    accent = data["color"]
    f_title = _load_font(46, bold=True)
    f_h = _load_font(26, bold=True)
    f_b = _load_font(22)
    f_s = _load_font(18)
    f_small = _load_font(16)

    margin = 70

    # Header band
    d.rectangle([0, 0, W, 150], fill=accent)
    d.text((margin, 40), data["vendor"], font=f_title, fill="white")
    d.text((W - margin - 230, 55), "INVOICE", font=f_h, fill="white")

    # Vendor address
    y = 180
    for line in data["vendor_addr"]:
        d.text((margin, y), line, font=f_s, fill=(60, 60, 60))
        y += 26

    # Invoice meta (right column)
    meta = [
        ("Invoice #", data["number"]),
        ("Date", data["date"]),
        ("Due Date", data["due"]),
        ("Terms", data["terms"]),
    ]
    if data["po"]:
        meta.append(("PO #", data["po"]))
    my = 180
    for label, val in meta:
        d.text((W - margin - 360, my), f"{label}:", font=f_s, fill=(90, 90, 90))
        d.text((W - margin - 180, my), val, font=f_s, fill=(20, 20, 20))
        my += 28

    # Bill To
    y = max(y, my) + 30
    d.text((margin, y), "Bill To:", font=f_h, fill=accent)
    y += 34
    for line in BILL_TO:
        d.text((margin, y), line, font=f_b, fill=(40, 40, 40))
        y += 28

    # Table header
    y += 30
    col_desc = margin
    col_qty = 760
    col_price = 900
    col_amt = 1090
    d.rectangle([margin - 10, y - 6, W - margin + 10, y + 34], fill=accent)
    d.text((col_desc, y), "Description", font=f_h, fill="white")
    d.text((col_qty, y), "Qty", font=f_h, fill="white")
    d.text((col_price, y), "Unit", font=f_h, fill="white")
    d.text((col_amt, y), "Amount", font=f_h, fill="white")
    y += 50

    subtotal = 0.0
    for desc, qty, price in data["items"]:
        amt = qty * price
        subtotal += amt
        d.text((col_desc, y), desc, font=f_b, fill=(30, 30, 30))
        d.text((col_qty, y), str(qty), font=f_b, fill=(30, 30, 30))
        d.text((col_price, y), money(price), font=f_b, fill=(30, 30, 30))
        d.text((col_amt, y), money(amt), font=f_b, fill=(30, 30, 30))
        y += 38
        d.line([margin - 10, y - 6, W - margin + 10, y - 6], fill=(220, 220, 220))

    # Totals
    tax = subtotal * data["tax_rate"]
    total = subtotal + tax
    y += 20
    tx = col_price - 40
    d.text((tx, y), "Subtotal:", font=f_b, fill=(60, 60, 60))
    d.text((col_amt, y), money(subtotal), font=f_b, fill=(30, 30, 30))
    y += 34
    if data["tax_rate"] > 0:
        d.text((tx, y), f"Tax ({data['tax_rate']*100:.1f}%):", font=f_b, fill=(60, 60, 60))
        d.text((col_amt, y), money(tax), font=f_b, fill=(30, 30, 30))
        y += 34
    d.rectangle([tx - 20, y - 4, W - margin + 10, y + 40], fill=accent)
    d.text((tx, y + 4), "TOTAL:", font=f_h, fill="white")
    d.text((col_amt, y + 4), money(total), font=f_h, fill="white")

    # Notes
    y += 90
    if data.get("notes"):
        d.text((margin, y), "Notes:", font=f_h, fill=accent)
        y += 32
        d.text((margin, y), data["notes"], font=f_s, fill=(70, 70, 70))

    # Footer
    d.line([margin, H - 120, W - margin, H - 120], fill=accent, width=2)
    d.text(
        (margin, H - 100),
        "Remit payment to the address above. Reference the invoice number on all correspondence.",
        font=f_small,
        fill=(120, 120, 120),
    )
    d.text(
        (margin, H - 70),
        "Thank you for your business.",
        font=f_small,
        fill=(120, 120, 120),
    )

    img.save(path, "JPEG", quality=88)


# --------------------------------------------------------------------------- #
# Receipt renderer (PDF)
# --------------------------------------------------------------------------- #
def render_receipt(data: dict, path: str) -> None:
    width = 3.2 * inch
    base = 5.0 * inch
    extra = len(data["items"]) * 0.22 * inch
    height = base + extra
    c = canvas.Canvas(path, pagesize=(width, height))

    cx = width / 2
    y = height - 0.4 * inch

    def center(text, font="Helvetica", size=9, dy=0.2):
        nonlocal y
        c.setFont(font, size)
        c.drawCentredString(cx, y, text)
        y -= dy * inch

    def left_right(left, right, font="Helvetica", size=8, dy=0.2):
        nonlocal y
        c.setFont(font, size)
        c.drawString(0.25 * inch, y, left)
        c.drawRightString(width - 0.25 * inch, y, right)
        y -= dy * inch

    def rule():
        nonlocal y
        c.setDash(1, 2)
        c.line(0.25 * inch, y, width - 0.25 * inch, y)
        c.setDash()
        y -= 0.18 * inch

    center(data["merchant"], font="Helvetica-Bold", size=12, dy=0.26)
    for a in data["addr"]:
        center(a, size=8, dy=0.18)
    y -= 0.05 * inch
    rule()

    center(f"{data['type'].upper()} RECEIPT", font="Helvetica-Bold", size=9, dy=0.24)
    left_right("Date:", data["date"])
    left_right("Time:", data["time"])
    left_right("Ref:", data["ref"])
    if data.get("server"):
        center(data["server"], size=8, dy=0.2)
    rule()

    subtotal = 0.0
    for desc, qty, price in data["items"]:
        amt = qty * price
        subtotal += amt
        label = f"{qty} x {desc}" if qty != 1 else desc
        if len(label) > 32:
            label = label[:31] + "."
        left_right(label, money(amt), size=8, dy=0.2)
    rule()

    tax = subtotal * data["tax_rate"]
    left_right("Subtotal", money(subtotal), size=9)
    if data["tax_rate"] > 0:
        left_right(f"Tax ({data['tax_rate']*100:.1f}%)", money(tax), size=9)
    tip = data.get("tip", 0.0)
    if tip:
        left_right("Tip", money(tip), size=9)
    total = subtotal + tax + tip
    rule()
    left_right("TOTAL", money(total), font="Helvetica-Bold", size=11, dy=0.28)
    rule()

    center(data["payment"], size=8, dy=0.2)
    center("APPROVED", font="Helvetica-Bold", size=9, dy=0.26)
    y -= 0.05 * inch

    note = data.get("footer", "")
    words = note.split()
    lines_out, cur = [], ""
    for w in words:
        if len(cur) + len(w) + 1 <= 40:
            cur = (cur + " " + w).strip()
        else:
            lines_out.append(cur)
            cur = w
    if cur:
        lines_out.append(cur)
    c.setFont("Helvetica-Oblique", 7)
    for ln in lines_out:
        c.drawCentredString(cx, y, ln)
        y -= 0.16 * inch

    y -= 0.1 * inch
    c.setFont("Helvetica", 7)
    c.drawCentredString(cx, y, "*** Customer Copy - Retain for records ***")

    c.showPage()
    c.save()


def main() -> None:
    os.makedirs(INVOICE_DIR, exist_ok=True)
    os.makedirs(RECEIPT_DIR, exist_ok=True)

    for i, inv in enumerate(INVOICES, start=1):
        slug = inv["vendor"].split(",")[0].split(" ")[0].lower()
        fname = f"invoice-{i:02d}-{slug}.jpg"
        render_invoice(inv, os.path.join(INVOICE_DIR, fname))
        print(f"  invoice  -> testfiles/invoices/{fname}")

    for i, rec in enumerate(RECEIPTS, start=1):
        slug = rec["merchant"].split(" ")[0].lower().strip("#")
        fname = f"receipt-{i:02d}-{rec['type'].lower()}-{slug}.pdf"
        render_receipt(rec, os.path.join(RECEIPT_DIR, fname))
        print(f"  receipt  -> testfiles/receipts/{fname}")

    print("\nDone. 10 invoice JPGs + 10 receipt PDFs generated.")


if __name__ == "__main__":
    main()
