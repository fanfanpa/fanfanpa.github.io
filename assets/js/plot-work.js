/* =============================================================
   plot-work.js — 代码绘制作品页的公共壳

   作品页里只写「取数 + 画图」，剩下每页都一样的杂事在这儿：

     1. 从 CDN 拿 d3，要画 Observable Plot 的话连 Plot 一起拿。版本号
        全站只写这一处。
        · renderD3 只要 d3；renderPlot 两个都要
        · Plot 的 ESM 包内部自带一份 d3，但不把它导出；作品代码里
          要用 d3.csv / d3.autoType，所以两个都得显式加载
        · 用动态 import() 而不是顶部的静态 import：静态 import 失败
          会让整个模块静默死掉，页面只剩一块预留的空白；动态
          import 才能 catch 到，按失败处理
     2. 把 build() 返回的节点塞进容器。一般是裸 <svg>；用了
        title / subtitle / caption 选项时 Plot 会包一层 <figure>，
        两种都能直接 appendChild
     3. 失败时把容器标成 data-state="failed"，style.css 里那两条规则
        会撤掉为图预留的高度、把容器里那段文字说明露出来

   用法见 works/2025-11/grid-world/index.html 和
   works/2026-06/covering-square/index.html：

     import { renderPlot } from '../../../assets/js/plot-work.js';

     renderPlot(document.getElementById('plot'), async ({ d3, Plot }) => {
       const rows = await d3.csv(url, d3.autoType);
       return Plot.plot({ width: 1100, height: 850, marks: [...] });
     });

     // 自己用 d3 拼 SVG 的图走这个，能少下一个 Plot
     import { renderD3 } from '../../../assets/js/plot-work.js';

     renderD3(document.getElementById('plot'), ({ d3, container }) => {
       const svg = d3.create('svg').attr('viewBox', [0, 0, 600, 600]);
       …
       return svg.node();
     });

   注意这类页面必须过 HTTP 服务器才能看：type="module" 和跨域 fetch
   在 file:// 下会被 CORS 拒掉。
   ============================================================= */

const D3_URL   = 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
const PLOT_URL = 'https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm';

let d3Pending = null;
let plotPending = null;

// 同一个页面只会真正加载一次；失败不缓存，下次调用还能重试
function loadD3() {
  if (!d3Pending) {
    d3Pending = import(D3_URL)
      .then((d3) => ({ d3 }))
      .catch((error) => {
        d3Pending = null;
        throw error;
      });
  }
  return d3Pending;
}

function loadPlot() {
  if (!plotPending) {
    plotPending = Promise.all([loadD3(), import(PLOT_URL)])
      .then(([{ d3 }, Plot]) => ({ d3, Plot }))
      .catch((error) => {
        plotPending = null;
        throw error;
      });
  }
  return plotPending;
}

// 「拿库 → 画 → 塞进容器 → 标状态」这条流程两个入口一样，只有 load 不同
async function run(container, build, load) {
  if (!container) return;

  try {
    const libraries = await load();
    const node = await build({ ...libraries, container });
    if (!node) throw new Error('build() 没有返回可插入的节点');

    container.replaceChildren(node);   // 顺手把失败用的那段文字说明挪走
    container.dataset.state = 'ready';
    return node;
  } catch (error) {
    container.dataset.state = 'failed';
    console.error('[plot-work] 画图失败：', error);
  } finally {
    container.removeAttribute('aria-busy');
  }
}

export function renderD3(container, build) {
  return run(container, build, loadD3);       // build 收 { d3, container }
}

export function renderPlot(container, build) {
  return run(container, build, loadPlot);     // build 收 { d3, Plot, container }
}
