/* =============================================================
   covering-square.js — Covering a Square with Three Discs 的现场 SVG 动画

   从 works/2026-06/covering-square/index.html 抽出来，作品页和首页
   缩略图共用同一份绘图代码。

   ── 和 Observable 笔记本的差异（原页面注释）──────────────────

     · width 是 Observable 的反应式变量，这里钉成常数 600
     · chart cell 里那个 for…of 的循环体搬成 paint()，由 rAF 逐帧调用
     · arrow 从 '@oberbichler/arrow' 抄成模块内的函数（那不是 npm 包，
       是笔记本之间的导入名）
     · 读数那行加了 lang="zh-CN"
     · 播放由 Replay 按钮控，笔记本里靠 replay 依赖重算整个 cell
     · 多了「减弱动态效果」那一条分支，站里的约定

   生成器 discCoverageOptimization 和画图的每一步都一字未动。

   ── 作品页和缩略图的不同 ──────────────────────────────────────

     · observe：传了元素就只在它进入视口时播、离开就停（首页缩略图）；
       作品页不传，进页面就播
     · controls：传了控件容器就建 Replay 按钮；缩略图不传
     · loop：缩略图跑完一遍后隔一会儿自动重来，作品页跑完就停
     · maxFps：缩略图把 60fps 压到 30fps，一次下降约 8 秒；每帧的
       计算量没变，只是少喂几帧，省一点 CPU
     · 缩略图的第一帧在挂载时就画出来（静态图要先让位给它），作品页
       也是同一帧的随机起点

   这类页面必须过 HTTP 服务器才能看：type="module" 和跨域 import 在
   file:// 下会被 CORS 拒掉。
   ============================================================= */

import { renderD3 } from '../plot-work.js';

const WIDTH = 600;    // 和作品页 --plot-w / --plot-h 是同一组数字
const HEIGHT = 600;

/* ── arrow ───────────────────────────────────────────────────
   笔记本里是 import {arrow} from '@oberbichler/arrow'。那是
   Observable 笔记本之间的导入名，npm 上没有这个包，所以照抄进来。

   画的是一条折线：把 a→b 的箭头写成 6 个点 —— 尖端 b、脖子 m、
   两片翅膀 l / r，再回到 m 收口。它改的是传进来那个 selection 的
   points 属性，所以调用写法是 selection.call(arrow, ax, ay, bx, by)

            b
           / \
          l-m-r
          |      ^
          |    u |
          a      0 --> n

   选项只有 arrowLength / arrowWidth，默认 8 / 4；笔记本调用时
   给的是 10 / 8。 */
function arrow(selection, ax, ay, bx, by, options = {}) {
  const dx = bx - ax
  const dy = by - ay
  const length = Math.sqrt(dx ** 2 + dy ** 2)
  const ux = dx / length
  const uy = dy / length
  const nx = -uy
  const ny = ux
  const h = options.arrowLength || 8
  const w = options.arrowWidth || 4
  const mx = bx - ux * h
  const my = by - uy * h
  const lx = mx - nx * w / 2
  const ly = my - ny * w / 2
  const rx = mx + nx * w / 2
  const ry = my + ny * w / 2

  selection.attr('points', `${ax},${ay} ${mx},${my} ${lx},${ly} ${bx},${by} ${rx},${ry} ${mx},${my}`)
    .attr('stroke-linejoin', 'round')
  return selection
}

/* ── 优化器 ──────────────────────────────────────────────────
   笔记本里的独立 cell，一字未动。

   三个半径 r = 2/3 的圆盘去盖单位正方形的内接正方形（边长 s = √2）。
   「软覆盖」是每个样本点被任一圆盘盖住的概率 —— 圆盘边界用
   logistic 平滑掉（TAU = 0.002），这样目标函数可微；「硬覆盖」才是
   真数点。梯度用有限差分（EPS = 1e-4）算，每次要调 7 遍 softCov
   （1 遍基准 + 6 个参数各扰动一次），优化器是 Adam。

   圆心从随机位置出发，跑 250 次迭代，每步 yield 一帧给外面画。 */
