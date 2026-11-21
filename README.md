# teardown-lab

可长期复用的 3D 拆解模拟器库。每台真实机器一个文件夹，一套代码同时产出三样东西：

- **交互页**：单文件离线 HTML（< 1 MB），中间是运转的机器，周围面板显示真实数值；按钮打开子系统，可拖动环绕，无人操作时自动巡游。
- **影片**：逐帧渲染的 mp4，配乐由同一张 timeline 合成，音画对齐。
- **评审静帧表**：每个节拍一张，用来逐项检查机构、构图、文字、时序。

整理自 [elvarofficial/teardown](https://github.com/elvarofficial/teardown)（MIT），它基于 [whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion)（MIT）；录音采样为 CC0。详见 [NOTICE.md](NOTICE.md) 和 [LICENSE](LICENSE)。

## 安装

需要 Node ≥ 20 和 Python 3（只用标准库）。clean checkout 后：

```bash
npm install
```

这一条命令会装好 three、esbuild、字体、Playwright 和它的 Chromium，以及 ffmpeg/ffprobe（`ffmpeg-static`、`ffprobe-static`）。Linux 上如果 Chromium 缺系统库，再跑一次 `npx playwright install-deps chromium`（需要 root）。

## 命令

```bash
npm run build  v8      # teardown-out/dist/v8.html（交互页）+ v8-film.html（给捕获用）
npm run stills v8      # teardown-out/v8-stills.png，整帧在 v8-stills-frames/
npm run film   v8      # teardown-out/v8.mp4（1920×1080，60 fps，带配乐）+ v8-wave.png
```

机器名：`v8`、`cessna`、`strandbeest`。常用参数（放在 `--` 之后）：

| 参数 | 作用 |
|---|---|
| `--fps 30` | film 降帧率（默认 60） |
| `--from 0 --to 5` | film 只出一段小样 |
| `--stills every:0.2 --from 3 --to 5` | stills 逐 0.2 s 看一段转场 |
| `--stills 4.2,9.8` | stills 指定时刻 |
| `--size 1600x900 --dpr 1.2` | 捕获布局和像素倍率（默认值） |

## 有 GPU / 无 GPU

`kit/paths.mjs` 自动选择：

| 环境 | 渲染 | 画质 |
|---|---|---|
| Linux、CI | SwiftShader（`--use-angle=swiftshader --enable-unsafe-swiftshader`） | lo：关 GTAO、关 MSAA、基础阴影 |
| macOS、Windows | 真实 GPU | hi：全画质 |

覆盖：`TEARDOWN_GPU=hw|swiftshader`、`TEARDOWN_QUALITY=hi|lo`、输出目录 `TEARDOWN_OUT`。捕获时打印的 `gpu:` 一行显示实际渲染器。软件渲染下不要用 hi：全画质在 1920×1080 下截图会超时、GPU 进程会挂。

## 目录

```
machines/<name>/      一台机器：kin / geometry / stage / console / film + timeline.json / live / score
kit/runtime/          页面运行时（runSim、HUD、director、shader 预热、工具函数、样式）
kit/build.mjs         打包成单文件 HTML
kit/capture.mjs       逐帧捕获：mp4、单帧、静帧表
kit/cli.mjs           npm run build|film|stills
kit/paths.mjs         依赖、二进制、GPU/画质选择
kit/sfx/              纯 Python 合成器、混音、响度母带，CC0 采样
kit/wave.mjs          配乐波形 + timeline 节拍线
kit/sheet.mjs         成片静帧表
kit/UPSTREAM-SKILL.md 上游原版技能说明（路径是上游的，仅供参考）
docs/                 新建机器规范、评审规则
```

## 新建一台机器

读 [docs/ADDING-A-MACHINE.md](docs/ADDING-A-MACHINE.md)（流程、规则、给 agent 的操作说明和交付标准）和 [docs/REVIEW.md](docs/REVIEW.md)（评审循环）。在 Devin 里说「按库规范建 X」即可。
