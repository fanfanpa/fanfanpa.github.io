/* =============================================================
   crayfish-production.js — 中国小龙虾产量 2015–2024 的现场 Plot 动画

   从 works/2025-11/crayfish-production-2015-2024/index.html 抽出来，
   作品页和首页缩略图共用同一份绘图代码。

   绘图代码来自 Observable 笔记本，按 cell 顺序改写成一个普通模块。
   改动只有下面注释里列的那几处，两张图的 spec 一字未动。

   ── 作品页和缩略图的不同 ──────────────────────────────────────

     · controls：传了控件容器就把播放条建在里面；缩略图不传，播放条
       建在一个不挂到 DOM 的盒子里，只为复用它的定时器和减弱动效逻辑
     · observe：传了元素就滚出视口暂停（作品页传画布容器；缩略图传
       卡片），不传默认看画布容器
     · fitMode：作品页 'width'，整块按容器宽度放大；缩略图 'contain'，
       让 600×600 的整幅图在 300×200 的卡片里居中、完整显示

   这类页面必须过 HTTP 服务器才能看：type="module" 和跨域 import 在
   file:// 下会被 CORS 拒掉。
   ============================================================= */

import { renderPlot } from '../plot-work.js';
import { createScrubber } from '../scrubber.js';

const WIDTH = 600;    // 和作品页 --plot-w / --plot-h 是同一组数字
const HEIGHT = 600;

/* 笔记本里的 FileAttachment("中国各省市自治区小龙虾产量.csv")。
   只有 1.4KB，直接内联在这里，页面就自成一体、不用再发一次 HTTP 请求。

   和原文件逐字一致，只动了两处，都不影响 d3.csvParse 的结果：
     · 去掉开头的 BOM（EF BB BF）。走文件时 fetch().text() 会按 Fetch
       规范自动吃掉它，内联进来没有那一步 —— BOM 会粘到第一个列名上
       变成 "﻿省"，d.省 取到 undefined，28 根条一根都画不出来。
     · 行尾从 CRLF 换成 LF。d3-dsv 的解析器两种情况都认（源码里
       \r 后面跟着 \n 就一起当换行吃掉），跟 CRLF 的结果完全一样。
   空单元格照旧留空：d3.autoType 把空串转成 null，d3.sum / d3.max 会
   跳过它 —— 补成 0 的话折线和总计就跟笔记本对不上了。 */
const CSV_TEXT = `省,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015
湖北省,1437321,1242701,1138392,1073621,982010,925005,812435,631621,489177,433000
安徽省,672037,639276,595239,495887,409247,349750,217546,137686,107144,97200
湖南省,482246,461495,423591,378929,359491,306777,237591,135719,56304,17500
江苏省,292217,280307,267161,263652,246165,204394,166777,115354,92984,90000
江西省,234592,236948,213054,199028,189977,133492,110214,74387,58582,55437
四川省,104175,83752,64681,57660,48868,34037,14813,,,
山东省,63944,63197,60086,53936,51687,40006,32493,,,
河南省,50702,54270,53338,53666,61130,58207,31661,,,
浙江省,50352,44673,34630,27596,22264,18168,5814,,,
广西壮族自治区,23028,20173,11122,6099,,3271,1095,,,
重庆市,19898,18272,15176,10725,9218,8159,4835,,,
云南省,3444,3205,2490,2714,,2110,1011,,,
广东省,3317,2860,1974,1461,,204,117,,,
福建省,2554,2691,2676,2657,,2322,1197,,,
陕西省,2506,2387,1998,1865,,1325,,,,
贵州省,1940,2609,2480,2247,,1793,660,,,
新疆维吾尔自治区,991,1024,979,922,,8,5,,,
黑龙江省,727,345,701,269,,72,46,,,
辽宁省,620,,,,,,,,,
海南省,344,336,327,170,,69,,,,
山西省,329,286,307,224,,20,1,,,
上海市,232,205,256,244,,391,322,,,
吉林省,34,,,,,,,,,
内蒙古自治区,15,,,,,,,,,
河北省,8,7,5,17,,12,4,,,
甘肃省,4,1,13,,,,,,,
宁夏回族自治区,1,2,8,,,12,25,,,
天津市,,,,6,,,,,,`;

const FIRST_YEAR = 2015;
const LAST_YEAR  = 2024;
const YEAR_MS    = 800;   // 笔记本里 Scrubber 的 delay: 800

