#!/usr/bin/env python3
"""Generate ScanRisk logo assets (regenerable — re-run to rebuild):
- assets/icon.png (1024, launcher + store)
- assets/android-icon-foreground.png (1024, transparent, adaptive icon)
- assets/android-icon-monochrome.png (1024, transparent, themed icon)
- assets/favicon.png (64, web)
Design: deep maroon + gold barcode bars + serif wordmark (house palette).
"""
from PIL import Image, ImageDraw, ImageFont

MAROON = (94, 18, 36)  # #5E1224
GOLD = (227, 197, 101)  # goldBright #E3C565
CREAM = (255, 247, 232)
BARS = [3, 2, 6, 2, 3, 8, 2, 4, 3, 2, 6, 3]
SERIF_BOLD = "/usr/share/fonts/truetype/noto/NotoSerifDisplay-Bold.ttf"


def draw_bars(d, cx, top, scale, gap, tall_h, short_h, color):
    widths = [w * scale for w in BARS]
    total = sum(widths) + gap * (len(widths) - 1)
    x = cx - total // 2
    for i, w in enumerate(widths):
        h = tall_h if i % 3 == 0 else short_h
        d.rectangle([x, top + (tall_h - h), x + w, top + tall_h], fill=color)
        x += w + gap


S = 1024

# --- icon.png: maroon field, gold bars, gold rule, serif wordmark ---
icon = Image.new("RGB", (S, S), MAROON)
d = ImageDraw.Draw(icon)
draw_bars(d, S // 2, 300, 8, 14, 210, 175, GOLD)
d.rectangle([S // 2 - 130, 590, S // 2 + 130, 594], fill=GOLD)
try:
    f_name = ImageFont.truetype(SERIF_BOLD, 88)
except OSError:
    f_name = ImageFont.load_default()
d.text((S // 2, 680), "ScanRisk", font=f_name, fill=CREAM, anchor="mm")
icon.save("assets/icon.png")

# --- adaptive foreground: transparent, bars only, centred in the safe zone ---
fg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(fg)
draw_bars(d, S // 2, 400, 7, 12, 220, 185, GOLD + (255,))
fg.save("assets/android-icon-foreground.png")

# --- monochrome: white bars on transparent (Android themed icons) ---
mono = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(mono)
draw_bars(d, S // 2, 400, 7, 12, 220, 185, (255, 255, 255, 255))
mono.save("assets/android-icon-monochrome.png")

# --- favicon ---
icon.resize((64, 64), Image.LANCZOS).save("assets/favicon.png")
print("wrote icon.png, android-icon-foreground.png, android-icon-monochrome.png, favicon.png")
