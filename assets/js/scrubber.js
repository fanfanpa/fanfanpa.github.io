/* =============================================================
   scrubber.js — 帧序列的播放控制条（进度条 + 播放/暂停按钮）

   移植自 Mike Bostock 的 Observable 笔记本 @mbostock/scrubber。

   那个笔记本没法直接 import：npm 上没有这个包（@mbostock 是用户的
   名字，不是 npm 作用域），api.observablehq.com 给的是笔记本的 cell
   序列，得靠 Observable 运行时组装，它自己还依赖运行时注入的 md /
   html(htl) / Inputs。所以按它的设计重写成一个普通模块，把运行时那
   部分去掉。

   用法（见 works/2025-11/crayfish-production-2015-2024/index.html）：

     import { createScrubber } from '../../../assets/js/scrubber.js';

     createScrubber(document.getElementById('scrubber'), {
       values: d3.range(2015, 2025),
       format: y => `Year: ${y}`,
       label: 'Year',
       delay: 800,
       observe: container,
       onchange: year => paint(year),
     });

   ── 和笔记本逐字一致的地方 ─────────────────────────────────────

     · 收 values 数组，不用 min/max/step —— 滑块内部的值是数组下标，
       读数靠 format 转
     · autoplay / loop / delay / initial 的语义
     · 手拖滑块即暂停；程序改 value 不派发 input，所以不会停自己
     · 用 event.isTrusted 区分用户拖动和合成事件

   ── 本站在此之上加的两条策略（笔记本里没有）──────────────────

     · 传了 observe 的元素滚出视口就暂停，滚回来接着播。只作用于自动
       播放那一档 —— 用户点过播放之后滚多远都照播，见 shouldRun()
     · 尊重 prefers-reduced-motion：开了就不自动播，静态停在最后一
       帧（静态图里信息最全的一帧）；中途改这个设置也跟着切，但用户
       自己点过播放/暂停之后就以用户的为准

   ── 没移植的笔记本选项 ───────────────────────────────────────
   alternate / direction / loopDelay（来回反弹、循环前停一下）和
   delay: null 的 requestAnimationFrame 模式。传了会直接抛错，不会
   静默忽略 —— 静默忽略会让将来移植的笔记本行为悄悄不对。
   ============================================================= */

const NOT_PORTED = 'alternate / direction / loopDelay 和 delay: null 的 requestAnimationFrame 模式还没移植，见文件头';

