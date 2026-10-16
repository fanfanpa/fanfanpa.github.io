# 浏览器实测（仓库外 `F:\temp\sc-test`）

工具不进 git，也别往仓库里搬。改完作品页或公共 CSS/JS 就得真跑一遍 ——
`type="module"` + CDN import 在 `file://` 下会被 CORS 拒掉，失败兜底、窄屏、
减弱动效这些也只有真浏览器能验。

## 起服务

```
node F:/temp/sc-test/serve.mjs "<仓库根目录>" 8123      # 后台起一次就够
```

根目录指向仓库，端口 8123 是各测试里写死的 base；`/__test/*` 映射到
`F:\temp\sc-test\harness`（窄屏 iframe 那些都放那儿）。用完了自己记着关。

## 套件

```
node F:/temp/sc-test/t1-controls.mjs    # 控件出得来、属性和预期一致、动画在跑、滑块跟着走
node F:/temp/sc-test/t2-state.mjs       # 点按钮停得住、区分 trusted 拖动和合成的 input
node F:/temp/sc-test/t3-harness.mjs     # 离线暂停不被手动暂停覆盖、键盘、没移植的选项要抛错、loop/autoplay 语义
node F:/temp/sc-test/t4-misc.mjs        # 减弱动效、防跳动、失败兜底、grid-world 没被牵动
node F:/temp/sc-test/t5-narrow.mjs      # 390px 窄屏下控件不能撑出横向滚动条
node F:/temp/sc-test/t6-fit.mjs         # 图和控件要能同屏、两者宽度对齐、grid-world 和窄屏不能受影响
```

t1–t6 约 157 条，是回归基线：**动过公共 CSS/JS 就必须全绿**。
`t7-*` 是当时在做的那个作品页的专项探针（`t7-armadillo` / `t7b-ref` /
`t7c-home` / `t7-covering`）。新作品照它们的样子写一份 —— 直接复制最接近的
那个改，`cdp.mjs` 的 `launch()` 返回 `{ port, proc, ws, send, on, evaluate,
goto, waitFor, sleep, ready, close }`，headless Chrome 走 CDP，
`evaluate` 自动 `awaitPromise` + `returnByValue`。

## 常踩的坑

- `scrollTo` 要带 `behavior: 'instant'` —— 站点有 `scroll-behavior: smooth`，
  不带的话量到的是滚动途中的位置。
- Chrome 在 Windows 上把窗口最小宽度卡在 512px，**量 390px 窄屏必须套 iframe**
  （`harness/narrow.html` 就是干这个的）。
- 模拟 CDN 挂掉用 `Network.setBlockedURLs`，但**要看拦的是谁的地址**：
  d3 / Plot 的地址写在 `assets/js/plot-work.js` 里，页面自己的数据地址才在页面里
  （armadillo 是 unpkg，两个都得拦才是完整的失败路径）。
- `Emulation.setDeviceMetricsOverride` 改 `deviceScaleFactor` 只会让页面里的
  `window.devicePixelRatio` 变，**不会派发 resize 事件**。要验「按 dpr 重建
  canvas」那条分支，得自己在页面里 `dispatchEvent(new Event('resize'))`。
- 减弱动效用 `Emulation.setEmulatedMedia` 置 `prefers-reduced-motion: reduce`，
  设置要在 **goto 之前**生效（页面加载时读一次）。
- 截图存档在 `F:\temp\sc-test\*.png`，量几何用 `measure.py`（只比与裁剪无关的比值）。
- 「一屏」是**滚过标题之后**图＋控件占满视口，不是「从页面顶部滚起就全看见」——
  量的时候先 `scrollTo` 到图的 top。