function* discCoverageOptimization() {

  const s = Math.sqrt(2);
  const r = 2 / 3;
  const MAX_ITER = 250;
  const BOUND_MIN = -r, BOUND_MAX = s + r;

  const GRID = 100;
  const samples = [];
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      samples.push([(i + 0.5) / GRID * s, (j + 0.5) / GRID * s]);
    }
  }

  const TAU = 0.002;

  function softCov(params) {
    let sum = 0;
    for (const [px, py] of samples) {
      let notCov = 1;
      for (let k = 0; k < 3; k++) {
        const d2 = (px - params[k * 2]) ** 2 + (py - params[k * 2 + 1]) ** 2;
        notCov *= (1 - 1 / (1 + Math.exp((d2 - r * r) / TAU)));
      }
      sum += (1 - notCov);
    }
    return sum / samples.length;
  }

  function hardCov(params) {
    let cnt = 0;
    for (const [px, py] of samples) {
      for (let k = 0; k < 3; k++) {
        if ((px - params[k * 2]) ** 2 + (py - params[k * 2 + 1]) ** 2 <= r * r) {
          cnt++;
          break;
        }
      }
    }
    return cnt / samples.length;
  }

  const EPS = 1e-4;

  function gradient(params) {
    const base = softCov(params);
    const g = new Float64Array(6);
    for (let i = 0; i < 6; i++) {
      params[i] += EPS;
      g[i] = (softCov(params) - base) / EPS;
      params[i] -= EPS;
    }
    return g;
  }

  function clamp(v) {
    return Math.min(BOUND_MAX, Math.max(BOUND_MIN, v));
  }

  // 随机初始圆心（每次刷新都不一样）
  let params = new Float64Array(6);
  for (let k = 0; k < 3; k++) {
    params[k * 2] = Math.random() * s;
    params[k * 2 + 1] = Math.random() * s;
  }

  // Adam 优化器状态
  let m = new Float64Array(6);
  let v2 = new Float64Array(6);
  let adamT = 0;
  const B1 = 0.9, B2 = 0.999, ADAM_EPS = 1e-8, LR = 0.01;

  let curSoft = softCov(params);
  let curHard = hardCov(params);
  let best = { params: params.slice(), hard: curHard, iter: 0 };

  // 轨迹记录
  const trails = [[], [], []];
  function pushTrail(p) {
    for (let k = 0; k < 3; k++) trails[k].push([p[k * 2], p[k * 2 + 1]]);
  }
  pushTrail(params);

  // 输出初始状态
  yield {
    params: params.slice(),
    soft: curSoft,
    hard: curHard,
    bestHard: best.hard,
    trails: trails.map(t => [...t]),
    iter: 0
  };

  // 主优化循环
  for (let iter = 1; iter <= MAX_ITER; iter++) {
    adamT++;
    const grad = gradient(params);

    for (let i = 0; i < 6; i++) {
      m[i] = B1 * m[i] + (1 - B1) * grad[i];
      v2[i] = B2 * v2[i] + (1 - B2) * grad[i] ** 2;
      const mh = m[i] / (1 - B1 ** adamT);
      const vh = v2[i] / (1 - B2 ** adamT);
      params[i] = clamp(params[i] + LR * mh / (Math.sqrt(vh) + ADAM_EPS));
    }

    curSoft = softCov(params);
    curHard = hardCov(params);

    if (curHard > best.hard) {
      best = { params: params.slice(), hard: curHard, iter };
    }

    pushTrail(params);

    yield {
      params: params.slice(),
      soft: curSoft,
      hard: curHard,
      bestHard: best.hard,
      trails: trails.map(t => [...t]),
      iter
    };
  }
};

