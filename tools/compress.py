"""
把 works/ 下的原图统一压成 JPEG，替换原图，并同步改掉页面里的引用。

只有 index.html 和 thumb.jpg、压根没有原图的目录（代码现场画图的作品页）
会安静跳过，不计入问题数。

每张图做四件事：
  1. 合成到白底（去掉透明通道），存成 JPEG
  2. 如果压完反而比原来大，就保留原图不动 —— 压缩不该让仓库变大
  3. 新文件写成功之后才删原图（扩展名变了才会删）
  4. 改同目录 index.html 里的 <img src>，否则页面会指向一个已经不存在的文件

⚠ JPEG 是有损的，这一步不可逆：像素的「数量」不变，但「值」会被重写。
  已经提交过的图能从 git 历史里捞回来（git checkout <commit> -- <路径>），
  没提交过的找不回来。所以不加 --apply 时只预览，一个字节都不写。

用法：
    python tools/compress.py                    # 预览
    python tools/compress.py --apply            # 执行
    python tools/compress.py -q 92              # 质量，默认 85
    python tools/compress.py --keep-jpeg        # 本来就是 jpg 的不动
    python tools/compress.py --max-width 2160   # 顺便缩尺寸，默认不缩

缩尺寸是省空间的大头（网页最宽只显示 1080 CSS 像素），但它会让图不能再
放大看细节，所以默认关着，要的时候显式打开。
"""

import io
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit('需要 Pillow，请先运行：pip install Pillow')

# 原图目录里除了这两个，剩下的那个就是原图
SKIP_NAMES = ('index.html', 'thumb.jpg')

# 认得出的图片后缀。目录里可能一个原图都没有（代码现场画图的作品页），
# 也可能放了数据文件；这些都不能当原图 —— Image.open 拿到非图片会直接崩
IMG_SUFFIXES = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp',
                '.tif', '.tiff', '.avif')


