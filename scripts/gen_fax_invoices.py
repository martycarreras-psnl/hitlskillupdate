#!/usr/bin/env python3
"""Generate poor-quality, "came in on a fax" versions of the test invoices.

Takes the existing clean invoices (the varied PDFs in testfiles/invoices_varied
and the JPGs in testfiles/invoices) and applies a stack of realistic fax /
bad-scan artifacts so OCR + the extraction agent can be stress-tested against
low-quality input:

  * rasterize to a low DPI (fax is ~200x100 / coarse)
  * desaturate to grayscale
  * slight rotation/skew (paper fed in crooked)
  * blur + downscale/upscale (loss of sharpness through the fax pipe)
  * contrast crush + gamma shift (toner/exposure variance)
  * horizontal scan-line dropouts and streaks (classic fax banding)
  * speckle / salt-and-pepper noise (transmission noise)
  * 1-bit error-diffusion dithering (fax is bilevel) then back to grayscale
  * a monospaced fax header band across the top
  * optional dark edge/border from the scanner platen

Output: testfiles/invoices_fax/  (one JPG per source, plus the original .pdf
page count preserved as -p1, -p2 ... if multipage).

Deterministic per file (seeded by file name) so reruns are stable, with a
range of severities across the set (light / medium / heavy fax abuse).

Run:
    python3 scripts/gen_fax_invoices.py
"""

from __future__ import annotations

import os
import random
from datetime import datetime, timedelta

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

try:
    import fitz  # PyMuPDF, for rasterizing the PDF invoices
except ImportError:  # pragma: no cover
    fitz = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIRS = [
    os.path.join(ROOT, "testfiles", "invoices_varied"),  # PDFs
    os.path.join(ROOT, "testfiles", "invoices"),  # JPGs
]
OUT_DIR = os.path.join(ROOT, "testfiles", "invoices_fax")


# --------------------------------------------------------------------------- #
# Fonts
# --------------------------------------------------------------------------- #
def _mono_font(size: int) -> ImageFont.FreeTypeFont:
    for path in (
        "/System/Library/Fonts/Menlo.ttc",
        "/System/Library/Fonts/Courier.ttc",
        "/System/Library/Fonts/Supplemental/Courier New.ttf",
    ):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


# --------------------------------------------------------------------------- #
# Rasterize a source document to a list of grayscale PIL pages
# --------------------------------------------------------------------------- #
def load_pages(path: str, dpi: int) -> list[Image.Image]:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        if fitz is None:
            raise RuntimeError("PyMuPDF (fitz) is required to rasterize PDF sources")
        pages: list[Image.Image] = []
        with fitz.open(path) as doc:
            for page in doc:
                pix = page.get_pixmap(dpi=dpi)
                img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                pages.append(img.convert("L"))
        return pages
    # raster image
    return [Image.open(path).convert("L")]


