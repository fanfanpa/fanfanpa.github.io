/* =============================================================
   armadillo.js — Armadillo Earth 的现场 canvas 动画

   从 works/2026-03/armadillo-earth/index.html 抽出来，作品页和首页
   缩略图共用同一份绘图代码。

   ── 和 Observable 笔记本的差异（原页面注释）──────────────────

     · width / height 是 Observable 的反应式变量（跟着 cell 宽度走），
       这里钉成常数 500 / 618；画布是 width*2 × height = 1000×618
     · DOM.context2d 换成自己建 canvas：按 devicePixelRatio 放大
       width / height 属性，再 setTransform 缩放回去（Observable 在
       context2d 里做的就是这件事），之后一律按 1000×618 的用户坐标画
     · Armadillo_projection1 / 2 是两个逐字相同的 cell，只差
       lambda0 = ±180°，合成一个工厂函数；算式一个符号没动
     · 两个 rotate 分别给了名字（笔记本里都是 var rotate，同一个作用域
       里连着声明两次）
     · 播放由 Play / Pause 按钮控，笔记本是靠 invalidation 停的
     · 多了「减弱动态效果」那一条分支，站里的约定

   取数、两个投影的 translate、render() 的每一步、每帧 +0.4° 都原样。

   ── 作品页和缩略图的不同 ──────────────────────────────────────

     · unit：整体缩放系数。作品页 1；缩略图 0.6，投影 scale、translate
       和画布尺寸一起乘上去，构图不变，只是少画点像素
     · crop：缩略图只保留蛋的 bbox（作品页画布左右各有 200px 白边，
       缩略图里不需要）。裁切靠 canvas 的 transform 平移实现，绘图坐标
       仍然是完整的 1000×618 用户坐标
     · observe：传了元素就只在它进入视口时播、离开就停（首页缩略图）；
       作品页不传，进页面就播
     · controls：传了控件容器就建 Play / Pause 按钮；缩略图不传

   这类页面必须过 HTTP 服务器才能看：type="module" 和跨域 fetch 在
   file:// 下会被 CORS 拒掉（海岸线是从 unpkg 取的，d3 从 jsdelivr 取）。
   ============================================================= */

import { renderD3 } from '../plot-work.js';

// 笔记本里的两个面板：每个 500×618，合起来 1000×618。
const BASE_WIDTH = 500;
const BASE_HEIGHT = 618;

// 蛋在完整画布里的 bbox（单位是笔记本坐标，unit = 1 时）。
// 数值由投影算出来：左 lobe x 200–500，右 lobe 平移后 500–800；
// y 107.6969785–510.3030215。缩略图裁掉左右白边，只留这一块。
const EGG = {
  x: 200,
  y: 107.69697850114972,
  w: 600,
  h: 402.6060429977006
};

const LAND_URL = 'https://unpkg.com/visionscarto-world-atlas@0.0.6/world/110m_land.geojson';

