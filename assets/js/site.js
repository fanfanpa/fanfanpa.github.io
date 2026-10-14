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

  // 代码现场绘制的作品页（.work-plot）如果迟迟没画出来 —— CDN 连不上、
  // 模块文件 404、请求一直挂着 —— 到点就按「画失败」处理，让 CSS 把
  // 容器里那段文字说明露出来，而不是永远留着那块为图预留的空白。
  //
  // plot-work.js 里的 try/catch 只能接住「模块已经开始跑之后」的错误，
  // 模块本身没加载起来的情况只有这里兜得住。正常一两秒就画完了，
  // 15 秒是给慢网络留的余量；真画出来了 renderPlot 会把状态改回 ready，
  // 所以只是一闪而过，不会把画好的图按掉。
  var plot = document.querySelector('.work-plot[aria-busy]');
  if (plot) {
    setTimeout(function () {
      if (!plot.dataset.state) plot.dataset.state = 'failed';
      plot.removeAttribute('aria-busy');
    }, 15000);
  }

})();