export function mountCrayfish(container, options = {}) {
  if (!container) return Promise.resolve(null);

  const {
    controls = null,
    observe = container,
    autoplay = true,
    fit: fitMode = 'width'
  } = options;

  let destroyed = false;
  let resizeObserver = null;
  let scrubberMount = null;
  let teardown = null;

  const ready = renderPlot(container, async ({ d3, Plot, container }) => {
    /* ── 笔记本里几个独立的 cell ───────────────────────────────
       cell 之间有依赖时 Observable 会自动重算，普通脚本没有这套，
       所以按依赖顺序排成一段顺序代码；下面两张图改成接收 t 的函数，
       不再去读外层的 t（笔记本里是隐式依赖）。 */

    const data = d3.csvParse(CSV_TEXT, d3.autoType);

    const yearColumns = Object.keys(data[0]).filter(key => key !== '省' && !isNaN(parseInt(key)));

    const longData = data.flatMap(d => yearColumns.map(year => ({省: d.省, Year: parseInt(year), Production: d[year]})));

    const maxProduction = d3.max(longData, d => d.Production);

    const yearlyTotal = d3.rollups(
      longData,
      v => d3.sum(v, d => d.Production) / 10000, // 转换为万吨
      d => d.Year
    ).map(([year, total]) => ({Year: year, Total: total}))
    .sort((a, b) => a.Year - b.Year); // 按年份排序

    /* ── 两张图 ──────────────────────────────────────────────
       spec 一字未动。唯一的改动是把读外层 t 的地方变成读入参，
       以及删掉了笔记本里注释掉的 Plot.frame() / Plot.ruleX([0]) /
       fontSize: 12 和那个没有下游的 d3.extent(...) 调试 cell。 */

    function ProvinceProduction(t) {
      return Plot.plot({
        width: 600,
        height: 600,
        marginLeft: 110,
        title: "中国各省市自治区小龙虾产量",
        x: {
          axis: "top",
          domain: [0, maxProduction * 1.1],
          label: "产量（万吨）", // 添加X轴标题并包含单位
          tickFormat: d => (d / 10000).toFixed(1) // 将刻度值除以10000并保留1位小数
        },
        y: {
          label: "省市自治区",
          domain: Array.from(new Set(longData.map(d => d.省)))
        },
        ariaLabel: "中国各省市自治区小龙虾产量",
        ariaDescription: "Horizontal bars ranking China's provinces by crayfish production for the year currently on screen.",
        marks: [
          Plot.barX(longData.filter(d => d.Year === t), {x: "Production", y: "省", fill: "steelblue", sort: { y: "data", reverse: true }}),
          // 添加文本标签，显示万吨单位
          Plot.text(longData.filter(d => d.Year === t), {
            x: "Production",
            y: "省",
            text: d => (d.Production / 10000).toFixed(1),
            textAnchor: "start",
            dx: 5, // 向右偏移5像素
            fill: "black"
          })
        ]
      });
    }

    function TotalProduction(t) {
      return Plot.plot({
        width: 500,
        height: 400,
        title: "中国小龙虾年产量变化",
        marginLeft: 40,
        x: {
          label: "年份",
          domain: [2015, 2025],
          ticks: 10,
          tickFormat: d => d + ""
        },
        y: {
          label: "总产量（万吨）",
          axis: "right",
          grid: true
        },
        ariaLabel: "中国小龙虾年产量变化",
        ariaDescription: "National crayfish production by year, with the years up to the current one highlighted.",
        marks: [
          Plot.ruleY([60]),
          // 绘制完整折线（浅色）
          Plot.lineY(yearlyTotal, {
            x: "Year",
            y: "Total",
            stroke: "lightgray",
            strokeWidth: 1
          }),
          // 绘制到当前年份的折线（高亮）
          Plot.lineY(yearlyTotal.filter(d => d.Year <= t), {
            x: "Year",
            y: "Total",
            stroke: "steelblue",
            strokeWidth: 3
          }),
          // 绘制到当前年份的数据点
          Plot.dot(yearlyTotal.filter(d => d.Year <= t), {
            x: "Year",
            y: "Total",
            fill: "steelblue",
            r: 4
          }),
          // 当前年份的数据标签
          Plot.text(yearlyTotal.filter(d => d.Year === t), {
            x: "Year",
            y: "Total",
            text: d => d.Total.toFixed(1),
            dx: -20,
            dy: -10,
            fill: "steelblue",
            fontWeight: "bold"
          }),
          // 当前年份的垂直线
          Plot.ruleX([t], {
            stroke: "red",
            strokeWidth: 1,
            strokeDasharray: "3,3"
          })
        ]
      });
    }

    /* ── DOM ─────────────────────────────────────────────────
       笔记本最后那个 cell 的结构：一个 600×600 的框，条形图铺满它，
       折线图绝对定位叠在右下角。原来写在 style 里的百分比搬到 CSS
       的 .work-plot__bars / .work-plot__line 两条规则上。

       缩略图没有 .work-plot 祖先，--plot-w / --plot-h 不会从行内
       style 继承下来，所以在框上补一份；作品页写的是同一组数字，
       补一遍没有影响。 */
    const frame = document.createElement('div');
    frame.className = 'work-plot__frame';
    frame.style.setProperty('--plot-w', WIDTH);
    frame.style.setProperty('--plot-h', HEIGHT);

    const bars = document.createElement('div');
    bars.className = 'work-plot__bars';

    const line = document.createElement('div');
    line.className = 'work-plot__line';

    frame.append(bars, line);

    function paint(t) {
      // 同一个任务里换掉两棵子树，中间不会渲染，所以看不见闪烁
      bars.replaceChildren(ProvinceProduction(t));
      line.replaceChildren(TotalProduction(t));
    }

    /* ── 缩放 ────────────────────────────────────────────────
       两张图仍按笔记本里的 600 / 500 画，整块用 transform 等比放大。
       'width'（作品页）只按容器宽度算，和原来一样；'contain'（缩略图）
       取宽高两个比例里小的那个，再把框居中 —— 卡片是 300×200，整幅
       600×600 的图会变成 200×200，左右留白，比例和作品页一致。

       重算 width 的话 marginLeft: 110 这类固定边距占的比例会变，画面
       就和笔记本不一样了。 */
    function fitFrame() {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (!(cw > 0) || !(ch > 0)) return;

      let scale;
      let left = 0;
      let top = 0;
      if (fitMode === 'contain') {
        scale = Math.min(cw / WIDTH, ch / HEIGHT);
        left = (cw - WIDTH * scale) / 2;
        top = (ch - HEIGHT * scale) / 2;
      } else {
        scale = cw / WIDTH;
      }
      if (!(scale > 0)) return;

      frame.style.setProperty('--plot-scale', scale);
      frame.style.left = `${left}px`;
      frame.style.top = `${top}px`;
    }
    fitFrame();
    resizeObserver = new ResizeObserver(fitFrame);
    resizeObserver.observe(container);

    teardown = () => {
      if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
      if (scrubberMount && scrubberMount.destroy) scrubberMount.destroy();
      scrubberMount = null;
    };

    /* ── 播放 ────────────────────────────────────────────────
       笔记本里是 viewof Scrubber(d3.ticks(2015, 2024, 10), {
       autoplay, loop, delay: 800, initial: 0 })。那个笔记本 import
       不进来，assets/js/scrubber.js 是照着它重写的公共模块，收的也
       是 values 数组 —— 这里的 d3.range 和笔记本的 d3.ticks 是同一
       组年份。

       滚出视口暂停、尊重「减弱动态效果」，这两条都在模块里，不用
       在这儿再写一遍。

       ⚠ 这个调用必须留在 build() 里、而且 build 必须保持同步（体内
       不能出现 await）。这样 await build(...) 的续体是同一个任务里
       的微任务，replaceChildren(node) 和这里的插控件发生在同一次
       渲染机会内，中间不可能出现「控件在、图不在」的一帧。将来谁在
       build 里加了 await（比如把 CSV 改成 fetch 回来），这个前提就
       没了。

       注意画失败的情况：控件是在第一次 onchange 之前就插好的，图抛
       错的时候它已经在 DOM 里了。收掉它的是 CSS 里
       .work-plot[data-state="failed"] ~ .scrubber 那条。缩略图没有
       这条 CSS，靠 home-thumbs.js 把整层 live 删掉。 */
    const controlMount = controls || document.createElement('div');
    scrubberMount = createScrubber(controlMount, {
      values: d3.range(FIRST_YEAR, LAST_YEAR + 1),
      format: year => `Year: ${year}`,
      label: 'Year',
      delay: YEAR_MS,
      autoplay,
      observe,
      onchange: paint,
    });

    return frame;
  });

  return ready.then((node) => {
    if (!node) {
      if (teardown) teardown();
      return null;
    }

    if (destroyed) {
      if (teardown) teardown();
      container.replaceChildren();
      return null;
    }

    return {
      play: () => {
        if (!destroyed && scrubberMount) {
          const button = scrubberMount.querySelector('button');
          if (button) button.click();
        }
      },
      pause: () => {
        if (!destroyed && scrubberMount) {
          const button = scrubberMount.querySelector('button');
          if (button && button.textContent === 'Pause') button.click();
        }
      },
      destroy: () => {
        destroyed = true;
        if (teardown) teardown();
        container.replaceChildren();
      }
    };
  });
}
