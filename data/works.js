/* =============================================================
   作品清单 —— 这是你唯一需要经常编辑的文件。

   新增一个作品：复制下面任意一段 { ... }，改掉里面的值即可。
   首页的年份分组、卡片网格和标签筛选按钮都会自动更新，不用碰 HTML。

   字段说明（带 * 的是必填）：
     title *  作品名。卡片上不显示文字，鼠标悬停时以提示的方式出现
     date  *  完成时间，写成 "2026-09"。只要年份就写 "2026"
     href  *  作品页面地址。推荐做成独立目录，如 "works/china-migration/"
              以 / 结尾时，app.js 会自动补上 index.html，
              这样本地双击打开（file:// 协议）也不会报错。
     thumb    缩略图路径。建议做成 300x200 的 2 倍图（600x400），
              留空或路径写错都会自动显示占位块
     tags     标签数组，会自动变成顶部的「筛选按钮」

   排序：不用手动排。app.js 会自动按年份倒序分组、
          同一年内按月倒序，最新的永远在最前面。
   ============================================================= */

window.WORKS = [

  {
    title: '潜江城市公交路线图',
    date:  '2026-09',
    href:  'works/潜江城市公交路线图/',
    thumb: 'works/潜江城市公交路线图/thumb.jpg',
    tags:  ['专题地图']
  },

  {
    title: 'Orthographic Projection Centered at a Specific Latitude',
    date:  '2025-10',
    href:  'works/Orthographic Projection Centered at a Specific Latitude/',
    thumb: 'works/Orthographic Projection Centered at a Specific Latitude/thumb.jpg',
    tags:  ['地图投影']
  },

  {
    title: 'Map of Bioko Island',
    date:  '2025-09',
    href:  'works/Map of Bioko Island/',
    thumb: 'works/Map of Bioko Island/thumb.jpg',
    tags:  ['普通地图']
  },

  {
    title: 'Plan Oblique Relief of South China Sea',
    date:  '2025-09',
    href:  'works/Plan Oblique Relief of South China Sea/',
    thumb: 'works/Plan Oblique Relief of South China Sea/thumb.jpg',
    tags:  ['普通地图']
  },

  {
    title: 'PLANISPHERE',
    date:  '2025-09',
    href:  'works/planisphere/',
    thumb: 'works/planisphere/thumb.jpg',
    tags:  ['普通地图']
  },

  {
    title: '高中',
    date:  '2025-04',
    href:  'works/手绘高中/',
    thumb: 'works/手绘高中/thumb.jpg',
    tags:  ['专题地图']
  },

  {
    title: '小学&初中',
    date:  '2025-04',
    href:  'works/手绘小学初中/',
    thumb: 'works/手绘小学初中/thumb.jpg',
    tags:  ['专题地图']
  },

  {
    title: '1982 仙桃镇地图',
    date:  '2025-04',
    href:  'works/1982 仙桃镇地图/',
    thumb: 'works/1982 仙桃镇地图/thumb.jpg',
    tags:  ['普通地图']
  }

];
