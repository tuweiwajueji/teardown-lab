# AGENTS.md

给在这个仓库里工作的 agent。

- 用户说「按库规范建 X」：按 `docs/ADDING-A-MACHINE.md` 末尾「给 agent 的操作说明」逐步做，交付标准也在那里。评审规则在 `docs/REVIEW.md`。
- 环境：`npm install` 一条命令装好全部依赖（含 Chromium、ffmpeg）。另需 Node ≥ 20、Python 3。
- 本机多半没有 GPU：在 Linux 上 kit 自动用 SwiftShader + lo 画质，不要改成全画质跑（软件渲染下全画质会挂）。`capture` 打印的 `gpu:` 一行说明实际用的渲染器。
- 出交付片之前，先用交付时的尺寸和画质渲一小段测耗时（`node kit/capture.mjs <name>-film --size 1600x900 --dpr 1.2 --to 2 --out teardown-out/probe.mp4`，先 `npm run build <name>`），按帧数推算全片要多久，告诉用户后再开渲。参考：v8 在无 GPU + lo 下约 1 秒/帧，26 秒 60fps 全片约 25 分钟。
- 不要手工给零件打关键帧，不要在 `render(t)` 里用 `Math.random`、`Date`；所有影片时间写进 `timeline.json`。
- 没读过当前渲染的静帧表，不能报告完成。
- 不要改 `kit/` 来迁就某一台机器；kit 的改动要对三台示例都重跑 `npm run stills`。
- 出处：改动 `kit/` 或示例时保留文件头和 `NOTICE.md` 的署名。
- PR 开出后不要合并，除非用户明确要求。
