/* =============================================================
   home-thumbs.js — 首页那三张作品的「现场缩略图」

   首页卡片本来都是一张静态 JPEG。Armadillo Earth、Covering a Square
   和 Crayfish Production 这三页是脚本现场画的，这里把同一份绘图模块
   挂到卡片上，让缩略图也动起来。

   为什么是动态 import：index.html 里的 app.js 是普通脚本（不是
   module），首页也要能直接双击打开（file://）。app.js 用 import()
   加载这个文件；file:// 下模块加载会被 CORS 拒掉，那个 promise 失败
   之后什么都不做，静态 JPEG 仍然好好的。

   挂载策略：

     · 先只观察卡片。卡片离视口还有 200px 时才开始建图 —— 首页有
       18 张卡片，一上来就把三套库和画布全建出来没必要
     · 建好之前 .card__live 是 visibility: hidden 的，静态图一直
       显示；第一帧画好、controller 回来之后才加 .is-live，把静态图
       藏掉、露出现场图
     · 每个作品的模块自己看卡片是否在视口里，滚出去停、滚回来播；
       这里不管播放状态
     · prefers-reduced-motion: reduce 时整页都不挂，静态 JPEG 就是
       最终形态（和站里其它动画的约定一致：系统设置优先）
     · 筛选按钮重绘卡片时 app.js 先 unmount()，旧图、定时器、
       IntersectionObserver 一起拆掉，再 mount() 新卡片
     · 任何一步失败（CDN 连不上、取数失败、脚本报错）就删掉 live
       层；静态缩略图从来没被换掉，所以失败时页面看起来和以前一样

   尺寸约定：

     · Armadillo：unit = 0.6 + crop，画布只开蛋的 bbox（360×241.6），
       显示约 298×200。作品页的画布是 1000×618，左右各有 200 宽的
       白边，缩略图不需要
     · Covering：SVG 是 600×600，靠 .card__live svg 的 width/height
       100% 撑满卡片，viewBox 自己按比例居中（内容 200×200）
     · Crayfish：整块 600×600 的 frame 用 'contain' 缩到 200×200 居中
   ============================================================= */

import { mountArmadillo } from './works/armadillo.js';
import { mountCoveringSquare } from './works/covering-square.js';
import { mountCrayfish } from './works/crayfish-production.js';

const VIEWS = {
  armadillo: mountArmadillo,
  'covering-square': mountCoveringSquare,
  crayfish: mountCrayfish
};

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

let root = null;
let initObserver = null;
const entries = new Map();   // card -> { layer, controller, alive }

function removeEntry(card, state) {
  if (!state || !state.alive) return;
  state.alive = false;
  entries.delete(card);
  if (state.controller) state.controller.destroy();
  state.layer.remove();
  card.classList.remove('is-live');
}

function teardownAll() {
  if (initObserver) {
    initObserver.disconnect();
    initObserver = null;
  }
  for (const [card, state] of entries) removeEntry(card, state);
}

function mountCard(card) {
  if (entries.has(card) || !card.isConnected) return;
  if (root && !root.contains(card)) return;

  const name = card.dataset.liveThumb;
  const mountView = VIEWS[name];
  if (!mountView) return;

  const layer = document.createElement('div');
  layer.className = 'card__live';
  layer.setAttribute('aria-hidden', 'true');
  card.appendChild(layer);

  const state = { layer, controller: null, alive: true };
  entries.set(card, state);

  const options = {
    // 卡片本身进出视口时由各作品的模块停/续；图层和卡片同尺寸，
    // 观察哪个都行，这里统一用卡片
    observe: card,
    autoplay: true
  };

  if (name === 'armadillo') {
    options.unit = 0.6;
    options.crop = true;
  } else if (name === 'covering-square') {
    options.loop = true;
    options.loopDelay = 1500;
    options.maxFps = 30;
  } else if (name === 'crayfish') {
    options.fit = 'contain';
  }

  let pending;
  try {
    pending = mountView(layer, options);
  } catch (error) {
    pending = Promise.reject(error);
  }

  Promise.resolve(pending).then((controller) => {
    // 还没画完卡片就被筛掉 / 换掉了：controller 自己收拾干净
    if (!state.alive || !card.isConnected || entries.get(card) !== state) {
      if (controller) controller.destroy();
      return;
    }
    if (!controller) {
      removeEntry(card, state);
      return;
    }
    state.controller = controller;
    card.classList.add('is-live');
  }).catch(() => {
    removeEntry(card, state);
  });
}

export function unmount() {
  teardownAll();
  root = null;
}

export function mount(rootEl) {
  teardownAll();
  root = rootEl || null;
  if (!root || reduced.matches) return;

  const observer = new IntersectionObserver((items) => {
    for (const item of items) {
      if (!item.isIntersecting) continue;
      observer.unobserve(item.target);
      mountCard(item.target);
    }
  }, { rootMargin: '200px 0px' });
  initObserver = observer;

  for (const card of root.querySelectorAll('.card[data-live-thumb]')) {
    observer.observe(card);
  }
}

/* 用户中途改系统设置也生效：切到 reduce 就把现场图全拆了，静态图
   回来；切回 no-preference 再按正常流程重新懒加载。 */
reduced.addEventListener('change', () => {
  if (!root) return;
  if (reduced.matches) teardownAll();
  else mount(root);
});
