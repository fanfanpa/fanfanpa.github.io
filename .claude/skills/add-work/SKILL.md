---
name: add-work
description: 往 fanfanpa.github.io 作品集里加一个新作品——用户画好的成图，或者要移植成代码现场绘制的 Observable 笔记本。包含建目录、写页面、出缩略图、登记 data/works.js、跑浏览器回归套件、提交推送。用户说「加个新作品 / 新成果 / 把这张图（这个笔记本）放上去」时用它。
---

# 加一个新作品

站点是纯静态、无构建步骤，从 `main` 分支直接发布。加一个作品＝两个新文件
（`index.html` + `thumb.jpg`）＋ `data/works.js` 里加一条。首页的年份分组、
卡片网格、标签筛选按钮全是 `assets/js/app.js` 现算的，**不用碰任何 HTML/JS/CSS**。

硬规矩（许可证、水印、JPEG 画质、CDN import、推送走代理）都在仓库根的
[CLAUDE.md](../../../CLAUDE.md)，先读它，这里不重复。

> 这两个文件会被线上站点原样提供（仓库有 `.nojekyll`，点目录也照发），
> 只写可以公开的东西。

## 第 0 步：判断是哪一类

|  | 图片作品（现有 14 个） | 代码现场绘制（现有 4 个） |
|---|---|---|
| 素材 | 一张画好的位图（QGIS / Illustrator 出的） | Observable 笔记本，或一段绘图代码 |
| 页面里 | 一张 `<img>` | `<div class="work-plot">` + `<script type="module">` |
| 目录里 | `index.html` · `<slug>.jpg` · `thumb.jpg` | `index.html` · `thumb.jpg`（**没有原图**） |
| 参照页 | [works/2026-09/qianjiang-bus-route/](../../../works/2026-09/qianjiang-bus-route/) | [works/2026-03/armadillo-earth/](../../../works/2026-03/armadillo-earth/)、[works/2026-06/covering-square/](../../../works/2026-06/covering-square/) |
| 规程 | [references/page-image.md](references/page-image.md) | [references/page-code.md](references/page-code.md) |

拿不准就问一句：这张图是**你自己画好的成图**，还是要**在浏览器里现画**？
（现画的必须移植成 JS —— 笔记本不能直接嵌进这个站。）

## 第 1 步：建目录

```
works/<YYYY-MM>/<slug>/     ← 必须正好两层，别再加一层
```

两层是硬约束：`tools/compress.py` 按 `works/*/*/index.html` 扫，站内所有相对
路径都是 `../../../`。`<YYYY-MM>` 是完成时间（只到年也行，写 `2026`），
`<slug>` 是小写连字符英文，和目录同名的那张图就是原图。

## 第 2 步：问清元数据（一次问齐，别一条一条问）

**全站页面文字是英文的** —— `lang="en"`，title / description / alt / h1 /
按钮文案全英文。用户说中文，但成品里不能出现中文（页面里的中文注释除外，
那是给未来的自己看的，现有页面里就有）。

- title —— 英文短名，卡片上不显示文字，靠悬停提示
- date —— `2026-10` 这种
- tags —— 现有只有四种，优先复用：`Thematic Map`(8) · `General Map`(6) ·
  `Map Projection`(2) · `Animation`(2)。填新词也行，它自动变成筛选按钮
- 一句话描述 —— 同时进 `<meta name="description">` 和图的 `alt`／代码页的
  `__note` 兜底文字（两处措辞可以不同，但都得说清画的是什么）

代码页还要多问三个（armadillo 那次就是这么定的）：

1. **画面范围** —— 照笔记本整块画布，还是裁到主体？
2. **数据来源** —— 运行时从 CDN/远程取，还是内联进页面？（小数据内联是
   既定偏好：「将 csv 数据直接写进 html 中，不要复制文件了」）
3. **控件** —— 不要 / 只有 Play-Pause / 完整播放条（`createScrubber`）

## 第 3 步：写页面

细活见两个 references。两条最容易踩的：

