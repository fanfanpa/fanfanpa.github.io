/* =============================================================
   plot-work.js — 代码绘制作品页的公共壳

   作品页里只写「取数 + 画图」，剩下每页都一样的杂事在这儿：

     1. 从 CDN 拿 d3 和 Observable Plot。版本号全站只写这一处。
        · Plot 的 ESM 包内部自带一份 d3，但不把它导出；作品代码里
          要用 d3.csv / d3.autoType，所以两个都得显式加载
        · 用动态 import() 而不是顶部的静态 import：静态 import 失败
          会让整个模块静默死掉，页面只剩一块预留的空白；动态
          import 才能 catch 到，按失败处理
     2. 把 Plot.plot() 画出来的节点塞进容器。一般是裸 <svg>；用了
        title / subtitle / caption 选项时 Plot 会包一层 <figure>，
        两种都能直接 appendChild
     3. 失败时把容器标成 data-state="failed"，style.css 里那两条规则
        会撤掉为图预留的高度、把容器里那段文字说明露出来

   用法见 works/2025-11/grid-world/index.html：

     import { renderPlot } from '../../../assets/js/plot-work.js';

     renderPlot(document.getElementById('plot'), async ({ d3, Plot }) => {
       const rows = await d3.csv(url, d3.autoType);
       return Plot.plot({ width: 1100, height: 850, marks: [...] });
     });

   注意这类页面必须过 HTTP 服务器才能看：type="module" 和跨域 fetch
   在 file:// 下会被 CORS 拒掉。
   ============================================================= */

const D3_URL   = 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
const PLOT_URL = 'https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm';

let pending = null;

// 同一个页面只会真正加载一次；失败不缓存，下次调用还能重试
function load() {
  if (!pending) {
    pending = Promise.all([import(D3_URL), import(PLOT_URL)])
      .then(([d3, Plot]) => ({ d3, Plot }))
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}

export async function renderPlot(container, build) {
  if (!container) return;

  try {
    const { d3, Plot } = await load();
    const node = await build({ d3, Plot, container });
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
