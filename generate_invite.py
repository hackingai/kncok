"""
generate_invite.py — Vanukuri Family Housewarming Invitation Card Generator
============================================================================
Generates an Ultra-HD shareable invitation card with an optimized instant-scan QR code.
Guests scan or click -> land on the full ceremonial invitation website.

Features:
  - Optimized QR code (Level M, high contrast, enlarged modules for instant scanning)
  - Dedicated text link below QR for direct typing
  - Royal Lord Ganesha sacred header (॥ श्री गणेशाय नमः ॥)
  - WhatsApp share-ready message snippet output

Requirements:
    pip install pillow qrcode

Usage:
    python generate_invite.py
"""

import sys
import os
from PIL import Image, ImageDraw, ImageFont
import qrcode

# Ensure safe console UTF-8 printing on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# ─────────────────────────────────────────────────────────────
#  CONFIGURATION
# ─────────────────────────────────────────────────────────────
WEBSITE_URL  = "https://vanukuri2026.netlify.app"
FAMILY_NAME  = "Vanukuri Veena Damodar Reddy"
CEREMONY     = "Housewarming Ceremony"
EVENT_DATE   = "31 August 2026 · 3:00 AM"
OUTPUT_FILE  = "invitation_card.png"

# ─────────────────────────────────────────────────────────────
#  DESIGN TOKENS (Ultra-HD Portrait for WhatsApp Sharing)
# ─────────────────────────────────────────────────────────────
W, H         = 1080, 1500

BG_TOP       = (15,  28,  22)   # deep emerald
BG_BOTTOM    = (8,   15,  12)   # regal dark emerald
GOLD         = (212, 175, 55)   # #d4af37
GOLD_LIGHT   = (245, 226, 150)  # #f5e296
GOLD_DIM     = (150, 120, 35)
WHITE        = (255, 255, 255)
WHITE_DIM    = (230, 225, 210)
WHITE_FAINT  = (175, 165, 145)