export function mountArmadillo(container, options = {}) {
  if (!container) return Promise.resolve(null);

  const {
    controls = null,
    observe = null,
    autoplay = true,
    unit = 1,
    crop = false
  } = options;

  let destroyed = false;
  let observer = null;
  let button = null;
  let start = null;
  let stop = null;
  let teardown = null;

  const ready = renderD3(container, async ({ d3 }) => {

    /* ── 画布 ────────────────────────────────────────────────
       笔记本：width = 500、height = 618，两个面板各占 width 宽，
       合起来 1000×618。unit 把整组数字一起缩放。 */
    const width = BASE_WIDTH * unit;
    const height = BASE_HEIGHT * unit;
    const canvasWidth = width * 2;

    // 缩略图视图：只保留蛋的 bbox；作品页就是整张画布。
    const view = crop
      ? {
          x: EGG.x * unit,
          y: EGG.y * unit,
          w: EGG.w * unit,
          h: EGG.h * unit
        }
      : { x: 0, y: 0, w: canvasWidth, h: height };

    // 每帧转过的角度：笔记本里是 velocity * 20 = 0.02 * 20，60fps 下
    // 约 15 秒一圈。跟着帧率走，笔记本就是这样，不改成按时间算。
    const velocity = 0.02;

    /* ── 取数 ────────────────────────────────────────────────
       海岸线来自 https://github.com/Fil/visionscarto-world-atlas，
       和笔记本同一个地址、同一份文件（100KB，浏览器会缓存）。
       经纬网是 d3 现算的 10° 网格。 */
    const land = await d3.json(LAND_URL);
    const graticule = d3.geoGraticule10();
    const outline = { type: 'Sphere' };

    /* ── 投影 ────────────────────────────────────────────────
       Armadillo_projection1 和 2 是两个逐字相同的 cell，只差
       lambda0 = ±180°（一个是东经 180° 的那半，一个是西经 180° 的
       那半）。合成一个工厂函数，算式一个符号没动（只有 let → const、
       phi_s → phiS，以及那个三元表达式改写成 if）：

         θ = λ − λ₀
         φ_s = −atan(cos(θ/2) / tan(π/9))

       φ_s 是这只蛋的下缘：比它更南的纬度一律压到这条线上，投影
       只画到这儿为止 —— 蛋的两头就是被它收尖的。 */
    function armadilloRaw(lambda0) {
      return (lambda, phi) => {
        const phi0 = 20 * Math.PI / 180;

        const theta = lambda - lambda0;

        const phiS = -Math.atan(Math.cos(theta / 2) / Math.tan(Math.PI / 9));
        if (phi < phiS) phi = phiS;

        const x = (1 + Math.cos(phi)) * Math.sin(theta / 2);
        const y = (1 + Math.sin(phi0) - Math.cos(phi0)) + Math.sin(phi) * Math.cos(phi0) - (1 + Math.cos(phi)) * Math.sin(phi0) * Math.cos(theta / 2);

        return [x, y];
      };
    }

    /* 笔记本里没有 .scale()，用 geoProjection 的默认值 150。
       translate 的落点是 raw(0,0) 的像（d3 先 recenter 再平移），
       而这两个 raw 在 (0,0) 处分别映到 (−2, …) 和 (+2, …)：所以
       200 和 300 不是随手写的，两个 lobe 正好在 x = 500（面板接缝）
       拼上，合起来是 600 宽、402.6 高的一整只蛋。

       unit = 1（作品页）时完全照笔记本，不写 .scale()。缩略图要缩小
       整只蛋，才显式给它那个默认值：150 × unit；translate 也一起缩。
       unit = 0.6 时蛋是 360×241.6，构图比例不变。 */
    function makeProjection(lambda0, tx) {
      const projection = d3.geoProjection(armadilloRaw(lambda0))
        .translate([tx, height / 2]);
      return unit === 1 ? projection : projection.scale(150 * unit);
    }

    const leftProj = makeProjection(180 * Math.PI / 180, width - 300 * unit);
    const rightProj = makeProjection(-180 * Math.PI / 180, 300 * unit);

    /* 画布。笔记本里是 DOM.context2d(width*2, height)：Observable 会
       按 devicePixelRatio 放大 canvas.width / height 属性，再把
       context 缩放回去，这里自己做同一件事 —— 属性是物理像素（高分
       屏才不糊），setTransform 之后一律按 1000×618 的用户坐标画，
       和笔记本同一套数字。

       crop 时画布只开蛋那么大，setTransform 里再平移 −view.x / −view.y，
       这样绘图代码仍然按完整坐标写，不用到处减 offset。 */
    let dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    function sizeCanvas() {
      canvas.width = Math.round(view.w * dpr);
      canvas.height = Math.round(view.h * dpr);
      context.setTransform(dpr, 0, 0, dpr, -view.x * dpr, -view.y * dpr);
    }
    sizeCanvas();

    // canvas 里的东西读屏读不到（SVG 那几页是 Plot 给挂的 role / label）
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'An animated egg-shaped world map: two Armadillo projections joined at the antimeridian, black landmasses on an ivory globe with a gray graticule, rotating continuously.');

    /* ── 画一帧 ──────────────────────────────────────────────
       笔记本里的 render()，每一步都没动（只是双引号换成了单引号）。

       两个面板各自 save / clip(自己的轮廓) / 铺底 / 画经纬网和陆地 /
       restore：clip 用的是投影后的 {type: "Sphere"}，它投出来正好是
       这个 lobe 自己的轮廓，所以这段 clip 是紧贴着蛋形收边的。右面板
       外面套一层 translate(width, 0)，画到画布右半边去。

       先画的两条 strokeRect 是面板边框：线宽只有 0.1，被后面的蛋
       盖住大半，只有蛋没铺到的地方（比如 x = 500 那条接缝的上半段）
       还看得见一条细线。 */
    const render = function () {

      const leftpath = d3.geoPath(leftProj, context);
      const rightpath = d3.geoPath(rightProj, context);

      // clearRect 要在未平移的坐标系里做，否则只擦掉 crop 那一块
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.restore();

      // 添加边框
      context.save();
      context.strokeStyle = 'black';
      context.lineWidth = 0.1;
      // 左地图边框
      context.strokeRect(0, 0, width, height);
      // 右地图边框（注意平移后坐标）
      context.translate(width, 0);
      context.strokeRect(0, 0, width, height);
      context.restore();

      context.save();
      context.beginPath();
      leftpath(outline);
      context.clip();
      context.fillStyle = '#fefef2';
      context.fillRect(0, 0, width, height);

      context.beginPath();
      leftpath(graticule);
      context.strokeStyle = '#ccc';
      context.stroke();

      context.beginPath();
      leftpath(land);
      context.fillStyle = '#000';
      context.fill();
      context.restore();

      context.save();
      context.translate(width, 0);
      context.beginPath();
      rightpath(outline);
      context.clip();
      context.fillStyle = '#fefef2';
      context.fillRect(0, 0, width, height);

      context.beginPath();
      rightpath(graticule);
      context.strokeStyle = '#ccc';
      context.stroke();

      context.beginPath();
      rightpath(land);
      context.fillStyle = '#000';
      context.fill();
      context.restore();
    };

    /* ── 播放 ────────────────────────────────────────────────
       笔记本里是一个 d3.timer：每帧把两个投影的 rotate[0] 加上
       velocity * 20，再 render 一遍。d3.timer 和 rAF 是同一个时间源，
       所以这里仍然是「一帧一度」。.rotate() 不传参返回的是副本，
       所以读出来改完再写回去是安全的。

       笔记本的 timer 靠 invalidation 停；这里由按钮控，停的时候不
       重画 —— 画布留着最后一帧。 */
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer = null;
    let onScreen = !observe;

    /* 备选分辨率是建画布那一刻按 dpr 定的，浏览器缩放、或者把窗口拖到
       另一块缩放比不同的显示器上，dpr 就变了，画布会跟着变糊（比例还是
       对的，CSS 在管显示尺寸）。resize 里比一下，变了才重建 —— 重建会
       清空画布，所以紧接着补画当前这一帧。 */
    const onResize = () => {
      const next = window.devicePixelRatio || 1;
      if (next === dpr) return;
      dpr = next;
      sizeCanvas();
      render();
    };
    window.addEventListener('resize', onResize);

    teardown = () => {
      window.removeEventListener('resize', onResize);
      if (timer) { timer.stop(); timer = null; }
      if (observer) { observer.disconnect(); observer = null; }
      if (button) { button.remove(); button = null; }
    };

    function tick() {
      const leftRotate = leftProj.rotate();
      leftRotate[0] += velocity * 20;
      leftProj.rotate(leftRotate);

      const rightRotate = rightProj.rotate();
      rightRotate[0] += velocity * 20;
      rightProj.rotate(rightRotate);

      render();
    }

    function setLabel() {
      if (button) button.textContent = timer ? 'Pause' : 'Play';
    }

    start = function () {
      if (!timer) timer = d3.timer(tick);
      setLabel();
    };

    stop = function () {
      if (timer) { timer.stop(); timer = null; }
      setLabel();
    };

    /* Play / Pause 按钮。脚本建的（HTML 里只有个空盒子），和小龙虾
       那页的控件同理：类名和 min-height 都写在静态 HTML / CSS 里，
       高度先占住，按钮冒出来时页脚不会跳。 */
    if (controls) {
      button = document.createElement('button');
      button.type = 'button';
      button.addEventListener('click', () => (timer ? stop() : start()));
      controls.append(button);
    }

    /* 第一帧（0°）先画出来，别让画布空着。然后按站里的约定起播：
       减弱动态效果时压制自动播，但不压制用户点 —— 这里没有「跳到最后
       一帧」这回事（旋转是循环的），静止的第一帧就是它该停的样子；
       点了 Play 照样转。

       传了 observe（首页缩略图）就等它进视口再播；进进出出只停/续
       timer，不重画，回来时接着转。 */
    function sync() {
      if (autoplay && !reduced.matches && onScreen) start();
      else stop();
    }

    if (observe) {
      onScreen = false;
      observer = new IntersectionObserver((entries) => {
        onScreen = entries[0].isIntersecting;
        sync();
      });
      observer.observe(observe);
    }

    render();
    setLabel();
    sync();

    return canvas;
  });

  return ready.then((node) => {
    if (!node) {
      if (teardown) teardown();
      return null;
    }

    // 还没画完就被移出页面：把刚建好的东西收掉
    if (destroyed) {
      if (teardown) teardown();
      container.replaceChildren();
      return null;
    }

    return {
      play: () => { if (!destroyed && start) start(); },
      pause: () => { if (stop) stop(); },
      destroy: () => {
        destroyed = true;
        if (teardown) teardown();
        container.replaceChildren();
      }
    };
  });
}