def flatten(im):
    """把带透明通道的图合成到白底上。和 tools/mkthumb.py 保持一致的规则。"""
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        bg = Image.new('RGB', im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        return bg
    return im.convert('RGB')


def arg(flag, default=None, cast=str):
    if flag in sys.argv:
        i = sys.argv.index(flag)
        if i + 1 >= len(sys.argv):
            sys.exit(f'{flag} 后面要跟一个值')
        return cast(sys.argv[i + 1])
    return default


def mb(n):
    return n / 1024 / 1024


apply = '--apply' in sys.argv
quality = arg('-q', 85, int)
max_width = arg('--max-width', 0, int)
keep_jpeg = '--keep-jpeg' in sys.argv
root = Path(arg('--root', '.')).resolve()

print(f'{"执行" if apply else "预览（加 --apply 才真正执行）"}   '
      f'质量 {quality}   '
      f'{"缩到 " + str(max_width) + "px 宽" if max_width else "不改尺寸"}   '
      f'{"跳过已有 jpg" if keep_jpeg else "含已有 jpg 一并重压"}\n')

IMG_RE = re.compile(r'<img\s+src="[^"]*"\s+width="(\d+)"\s+height="(\d+)"\s*\n(\s+)alt="([^"]*)">')

rows = []
problems = 0

for page in sorted(root.glob('works/*/*/index.html')):
    work_dir = page.parent
    slug = work_dir.name
    assets = [f for f in work_dir.iterdir()
              if f.is_file()
              and f.name not in SKIP_NAMES
              and f.suffix.lower() in IMG_SUFFIXES]

    if not assets:
        # 目录里根本没有图片：这一页是代码现场画出图来的（或者图还没放），
        # 不是错误，安静跳过
        print(f'  --  {slug:<34} 没有原图，跳过')
        continue

    if len(assets) != 1:
        print(f'  [!] {work_dir.relative_to(root)}: 有 {len(assets)} 个候选原图，跳过')
        problems += 1
        continue

    src = assets[0]
    before = src.stat().st_size
    already_jpeg = src.suffix.lower() in ('.jpg', '.jpeg')

    if already_jpeg and keep_jpeg:
        print(f'  --  {slug:<34} 本来就是 jpg，按 --keep-jpeg 跳过')
        continue

    try:
        im = flatten(Image.open(src))
    except Exception as e:              # 后缀像图片但内容不是，或者文件坏了
        print(f'  [!] {slug:<34} 读不了 {src.name}：{e}')
        problems += 1
        continue

    orig_size = im.size
    if max_width and im.width > max_width:
        im = im.resize((max_width, round(im.height * max_width / im.width)), Image.LANCZOS)

    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=quality, optimize=True, progressive=True)
    data = buf.getvalue()
    after = len(data)

    if after >= before:
        print(f'  --  {slug:<34} 压完 {mb(after):.2f}MB ≥ 原图 {mb(before):.2f}MB，保留原图')
        rows.append((slug, src.name, before, before, im.size, orig_size, already_jpeg, 'skip'))
        continue

    dst = work_dir / f'{slug}.jpg'
    note = []
    if already_jpeg:
        note.append('二次压缩')
    if im.size != orig_size:
        note.append(f'{orig_size[0]}px→{im.size[0]}px')

    # 改页面里的 <img>。尺寸变了的话 width/height 也要跟着改，
    # 否则浏览器会按错的宽高比预留位置。
    raw = page.read_text(encoding='utf-8')
    m = IMG_RE.search(raw)
    if not m:
        print(f'  [!] {slug:<34} index.html 里没找到预期格式的 <img>，跳过以免改坏页面')
        problems += 1
        continue
    new_tag = (f'<img src="{dst.name}" width="{im.width}" height="{im.height}"\n'
               f'{m.group(3)}alt="{m.group(4)}">')

    if apply:
        dst.write_bytes(data)                    # 先写新的
        if dst != src:
            src.unlink()                         # 新的落地了才删旧的
        page.write_text(raw[:m.start()] + new_tag + raw[m.end():], encoding='utf-8')

    print(f'  ok  {slug:<34} {mb(before):>6.2f}MB → {mb(after):>6.2f}MB '
          f'({after / before * 100:>3.0f}%)  {src.name} → {dst.name}'
          f'{"  [" + "、".join(note) + "]" if note else ""}')
    rows.append((slug, src.name, before, after, im.size, orig_size, already_jpeg, 'ok'))

# ---------------- 汇总 ----------------
print()
total_before = sum(r[2] for r in rows)
total_after = sum(r[3] for r in rows)
print(f'  合计 {len(rows)} 张   {mb(total_before):.1f}MB → {mb(total_after):.1f}MB '
      f'（省 {mb(total_before - total_after):.1f}MB，{100 - total_after / total_before * 100:.0f}%）')

second_gen = [r[0] for r in rows if r[6] and r[7] == 'ok']
if second_gen:
    print(f'\n  ⚠ 这些原本就是 JPEG，重压是二次压缩，损失会叠加：')
    for s in second_gen:
        print(f'      {s}')

# ---------------- 收尾检查：所有引用还指得到文件吗 ----------------
if apply:
    print()
    missing = 0
    for page in sorted(root.glob('works/*/*/index.html')):
        s = page.read_text(encoding='utf-8')
        m = re.search(r'<img\s+src="([^"]*)"', s)
        if m and not (page.parent / m.group(1)).is_file():
            print(f'  [!] {page.relative_to(root)} 指向的 {m.group(1)} 不存在')
            missing += 1
    # 只看图片后缀：作品目录里放数据文件（.csv/.js 之类）是正常的，不该报警
    extra = [f for f in root.glob('works/*/*/*')
             if f.is_file() and f.name not in SKIP_NAMES
             and f.suffix.lower() in IMG_SUFFIXES
             and f.suffix.lower() not in ('.jpg', '.jpeg')]
    for f in extra:
        print(f'  [!] 残留的非 jpg 原图：{f.relative_to(root)}')
    print(f'  引用检查：{"全部有效 ✓" if not missing else str(missing) + " 处失效"}')

print(f'\n  {"已写入" if apply else "预览结束，未改动任何文件"}   问题: {problems}')
