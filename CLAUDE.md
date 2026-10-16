# 这个仓库的硬规矩

纯静态 GitHub Pages 作品集（`fanfanpa.github.io`），无构建步骤，直接从 `main` 发布。
下面几条是用户划过的线，不要自作主张改动：

- **LICENSE 一个字都不动** —— 包括版权持有人那一行。（它本来就是从模板意外带进来的，
  用户听过完整分析后决定保持现状，别再提「要不要换个许可证」。）
- **不加水印**，作品图上也不要加任何标记。
- **作品原图统一 JPEG q85**（`python tools/compress.py --apply`）。不要再提议提高画质、
  换 WebP 或恢复原图 —— 体积和画质之间的取舍用户已经做过了。
- **代码现场绘制的作品页只从 CDN 动态 `import()` d3 / Observable Plot**，不下载到本地、
  不加构建步骤。这是全站唯一的外部依赖，是知情选择。
- **`data/site.js` 里的 `fanfanpa` 不要改名**（站名显示成 X.B. 是另一回事）。
- **`git push` 必须走本地代理**：`git -c http.proxy=http://127.0.0.1:10809
  -c https.proxy=http://127.0.0.1:10809 push origin main`。直连不通，代理没开就先问用户。
- **新增作品页的完整流程见 [.claude/skills/add-work/](.claude/skills/add-work/SKILL.md)**，
  照着走，别每次重新发明。

改动作品页或公共 CSS/JS 之后，跑一遍仓库外的浏览器回归套件 `F:\temp\sc-test`（t1–t6），
细节见 skill 里的 `references/harness.md`。
