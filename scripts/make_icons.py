"""앱 아이콘 PNG를 만든다. 실행: python scripts/make_icons.py (Pillow 필요)"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
GROUND = (23, 18, 28, 255)
FELT = (14, 77, 66, 255)
IVORY = (251, 246, 234, 255)
BACK = (142, 28, 46, 255)
RED = (194, 31, 48, 255)
BRASS = (220, 183, 111, 255)


def rounded_card(size, fill, angle, radius=0.09):
    w, h = size
    pad = int(h * 0.4)
    layer = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((pad, pad, pad + w, pad + h), radius=int(w * radius), fill=fill)
    return layer, pad


def heart(d, cx, cy, s, fill):
    r = s * 0.27
    d.ellipse((cx - s * 0.5, cy - s * 0.42, cx - s * 0.5 + 2 * r, cy - s * 0.42 + 2 * r), fill=fill)
    d.ellipse((cx + s * 0.5 - 2 * r, cy - s * 0.42, cx + s * 0.5, cy - s * 0.42 + 2 * r), fill=fill)
    d.polygon([(cx - s * 0.49, cy - s * 0.1), (cx + s * 0.49, cy - s * 0.1), (cx, cy + s * 0.5)], fill=fill)


def draw_icon(px, scale=1.0, rounded=False):
    ss = 4
    S = px * ss
    img = Image.new("RGBA", (S, S), GROUND)
    d = ImageDraw.Draw(img)
    d.ellipse((S * 0.08, S * 0.08, S * 0.92, S * 0.92), fill=FELT)

    w = int(S * 0.36 * scale)
    h = int(w * 1.4)
    cx, cy = S // 2, int(S * 0.5)

    back, _ = rounded_card((w, h), BACK, 0)
    bd = ImageDraw.Draw(back)
    pad = int(h * 0.4)
    bd.rounded_rectangle((pad, pad, pad + w, pad + h), radius=int(w * 0.09), outline=IVORY, width=max(2, int(w * 0.05)))
    for x_off, angle in ((-int(w * 0.34), 17),):
        rotated = back.rotate(angle, resample=Image.BICUBIC)
        img.alpha_composite(rotated, (cx + x_off - rotated.width // 2, cy - rotated.height // 2))

    front, _ = rounded_card((w, h), IVORY, 0)
    fd = ImageDraw.Draw(front)
    heart(fd, pad + w / 2, pad + h / 2, w * 0.62, RED)
    fd.rounded_rectangle((pad, pad, pad + w, pad + h), radius=int(w * 0.09), outline=BRASS, width=max(2, int(w * 0.03)))
    rotated = front.rotate(-11, resample=Image.BICUBIC)
    img.alpha_composite(rotated, (cx + int(w * 0.2) - rotated.width // 2, cy - rotated.height // 2))

    return img.resize((px, px), Image.LANCZOS)


OUT.mkdir(exist_ok=True)
draw_icon(180).convert("RGB").save(OUT / "icon-180.png")
draw_icon(192).save(OUT / "icon-192.png")
draw_icon(512).save(OUT / "icon-512.png")
draw_icon(512, scale=0.8).save(OUT / "icon-maskable-512.png")
print("icons written to", OUT)