# ─────────────────────────────────────────────────────────────
#  FONT LOADERS
# ─────────────────────────────────────────────────────────────
def load_indic(size):
    """Loads Indic / Devanagari font for Sanskrit shloka and sacred symbols."""
    for path in [
        "C:/Windows/Fonts/Nirmala.ttc",
        "C:/Windows/Fonts/NirmalaB.ttc",
        "C:/Windows/Fonts/mangal.ttf",
        "C:/Windows/Fonts/aparaj.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]:
        if os.path.exists(path):
            try: return ImageFont.truetype(path, size)
            except Exception: pass
    return ImageFont.load_default()

def load_serif(size):
    for path in [
        "C:/Windows/Fonts/georgia.ttf",
        "C:/Windows/Fonts/times.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
        "/System/Library/Fonts/Times New Roman.ttf",
    ]:
        if os.path.exists(path):
            try: return ImageFont.truetype(path, size)
            except Exception: pass
    return ImageFont.load_default()

def load_sans(size):
    for path in [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]:
        if os.path.exists(path):
            try: return ImageFont.truetype(path, size)
            except Exception: pass
    return ImageFont.load_default()

# ─────────────────────────────────────────────────────────────
#  DRAWING HELPERS
# ─────────────────────────────────────────────────────────────
def centered(draw, y, text, font, color):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(((W - tw) // 2, y), text, font=font, fill=color)
    return th

def gold_line(draw, y, width=420):
    x0 = W // 2 - width // 2
    x1 = W // 2 + width // 2
    steps = 80
    for i in range(steps):
        t = i / steps
        fade = 1 - abs(t - 0.5) * 2
        c = tuple(int(v * fade) for v in GOLD)
        sx = x0 + int((x1 - x0) * t)
        sw = max(1, (x1 - x0) // steps + 1)
        draw.rectangle([sx, y, sx + sw, y + 1], fill=c)

def corner(draw, x, y, size, d):
    t, s, c = 2, size, GOLD_DIM
    if d == 'tl': draw.rectangle([x,   y,   x+s, y+t], fill=c); draw.rectangle([x,   y,   x+t, y+s], fill=c)
    if d == 'tr': draw.rectangle([x-s, y,   x,   y+t], fill=c); draw.rectangle([x-t, y,   x,   y+s], fill=c)
    if d == 'bl': draw.rectangle([x,   y-s, x+t, y],   fill=c); draw.rectangle([x,   y-t, x+s, y],   fill=c)
    if d == 'br': draw.rectangle([x-t, y-s, x,   y],   fill=c); draw.rectangle([x-s, y-t, x,   y],   fill=c)

def diamond(draw, cx, cy, size=7):
    draw.polygon([(cx, cy-size),(cx+size, cy),(cx, cy+size),(cx-size, cy)], fill=GOLD)

def draw_swastika(draw, cx, cy, size=16, color=GOLD, width=2):
    """Draws a precise auspicious Hindu Swastika with 4 bindu dots."""
    s = size // 2
    # Main vertical and horizontal cross
    draw.line([(cx, cy - s), (cx, cy + s)], fill=color, width=width)
    draw.line([(cx - s, cy), (cx + s, cy)], fill=color, width=width)
    # 4 clockwise bent arms
    draw.line([(cx, cy - s), (cx + s, cy - s)], fill=color, width=width) # Top right
    draw.line([(cx + s, cy), (cx + s, cy + s)], fill=color, width=width) # Right bottom
    draw.line([(cx, cy + s), (cx - s, cy + s)], fill=color, width=width) # Bottom left
    draw.line([(cx - s, cy), (cx - s, cy - s)], fill=color, width=width) # Left top
    # 4 sacred bindu dots in quadrants
    d = s // 2
    r = 1
    draw.ellipse([cx + d - r, cy - d - r, cx + d + r, cy - d + r], fill=color)
    draw.ellipse([cx + d - r, cy + d - r, cx + d + r, cy + d + r], fill=color)
    draw.ellipse([cx - d - r, cy + d - r, cx - d + r, cy + d + r], fill=color)
    draw.ellipse([cx - d - r, cy - d - r, cx - d + r, cy - d + r], fill=color)

# ─────────────────────────────────────────────────────────────
#  BACKGROUND GENERATOR
# ─────────────────────────────────────────────────────────────
def make_bg():
    img  = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t)
        g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t)
        b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
    
    # Soft warm ambient light at top
    for r_step in range(260, 0, -2):
        col = (
            min(255, BG_TOP[0] + int(24 * (1 - r_step / 260))),
            min(255, BG_TOP[1] + int(14 * (1 - r_step / 260))),
            min(255, BG_TOP[2] + int(6  * (1 - r_step / 260))),
        )
        draw.ellipse([W//2 - r_step, -r_step//2, W//2 + r_step, r_step], fill=col)
    return img

# ─────────────────────────────────────────────────────────────
#  OPTIMIZED INSTANT-SCAN QR CODE GENERATOR
# ─────────────────────────────────────────────────────────────
def make_optimized_qr(url, size=400):
    """
    Generates an optimized, fast-scanning QR code:
      - Uses Level M error correction (15%) for large, clean modules without visual clutter.
      - High-contrast pure white quiet-zone background with dark emerald modules.
    """
    qr = qrcode.QRCode(
        version=None,  # dynamic minimum version (simple pattern)
        error_correction=qrcode.constants.ERROR_CORRECT_M,  # fast & clean scan
        box_size=12,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # Sharp crisp contrast
    qr_img = qr.make_image(
        fill_color=(15, 28, 22),
        back_color=(255, 255, 255)
    ).convert("RGB")

    return qr_img.resize((size, size), Image.LANCZOS)

# ─────────────────────────────────────────────────────────────
#  MAIN CARD GENERATOR
# ─────────────────────────────────────────────────────────────
def generate():
    print("[*] Generating high-clarity invitation card...")

    img  = make_bg()
    draw = ImageDraw.Draw(img)

    # Fonts
    f_shloka = load_indic(30)
    f_om     = load_indic(38)
    f_xl     = load_serif(68)
    f_lg     = load_serif(44)
    f_md     = load_serif(30)
    f_sm     = load_sans(24)
    f_xs     = load_sans(20)
    f_link   = load_sans(24)

    # Outer decorative borders
    m = 28
    draw.rectangle([m, m, W-m, H-m], outline=GOLD_DIM, width=1)
    draw.rectangle([m+10, m+10, W-m-10, H-m-10], outline=(*GOLD_DIM, 60), width=1)

    # Corner ornaments
    s = 50
    corner(draw, m+10,   m+10,   s, 'tl')
    corner(draw, W-m-10, m+10,   s, 'tr')
    corner(draw, m+10,   H-m-10, s, 'bl')
    corner(draw, W-m-10, H-m-10, s, 'br')

    y = 65

    # 1. Sacred Header Invocation
    f_shloka = load_serif(22)
    centered(draw, y, "✦   O M   S R I   G A N E S H A Y A   N A M A H A   ✦", f_shloka, GOLD_LIGHT)
    y += 40

    # Sacred Swastik & Om Emblem (Flanked by geometric Swastikas)
    f_om = load_indic(42)
    centered(draw, y, "ॐ", f_om, GOLD)
    draw_swastika(draw, W // 2 - 76, y + 20, size=24, color=GOLD, width=2)
    draw_swastika(draw, W // 2 + 76, y + 20, size=24, color=GOLD, width=2)
    y += 62

    # 2. YOU ARE INVITED
    centered(draw, y, "Y O U   A R E   I N V I T E D", f_xs, GOLD)
    y += 30

    gold_line(draw, y, width=440)
    y += 22

    # 3. HOUSEWARMING CEREMONY
    h = centered(draw, y, "H O U S E W A R M I N G", f_sm, GOLD_LIGHT)
    y += h + 8
    h = centered(draw, y, "C E R E M O N Y", f_sm, GOLD_LIGHT)
    y += h + 28

    # Diamond row
    for dx in [-72, -36, 0, 36, 72]:
        diamond(draw, W//2 + dx, y + 6, 5 if dx != 0 else 8)
    y += 26

    # 4. Family Name
    words = FAMILY_NAME.split()
    mid   = len(words) // 2
    h = centered(draw, y, " ".join(words[:mid]), f_xl, WHITE)
    y += h + 8
    h = centered(draw, y, " ".join(words[mid:]), f_xl, WHITE)
    y += h + 32

    # Event date
    centered(draw, y, f"31 August 2026 · 3:00 AM", f_md, GOLD_LIGHT)
    y += 44

    gold_line(draw, y, width=380)
    y += 28

    # 5. Scan & Visit Instruction
    h = centered(draw, y, "Scan to view full invitation & location", f_md, WHITE_DIM)
    y += h + 24

    # 6. Optimized Large QR Code (400x400 with pristine white quiet zone)
    qr_size  = 400
    qr_pad   = 16
    qr_total = qr_size + qr_pad * 2
    qr_img   = make_optimized_qr(WEBSITE_URL, qr_size)

    # Gold-bordered QR box
    qr_box = Image.new("RGB", (qr_total, qr_total), (255, 255, 255))
    qr_box.paste(qr_img, (qr_pad, qr_pad))

    # Add elegant gold outline to the QR frame
    qd = ImageDraw.Draw(qr_box)
    qd.rectangle([0, 0, qr_total-1, qr_total-1], outline=GOLD, width=2)
    cs = 16
    corner(qd, 4,          4,          cs, 'tl')
    corner(qd, qr_total-4, 4,          cs, 'tr')
    corner(qd, 4,          qr_total-4, cs, 'bl')
    corner(qd, qr_total-4, qr_total-4, cs, 'br')

    qr_x = (W - qr_total) // 2
    img.paste(qr_box, (qr_x, y))
    y += qr_total + 20

    # 7. Text Link (Direct URL for typing or tapping)
    clean_url_display = WEBSITE_URL.replace("https://", "")
    centered(draw, y, f"Or visit: {clean_url_display}", f_link, GOLD_LIGHT)
    y += 38

    # 8. Bottom blessing
    centered(draw, y, "•   ॐ   •", load_indic(26), GOLD_DIM)
    draw_swastika(draw, W // 2 - 64, y + 14, size=18, color=GOLD_DIM, width=2)
    draw_swastika(draw, W // 2 + 64, y + 14, size=18, color=GOLD_DIM, width=2)
    y += 36
    centered(draw, y, "With Blessings & Warm Wishes", f_xs, WHITE_FAINT)

    # Save Ultra-HD Output
    img.save(OUTPUT_FILE, "PNG", quality=98)
    print(f"[OK] Card saved successfully -> {OUTPUT_FILE} ({W}x{H}px)")
    print(f"[OK] Encoded URL: {WEBSITE_URL}")
    print("\n" + "=" * 64)
    print("WHATSAPP SHARING TEMPLATE (Copy & send this message):")
    print("=" * 64)
    print("Namaste! You are cordially invited to celebrate our new home.")
    print("\n*Vanukuri Veena Damodar Reddy — Housewarming Ceremony*")
    print("Date: 31 August 2026 (Monday)")
    print("Auspicious Muhurtham: 3:00 AM")
    print("\nClick below to view ceremonial invitation, location & photos:")
    print(f"{WEBSITE_URL}")
    print("=" * 64 + "\n")

if __name__ == "__main__":
    generate()
