# 代码现场绘制的作品页（4 / 18）

目录里只有 `index.html` + `thumb.jpg`，**没有原图** —— 图是每次打开现画的。
库从 CDN 动态 `import()`，不本地打包（用户的知情选择，见 CLAUDE.md）。

其中三页的绘图代码已经抽到 `assets/js/works/`，作品页和首页现场缩略图共用
同一份模块；grid-world 仍然是页面内联。**要上首页现场缩略图的画法必须写成
共享模块**，不要在 `home-thumbs.js` 里再抄一份。

## 现有四个，各代表一种画法

| 页面 | 入口 | 画法 |
|---|---|---|
| [works/2025-11/grid-world/](../../../../works/2025-11/grid-world/) | 页面内联 `renderPlot` | 笔记本规格原样搬，`Plot.plot()` 出 SVG（1100×850；唯一用了 webfont 的页） |
| [works/2025-11/crayfish-production-2015-2024/](../../../../works/2025-11/crayfish-production-2015-2024/) | `assets/js/works/crayfish-production.js` → `mountCrayfish` | 两张 Plot 图拼 composite，`.work-plot__frame` + `--plot-scale` 整体 transform 缩放 |
| [works/2026-03/armadillo-earth/](../../../../works/2026-03/armadillo-earth/) | `assets/js/works/armadillo.js` → `mountArmadillo` | 现场建 `<canvas>`，按 dpr 放大，每帧 `d3.geoPath(proj, ctx)` 重投影 |
| [works/2026-06/covering-square/](../../../../works/2026-06/covering-square/) | `assets/js/works/covering-square.js` → `mountCoveringSquare` | `d3.create('svg')` 手搓 SVG ＋ 自实现箭头插件 |

新的一页通常最像其中一个。只上作品页、不需要现场缩略图时，照 grid-world
把 build 内联在页面里最省事；要上首页就必须写成共享模块（见下一节）。
**先把最像的那个读一遍再动手**，比读这份文档管用。

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
`<script type="module">`。共享模块的页面只负责把容器和控件交出去：

```js
import { mountArmadillo } from '../../../assets/js/works/armadillo.js';

mountArmadillo(document.getElementById('plot'), {
  controls: document.getElementById('controls'),
});
```

只上作品页、没有共享模块的图，也可以直接 `import` plot-work.js 里的
`renderD3` / `renderPlot`，在页面里写 build（grid-world 就是这样）。
**d3 / Plot 的 CDN 地址和加载壳都在 `assets/js/plot-work.js` 里，页面和
共享模块里都不要出现。**

## 共享模块（要上首页现场缩略图时）

模块放在 `assets/js/works/<slug>.js`，导出 `mountX(container, options)`。
作品页和 `assets/js/home-thumbs.js` 调的是同一个函数，只是参数不同：

| 模块 | 导出 | 作品页 | 首页缩略图 |
|---|---|---|---|
| `armadillo.js` | `mountArmadillo` | 默认 | `unit: 0.6`, `crop: true` |
| `covering-square.js` | `mountCoveringSquare` | 默认 | `loop: true`, `loopDelay: 1500`, `maxFps: 30` |
| `crayfish-production.js` | `mountCrayfish` | 默认 | `fit: 'contain'` |

共同约定：

- `controls`：作品页把控件容器传进去；缩略图不传（只保留确实需要复用的
  定时器，控件不挂进 DOM）。
- `observe`：传了元素就听它进出视口（缩略图传卡片）；作品页不传，进页面
  就播。
- `autoplay` 默认 `true`；是否自动播放、减弱动态效果怎么静下来，都由模块
  自己判断。
- 返回 `Promise<controller|null>`。**resolve 之前第一帧必须已经画好**，
  首页才敢把静态图藏掉。controller 有 `play()`、`pause()`、`destroy()`；
  `destroy()` 要收掉定时器、rAF、IntersectionObserver、resize / 媒体查询
  监听和脚本建的按钮，并清空容器。
