"""
Game Data Studio 앱 아이콘 생성
- 어두운 파란-회색 배경 (#0e1520 → #1a2540 그라데이션)
- 기존 컨트롤러 foreground 이미지 합성
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
SRC_FG = BASE / "icon-assets" / "icon-source-foreground.png"
OUT_DIR = BASE / "icon-assets" / "AppIcon.iconset"
OUT_ICNS = BASE / "icon-assets" / "AppIcon.icns"
BUNDLE_ICNS = BASE / "Game Data Studio.app" / "Contents" / "Resources" / "AppIcon.icns"

SIZE = 1024

def make_rounded_mask(size, radius_ratio=0.2):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    return mask

def make_bg(size):
    """어두운 파란-회색 방사형 그라데이션"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pixels = img.load()
    cx, cy = size / 2, size / 2
    for y in range(size):
        for x in range(size):
            dx = (x - cx) / (size / 2)
            dy = (y - cy) / (size / 2)
            dist = math.sqrt(dx * dx + dy * dy)
            t = min(dist, 1.0)
            # 중앙: #1e2d47 → 가장자리: #0a1120
            r = int(0x1e + (0x0a - 0x1e) * t)
            g = int(0x2d + (0x11 - 0x2d) * t)
            b = int(0x47 + (0x20 - 0x47) * t)
            pixels[x, y] = (r, g, b, 255)
    return img

def add_sparkles(draw, size):
    """반짝임 별 효과 (작은 십자형)"""
    sparkles = [
        (int(size * 0.77), int(size * 0.22), size // 40, 200),
        (int(size * 0.20), int(size * 0.30), size // 55, 160),
        (int(size * 0.82), int(size * 0.70), size // 65, 130),
        (int(size * 0.16), int(size * 0.72), size // 70, 120),
    ]
    for cx, cy, arm, alpha in sparkles:
        col = (255, 255, 255, alpha)
        # 긴 십자
        draw.line([(cx - arm * 2, cy), (cx + arm * 2, cy)], fill=col, width=max(1, arm // 4))
        draw.line([(cx, cy - arm * 2), (cx, cy + arm * 2)], fill=col, width=max(1, arm // 4))
        # 짧은 대각
        d = int(arm * 0.8)
        draw.line([(cx - d, cy - d), (cx + d, cy + d)], fill=col, width=max(1, arm // 6))
        draw.line([(cx + d, cy - d), (cx - d, cy + d)], fill=col, width=max(1, arm // 6))

def build_icon(size):
    # 배경
    bg = make_bg(size)

    # 기존 foreground 이미지 불러오기
    fg = Image.open(SRC_FG).convert("RGBA")

    # foreground 이미지는 배경 포함 정사각형 — 컨트롤러만 추출하기 위해
    # 알파 채널 임계값 처리 (배경 픽셀 제거)
    # 현재 이미지는 배경이 회색이므로 채도 낮은 픽셀을 투명처리
    r, g, b, a = fg.split()
    import struct

    # 회색 배경 픽셀 → 투명으로 (채도 기반)
    new_a = Image.new("L", fg.size, 0)
    for py in range(fg.height):
        for px in range(fg.width):
            rv = r.getpixel((px, py))
            gv = g.getpixel((px, py))
            bv = b.getpixel((px, py))
            # 채도 계산
            mx = max(rv, gv, bv)
            mn = min(rv, gv, bv)
            sat = (mx - mn) / mx if mx > 0 else 0
            # 회색 계열(채도<0.12)이고 중간 밝기면 투명
            if sat < 0.12 and 40 < mx < 220:
                new_a.putpixel((px, py), 0)
            else:
                new_a.putpixel((px, py), 255)

    fg.putalpha(new_a)

    # 엣지 스무딩
    fg_smooth = fg.filter(ImageFilter.SMOOTH_MORE)

    # foreground 리사이즈 후 중앙 합성
    fg_size = int(size * 0.82)
    fg_resized = fg_smooth.resize((fg_size, fg_size), Image.LANCZOS)
    offset = (size - fg_size) // 2
    bg.paste(fg_resized, (offset, offset), fg_resized)

    # 반짝임 효과 레이어
    sparkle_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(sparkle_layer)
    add_sparkles(draw, size)
    bg = Image.alpha_composite(bg, sparkle_layer)

    # 둥근 모서리 마스크 적용
    mask = make_rounded_mask(size, 0.225)
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(bg, (0, 0), mask)

    return result

# --- iconset 생성 ---
OUT_DIR.mkdir(parents=True, exist_ok=True)

sizes = [16, 32, 64, 128, 256, 512, 1024]
print("아이콘 생성 중...")
for s in sizes:
    img = build_icon(s)
    img.save(OUT_DIR / f"icon_{s}x{s}.png")
    if s <= 512:
        img2 = build_icon(s * 2)
        img2.save(OUT_DIR / f"icon_{s}x{s}@2x.png")

print("icns 변환 중...")
subprocess.run(["iconutil", "-c", "icns", str(OUT_DIR), "-o", str(OUT_ICNS)], check=True)

print("앱 번들에 복사 중...")
shutil.copy(OUT_ICNS, BUNDLE_ICNS)

# Dock 캐시 갱신
subprocess.run(["touch", str(BASE / "Game Data Studio.app")], check=False)

print("완료!")
