"""
generate_invite.py — Vanukuri Family Housewarming Invitation Card Generator
============================================================================
Generates a clean shareable image with QR code.
Guests scan → land on the full invitation website.

Requirements:
    pip install pillow qrcode

Usage:
    python generate_invite.py
    
Output:
    invitation_card.png  — Share on WhatsApp, print, or use anywhere
"""

from PIL import Image, ImageDraw, ImageFont
import qrcode
import os

# ─────────────────────────────────────────────────────────────
#  CONFIGURATION — Only edit these two lines
# ─────────────────────────────────────────────────────────────
WEBSITE_URL  = "https://vanukuri2026.netlify.app"  # ← paste your Netlify URL
FAMILY_NAME  = "Vanukuri Veena Damodar Reddy Family"
OUTPUT_FILE  = "invitation_card.png"

# ─────────────────────────────────────────────────────────────
#  DESIGN TOKENS
# ─────────────────────────────────────────────────────────────
W, H         = 1080, 1350   # portrait — perfect for WhatsApp

BG_TOP       = (15,  28,  22)
BG_BOTTOM    = (8,   15,  12)
GOLD         = (212, 175, 55)
GOLD_LIGHT   = (240, 210, 120)
GOLD_DIM     = (140, 110, 35)
WHITE        = (255, 255, 255)
WHITE_DIM    = (220, 215, 200)
WHITE_FAINT  = (160, 150, 130)

# ─────────────────────────────────────────────────────────────
#  FONT LOADER
# ─────────────────────────────────────────────────────────────
def load_serif(size):
    for path in [
        "C:/Windows/Fonts/georgia.ttf",
        "C:/Windows/Fonts/times.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
        "/System/Library/Fonts/Times New Roman.ttf",
    ]:
        if os.path.exists(path):
            try: return ImageFont.truetype(path, size)
            except: pass
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
            except: pass
    return ImageFont.load_default()

