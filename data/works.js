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
    title: 'Qianjiang City Bus Route Map',
    date:  '2026-09',
    href:  'works/2026-09/qianjiang-bus-route/',
    thumb: 'works/2026-09/qianjiang-bus-route/thumb.jpg',
    tags:  ['Thematic Map']
  },

  {
    title: 'World Grid Map',
    date:  '2025-11',
    href:  'works/2025-11/grid-world/',
    thumb: 'works/2025-11/grid-world/thumb.jpg',
    tags:  ['General Map']
  },
  
  {
    title: 'Power Plants of China',
    date:  '2025-11',
    href:  'works/2025-11/china-power-plants/',
    thumb: 'works/2025-11/china-power-plants/thumb.jpg',
    tags:  ['Thematic Map']
  },

  {
    title: 'Electric Scooter Accessibility in Beijing',
    date:  '2025-11',
    href:  'works/2025-11/accessibility/',
    thumb: 'works/2025-11/accessibility/thumb.jpg',
    tags:  ['Thematic Map']
  },

  {
    title: 'Aosen South Park Running Trail',
    date:  '2025-11',
    href:  'works/2025-11/running-route/',
    thumb: 'works/2025-11/running-route/thumb.jpg',
    tags:  ['Thematic Map']
  },

  {
    title: 'China’s Crayfish Production and Exports, 2024',
    date:  '2025-11',
    href:  'works/2025-11/crayfish-production-exports-2024/',
    thumb: 'works/2025-11/crayfish-production-exports-2024/thumb.jpg',
    tags:  ['Thematic Map']
  },

  {
    title: 'Hubei’s Crayfish Exports, 2024',
    date:  '2025-11',
    href:  'works/2025-11/hubei-crayfish-exports-2024/',
    thumb: 'works/2025-11/hubei-crayfish-exports-2024/thumb.jpg',
    tags:  ['Thematic Map']
  },

  {
    title: 'CMYK Dots for Relief Representation',
    date:  '2025-11',
    href:  'works/2025-11/cmyk-dots-relief-representation/',
    thumb: 'works/2025-11/cmyk-dots-relief-representation/thumb.jpg',
    tags:  ['General Map']
  },

  {
    title: 'Orthographic Projection Centered at a Specific Latitude',
    date:  '2025-10',
    href:  'works/2025-10/orthographic-projection/',
    thumb: 'works/2025-10/orthographic-projection/thumb.jpg',
    tags:  ['Map Projection']
  },

  {
    title: 'Map of Bioko Island',
    date:  '2025-09',
    href:  'works/2025-09/bioko-island/',
    thumb: 'works/2025-09/bioko-island/thumb.jpg',
    tags:  ['General Map']
  },

  {
    title: 'Plan Oblique Relief of South China Sea',
    date:  '2025-09',
    href:  'works/2025-09/south-china-sea-relief/',
    thumb: 'works/2025-09/south-china-sea-relief/thumb.jpg',
    tags:  ['General Map']
  },

  {
    title: 'Planisphere',
    date:  '2025-09',
    href:  'works/2025-09/planisphere/',
    thumb: 'works/2025-09/planisphere/thumb.jpg',
    tags:  ['General Map']
  },

  {
    title: 'My High School and Surroundings',
    date:  '2025-04',
    href:  'works/2025-04/my-high-school/',
    thumb: 'works/2025-04/my-high-school/thumb.jpg',
    tags:  ['Thematic Map']
  },

  {
    title: 'My Primary and Middle Schools and Their Surroundings',
    date:  '2025-04',
    href:  'works/2025-04/my-primary-middle-school/',
    thumb: 'works/2025-04/my-primary-middle-school/thumb.jpg',
    tags:  ['Thematic Map']
  },

  {
    title: '1982 Xiantao Town Map',
    date:  '2025-04',
    href:  'works/2025-04/xiantao-1982/',
    thumb: 'works/2025-04/xiantao-1982/thumb.jpg',
    tags:  ['General Map']
  }

];
