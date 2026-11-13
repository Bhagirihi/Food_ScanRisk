#!/usr/bin/env python3
"""Generate ScanRisk splash art (assets/splash.png, 1024x1024).

Deep maroon #4A121A field (matches the native splash backgroundColor in
app.json, so the image blends seamlessly) + gold barcode bars + wordmark
in Plus Jakarta Sans Bold + letterspaced tagline. Re-run to regenerate.
"""
from PIL import Image, ImageDraw, ImageFont

W = H = 1024
# Solid maroon so the image blends with the native splash backgroundColor
# at any display size (a gradient would show a square edge).
BG = (74, 18, 26)           # primary maroon #4A121A
GOLD = (227, 197, 101)      # amber-ish gold
GOLD_DIM = (217, 119, 6)    # secondary amber #D97706
CREAM = (255, 255, 255)

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

jakarta_bold = "node_modules/@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf"
inter = "node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"
serif_bold = "/usr/share/fonts/truetype/noto/NotoSerifDisplay-Bold.ttf"
serif = "/usr/share/fonts/truetype/noto/NotoSerifDisplay-Regular.ttf"
try:
    f_name = ImageFont.truetype(jakarta_bold, 120)
except OSError:
    try:
        f_name = ImageFont.truetype(serif_bold, 120)
    except OSError:
        f_name = ImageFont.load_default()
try:
    f_tag = ImageFont.truetype(inter, 34)
except OSError:
    try:
        f_tag = ImageFont.truetype(serif, 34)
    except OSError:
        f_tag = ImageFont.load_default()

d.text((W // 2, 630), "ScanRisk", font=f_name, fill=CREAM, anchor="mm")

# Letterspaced tagline, drawn letter by letter.
tag = "KNOW WHAT YOU CONSUME"
cx = W // 2
widths = [d.textlength(ch, font=f_tag) for ch in tag]
total_w = sum(widths) + 14 * (len(tag) - 1)
x = cx - total_w / 2
for ch, w in zip(tag, widths):
    d.text((x, 748), ch, font=f_tag, fill=GOLD)
    x += w + 14

img.save("assets/splash.png")
print("wrote assets/splash.png", img.size)
