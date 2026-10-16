# 图片作品页（14 / 18）

页面里就是一张 `<img>`。不用 `<figure>`、不用 `<figcaption>`、没有控件 ——
全仓库 `works/` 下这两样是 0 命中。

## 模板：整份复制，只改四处

以 [works/2026-09/qianjiang-bus-route/index.html](../../../../works/2026-09/qianjiang-bus-route/index.html)
为准。14 个图片页都是这一份逐字复制出来的，正好 75 行，只有四处不同：

| # | 位置 | 改成 |
|---|---|---|
| 1 | `<title>` | 作品名 |
| 2 | `<meta name="description" content="…">` | 一句话英文描述 |
| 3 | `<h1>` | 作品名（和 title 一致） |
| 4 | `<img …>` | src / width / height / alt |

其余一律不动：head 的 `charset` / `viewport` / stylesheet / `<link rel="icon" href="data:,">`
（空 favicon，防 404）、`<header class="site-header">`（含四个内联 SVG 社交图标，
`href="#"` 由 `assets/js/site.js` 运行时填）、`<main class="wrap work">`、
`<a class="back" href="../../../index.html#works">← All work</a>`、footer、
末尾两个 script（顺序：`data/site.js` → `assets/js/site.js`）。

注意 `<main>` 上没有 `work--fit` —— 那是代码页才有的。

## `<img>` 的写法是硬约束

```html
    <!-- 直接引用原图。width/height 写的是原始像素尺寸，
         浏览器能在图片加载完成前就留好位置，避免页面跳动。 -->
    <img src="qianjiang-bus-route.jpg" width="2480" height="3508"
         alt="Qianjiang city bus route map: a portrait-format schematic in which routes are color-coded by number and stop names run along each line, with the route legend at the lower right and a compass rose at the upper right.">
```

`tools/compress.py` 用这条正则定位它：

```python
IMG_RE = re.compile(r'<img\s+src="[^"]*"\s+width="(\d+)"\s+height="(\d+)"\s*\n(\s+)alt="([^"]*)">')
```

也就是：**属性顺序必须是 src → width → height →（换行＋缩进）→ alt**，
`alt` 必须在下一行。写歪了脚本会报 `[!] 没找到预期格式的 <img>，跳过以免改坏页面`。

`alt` 就是这张图的门面：写一句完整英文，说清画的是什么、什么画法，
不要写「图片」「地图」这种。

## 流程

```
1. 建目录 works/<YYYY-MM>/<slug>/，把原图丢进去（文件名随意，可以是中文、
   可以是 .png；压缩那步会把它规范成 <slug>.jpg）
2. 复制模板 → index.html，改四处。img 的 width/height 先写原图的真实像素尺寸
3. python tools/mkthumb.py "…/<原图>"        → thumb.jpg（600×400）
4. python tools/compress.py                   → 看清楚预览（一个字节都不写）
   python tools/compress.py --apply           → 压成 JPEG q85、改名成 <slug>.jpg、
                                                同步改写页面里的 src/width/height
5. data/works.js 加一条（见 SKILL.md 第 5 步）
```

compress.py 行为要点（别自己发明替代流程）：

- **默认预览，`--apply` 才写**。JPEG 有损，这一步不可逆。
- 压完反而更大就保留原图，`--` 那行会说明原因。
- 新文件写成功之后才删原图；扩展名变了才删。
- `dst` 固定是 `工作目录/<slug>.jpg`，页面里的 src 会被改成它。
- `--apply` 的收尾会全仓检查：所有页面 `<img src>` 指得到文件、`works/*/*/*`
  下没有残留的非 jpg 原图。看到 `[!]` 就得处理，别提交。
- 别加 `--max-width`（默认不缩尺寸）：网页最宽显示 1080 CSS px，但缩了就不能
  放大看细节，用户没要就别动。
- 别用 `-q` 改质量。**统一 q85 是用户定过的**。
- 它在 Windows 中文控制台上做过 GBK 兼容（`※` 不写 `⚠`、输出降级成 `?`），
  看到 `?` 是正常的，不是坏了。