# --------------------------------------------------------------------------- #
# Individual artifact passes
# --------------------------------------------------------------------------- #
def add_fax_header(img: Image.Image, rng: random.Random) -> Image.Image:
    """Stamp a monospaced fax transmission header band across the top."""
    w, h = img.size
    band_h = max(18, int(h * 0.022))
    canvas = Image.new("L", (w, h + band_h), 255)
    canvas.paste(img, (0, band_h))
    draw = ImageDraw.Draw(canvas)
    font = _mono_font(max(10, int(band_h * 0.62)))

    when = datetime(2026, rng.randint(1, 6), rng.randint(1, 28),
                    rng.randint(0, 23), rng.randint(0, 59))
    sender = rng.choice([
        "ATLANTIC MED SUPPLY", "KEYSTONE LOGISTICS", "SUNRISE DISTRIBUTION",
        "HELIX SCIENTIFIC", "CARDINAL FACILITIES", "NORTHSTAR VENDORS",
    ])
    fax_no = f"+1 {rng.randint(200, 989)} {rng.randint(200, 989)} {rng.randint(1000, 9999)}"
    page_no = rng.randint(1, 3)
    header = (
        f"{when:%m/%d/%Y %H:%M}  FROM: {sender}  {fax_no}"
        f"   P.{page_no}/{page_no}   ID:{rng.randint(10000, 99999)}"
    )
    draw.text((6, band_h // 2), header, fill=40, font=font, anchor="lm")
    # thin separator rule under the header
    draw.line([(0, band_h - 1), (w, band_h - 1)], fill=90, width=1)
    return canvas


def skew(img: Image.Image, rng: random.Random, max_deg: float) -> Image.Image:
    angle = rng.uniform(-max_deg, max_deg)
    return img.rotate(angle, resample=Image.BICUBIC, expand=False, fillcolor=255)


def soften(img: Image.Image, rng: random.Random, radius: float) -> Image.Image:
    """Blur, then round-trip through a lower resolution to lose detail."""
    img = img.filter(ImageFilter.GaussianBlur(radius=radius))
    w, h = img.size
    scale = rng.uniform(0.55, 0.78)
    small = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.BILINEAR)
    return small.resize((w, h), Image.BILINEAR)


def tone(img: Image.Image, rng: random.Random) -> Image.Image:
    """Crush contrast and apply a gamma/exposure shift (toner variance)."""
    arr = np.asarray(img).astype(np.float32) / 255.0
    gamma = rng.uniform(0.7, 1.5)
    arr = np.power(arr, gamma)
    # autocontrast-ish stretch around a random black/white point
    lo = rng.uniform(0.04, 0.16)
    hi = rng.uniform(0.82, 0.97)
    arr = np.clip((arr - lo) / max(1e-3, (hi - lo)), 0.0, 1.0)
    return Image.fromarray((arr * 255).astype(np.uint8), "L")


def scan_lines(img: Image.Image, rng: random.Random, severity: float) -> Image.Image:
    """Horizontal fax banding: bright dropout rows + dark streak rows."""
    arr = np.asarray(img).astype(np.int16)
    h, w = arr.shape
    n_drop = int(h * 0.02 * severity)
    for _ in range(n_drop):
        y = rng.randint(0, h - 1)
        thick = rng.randint(1, 2)
        arr[y:y + thick, :] = np.clip(arr[y:y + thick, :] + rng.randint(60, 130), 0, 255)
    n_dark = int(h * 0.012 * severity)
    for _ in range(n_dark):
        y = rng.randint(0, h - 1)
        thick = rng.randint(1, 3)
        x0 = rng.randint(0, w // 2)
        x1 = rng.randint(x0, w)
        arr[y:y + thick, x0:x1] = np.clip(arr[y:y + thick, x0:x1] - rng.randint(50, 110), 0, 255)
    # occasional vertical feed streak
    if rng.random() < 0.5:
        x = rng.randint(0, w - 1)
        arr[:, x:x + 1] = np.clip(arr[:, x:x + 1] - rng.randint(30, 90), 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "L")


def speckle(img: Image.Image, rng: random.Random, amount: float) -> Image.Image:
    """Salt-and-pepper transmission noise."""
    arr = np.asarray(img).copy()
    h, w = arr.shape
    n = int(h * w * amount)
    seed = rng.randint(0, 2**31 - 1)
    gen = np.random.default_rng(seed)
    ys = gen.integers(0, h, n)
    xs = gen.integers(0, w, n)
    vals = gen.choice([0, 255], n, p=[0.55, 0.45]).astype(np.uint8)
    arr[ys, xs] = vals
    return Image.fromarray(arr, "L")


def bilevel(img: Image.Image, rng: random.Random) -> Image.Image:
    """Fax is 1-bit: error-diffusion dither to pure black/white, back to L."""
    return img.convert("1").convert("L")


def darken_text(img: Image.Image, strength: float) -> Image.Image:
    """Deepen mid/light grays before dithering so light-gray text survives the
    1-bit pass instead of dissolving into sparse dots. Whites stay white."""
    arr = np.asarray(img).astype(np.float32) / 255.0
    # gamma > 1 pulls midtones toward black; near-white pixels barely move
    arr = np.power(arr, 1.0 + strength)
    return Image.fromarray((arr * 255).astype(np.uint8))


def platen_edge(img: Image.Image, rng: random.Random) -> Image.Image:
    """Dark scanner-platen border on one or two edges."""
    w, h = img.size
    draw = ImageDraw.Draw(img)
    edge = max(2, int(min(w, h) * 0.006))
    if rng.random() < 0.7:
        draw.rectangle([0, 0, w, edge], fill=rng.randint(20, 70))
    if rng.random() < 0.5:
        side = rng.choice(["l", "r"])
        if side == "l":
            draw.rectangle([0, 0, edge, h], fill=rng.randint(20, 70))
        else:
            draw.rectangle([w - edge, 0, w, h], fill=rng.randint(20, 70))
    return img


# --------------------------------------------------------------------------- #
# Severity presets — light / medium / heavy fax abuse
# --------------------------------------------------------------------------- #
PRESETS = {
    "light": dict(dpi=150, skew=0.6, blur=0.6, scan=0.6, speckle=0.0009, dither=False, darken=0.0),
    "medium": dict(dpi=130, skew=1.2, blur=0.9, scan=1.0, speckle=0.0016, dither=False, darken=0.35),
    "heavy": dict(dpi=120, skew=2.0, blur=1.1, scan=1.5, speckle=0.0026, dither=True, darken=0.7),
}


def degrade(path: str, severity: str) -> list[Image.Image]:
    rng = random.Random(f"{os.path.basename(path)}::{severity}")
    p = PRESETS[severity]
    out: list[Image.Image] = []
    for page in load_pages(path, dpi=p["dpi"]):
        img = page
        img = tone(img, rng)
        img = soften(img, rng, radius=p["blur"])
        img = scan_lines(img, rng, severity=p["scan"])
        img = speckle(img, rng, amount=p["speckle"])
        if p["darken"]:
            img = darken_text(img, strength=p["darken"])
        if p["dither"]:
            img = bilevel(img, rng)
        img = skew(img, rng, max_deg=p["skew"])
        img = add_fax_header(img, rng)
        img = platen_edge(img, rng)
        # final slight blur so dither/noise reads like a real fax, not crisp pixels
        img = img.filter(ImageFilter.GaussianBlur(radius=0.4))
        out.append(img.convert("L"))
    return out


# --------------------------------------------------------------------------- #
def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    severities = ["light", "medium", "heavy"]

    sources: list[str] = []
    for d in SRC_DIRS:
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if name.lower().endswith((".pdf", ".jpg", ".jpeg", ".png")):
                sources.append(os.path.join(d, name))

    if not sources:
        print("No source invoices found in", SRC_DIRS)
        return

    count = 0
    for i, src in enumerate(sources):
        severity = severities[i % len(severities)]
        stem = os.path.splitext(os.path.basename(src))[0]
        pages = degrade(src, severity)
        for pno, img in enumerate(pages, start=1):
            suffix = f"-p{pno}" if len(pages) > 1 else ""
            out_name = f"fax-{severity}-{stem}{suffix}.jpg"
            out_path = os.path.join(OUT_DIR, out_name)
            # save at modest JPEG quality to add compression artifacts
            img.save(out_path, "JPEG", quality=55, optimize=True)
            count += 1
        print(f"  {severity:6s}  {stem}  -> {len(pages)} page(s)")

    print(f"\nWrote {count} fax-quality invoice image(s) to {OUT_DIR}")


if __name__ == "__main__":
    main()
