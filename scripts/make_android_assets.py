"""Android 아이콘과 시작 화면, 스토어 그래픽을 만든다. 실행: python scripts/make_android_assets.py (Pillow 필요)"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_icons import BACK, BRASS, FELT, GROUND, IVORY, RED, draw_icon, heart, rounded_card  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "android" / "app" / "src" / "main" / "res"
STORE = ROOT / "store"
GROUND_HEX = "#17121c"

LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
FOREGROUND = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}


def card_pair(S):
    """배경 없는 카드 두 장. 적응형 아이콘의 안전 영역(가운데 66%) 안에 들어간다."""
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    w = int(S * 0.27)
    h = int(w * 1.4)
    cx, cy = S // 2, S // 2
    pad = int(h * 0.4)
    back, _ = rounded_card((w, h), BACK, 0)
    ImageDraw.Draw(back).rounded_rectangle((pad, pad, pad + w, pad + h), radius=int(w * 0.09), outline=IVORY, width=max(2, int(w * 0.05)))
    rotated = back.rotate(17, resample=Image.BICUBIC)
    img.alpha_composite(rotated, (cx - int(w * 0.34) - rotated.width // 2, cy - rotated.height // 2))
    front, _ = rounded_card((w, h), IVORY, 0)
    fd = ImageDraw.Draw(front)
    heart(fd, pad + w / 2, pad + h / 2, w * 0.62, RED)
    fd.rounded_rectangle((pad, pad, pad + w, pad + h), radius=int(w * 0.09), outline=BRASS, width=max(2, int(w * 0.03)))
    rotated = front.rotate(-11, resample=Image.BICUBIC)
    img.alpha_composite(rotated, (cx + int(w * 0.2) - rotated.width // 2, cy - rotated.height // 2))
    return img


def foreground(px):
    ss = 4
    S = px * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(img).ellipse((S * 0.19, S * 0.19, S * 0.81, S * 0.81), fill=FELT)
    img.alpha_composite(card_pair(S))
    return img.resize((px, px), Image.LANCZOS)


def round_icon(px):
    icon = draw_icon(px)
    mask = Image.new("L", (px * 4, px * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, px * 4, px * 4), fill=255)
    out = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    out.paste(icon, (0, 0), mask.resize((px, px), Image.LANCZOS))
    return out


def splash_files():
    logo = foreground(432)
    for path in RES.glob("drawable*/splash.png"):
        w, h = Image.open(path).size
        canvas = Image.new("RGBA", (w, h), GROUND)
        size = int(min(w, h) * 0.42)
        canvas.alpha_composite(logo.resize((size, size), Image.LANCZOS), ((w - size) // 2, (h - size) // 2))
        canvas.convert("RGB").save(path)


def feature_graphic():
    W, H = 1024, 500
    img = Image.new("RGBA", (W, H), GROUND)
    d = ImageDraw.Draw(img)
    d.ellipse((560, -130, 1180, 630), fill=FELT)
    img.alpha_composite(card_pair(760).resize((640, 640), Image.LANCZOS), (440, -70))
    bold = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 72)
    reg = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 30)
    d.text((64, 150), "카드 마술 모음", font=bold, fill=(243, 236, 221, 255))
    d.text((68, 262), "트럼프와 화투 마술 29가지", font=reg, fill=BRASS)
    d.text((68, 308), "공연을 보고 비법까지 배웁니다", font=reg, fill=(171, 158, 180, 255))
    img.convert("RGB").save(STORE / "feature-graphic-1024x500.png")


for name, px in LEGACY.items():
    folder = RES / f"mipmap-{name}"
    draw_icon(px).save(folder / "ic_launcher.png")
    round_icon(px).save(folder / "ic_launcher_round.png")
for name, px in FOREGROUND.items():
    foreground(px).save(RES / f"mipmap-{name}" / "ic_launcher_foreground.png")

(RES / "values" / "ic_launcher_background.xml").write_text(
    f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{GROUND_HEX}</color>\n</resources>\n',
    encoding="utf-8",
)
splash_files()
STORE.mkdir(exist_ok=True)
feature_graphic()
draw_icon(512).convert("RGB").save(STORE / "icon-512.png")
print("android assets written")
