# fanfanpa.github.io

我的个人可视化作品集。纯静态站点：没有构建步骤、没有框架、没有依赖，
推到 GitHub Pages 就能直接跑。

参考了 [jasondavies.com](https://www.jasondavies.com/) 的组织思路
（缩略图网格 + 每个作品独立目录），样式和代码是重新写的。

## 目录结构

```
.
├── index.html              首页
├── data/
│   ├── works.js            ★ 作品清单，平时最常改这个
│   └── site.js             ★ 顶栏账号链接
├── assets/
│   ├── css/style.css       全站样式（配色、卡片尺寸变量集中在顶部）
│   └── js/
│       ├── site.js         公共逻辑：填账号链接 + 页脚年份
│       ├── app.js          首页：年份分组渲染 + 标签筛选
│       └── map-viewer.js   作品页：可放大的图片查看器
├── tools/
│   └── mkthumb.py          生成 300x200 卡片缩略图
├── works/
│   ├── 1982 仙桃镇地图/
│   └── 潜江城市公交路线图/
└── .nojekyll               让 GitHub Pages 跳过 Jekyll 处理（别删）
```

## 怎么加一个新作品

**第一步：建目录**

复制一个已有的作品目录当起点，然后改里面的内容：

```bash
cp -r "works/1982 仙桃镇地图" "works/新作品名"
```

一个作品目录里通常有：

| 文件 | 说明 |
| --- | --- |
| `index.html` | 作品页。从别的作品页复制后改文案和图片路径 |
| `thumb.jpg` | 卡片缩略图，用下面的脚本生成 |
| `map-large.jpg` | 页面上显示的压缩版（大图才需要） |
| 原始文件 | 未压缩的原图，供「查看原图」链接下载 |

**第二步：生成缩略图**

```bash
python tools/mkthumb.py "works/新作品名/原图.png"
```

输出 600×400 的 `thumb.jpg`（即 300×200 的 2 倍图，高分屏不虚）。
整图等比居中、不足的部分填白，所以竖版作品不会被裁掉。
需要 Pillow：`pip install Pillow`

**第三步：登记到 `data/works.js`**

```js
{
  title: '新作品名',
  date:  '2026-09',
  href:  'works/新作品名/',
  thumb: 'works/新作品名/thumb.jpg',
  tags:  ['专题地图']
}
```

刷新页面就出现了。年份分组和标签筛选按钮都会自动更新。

## 字段说明

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | ✅ | 作品名。卡片上不显示文字，鼠标悬停时以提示的方式出现 |
| `date` | ✅ | 完成时间，写成 `2026-09`。只写 `2026` 也能认 |
| `href` | ✅ | 作品页地址，建议用独立目录 |
| `thumb` | | 缩略图路径。**留空或路径写错都会自动生成渐变占位块**，不会开天窗 |
| `tags` | | 字符串数组，自动变成顶部筛选按钮 |

## 排序规则

**不用手动排。** `app.js` 会自动按年份倒序分组、同一年内按月倒序，
最新的永远在最前面。

`date` 精确到月就写 `2026-09`；只写 `2026` 时会排在当年最后。
留空则归入「未标日期」一组，排在所有年份之后。

## 填账号链接

顶栏四个图标（微博 / X / GitHub / Observable）的地址统一在
`data/site.js` 里配置，**改一处、全站所有页面一起生效**，
不用逐页去改：

```js
window.SITE = {
  social: {
    weibo:      'https://weibo.com/u/1234567890',
    x:          'https://x.com/yourname',
    github:     'https://github.com/fanfanpa',
    observable: 'https://observablehq.com/@yourname'
  }
};
```

还没填的保持 `#`，点一下没反应就知道漏了。

## 本地预览

### 方式一：直接双击 index.html（适合随便看看）

整个站点在这个模式下都能正常浏览。为了做到这一点，有两条约定必须遵守：

**1. 站内链接一律用相对路径，不要写 `/` 开头的根路径。**

`href="/"` 在 GitHub Pages 上指向网站根目录，但本地双击打开时走的是
`file://` 协议，`/` 会解析到**磁盘根目录**（比如 C 盘），链接直接失效。

```html
<!-- ✗ 双击打开时会跳到 C 盘根目录 -->
<a href="/works/">作品</a>

<!-- ✓ 两种环境都正常 -->
<a href="works/index.html">作品</a>
```

**2. 链接要指向具体文件，不要指向目录。**

`href="works/foo/"` 在 http 服务器下能自动补成 `index.html`，
但 `file://` 下浏览器不干这事，会尝试列目录并报 `ERR_UNEXPECTED`。

不用手动加 —— `app.js` 里的 `resolveHref()` 会自动把 `data/works.js`
中以 `/` 结尾的 `href` 补全成 `index.html`，所以作品清单里照常写目录就行。

### 方式二：起本地服务器（作品要用 d3.csv 读数据时必须）

单个作品页如果要 `d3.csv()` 之类读取同目录的数据文件，
`file://` 下会被跨域策略拦掉，这时必须起服务器：

```bash
python -m http.server 8000
# 然后浏览器打开 http://localhost:8000
```

在这个模式下，上面两条约定不适用，写 `/` 根路径也能正常工作。

## 改配色和卡片尺寸

`assets/css/style.css` 顶部的「1. 设计变量」一节集中定义了所有颜色、
卡片尺寸、圆角和字体：

```css
--card-w: 300px;    /* 卡片缩略图宽 */
--card-h: 200px;    /* 卡片缩略图高 */
--accent: #2563eb;  /* 链接颜色 */
```

改 `--card-w` / `--card-h` 时记得用 `tools/mkthumb.py` 按新尺寸的
2 倍重新生成缩略图。

全站恒定浅色，没有暗色模式。

## 部署

推到 GitHub 仓库 `fanfanpa.github.io` 的 `main` 分支即可，
GitHub Pages 会自动发布到 <https://fanfanpa.github.io>。

```bash
git add .
git commit -m "更新作品集"
git push origin main
```

## 待办

- [ ] 填写 `data/site.js` 里的四个账号链接
- [ ] 把两个作品页里「关于这张图」的占位文案换成实际制作说明
- [ ] 准备一张 `og-image.png`（1200×630）用于社交分享预览