export function createScrubber(mount, options = {}) {
  if (!mount) return;

  const {
    values: rawValues,
    format = (value) => String(value),
    initial = 0,
    delay = 800,
    loop = true,
    autoplay = true,
    label = 'Frame',
    observe = null,
    onchange = null,
  } = options;

  if (options.alternate) throw new Error(`scrubber: ${NOT_PORTED}`);
  if (options.loopDelay != null) throw new Error(`scrubber: ${NOT_PORTED}`);
  if (options.direction !== undefined && options.direction !== 1) {
    throw new Error(`scrubber: ${NOT_PORTED}`);
  }
  if (delay === null) throw new Error(`scrubber: ${NOT_PORTED}`);

  const values = Array.from(rawValues || []);
  if (!values.length) throw new Error('scrubber: values 不能是空的');
  // 写成 !(delay >= 1) 不写 delay < 1：NaN 跟谁比都是 false，会漏过去，
  // 然后 setInterval(tick, NaN) 等价于 0 毫秒，直接把页面卡死
  if (!(delay >= 1)) throw new Error('scrubber: delay 是毫秒数，要 >= 1');

  const last = values.length - 1;
  // initial 越界的话 values[index] 是 undefined，读数会变成 "Year: undefined"。
  // 滑块自己会被 min/max 夹住，index 不会，所以得在这儿夹一次。
  const first = Math.max(0, Math.min(last, Math.trunc(initial) || 0));

  /* 状态：index 是唯一真值，其余都只是它的约束条件。

     intent 用四态而不是布尔。「用户还没表过态」（auto）和「用户要求暂停」
     （pause）是两回事：前者听系统设置和视口的，后者那两样都说了不算。
     done 是 loop: false 播到末帧之后的状态 —— 它不能并进 pause，否则
     再点一下播放会从末帧原样继续，看起来像是按钮坏了。 */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  let index = reduced.matches ? last : first;
  let intent = 'auto';                        // 'auto' | 'play' | 'pause' | 'done'
  let onScreen = true;
  let timer = null;

  /* ── 控件 ────────────────────────────────────────────────────
     mount 上的 class 是页面写在 HTML 里的：控件要等模块脚本跑起来
     才存在，class 写在这儿的话，加载期间就没有预留高度，控件出现时
     页脚会跳一下。这里再补一次只是防御。 */
  mount.classList.add('scrubber');
  mount.setAttribute('role', 'group');
  mount.setAttribute('aria-label', 'Animation controls');

  const button = document.createElement('button');
  button.type = 'button';

  const range = document.createElement('input');
  range.type = 'range';
  // 顺序要紧：input[type=range] 默认 min=0 max=100，先设 value 会被 clamp
  range.min = '0';
  range.max = String(last);
  range.step = '1';
  range.value = String(index);
  range.setAttribute('aria-label', label);

  /* 读数用 <span> 不用 <output>：<output> 在 HTML-AAM 里映射成
     role=status，是个礼貌级播报区 —— 自动播放时每 800ms 播报一次年
     份，读屏用户会被连续轰炸。年份由 range 的 aria-valuetext 承担，
     这段可见文字对辅助技术是重复的，所以藏起来。 */
  const readout = document.createElement('span');
  readout.setAttribute('aria-hidden', 'true');

  mount.append(button, range, readout);

  /* ── 状态机 ──────────────────────────────────────────────────
       intent 是用户的意思，'auto' 表示他还没表过态；shouldRun() 是这一刻
       到底该不该转。只有 sync() 能启停定时器，别的分支一律改完状态再
       调它，免得出现「定时器停了但按钮还写着 Pause」这种对不上的状态。

     滚出视口的暂停只作用于 'auto' 这一档，用户明确点过播放之后就按他的
     意思办，滚到哪儿都播。这不是妥协：控件在画布**下面**，人滚下来够控件
     的时候画布多半正好在视口外，要是连这一档也拦，就会变成「站在控件前面
     点了播放却什么都不动」。自动那一档拦下来就够了 —— 它要防的是「放着
     不管，滚走了还在烧 CPU」。 */
  function shouldRun() {
    if (intent === 'play') return true;
    if (intent === 'auto') return autoplay && !reduced.matches && onScreen;
    return false;                            // 'pause' 和 'done'
  }

  function start() {
    if (timer !== null) return;
    timer = setInterval(tick, delay);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  /* 按钮的文字跟着实际状态走，不跟 intent 走。两个理由：一是屏幕阅读器
     听到的名字得描述这个键真正会做的事，不能报一个当前不成立的承诺；
     二是 intent 和实际状态一旦不一致（滚出视口时就是），按钮就会说
     Pause 却什么都没在播，点下去也看不出变化。 */
  function sync() {
    const run = shouldRun();
    if (run) start(); else stop();
    button.textContent = run ? 'Pause' : 'Play';
    button.setAttribute('aria-label', run ? 'Pause the animation' : 'Play the animation');
  }

  function show() {
    range.value = String(index);
    const text = format(values[index]);
    range.setAttribute('aria-valuetext', text);
    readout.textContent = text;
  }

  function emit() {
    if (onchange) onchange(values[index], index, values);
  }

  function tick() {
    if (index >= last) {
      if (!loop) { intent = 'done'; sync(); return; }
      index = 0;
    } else {
      index += 1;
    }
    show();
    emit();
  }

  /* ── 输入 ────────────────────────────────────────────────── */

  button.addEventListener('click', () => {
    if (shouldRun()) {
      intent = 'pause';
    } else {
      if (intent === 'done') { index = first; show(); emit(); }    // 播完再点就是重播
      intent = 'play';
    }
    sync();
  });

  range.addEventListener('input', (event) => {
    // 只在 pointerdown 上暂停是不行的：手机上手指按住滑块准备滚页面
    // 时会先收到 pointerdown，一碰就误暂停。只认 input。
    if (!event.isTrusted) return;
    index = range.valueAsNumber;
    intent = 'pause';
    show();
    sync();
    emit();
  });

  /* 滚出视口就停：动画每帧要重建整棵图，看不见的时候没必要占 CPU */
  if (observe) {
    new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      sync();                                  // 不动 intent，所以手动暂停不会被它覆盖
    }).observe(observe);
  }

  /* 中途改「减弱动态效果」也生效，但只在用户没表过态的时候 ——
     用户点过播放/暂停之后，系统设置不该再改他的主意。 */
  reduced.addEventListener('change', () => {
    if (intent === 'auto') {
      index = reduced.matches ? last : first;
      show();
      emit();
    }
    sync();
  });

  show();
  sync();
  emit();

  return mount;
}
