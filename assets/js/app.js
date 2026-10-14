/* =============================================================
   app.js — 首页专用

   读取 data/works.js 里的作品清单，按年份分组、年内按月倒序，
   渲染成「年份标题 + 卡片网格」。另外生成顶部的标签筛选按钮。

   顶栏的账号图标和页脚年份在 assets/js/site.js 里处理。
   平时你不需要动这个文件，只改 data/works.js 就行。
   ============================================================= */

(function () {
  'use strict';

  var WORKS = window.WORKS || [];

  var yearsEl   = document.getElementById('years');
  var filtersEl = document.getElementById('filters');
  var emptyEl   = document.getElementById('empty');

  // 这个脚本只有首页会用到，但保险起见还是判空
  if (!yearsEl || !filtersEl || !emptyEl) return;


  /* ---------- 小工具 ---------- */

  // 把「目录地址」补全成明确的 index.html。
  // http 下服务器会自动把 .../foo/ 解析到 .../foo/index.html，
  // 但本地双击打开走的是 file:// 协议，浏览器不会自动补，
  // 点目录链接会报 ERR_UNEXPECTED。补全后两种环境都能用。
  function resolveHref(href) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.slice(0, 2) === '//') {
      return href;                                   // 外链原样返回
    }
    return href.slice(-1) === '/' ? href + 'index.html' : href;
  }

  // 把 "2026-09" 拆成 {year: 2026, month: 9}。
  // 只写 "2026" 也能认，月份记为 0，会排在当年最后。
  function parseDate(value) {
    var m = /^(\d{4})(?:-(\d{1,2}))?/.exec(String(value || ''));
    if (!m) return { year: 0, month: 0 };
    return { year: +m[1], month: m[2] ? +m[2] : 0 };
  }

  // 由标题算一个稳定的色相，保证同一个作品每次刷新颜色一致
  function hueOf(text) {
    var h = 0;
    for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return Math.abs(h) % 360;
  }

  // 没有缩略图时的占位块
  function placeholder(title) {
    var hue = hueOf(title);
    var box = document.createElement('div');
    box.className = 'ph';
    box.setAttribute('aria-hidden', 'true');
    box.style.background =
      'linear-gradient(135deg,' +
      'hsl(' + hue + ' 58% 60%) 0%,' +
      'hsl(' + ((hue + 46) % 360) + ' 55% 42%) 100%)';

    var label = document.createElement('span');
    label.textContent = title;          // textContent 而非 innerHTML，天然防注入
    box.appendChild(label);
    return box;
  }


  /* ---------- 一张卡片（纯图片，无文字） ---------- */

  function makeCard(work) {
    var card = document.createElement('a');
    card.className = 'card';
    card.href = resolveHref(work.href);
    // 卡片上没有文字，作品名靠原生悬停提示和 alt 传达
    card.title = work.title;
    card.dataset.tags = (work.tags || []).join(',');

    if (work.thumb) {
      var img = document.createElement('img');
      img.src = work.thumb;
      img.alt = work.title;             // 卡片只有图，alt 就是它的可访问名称
      img.loading = 'lazy';
      img.decoding = 'async';
      // 路径写错或文件缺失时退回占位块，页面不会开天窗
      img.addEventListener('error', function () {
        img.remove();
        card.appendChild(placeholder(work.title));
      });
      card.appendChild(img);
    } else {
      card.appendChild(placeholder(work.title));
    }

    return card;
  }


  /* ---------- 按年份分组，年内按月倒序 ---------- */

  function groupByYear(list) {
    var buckets = {};                   // { 年份: [{work, month}, ...] }
    var order = [];

    list.forEach(function (work) {
      var d = parseDate(work.date);
      if (!buckets[d.year]) {
        buckets[d.year] = [];
        order.push(d.year);
      }
      buckets[d.year].push({ work: work, month: d.month });
    });

    return order
      .sort(function (a, b) { return b - a; })          // 年份倒序
      .map(function (year) {
        return {
          year: year,
          items: buckets[year]
            .sort(function (a, b) { return b.month - a.month; })   // 月份倒序
            .map(function (entry) { return entry.work; })
        };
      });
  }


  /* ---------- 渲染 ---------- */

  function render(list) {
    yearsEl.textContent = '';

    groupByYear(list).forEach(function (group) {
      var block = document.createElement('section');
      block.className = 'year-block';

      var head = document.createElement('h2');
      head.className = 'year-head';
      head.textContent = group.year === 0 ? 'Undated' : group.year;
      block.appendChild(head);

      var grid = document.createElement('div');
      grid.className = 'grid';
      group.items.forEach(function (work) {
        grid.appendChild(makeCard(work));
      });
      block.appendChild(grid);

      yearsEl.appendChild(block);
    });

    emptyEl.hidden = list.length > 0;
  }


  /* ---------- 标签筛选 ---------- */

  function buildFilters() {
    var seen = [];
    WORKS.forEach(function (w) {
      (w.tags || []).forEach(function (t) {
        if (seen.indexOf(t) === -1) seen.push(t);
      });
    });

    if (seen.length === 0) return;      // 一条标签都没有就不显示筛选栏

    var active = 'All';

    ['All'].concat(seen).forEach(function (label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.setAttribute('aria-pressed', String(label === active));

      btn.addEventListener('click', function () {
        active = label;
        Array.prototype.forEach.call(filtersEl.children, function (b) {
          b.setAttribute('aria-pressed', String(b.textContent === active));
        });
        render(label === 'All'
          ? WORKS
          : WORKS.filter(function (w) {
              return (w.tags || []).indexOf(label) !== -1;
            }));
      });

      filtersEl.appendChild(btn);
    });
  }


  /* ---------- 启动 ---------- */

  buildFilters();
  render(WORKS);

  if (WORKS.length === 0) {
    emptyEl.textContent = 'No work yet. Open data/works.js to add the first one.';
    emptyEl.hidden = false;
  }

})();
