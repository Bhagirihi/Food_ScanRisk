#!/usr/bin/env python3
"""Generate ScanRisk splash art (assets/splash.png, 1024x1024).

Deep maroon #4A121A field (matches the native splash backgroundColor in
app.json, so the image blends seamlessly) + white rounded logo box with
gold barcode bars that FIT inside it + wordmark in Plus Jakarta Sans
Bold + letterspaced tagline. Same identity as the in-app BrandedSplash
(no orange rules, no clinical copy). Re-run to regenerate.
"""
from PIL import Image, ImageDraw, ImageFont

W = H = 1024
# Solid maroon so the image blends with the native splash backgroundColor
# at any display size (a gradient would show a square edge).
BG = (74, 18, 26)           # primary maroon #4A121A
GOLD = (227, 197, 101)      # amber-ish gold
CREAM = (255, 255, 255)

img = Image.new("RGB", (W, H), BG)

d = ImageDraw.Draw(img, "RGBA")

# White rounded logo box, centred.
BOX = 360
box_left, box_top = (W - BOX) // 2, 180
d.rounded_rectangle(
    [box_left, box_top, box_left + BOX, box_top + BOX], radius=64, fill=CREAM
)

# Gold barcode bars, fitted INSIDE the box: 44 units * 4 + 11 gaps * 8 =
# 264px wide in a 360px box (48px padding each side).
bars = [3, 2, 6, 2, 3, 8, 2, 4, 3, 2, 6, 3]
bar_w = [w * 4 for w in bars]
gap = 8
total = sum(bar_w) + gap * (len(bar_w) - 1)
x = (W - total) // 2
bar_bottom = 435
bar_h = 150
for i, w in enumerate(bar_w):
    h = bar_h if i % 3 == 0 else bar_h - 40
    d.rectangle([x, bar_bottom - h, x + w, bar_bottom], fill=GOLD)
    x += w + gap

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

d.text((W // 2, 665), "ScanRisk", font=f_name, fill=CREAM, anchor="mm")

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
