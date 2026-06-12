"""
icon.png → macOS 앱 아이콘 생성
- 흰 배경 제거 후 어두운 파란-회색 배경에 합성
- 반짝임 효과 추가
- icns 변환 후 앱 번들에 복사
"""
import os
import math
import shutil
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

BASE = Path(__file__).parent.parent
SRC = BASE / "icon-assets" / "icon.png"
OUT_DIR = BASE / "icon-assets" / "AppIcon.iconset"
OUT_ICNS = BASE / "icon-assets" / "AppIcon.icns"
BUNDLE_ICNS = BASE / "Game Data Studio.app" / "Contents" / "Resources" / "AppIcon.icns"

def make_rounded_mask(size, radius_ratio=0.225):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    return mask

def make_bg(size):
    """어두운 파란-회색 방사형 그라데이션"""
    img = Image.new("RGBA", (size, size))
    pixels = img.load()
    cx, cy = size / 2, size / 2
    for y in range(size):
        for x in range(size):
            dx = (x - cx) / (size / 2)
            dy = (y - cy) / (size / 2)
            t = min(math.sqrt(dx * dx + dy * dy), 1.0)
            r = int(0x1e + (0x0a - 0x1e) * t)
            g = int(0x2d + (0x11 - 0x2d) * t)
            b = int(0x47 + (0x20 - 0x47) * t)
            pixels[x, y] = (r, g, b, 255)
    return img

def remove_white_bg(img, threshold=240, feather=8):
    """흰/밝은 배경 픽셀 투명 처리 + 엣지 페더링"""
    img = img.convert("RGBA")
    data = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            # 채도 계산
            mx = max(r, g, b)
            mn = min(r, g, b)
            sat = (mx - mn) / mx if mx > 0 else 0
            brightness = mx
            # 밝고 채도 낮으면(=흰/회색 배경) 투명
            if brightness > threshold and sat < 0.15:
                data[x, y] = (r, g, b, 0)
    # 엣지 스무딩
    img = img.filter(ImageFilter.SMOOTH_MORE)
    return img

def add_sparkles(draw, size):
    sparkles = [
        (int(size * 0.77), int(size * 0.22), size // 40, 200),
        (int(size * 0.20), int(size * 0.30), size // 55, 160),
        (int(size * 0.82), int(size * 0.70), size // 65, 130),
        (int(size * 0.16), int(size * 0.72), size // 70, 120),
    ]
    for cx, cy, arm, alpha in sparkles:
        col = (255, 255, 255, alpha)
        draw.line([(cx - arm * 2, cy), (cx + arm * 2, cy)], fill=col, width=max(1, arm // 4))
        draw.line([(cx, cy - arm * 2), (cx, cy + arm * 2)], fill=col, width=max(1, arm // 4))
        d = int(arm * 0.8)
        draw.line([(cx - d, cy - d), (cx + d, cy + d)], fill=col, width=max(1, arm // 6))
        draw.line([(cx + d, cy - d), (cx - d, cy + d)], fill=col, width=max(1, arm // 6))

def build_icon(size):
    bg = make_bg(size)

    fg = Image.open(SRC).convert("RGBA")
    fg = remove_white_bg(fg)

    fg_size = int(size * 0.84)
    fg = fg.resize((fg_size, fg_size), Image.LANCZOS)
    offset = (size - fg_size) // 2
    bg.paste(fg, (offset, offset), fg)

    sparkle = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    add_sparkles(ImageDraw.Draw(sparkle), size)
    bg = Image.alpha_composite(bg, sparkle)

    mask = make_rounded_mask(size)
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(bg, (0, 0), mask)
    return result

OUT_DIR.mkdir(parents=True, exist_ok=True)

print("아이콘 생성 중...")
for s in [16, 32, 64, 128, 256, 512, 1024]:
    build_icon(s).save(OUT_DIR / f"icon_{s}x{s}.png")
    if s <= 512:
        build_icon(s * 2).save(OUT_DIR / f"icon_{s}x{s}@2x.png")

print("icns 변환...")
subprocess.run(["iconutil", "-c", "icns", str(OUT_DIR), "-o", str(OUT_ICNS)], check=True)

print("앱 번들 복사...")
shutil.copy(OUT_ICNS, BUNDLE_ICNS)
subprocess.run(["touch", str(BASE / "Game Data Studio.app")], check=False)
print("완료!")
