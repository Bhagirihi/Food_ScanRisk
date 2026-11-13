#!/usr/bin/env python3
"""Generate ScanRisk splash art (assets/splash.png, 1024x1024).

Maroon hero gradient + gold barcode bars + serif wordmark, matching the
Shubh Muhurat royal-temple palette used across the app. Re-run to regenerate.
"""
from PIL import Image, ImageDraw, ImageFont

W = H = 1024
# Solid maroon so the image blends seamlessly with the native splash
# backgroundColor at any display size (a gradient would show a square edge).
BG = (94, 18, 36)           # maroon #5E1224
GOLD = (227, 197, 101)  # goldBright #E3C565
GOLD_DIM = (193, 154, 61)  # gold #C19A3D
CREAM = (255, 247, 232)

img = Image.new("RGB", (W, H), BG)

d = ImageDraw.Draw(img, "RGBA")

# Gold barcode bars, centred.
bars = [3, 2, 6, 2, 3, 8, 2, 4, 3, 2, 6, 3]
bar_w = [w * 7 for w in bars]
gap = 12
total = sum(bar_w) + gap * (len(bar_w) - 1)
x = (W - total) // 2
bar_top, bar_h = 300, 150
for i, w in enumerate(bar_w):
    h = bar_h if i % 3 == 0 else bar_h - 28
    d.rectangle([x, bar_top + (bar_h - h), x + w, bar_top + bar_h], fill=GOLD)
    x += w + gap

# Thin gold rules above and below the wordmark.
d.rectangle([W // 2 - 130, 560, W // 2 + 130, 563], fill=GOLD_DIM)
d.rectangle([W // 2 - 130, 700, W // 2 + 130, 703], fill=GOLD_DIM)

serif_bold = "/usr/share/fonts/truetype/noto/NotoSerifDisplay-Bold.ttf"
serif = "/usr/share/fonts/truetype/noto/NotoSerifDisplay-Regular.ttf"
try:
    f_name = ImageFont.truetype(serif_bold, 120)
    f_tag = ImageFont.truetype(serif, 34)
except OSError:
    f_name = ImageFont.load_default()
    f_tag = ImageFont.load_default()

d.text((W // 2, 630), "ScanRisk", font=f_name, fill=CREAM, anchor="mm")

# Letterspaced tagline, drawn letter by letter.
tag = "SCAN  •  KNOW  •  CHOOSE"
cx = W // 2
widths = [d.textlength(ch, font=f_tag) for ch in tag]
total_w = sum(widths) + 14 * (len(tag) - 1)
x = cx - total_w / 2
for ch, w in zip(tag, widths):
    d.text((x, 748), ch, font=f_tag, fill=GOLD)
    x += w + 14

img.save("assets/splash.png")
print("wrote assets/splash.png", img.size)