export function mountCoveringSquare(container, options = {}) {
  if (!container) return Promise.resolve(null);

  const {
    controls = null,
    observe = null,
    autoplay = true,
    loop = false,
    loopDelay = 1500,
    maxFps = null
  } = options;

  let destroyed = false;
  let observer = null;
  let button = null;
  let teardown = null;
  let playControl = null;
  let pauseControl = null;

  const ready = renderD3(container, ({ d3 }) => {

    /* ── 画布 ──────────────────────────────────────────────── */
    const margin = { top: 30, right: 30, bottom: 40, left: 50 };
    const plotSize = Math.min(
      WIDTH - margin.left - margin.right,
      HEIGHT - margin.top - margin.bottom
    );

    // 数学坐标范围
    const s = Math.sqrt(2);
    const r = 2 / 3;
    const VIEW_MARGIN = r + 0.08;
    const xDomain = [-VIEW_MARGIN, s + VIEW_MARGIN];
    const yDomain = [-VIEW_MARGIN, s + VIEW_MARGIN];

    // 比例尺（SVG 坐标系 y 轴向下，所以 yScale 反置）
    const xScale = d3.scaleLinear()
      .domain(xDomain)
      .range([margin.left, margin.left + plotSize]);
    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([margin.top + plotSize, margin.top]);

    // 创建 SVG 元素。只给 viewBox：宽度由 CSS 拉满容器，高度按比例走
    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, WIDTH, HEIGHT]);

    // 背景：半透明正方形区域
    svg.append("rect")
      .attr("x", xScale(0))
      .attr("y", yScale(s))
      .attr("width", xScale(s) - xScale(0))
      .attr("height", yScale(0) - yScale(s))
      .attr("fill", "rgba(184,64,48,0.08)")
      .attr("stroke", "#1a2e3b")
      .attr("stroke-width", 1.5);

    // 坐标轴
    svg.append("g")
      .attr("transform", `translate(0,${yScale(0)})`)
      .call(d3.axisBottom(xScale).tickValues([-0.5, 0.5, 1.0, 1.5, 2.0]).tickSizeOuter(0))
      .style("font", "10px system-ui");
    svg.append("g")
      .attr("transform", `translate(${xScale(0)},0)`)
      .call(d3.axisLeft(yScale).tickValues([-0.5, 0.5, 1.0, 1.5, 2.0]).tickSizeOuter(0))
      .style("font", "10px system-ui");
    svg.append("text")
      .attr("x", xScale(0))
      .attr("dx", "-9")
      .attr("y", yScale(0))
      .attr("dy", "9")
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "hanging")
      .style("font", "10px system-ui")
      .text("0.0");
    svg.append('polyline')
      .call(arrow, xScale(0), yScale(0), xScale(0), yScale(s + 1.02 * VIEW_MARGIN), { arrowLength: 10, arrowWidth: 8 })
    svg.append('polyline')
      .call(arrow, xScale(0), yScale(0), xScale(s + 1.02 * VIEW_MARGIN), yScale(0), { arrowLength: 10, arrowWidth: 8 })

    // 三个圆盘的颜色
    const colors = ['#e07b30', '#3a7abf', '#7a4faa'];

    // 轨迹折线容器
    const trailG = svg.selectAll("g.trail")
      .data(d3.range(3))
      .join("g")
      .attr("class", "trail");

    // 圆盘容器
    const discG = svg.selectAll("g.disc")
      .data(d3.range(3))
      .join("g")
      .attr("class", "disc");

    // 状态信息文本。lang 是因为页面是 lang="en"，这一行是汉字，
    // 读屏该用中文音念
    const infoText = svg.append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 10)
      .style("font", "16px system-ui")
      .attr("fill", "#333")
      .attr("lang", "zh-CN");

    /* ── 画一帧 ──────────────────────────────────────────────
       笔记本里这是 chart cell 中 for…of 的循环体，原样搬过来，只是
       从「每帧跑一次」变成被调用一次。 */
    function paint(state) {
      // 更新轨迹
      trailG.each(function (d, i) {
        const polyline = d3.select(this).select("polyline");
        const points = state.trails[i].map(p => `${xScale(p[0])},${yScale(p[1])}`).join(" ");
        if (polyline.empty()) {
          d3.select(this).append("polyline")
            .attr("points", points)
            .attr("fill", "none")
            .attr("stroke", colors[i])
            .attr("stroke-width", 1.3)
            .attr("opacity", 0.75);
        } else {
          polyline.attr("points", points);
        }
      });

      // 更新圆盘
      const radiusPx = r * (xScale(1) - xScale(0)); // 圆的像素半径（保持比例）
      discG.each(function (d, i) {
        const cx = state.params[i * 2];
        const cy = state.params[i * 2 + 1];
        const px = xScale(cx);
        const py = yScale(cy);

        let g = d3.select(this);

        // 填充圆
        let fillCircle = g.select("circle.disc-fill");
        if (fillCircle.empty()) fillCircle = g.append("circle").attr("class", "disc-fill");
        fillCircle
          .attr("cx", px)
          .attr("cy", py)
          .attr("r", radiusPx)
          .attr("fill", d3.rgb(colors[i]).copy({ opacity: 0.22 }));

        // 轮廓圆
        let strokeCircle = g.select("circle.disc-stroke");
        if (strokeCircle.empty()) strokeCircle = g.append("circle").attr("class", "disc-stroke");
        strokeCircle
          .attr("cx", px)
          .attr("cy", py)
          .attr("r", radiusPx)
          .attr("fill", "none")
          .attr("stroke", colors[i])
          .attr("stroke-width", 1.4);

        // 圆心点
        let centerCircle = g.select("circle.disc-center");
        if (centerCircle.empty()) centerCircle = g.append("circle").attr("class", "disc-center");
        centerCircle
          .attr("cx", px)
          .attr("cy", py)
          .attr("r", 3)
          .attr("fill", colors[i]);
      });

      // 更新文字
      infoText.text(
        `迭代: ${state.iter} | 软覆盖: ${(state.soft * 100).toFixed(3)}% | 硬覆盖: ${(state.hard * 100).toFixed(3)}% | 最佳: ${(state.bestHard * 100).toFixed(3)}%`
      );
    }

    /* ── 播放 ────────────────────────────────────────────────
       笔记本里 chart cell 顶部那句 `replay;` 是个依赖声明：点一次
       Replay，整个 cell 重算一遍。这里等价于每次 play() 都把生成器
       重开一把。

       一帧一次迭代（笔记本里那 251 帧也是逐帧消费的）。一次迭代实测
       ~5.6ms，大头是 gradient 要调 7 遍 softCov、每遍 10000 个样本
       × 3 个圆，所以 250 次大约 4 秒，和笔记本的观感一致。作品页跑完
       就停，不循环；首页缩略图用 loop 选项跑完隔一会儿重来。

       第一帧（随机起点）在挂载时就画出来。这样「静态图 → 现场图」的
       交接不会有空白的一瞬；pendingIter 已经越过这一帧，真正起播时
       从第 1 步开始。 */
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cancel = null;                    // 停掉当前这一跑；null = 没在跑
    let running = false;
    let finished = false;
    let onScreen = !observe;
    let loopTimer = null;

    const initialIter = discCoverageOptimization();
    const firstState = initialIter.next().value;
    paint(firstState);
    let pendingIter = initialIter;

    function stopRun() {
      if (cancel) cancel();
      cancel = null;
      running = false;
      if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
    }

    function scheduleLoop() {
      if (loop && autoplay && !reduced.matches && onScreen && !loopTimer) {
        loopTimer = setTimeout(() => {
          loopTimer = null;
          play(true);
        }, loopDelay);
      }
    }

    function play(animate) {
      stopRun();

      const usePending = pendingIter !== null;
      const iter = usePending ? pendingIter : discCoverageOptimization();
      pendingIter = null;
      trailG.selectAll("polyline").remove();   // 上一跑的轨迹清掉，重画

      if (animate) {
        running = true;
        finished = false;
        let raf = 0;
        let lastFrame = 0;
        const minInterval = maxFps ? 1000 / maxFps : 0;

        const tick = (now) => {
          if (minInterval && now - lastFrame < minInterval) {
            raf = requestAnimationFrame(tick);
            return;
          }
          lastFrame = now;

          const { value, done } = iter.next();
          if (done) {
            running = false;
            finished = true;
            cancel = null;
            scheduleLoop();
            return;
          }
          paint(value);
          raf = requestAnimationFrame(tick);
        };
        cancel = () => {
          cancelAnimationFrame(raf);
          running = false;
        };
        tick(0);                            // 第 0 / 1 帧立刻出来
        return;
      }

      /* 减弱动态效果：站里的约定是「压制自动播、不压制用户点」（见
         assets/js/scrubber.js）。这页没有现成的静止帧可跳 —— 终点那帧
         也得算出来 —— 所以先把起点画出来（别让坐标系空着），再分片把
         整个下降算完、只画终点：每片 25 次迭代 ≈ 140ms，10 片、一共
         ~1.5 秒，片与片之间让出事件循环。一次同步算完要 1.4 秒，那样
         会把页面整个冻住。 */
      running = true;
      finished = false;
      const SLICE = 25;
      let timer = 0;
      let last = usePending ? firstState : iter.next().value;   // 第 0 帧
      paint(last);

      const slice = () => {
        for (let i = 0; i < SLICE; i++) {
          const { value, done } = iter.next();
          if (done) {
            paint(last);              // 只画终点，中间过程一帧都不画
            running = false;
            finished = true;
            cancel = null;
            return;
          }
          last = value;
        }
        timer = setTimeout(slice, 0);
      };
      cancel = () => {
        clearTimeout(timer);
        running = false;
      };
      slice();
    }

    playControl = play;
    pauseControl = stopRun;

    /* Replay 按钮。脚本建的（HTML 里只有个空盒子），和小龙虾那页的
       进度条同理：类名和 min-height 都写在静态 HTML / CSS 里，高度
       先占住，按钮冒出来时页脚不会跳。 */
    if (controls) {
      button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Replay';
      button.addEventListener('click', () => play(true));
      controls.append(button);
    }

    /* 传了 observe（首页缩略图）就等它进视口再播；滚出去停掉当前这一
       跑，回来时重新开始（生成器不能从半路接着跑，视觉上也看不出差别）。

       作品页不传 observe，onScreen 一直是 true：进页面就播；减弱动态
       效果时走缓存的终点帧分支。 */
    function sync() {
      if (!autoplay || reduced.matches) { stopRun(); return; }
      if (onScreen) {
        if (!running && (!finished || loop)) play(true);
      } else {
        stopRun();
      }
    }

    if (observe) {
      onScreen = false;
      observer = new IntersectionObserver((entries) => {
        onScreen = entries[0].isIntersecting;
        sync();
      });
      observer.observe(observe);
    }

    teardown = () => {
      stopRun();
      if (observer) { observer.disconnect(); observer = null; }
      if (button) { button.remove(); button = null; }
    };

    if (autoplay && reduced.matches && !observe) {
      // 作品页 + 减弱动效：不播，但把终点算出来
      play(false);
    } else {
      // 作品页：直接播；缩略图：等 IntersectionObserver 发话
      sync();
    }

    return svg.node();
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
      play: () => { if (!destroyed && playControl) playControl(true); },
      pause: () => { if (pauseControl) pauseControl(); },
      destroy: () => {
        destroyed = true;
        if (teardown) teardown();
        container.replaceChildren();
      }
    };
  });
}
