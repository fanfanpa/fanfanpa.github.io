"""
生成卡片缩略图。

把整张作品等比缩放后放进 300x200 的画布居中，不足的部分填白 ——
所以竖版作品不会被裁掉，横版作品也不会被拉伸变形。

输出默认是 300x200 的 2 倍图（600x400），这样在高分屏上不会发虚。

用法：
    python tools/mkthumb.py <源图> [目标图]

例子：
    python tools/mkthumb.py "works/潜江城市公交路线图/潜江城市公交路线.png"
    # 默认输出到同目录的 thumb.jpg

    python tools/mkthumb.py 原图.png works/某作品/thumb.jpg 900 600 90
    # 自定义输出路径、尺寸、质量

需要 Pillow：pip install Pillow
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("需要 Pillow，请先运行：pip install Pillow")


def flatten(im):
    """把带透明通道的图合成到白底上。"""
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        return bg
    return im.convert("RGB")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)

    src = Path(sys.argv[1])
    if not src.exists():
        sys.exit(f"找不到源图：{src}")

    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else src.with_name("thumb.jpg")
    W = int(sys.argv[3]) if len(sys.argv) > 3 else 600
    H = int(sys.argv[4]) if len(sys.argv) > 4 else 400
    quality = int(sys.argv[5]) if len(sys.argv) > 5 else 88

    im = flatten(Image.open(src))

    # min() = 等比缩放到「刚好能完整放进画布」（contain）
    scale = min(W / im.width, H / im.height)
    fg = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)

    canvas = Image.new("RGB", (W, H), (255, 255, 255))
    canvas.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2))
    canvas.save(dst, "JPEG", quality=quality, optimize=True, progressive=True)

    before = src.stat().st_size / 1024
    after = dst.stat().st_size / 1024
    px = (W - fg.width) // 2, (H - fg.height) // 2

    print(f"{src}")
    print(f"  {im.width}x{im.height}  ->  图 {fg.width}x{fg.height} 居中于 {W}x{H}")
    print(f"  留白 左右 {px[0]}px / 上下 {px[1]}px")
    print(f"  {before:.0f}K  ->  {after:.0f}K   {dst}")


if __name__ == "__main__":
    main()
