/* =============================================================
   site.js — 每个页面都要跑的公共逻辑

   1. 把 data/site.js 里配置的账号地址填进顶栏图标的 href
   2. 写入页脚年份

   图标本身是直接写在 HTML 里的（而不是用 JS 生成），
   这样即使脚本没加载，顶栏也是完整的，不会有闪烁。

   链接地址统一从 data/site.js 读，改一处、全站生效。
   ============================================================= */

(function () {
  'use strict';

  var SITE = window.SITE || {};
  var social = SITE.social || {};

  // 给每个 <a data-social="github"> 填上对应地址
  document.querySelectorAll('[data-social]').forEach(function (a) {
    var url = social[a.dataset.social];
    if (url && url !== '#') {
      a.href = url;
    }
    // 没配置时保持 href="#" 原样，点一下没反应就能发现漏填
  });

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

})();