# ─────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────
def centered(draw, y, text, font, color):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(((W - tw) // 2, y), text, font=font, fill=color)
    return th

def gold_line(draw, y, width=400):
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

# ─────────────────────────────────────────────────────────────
#  BACKGROUND
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
    return img

# ─────────────────────────────────────────────────────────────
#  QR CODE
# ─────────────────────────────────────────────────────────────
def make_qr(url, size=360):
    qr = qrcode.QRCode(version=3, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color=(15, 28, 22), back_color=(245, 235, 195)).convert("RGB")
    return img.resize((size, size), Image.LANCZOS)

# ─────────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────────
def generate():
    print("🪔 Generating invitation card...")

    img  = make_bg()
    draw = ImageDraw.Draw(img)

    # Fonts
    f_xl   = load_serif(82)
    f_lg   = load_serif(52)
    f_md   = load_serif(34)
    f_sm   = load_sans(22)
    f_xs   = load_sans(18)

    # Outer border
    m = 30
    draw.rectangle([m, m, W-m, H-m], outline=GOLD_DIM, width=1)
    draw.rectangle([m+10, m+10, W-m-10, H-m-10], outline=(*GOLD_DIM, 60), width=1)

    # Corner ornaments
    s = 55
    corner(draw, m+10,   m+10,   s, 'tl')
    corner(draw, W-m-10, m+10,   s, 'tr')
    corner(draw, m+10,   H-m-10, s, 'bl')
    corner(draw, W-m-10, H-m-10, s, 'br')

    y = 90

    # ॐ Sacred Symbol
    centered(draw, y, "卐   ॐ   卐", load_serif(44), GOLD)
    y += 75

    # YOU ARE INVITED
    centered(draw, y, "Y O U   A R E   I N V I T E D", f_xs, GOLD)
    y += 32

    gold_line(draw, y, width=460)
    y += 20

    # HOUSEWARMING CEREMONY
    h = centered(draw, y, "H O U S E W A R M I N G", f_sm, GOLD_LIGHT)
    y += h + 8
    h = centered(draw, y, "C E R E M O N Y", f_sm, GOLD_LIGHT)
    y += h + 36

    # Diamond row
    for dx in [-72, -36, 0, 36, 72]:
        diamond(draw, W//2 + dx, y + 6, 5 if dx != 0 else 8)
    y += 28

    # Family name — two lines
    words = FAMILY_NAME.split()
    mid   = len(words) // 2
    h = centered(draw, y, " ".join(words[:mid]), f_xl, WHITE)
    y += h + 10
    h = centered(draw, y, " ".join(words[mid:]), f_xl, WHITE)
    y += h + 50

    gold_line(draw, y, width=380)
    y += 36

    # Scan instruction
    h = centered(draw, y, "Scan to view the full invitation", f_md, WHITE_DIM)
    y += h + 32

    # Down arrow
    cx    = W // 2
    aw, ah = 20, 40
    draw.rectangle([cx-3, y, cx+3, y+ah-12], fill=GOLD)
    draw.polygon([(cx-aw, y+ah-14), (cx+aw, y+ah-14), (cx, y+ah+6)], fill=GOLD)
    y += ah + 24

    # QR code with gold frame
    qr_size    = 360
    qr_pad     = 12
    qr_total   = qr_size + qr_pad * 2
    qr_img     = make_qr(WEBSITE_URL, qr_size)

    # Gold-bordered QR box
    qr_box = Image.new("RGB", (qr_total, qr_total), (50, 40, 10))
    inner  = Image.new("RGB", (qr_size + 4, qr_size + 4), (245, 235, 195))
    inner.paste(qr_img, (2, 2))
    qr_box.paste(inner, (qr_pad - 2, qr_pad - 2))

    # Tiny corners on QR box
    qd = ImageDraw.Draw(qr_box)
    cs = 18
    corner(qd, 4,          4,          cs, 'tl')
    corner(qd, qr_total-4, 4,          cs, 'tr')
    corner(qd, 4,          qr_total-4, cs, 'bl')
    corner(qd, qr_total-4, qr_total-4, cs, 'br')

    qr_x = (W - qr_total) // 2
    img.paste(qr_box, (qr_x, y))
    y += qr_total + 18

    # Bottom emblem
    centered(draw, y, "卐   ✦   ॐ   ✦   卐", load_serif(26), GOLD_DIM)

    img.save(OUTPUT_FILE, "PNG")
    print(f"✅ Done! → {OUTPUT_FILE}  ({W}×{H}px)")
    print(f"   QR points to: {WEBSITE_URL}")

if __name__ == "__main__":
    generate()


# ─────────────────────────────────────────────────────────────
#  DESIGN TOKENS
# ─────────────────────────────────────────────────────────────
W, H          = 1080, 1620      # portrait — perfect for WhatsApp sharing

# Colors
BG_TOP        = (15,  28,  22)  # deep emerald
BG_BOTTOM     = (8,   15,  12)  # near black
GOLD          = (212, 175, 55)
GOLD_LIGHT    = (240, 210, 120)
GOLD_DIM      = (160, 130, 40)
GOLD_PALE     = (240, 225, 170)
WHITE         = (255, 255, 255)
WHITE_DIM     = (220, 215, 200)
WHITE_FAINT   = (170, 160, 140)
GREEN_MID     = (44,  74,  62)
MARIGOLD      = (224, 123, 57)

# ─────────────────────────────────────────────────────────────
#  FONT LOADER — falls back gracefully
# ─────────────────────────────────────────────────────────────
def load_font(size, bold=False):
    """Try system fonts, fall back to default."""
    candidates = []
    if bold:
        candidates = [
            "C:/Windows/Fonts/georgia.ttf",
            "C:/Windows/Fonts/times.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
            "/System/Library/Fonts/Times New Roman Bold.ttf",
        ]
    else:
        candidates = [
            "C:/Windows/Fonts/georgia.ttf",
            "C:/Windows/Fonts/times.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
            "/System/Library/Fonts/Times New Roman.ttf",
        ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()

def load_sans(size):
    candidates = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()

# ─────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────
def centered_text(draw, y, text, font, color, width=W):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, y), text, font=font, fill=color)
    return bbox[3] - bbox[1]  # return height

def draw_gold_line(draw, y, width=320, cx=W//2, thickness=1):
    x0 = cx - width // 2
    x1 = cx + width // 2
    # gradient-like line using segments
    steps = 60
    for i in range(steps):
        t = i / steps
        alpha = int(255 * (1 - abs(t - 0.5) * 2))
        seg_x = x0 + int((x1 - x0) * t)
        seg_w = max(1, (x1 - x0) // steps + 1)
        col = (*GOLD, alpha)
        draw.rectangle([seg_x, y, seg_x + seg_w, y + thickness], fill=GOLD if t > 0.1 and t < 0.9 else GOLD_DIM)

def draw_corner_ornament(draw, x, y, size, direction):
    """Draw an L-shaped gold corner at (x,y). direction: 'tl','tr','bl','br'"""
    t = 2
    s = size
    col = GOLD_DIM
    if direction == 'tl':
        draw.rectangle([x,   y,   x+s, y+t], fill=col)
        draw.rectangle([x,   y,   x+t, y+s], fill=col)
    elif direction == 'tr':
        draw.rectangle([x-s, y,   x,   y+t], fill=col)
        draw.rectangle([x-t, y,   x,   y+s], fill=col)
    elif direction == 'bl':
        draw.rectangle([x,   y-s, x+t, y],   fill=col)
        draw.rectangle([x,   y-t, x+s, y],   fill=col)
    elif direction == 'br':
        draw.rectangle([x-t, y-s, x,   y],   fill=col)
        draw.rectangle([x-s, y-t, x,   y],   fill=col)

def draw_dot_row(draw, y, count=7, cx=W//2, spacing=18):
    x0 = cx - (count // 2) * spacing
    for i in range(count):
        x = x0 + i * spacing
        r = 2
        alpha_factor = 1.0 - abs(i - count // 2) / (count // 2 + 1)
        col = tuple(int(c * alpha_factor) for c in GOLD_DIM) if alpha_factor < 0.5 else GOLD_DIM
        draw.ellipse([x - r, y - r, x + r, y + r], fill=GOLD if alpha_factor > 0.6 else GOLD_DIM)

def draw_diamond(draw, cx, cy, size=8):
    points = [(cx, cy - size), (cx + size, cy), (cx, cy + size), (cx - size, cy)]
    draw.polygon(points, fill=GOLD)

# ─────────────────────────────────────────────────────────────
#  QR CODE GENERATOR
# ─────────────────────────────────────────────────────────────
def make_qr(url, qr_size=340):
    qr = qrcode.QRCode(
        version=3,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # Dark green on pale gold — matches the theme
    qr_img = qr.make_image(
        fill_color=(15, 28, 22),
        back_color=(245, 235, 195)
    ).convert("RGB")

    qr_img = qr_img.resize((qr_size, qr_size), Image.LANCZOS)
    return qr_img

# ─────────────────────────────────────────────────────────────
#  BACKGROUND — deep emerald gradient
# ─────────────────────────────────────────────────────────────
def make_background():
    img = Image.new("RGB", (W, H), BG_TOP)
    draw = ImageDraw.Draw(img)

    # Vertical gradient — top to bottom
    for y in range(H):
        t = y / H
        r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t)
        g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t)
        b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Subtle warm glow at top center
    for r_step in range(300, 0, -1):
        alpha = int(18 * (1 - r_step / 300))
        col = (
            min(255, BG_TOP[0] + 30),
            min(255, BG_TOP[1] + 15),
            min(255, BG_TOP[2] + 8),
        )
        draw.ellipse(
            [W//2 - r_step, -r_step//2, W//2 + r_step, r_step],
            fill=col
        )

    return img

# ─────────────────────────────────────────────────────────────
#  MAIN CARD DRAW
# ─────────────────────────────────────────────────────────────
def generate_card():
    print("🪔 Generating invitation card...")

    img  = make_background()
    draw = ImageDraw.Draw(img)

    # ── Fonts
    f_script_xl  = load_font(88, bold=False)   # ceremony name
    f_script_lg  = load_font(54)               # family name
    f_serif_md   = load_font(36)               # date/time
    f_serif_sm   = load_font(28)               # address
    f_sans_xs    = load_sans(22)               # small labels
    f_sans_sm    = load_sans(26)               # scan label
    f_sans_md    = load_sans(30)               # section labels
    f_sans_lg    = load_sans(38)               # YOU ARE INVITED

    # ── OUTER BORDER
    margin = 28
    bw     = 1
    draw.rectangle([margin, margin, W-margin, H-margin], outline=GOLD_DIM, width=bw)
    # inner border
    margin2 = 38
    draw.rectangle([margin2, margin2, W-margin2, H-margin2], outline=(*GOLD_DIM, 80), width=1)

    # ── CORNER ORNAMENTS (outer)
    cs = 52
    draw_corner_ornament(draw, margin+8,   margin+8,   cs, 'tl')
    draw_corner_ornament(draw, W-margin-8, margin+8,   cs, 'tr')
    draw_corner_ornament(draw, margin+8,   H-margin-8, cs, 'bl')
    draw_corner_ornament(draw, W-margin-8, H-margin-8, cs, 'br')

    y = 72

    # ── SACRED EMBLEM
    diya_font = load_font(44)
    centered_text(draw, y, "卐   ॐ   卐", diya_font, GOLD)
    y += 65

    # ── YOU ARE INVITED
    centered_text(draw, y, "Y O U   A R E   I N V I T E D", f_sans_xs, GOLD)
    y += 34

    # ── Top gold line
    draw_gold_line(draw, y, width=420)
    y += 18

    # ── HOUSEWARMING
    h = centered_text(draw, y, CEREMONY.upper(), f_sans_md, GOLD_LIGHT)
    y += h + 14

    # ── dot ornament
    draw_dot_row(draw, y, count=9)
    y += 24

    # ── FAMILY NAME (large serif)
    # Split into two lines if long
    words = FAMILY_NAME.split()
    mid = len(words) // 2
    line1 = " ".join(words[:mid])
    line2 = " ".join(words[mid:])
    h1 = centered_text(draw, y, line1, f_script_xl, WHITE)
    y += h1 + 8
    h2 = centered_text(draw, y, line2, f_script_xl, WHITE)
    y += h2 + 28

    # ── Marigold divider diamond row
    for dx in [-60, -30, 0, 30, 60]:
        draw_diamond(draw, W//2 + dx, y + 8, size=6 if dx == 0 else 4)
    y += 32

    # ── SECTION LABEL: THE DAY
    centered_text(draw, y, "— THE DAY —", f_sans_xs, GOLD_DIM)
    y += 34

    # ── DATE
    h = centered_text(draw, y, DATE_LINE, f_serif_md, GOLD_LIGHT)
    y += h + 10

    # ── TIME
    h = centered_text(draw, y, TIME_LINE, f_serif_sm, WHITE_DIM)
    y += h + 32

    # ── Thin line
    draw_gold_line(draw, y, width=260)
    y += 24

    # ── SECTION LABEL: VENUE
    centered_text(draw, y, "— VENUE —", f_sans_xs, GOLD_DIM)
    y += 34

    # ── ADDRESS LINES
    h = centered_text(draw, y, ADDRESS_LINE1, f_serif_sm, WHITE_DIM)
    y += h + 6
    h = centered_text(draw, y, ADDRESS_LINE2, f_serif_sm, WHITE_DIM)
    y += h + 6
    h = centered_text(draw, y, ADDRESS_LINE3, f_serif_sm, WHITE_FAINT)
    y += h + 36

    # ── Bottom flourish line
    draw_gold_line(draw, y, width=500)
    y += 26

    # ── SCAN SECTION
    centered_text(draw, y, "SCAN TO VIEW INVITATION", f_sans_xs, GOLD)
    y += 28

    # ── DOWN ARROW
    arrow_cx = W // 2
    arrow_y  = y
    arrow_w  = 18
    arrow_h  = 28
    # shaft
    draw.rectangle([arrow_cx - 3, arrow_y, arrow_cx + 3, arrow_y + arrow_h - 10], fill=GOLD)
    # arrowhead
    draw.polygon([
        (arrow_cx - arrow_w, arrow_y + arrow_h - 14),
        (arrow_cx + arrow_w, arrow_y + arrow_h - 14),
        (arrow_cx,           arrow_y + arrow_h + 4),
    ], fill=GOLD)
    y += arrow_h + 18

    # ── QR CODE
    qr_size = 320
    qr_img  = make_qr(WEBSITE_URL, qr_size)

    # Gold border around QR
    qr_border = 10
    qr_total  = qr_size + qr_border * 2
    qr_bg     = Image.new("RGB", (qr_total, qr_total), GOLD_DIM)
    qr_bg.paste(qr_img, (qr_border, qr_border))

    # Add corner ornaments on QR box
    qr_draw = ImageDraw.Draw(qr_bg)
    co = 16
    draw_corner_ornament(qr_draw, 4,          4,          co, 'tl')
    draw_corner_ornament(qr_draw, qr_total-4, 4,          co, 'tr')
    draw_corner_ornament(qr_draw, 4,          qr_total-4, co, 'bl')
    draw_corner_ornament(qr_draw, qr_total-4, qr_total-4, co, 'br')

    qr_x = (W - qr_total) // 2
    img.paste(qr_bg, (qr_x, y))
    y += qr_total + 20

    # ── URL label below QR
    centered_text(draw, y, WEBSITE_URL, f_sans_xs, GOLD_DIM)
    y += 28

    # ── Bottom emblem row
    centered_text(draw, y, "卐  ✦  ॐ  ✦  卐", load_font(26), GOLD_DIM)
    y += 48

    # ── Footer blessing
    centered_text(draw, y, "With Blessings & Warm Wishes", f_sans_xs, WHITE_FAINT)

    # ── Save
    img = img.convert("RGB")
    img.save(OUTPUT_FILE, "PNG", quality=95)
    print(f"✅ Saved: {OUTPUT_FILE}")
    print(f"   Size: {W}x{H}px — perfect for WhatsApp sharing")
    print(f"   QR points to: {WEBSITE_URL}")

# ─────────────────────────────────────────────────────────────
#  RUN
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    generate_card()
