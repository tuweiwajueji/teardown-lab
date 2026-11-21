# 出处与许可

teardown-lab 整理自两个 MIT 开源项目，并带有一批 CC0 录音采样。整理时保留了原作者的版权声明。

| 来源 | 许可 | 在本仓库中的位置 |
|---|---|---|
| [elvarofficial/teardown](https://github.com/elvarofficial/teardown)：三台示例机器（V8、塞斯纳 337 起落架、Strandbeest）、构建与捕获脚本、配乐 score、技能规范 | MIT，Copyright (c) 2026 elvarofficial | `machines/`、`kit/`、`kit/UPSTREAM-SKILL.md` |
| [whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion)：kit（runtime、逐帧捕获、sfx 引擎）与评审规则，teardown 以它为基础 | MIT，Copyright (c) 2026 whaleyxbt | `kit/runtime/`、`kit/capture.mjs`、`kit/sfx/`、`docs/REVIEW.md` |
| Freesound 录音采样（经 [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) 的 `sound-effects` 技能裁剪、归一化，MIT） | CC0 1.0 | `kit/sfx/samples/`，逐条来源见 `kit/sfx/samples/SOURCES.md` |

两份 MIT 版权声明都在根目录 `LICENSE` 里。teardown-lab 自己新增的代码和文档同样以 MIT 发布。

## 相对上游的改动

- 目录：上游 `sims/<name>-shared|-live|-film/` 拆成 `machines/<name>/` 下按职责分开的文件（见 `docs/ADDING-A-MACHINE.md`）；塞斯纳的 `gear.js` 拆成 `kin.js`（数学）和 `geometry.js`（建模）。
- 时间线：影片的 SCRIPT 从 `film.js` 移到 `timeline.json`，`score.py` 只从同一个文件读时间，音画同表。重构后 V8 和塞斯纳的配乐与上游逐字节一致；Strandbeest 只有浮点舍入带来的采样级差异。
- 命令：统一为 `npm run build|film|stills <machine>`（`kit/cli.mjs`），`npm install` 一条命令装好 Chromium 和 ffmpeg。
- 无 GPU：`kit/paths.mjs` 在 Linux/CI 下自动用 SwiftShader，并默认切到 lo 画质；三台机器的 `stage.js` 都支持 `look.lo`。