- 失败时返回 `null`，别让错误穿到首页：静态 JPEG 还顶在那里。

首页接线三件事，缺一不可：

1. `data/works.js` 的条目写 `liveThumb: '<key>'`；
2. `assets/js/home-thumbs.js` 的 `VIEWS` 里把 key 指到 `mountX`；
3. `thumb.jpg` 照常出。现场图只是叠加层，加载前、`prefers-reduced-motion`
   和任何失败路径都显示它。

## CSS 契约（`assets/css/style.css` 第 7 节）

- `.work-plot { aspect-ratio: var(--plot-w) / var(--plot-h) }` —— 预留高度。
  **脚本里的宽高必须和 style 上那组数字是同一组**，否则加载期间占的位置和
  画出来的对不上，页面会跳。
- `.work-plot svg, .work-plot canvas { display: block; width: 100%; height: auto }`
  —— svg 有 viewBox、canvas 有 width/height 属性，浏览器自己按它算比例，
  所以两者都只需要给固有尺寸，不用自己算缩放。
- 失败时（`data-state="failed"`）：撤掉预留高度、露出 `__note`、隐藏后面的
  `.scrubber`。`assets/js/site.js` 还有一条 15 秒超时兜底。
- 首页现场缩略图的外层规则是 `.card__live` / `.card.is-live`。**`.card__live > svg`
  只选直接子 SVG**：小龙虾的 Plot SVG 嵌在 frame / bars / line 里面，
  改成后代选择器会把它们也拉成 100%。
- **`.card__live` 上的 `color: var(--fg)` 别删**：卡片本身是 `<a>`，默认
  颜色是链接蓝；Plot 的标题、D3 轴的刻度和标签都吃 `currentColor`，不拦
  就会整片变蓝（作品页里它们是黑的）。
- **`.work--fit` 是「一屏」的意思**：滚到小标题之后，图＋控件占满一屏高
  （不是从页面顶部算起）。它把宽度收成
  `min(100%, max(320px, (100svh - 72px) * var(--plot-ratio, 1)))`，
  72 = 16px 间距 + 44px 控件行 + 12px 到底。
  `--plot-ratio` 只有**横图**在 `<main>` 上行内写（宽/高）；正方形页不写，
  默认 1，算式退化成原来的样子。

## 行为约定

- **`prefers-reduced-motion: reduce`**：作品页不自动播、停在信息最全的那一帧
  （Armadillo 是第一帧，Covering 先算到终点，Crayfish 停在 2024），**但用户
  点了 Play 就一定播** —— 系统设置不该改用户的主意。站里所有动画页都是
  这条，`assets/js/scrubber.js` 里写着理由。首页则整页不挂现场缩略图，
  静态 JPEG 就是最终形态。
- **失败兜底**：远程取数/取库挂了要落到 `data-state="failed"`，别留一块空白。
  首页缩略图失败时把 `.card__live` 整层删掉，继续显示静态 JPEG。
- **数据**：小数据（一两 KB 的 CSV）直接内联进绘图脚本（2026 起是
  `assets/js/works/` 里的模块，例如 crayfish 的 `CSV_TEXT`）—— 用户定过
  「将 csv 数据直接写进 html 中，不要复制文件了」；大数据（geojson 之类）
  运行时远程取。用过并且能用的源：`gicentre.github.io/data/world/…`、
  `unpkg.com/visionscarto-world-atlas@0.0.6/…`。
- **canvas 页**：`canvas.width = w * dpr` 之后 `context.setTransform(dpr,0,0,dpr,0,0)`，
  之后一律按用户坐标写。挂 `role="img"` + `aria-label`（SVG 那几页是 Plot 帮它们加的）。
  再挂一个 resize 监听比较 `devicePixelRatio`，变了才重建后备存储并重画
  （armadillo 模块里那条，别漏；缩略图的 `unit` / `crop` 也要一起算进后备尺寸）。

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