- **图片页**：从 [works/2026-09/qianjiang-bus-route/index.html](../../../works/2026-09/qianjiang-bus-route/index.html)
  整份复制，只改 title、description、h1、img 四处。**`<img>` 那两行的排布
  一个字都不能动**（src → width → height 换行 → 缩进 → alt），
  `tools/compress.py` 的正则逐字依赖它。
- **代码页**：从 [works/2026-03/armadillo-earth/index.html](../../../works/2026-03/armadillo-earth/index.html)
  复制外壳（head 的 preconnect + noscript、site-header、footer、两个普通
  script），内容段照 page-code.md 的契约写。

## 第 4 步：出缩略图

```
python tools/mkthumb.py "works/2026-10/<slug>/<原图>"     # 默认 600×400，q88，输出同目录 thumb.jpg
```

代码页也一样，用一张代表帧的截图当源图。站点上 18 张 `thumb.jpg` **全是
600×400**（300×200 卡片的 2 倍图）。thumb 要进 git。

## 第 5 步：登记

`data/works.js` 数组最前面加一条（字段顺序固定 title, date, href, thumb, tags；
文件里的顺序是手工维护的「最新在前」）：

```js
  {
    title: '…',
    date:  '2026-10',
    href:  'works/2026-10/<slug>/',
    thumb: 'works/2026-10/<slug>/thumb.jpg',
    tags:  ['…']
  },
```

`href` 以 `/` 结尾 —— app.js 会自己补 `index.html`，本地双击打开也不报错。

## 第 6 步：压原图（图片作品）

```
python tools/compress.py          # 预览，一个字节都不写
python tools/compress.py --apply
```

预览里应该有这一页的 `ok <slug> … <原名> → <slug>.jpg`，结尾 **`问题: 0`**。
代码页那行是 `-- <slug> 没有原图，跳过`，正常。`[!] 没找到预期格式的 <img>`
就是第 3 步的 img 排布写歪了，回去改，别硬压。

## 第 7 步：真浏览器验一遍

必须过 HTTP 服务器（`type="module"` + CDN import 在 `file://` 下会被 CORS
拒掉）。工具在仓库外 `F:\temp\sc-test`，规程和坑见
[references/harness.md](references/harness.md)。最少要：

1. 页面画出来了、控件在、动画在跑（代码页）
2. 1280×900 / 1366×768 / 1280×700 / 900×800 下「滚过标题之后图＋控件占满
   一屏」，390px 窄屏不出横向滚动条
3. 断网兜底：`Network.setBlockedURLs` 之后显兜底文字、不留一块空白
4. **老套件 t1–t6（约 157 条）全绿** —— 动过公共 CSS/JS 的话这是重点
5. 首页：新卡片出现在对的年份分组、缩略图不糊、点得进去

## 第 8 步：提交推送

提交信息：英文祈使句标题（`Add …` / `Draw …` / `Size …`），正文用英文散文
讲清「为什么这么决定」，不加署名尾注 —— 照 `git log -5` 的样子写。

```
git -c http.proxy=http://127.0.0.1:10809 -c https.proxy=http://127.0.0.1:10809 push origin main
```

直接推 `main`（开分支就不会部署）。代理没开就先问用户，不要反复重试。

## 收尾清单

- [ ] 目录正好 `works/<YYYY-MM>/<slug>/` 两层
- [ ] 页面文字全英文
- [ ] `thumb.jpg` 600×400，进 git
- [ ] `data/works.js` 加了条目，`href` 尾斜杠，位置在数组最前
- [ ] `python tools/compress.py` 预览 `问题: 0`
- [ ] t1–t6 全绿 ＋ 这一页自己的专项探针
- [ ] `git status --short` 只有该动的那几个文件
- [ ] 推送走了代理

## 这份规程本身

它就是仓库里的一份普通 markdown，改它就是改文件再提交。三条：

- **照它走的时候发现哪一步不对、缺了，或者用户当场纠正了某个说法 —— 就在这一次里
  改掉**，跟新作品进同一次提交。别攒着，攒着的规矩慢慢就没人信了。
- 页面模板**不要抄进来**，要举例就指到具体那个作品页 —— 抄一份出来就会跟真页面
  漂移，指过去永远是真的。
- 改动为什么要改，写清楚（提交信息里说，或者就地写注释），和仓库里别处一个要求。
