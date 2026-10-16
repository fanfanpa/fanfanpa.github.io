# 代码现场绘制的作品页（4 / 18）

目录里只有 `index.html` + `thumb.jpg`，**没有原图** —— 图是每次打开现画的。
库从 CDN 动态 `import()`，不本地打包（用户的知情选择，见 CLAUDE.md）。

## 现有四个，各代表一种画法

| 页面 | 入口 | 画法 |
|---|---|---|
| [works/2025-11/grid-world/](../../../../works/2025-11/grid-world/) | `renderPlot` | 笔记本规格原样搬，`Plot.plot()` 出 SVG（1100×850；唯一用了 webfont 的页） |
| [works/2025-11/crayfish-production-2015-2024/](../../../../works/2025-11/crayfish-production-2015-2024/) | `renderPlot` + `createScrubber` | 两张 Plot 图拼 composite，`.work-plot__frame` + `--plot-scale` 整体 transform 缩放 |
| [works/2026-03/armadillo-earth/](../../../../works/2026-03/armadillo-earth/) | `renderD3` | 现场建 `<canvas>`，按 dpr 放大，每帧 `d3.geoPath(proj, ctx)` 重投影 |
| [works/2026-06/covering-square/](../../../../works/2026-06/covering-square/) | `renderD3` | `d3.create('svg')` 手搓 SVG ＋ 自实现箭头插件 |

新的一页通常最像其中一个。**先把那一个读一遍再动手**，比读这份文档管用。

## 外壳：从 armadillo-earth 复制

head 多两样：`<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>`、
一段 `<noscript><style>` 撤销为图预留的高度。body 里：

```html
<main class="wrap work work--fit" style="--plot-ratio: 1.6181">   <!-- 横图才写 --plot-ratio -->
  <a class="back" href="../../../index.html#works">← All work</a>
  <h1>…</h1>

  <div class="work-plot" id="plot" aria-busy="true" style="--plot-w: 1000; --plot-h: 618">
    <p class="work-plot__note">英文兜底文字：画的是什么、什么画法。图上写英文。</p>
  </div>

  <!-- 动画页才有。空盒子 + 类名写在 HTML 里：控件是脚本建的，
       类名写进脚本的话，加载期间没有预留高度，控件出现时页脚会跳一下 -->
  <div class="scrubber" id="controls" role="group" aria-label="Animation controls"></div>
</main>
```

末尾是两个普通 script（`data/site.js` → `assets/js/site.js`）＋ 一个
`<script type="module">`，里面 `import` plot-work.js（要播放条再 import
scrubber.js）。**d3 / Plot 的 CDN 地址写在 `assets/js/plot-work.js` 里，
页面里不要出现**。

## CSS 契约（`assets/css/style.css` 第 7 节）

- `.work-plot { aspect-ratio: var(--plot-w) / var(--plot-h) }` —— 预留高度。
  **脚本里的宽高必须和 style 上那组数字是同一组**，否则加载期间占的位置和
  画出来的对不上，页面会跳。
- `.work-plot svg, .work-plot canvas { display: block; width: 100%; height: auto }`
  —— svg 有 viewBox、canvas 有 width/height 属性，浏览器自己按它算比例，
  所以两者都只需要给固有尺寸，不用自己算缩放。
- 失败时（`data-state="failed"`）：撤掉预留高度、露出 `__note`、隐藏后面的
  `.scrubber`。`assets/js/site.js` 还有一条 15 秒超时兜底。
- **`.work--fit` 是「一屏」的意思**：滚到小标题之后，图＋控件占满一屏高
  （不是从页面顶部算起）。它把宽度收成
  `min(100%, max(320px, (100svh - 72px) * var(--plot-ratio, 1)))`，
  72 = 16px 间距 + 44px 控件行 + 12px 到底。
  `--plot-ratio` 只有**横图**在 `<main>` 上行内写（宽/高）；正方形页不写，
  默认 1，算式退化成原来的样子。

## 行为约定

- **`prefers-reduced-motion: reduce`**：不自动播、只画一帧（信息最全的那一帧），
  **但用户点了 Play 就一定播** —— 系统设置不该改用户的主意。站里所有动画页
  都是这条，`assets/js/scrubber.js` 里写着理由。
- **失败兜底**：远程取数/取库挂了要落到 `data-state="failed"`，别留一块空白。
- **数据**：小数据（一两 KB 的 CSV）直接内联进 HTML —— 用户定过
  「将 csv 数据直接写进 html 中，不要复制文件了」；大数据（geojson 之类）
  运行时远程取。用过并且能用的源：`gicentre.github.io/data/world/…`、
  `unpkg.com/visionscarto-world-atlas@0.0.6/…`。
- **canvas 页**：`canvas.width = w * dpr` 之后 `context.setTransform(dpr,0,0,dpr,0,0)`，
  之后一律按用户坐标写。挂 `role="img"` + `aria-label`（SVG 那几页是 Plot 帮它们加的）。
  再挂一个 resize 监听比较 `devicePixelRatio`，变了才重建后备存储并重画
  （armadillo 补的那条，别漏）。

## 忠实移植（笔记本 → 模块）

这是这类活的核心，用户要的是**同一张图**，不是「重画一张差不多的」：

1. 逐字搬。每一步都照着笔记本的顺序来，包括它的默认值（比如
   `d3.geoProjection` 的默认 scale 150 —— 笔记本没写 `.scale()`，页面里
   也别补）。
2. 允许的改动只有语法噪音：`let`→`const`、双引号→单引号、下划线命名→驼峰、
   带 `d3.` 前缀换成解构。**算式一个符号都别动。**
3. 每一处非噪音改动，都在注释里写清「改了什么、为什么」—— 现有页面的
   注释密度就是这么来的（「一行没改」这种话要写准确，改了就得说）。
4. 拿参考截图量化验一遍再收工：整幅的 bbox、或按网格比陆地掩膜算 IoU，
   别靠肉眼说「看着一样」。
5. 参考图是移植用的脚手架，用完删掉 —— 留着会让 `compress.py` 每次报一条
   「有原图但页面里没有 `<img>`」。**注意：删用户放进仓库的文件会被权限拦，
   先问一句，或移到仓库外**。
6. 笔记本里的交互（拖拽之类）如果记录里没有那个 cell，就别发明；
   动手前先问用户要不要。
