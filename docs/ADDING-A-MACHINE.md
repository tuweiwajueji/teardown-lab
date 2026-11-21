# 新建一台机器

本文是建机器的完整流程。新 session 只读这份文档、`docs/REVIEW.md` 和三台示例，就应该能独立做完一台机器。给 agent 的执行顺序和交付标准在文末「给 agent 的操作说明」。

## 0. 一台机器的文件

每台机器一个文件夹 `machines/<name>/`，`<name>` 用小写字母、数字和 `-`（也是命令参数和输出文件名）。按职责分文件：

| 文件 | 职责 | 规则 |
|---|---|---|
| `kin.js` | 数学：真实尺寸、真实单位、运动学 | 不 import three 的场景或材质（可以用 `THREE.Vector3` 之类的数学类型）。纯函数：给输入参数，返回姿态和读数。 |
| `geometry.js` | 代码建模：车削件、管件、实例化连杆；`update(input)` 摆姿态 | 尺寸全部从 `kin.js` 读，不再手写数字。 |
| `stage.js` | 影棚、灯光、阴影、后期（GTAO、bloom）；`frame(...)` 画一帧 | 必须支持 `look.lo`（见第 6 节）。 |
| `console.js` | 叠加层：固定 1600×900 CSS 布局的面板、图表、开关、带引线的标注；`update(state)` 按当帧状态重画 | 读数从 `kin.js` 来，和姿态同源。 |
| `film.js` | 巡游脚本：从 `timeline.json` 读 SCRIPT，`render(t)` 是 t 的纯函数；导出 `run()` | 见第 4 节。 |
| `timeline.json` | `{"duration": 秒, "script": [{"t": 秒, ...}, ...]}`，影片的每个节拍 | 画面和配乐唯一的时间来源。 |
| `live.js` | 交互页：按钮、拖动环绕、缩放、按键、无人操作时自动巡游；导出 `runLive()` | 复用 `film.js` 的 VIEW_FN、SCRIPT、光标。 |
| `score.py` | 配乐：`score(mix, tl)` | 所有时间都从 `tl["script"]` 推出来，不手写时刻。 |

机器需要更多文件时可以加（如塞斯纳的 `flight.js` 放飞行阶段），但上面八个必须有。kit 用包名引用：`import {runSim} from 'teardown-kit/runtime.js'`、`'teardown-kit/util.js'`、`'teardown-kit/warm.js'`。

三台示例是模板，开工时复制最接近的一台：

| 示例 | 驱动参数 | 适合参考 |
|---|---|---|
| `v8` | 曲轴转角；点火顺序 1-8-4-3-6-5-7-2；缸压模型 | 剖切模式（玻璃/剖面/实体）、按点火顺序选缸、与曲轴同步的实时图表 |
| `cessna` | 行程 0..1：201 mm 齿条带 32 齿（模数 4 mm）小齿轮转 180° | 一个自由度驱动整套机构、飞行阶段是时间的函数、跑道在模型下滚动 |
| `strandbeest` | 风速；曲轴转速由风积分得到，每个关节由 Jansen 的 11 个连杆长度做圆交 | 精确连杆求解、实例化管件、足迹、20 只脚的触地图 |

## 1. 先找参考，再动手

**不要凭想象建模。** 先找到：

- 实物照片（多个角度）；
- 剖面图、爆炸图；
- 维修手册或厂家资料里的结构图；
- 如果有，实物运转的视频。

把参考来源（链接、页码）写在 `kin.js` 文件头注释里。建模时对照参考逐帧比较。只凭一句话描述做出来的机器每次都很普通；有参考可对照时，能把真实机器还原得很接近。

## 2. 先拿真实尺寸

在写任何几何体之前，把真实尺寸写进 `kin.js` 的参数块，带单位注释：缸径、行程、连杆长、齿数、模数、连杆长度、轮径、行程角……按机器类型取。示例：

```js
export const E = {
  bore: 101.6, // mm, 4.00 in
  stroke: 88.9, // mm, 3.50 in
  rod: 145.0, // mm
};
```

用手算验证一个值，并把验算写进注释。例如塞斯纳：32 齿 × 4 mm 模数 = 128 mm 分度圆直径，半周长正好是 201 mm 行程。验算对不上，先查资料，不要调数字凑画面。

## 3. 一个输入参数驱动一切

选一个物理输入：曲轴转角、行程、风速……所有零件姿态、面板读数、图表、配乐中的机构声都由它算出来。

- 不手工打关键帧；
- 面板上的每个数字都调用同一个给零件摆姿态的函数，画面和读数不可能不一致；
- 影片、交互页、配乐共用这条链：`时间 → 输入参数 → kin.js → 姿态 + 读数`。

零件穿模时，用参数块里的数字修（改尺寸或位置），**不要用机位把它藏起来**。

## 4. render(t) 必须是纯函数

`film.js` 的骨架：

```js
import {runSim} from 'teardown-kit/runtime.js';
import TIMELINE from './timeline.json';

export const SCRIPT = TIMELINE.script;
export const DURATION = TIMELINE.duration;
export const DEFAULTS = {duration: DURATION, fps: 60, theme: 'light', hud: {enabled: false}, director: {enabled: false}, watermark: ''};

export function makeFilm() {
  return async ({cfg, canvas, capture}) => {
    const st = createMyStage({canvas, look: cfg.look});
    // 搭场景，预计算所有有状态的东西
    return {render(t) { /* 从头画出第 t 秒这一帧 */ return {}; }, resize(w, h) {}};
  };
}
export const run = () => runSim(DEFAULTS, makeFilm());
```

- 禁止 `Math.random`：需要随机就在 setup 里用 `kit/runtime/util.js` 的 `rng(seed)`（种子随机）。
- 禁止 `Date`、`performance.now()` 等任何时钟。
- 帧与帧之间不保留状态。捕获会以任意顺序、任意时刻调用 `render(t)`（静帧表就是跳着取的）。
- 按自己规则运动的东西（粒子、风沙）在加载时模拟一次存进 typed array，`render` 只读。随时间积分的量（Strandbeest 在变化风速下的曲轴角）在加载时制表或用闭式解，参见 `machines/v8/film.js` 的 `TH` 表。
- 检查：`grep -nE "Math\.random|Date|performance\.now" machines/<name>/*.js` 应该没有结果。

## 5. timeline.json：音画同表

影片的每个节拍写进 `timeline.json`，单位秒：

```json
{
  "duration": 26,
  "script": [
    {"t": 0, "cam": "open"},
    {"t": 3.5, "cam": "cyl"},
    {"t": 12.1, "rpm": [700, 2400, 1.4]}
  ]
}
```

- `film.js` 只从这里读 SCRIPT 和 DURATION；
- `score.py` 只从 `tl["script"]` 推时间，比如点击声 = 所有 `t > 0` 的节拍、机位移动的气声 = 带 `cam` 的节拍；
- `npm run stills` 每个节拍出一张；`kit/wave.mjs` 把节拍画成配乐波形上的竖线。

改一个节拍只改 `timeline.json`，画面、声音、静帧表一起跟着变。

## 6. 第 0 帧就是缩略图

`render(0)` 必须已经完整地展示机器：机器在画面中、灯光到位、面板已经有读数。不要从黑场、空场或淡入开始。

## 7. 舞台与画质

`stage.js` 导出 `create<Name>Stage({canvas, look = {}})`，`look.lo` 为真时：

- 关 GTAO（`gtao.enabled = false`）；
- 关 MSAA（渲染目标 `samples: 0`）；
- 基础阴影（`THREE.BasicShadowMap`，阴影贴图 2048）。

环境贴图只在加载时烘一次，lo 里可以保留，否则光泽黑色零件会变成剪影（V8 就是这样）。

画质和 GPU 由 `kit/paths.mjs` 决定，`kit/capture.mjs` 把 lo 作为 `cfg.look.lo` 传给页面：

| 环境 | 默认 GPU | 默认画质 |
|---|---|---|
| Linux、CI（`CI` 环境变量） | SwiftShader（`--use-angle=swiftshader --enable-unsafe-swiftshader`） | lo |
| macOS、Windows | 真实 GPU | hi |

可用环境变量覆盖：`TEARDOWN_GPU=hw|swiftshader`、`TEARDOWN_QUALITY=hi|lo`。两条已知的坑：

- 无 GPU 时不加 SwiftShader 标志，WebGL2 起不来，页面永远不会 ready；
- 软件渲染下跑全画质会挂（1920×1080 截图超时）。所以无 GPU 一律用 lo。

交互页另外有自己的画质分级（各示例 `live.js` 里的 `TIERS`），在集成显卡上要能跑。

## 8. 交互页

`live.js` 导出 `runLive()`。最低要求：

- 每个子系统一个按钮（视图、剖切、叠加层），按下时正在工作的零件打开；
- 拖动环绕、滚轮缩放；
- 无人操作几秒后自动巡游（复用 `film.js` 的 SCRIPT 和光标），有人操作立即交还控制；
- 用 `teardown-kit/warm.js` 预编译 shader，首帧不卡；
- `npm run build <name>` 出的 `teardown-out/dist/<name>.html` 小于 1 MB（构建超过会直接失败），离线 `file://` 能打开。

## 9. 配乐

`score.py` 骨架参照示例：`TIMELINE = "timeline.json"`、`SEED`、`TARGET_LUFS = -14.0`，以及 `score(mix, tl)`。`kit/sfx/score_kit.py` 有和弦铺底、每次做功的低音 thud、马达声、拖动下的气声。`python3 kit/run_sfx.py --list` 列出所有发声器；`sample()` 可以加入 `kit/sfx/samples/` 里的 CC0 录音。

- 每个时间都来自 timeline，不写数字常量；
- 母带自动处理到 −14 LUFS、true peak ≤ −2 dBFS；
- 只做点缀，不做解说：连续运动不配声。所有音高用同一个调。

## 10. 评审循环

按 `docs/REVIEW.md` 做：`npm run stills <name>` → 逐张查机构干涉、构图（裁切、焦点）、文字、时序 → 修 → 重来，直到完整一遍没问题；然后 `npm run film <name>`，读成片静帧表和波形图。

## 11. 命令速查

```bash
npm install                                  # clean checkout 后一条命令：依赖 + Chromium + ffmpeg
npm run build  <name>                        # teardown-out/dist/<name>.html（交互页）和 <name>-film.html
npm run stills <name>                        # teardown-out/<name>-stills.png
npm run film   <name>                        # teardown-out/<name>.mp4 + <name>_wave.png
npm run film   <name> -- --fps 30            # 降帧率加快出片（默认 60）
npm run film   <name> -- --from 0 --to 5     # 只出前 5 秒的小样
TEARDOWN_QUALITY=hi npm run stills <name>    # 有 GPU 时强制全画质
```

系统要求：Node ≥ 20、Python 3（只用标准库）。ffmpeg 和 Chromium 由 `npm install` 安装。

---

## 给 agent 的操作说明

收到「按库规范建 X」时，按这个顺序做，每一步做完再进下一步。

1. **读规范**：读本文、`docs/REVIEW.md`、`AGENTS.md`，以及最接近 X 的示例机器的全部文件。
2. **找参考**：搜集 X 的照片、剖面图、手册结构图。把来源写进 `kin.js` 文件头。找不到可靠参考时停下来问用户要。
3. **定尺寸和驱动参数**：列出真实尺寸表（带单位和出处）、选定唯一的输入参数，手算验证至少一个值。把尺寸表和驱动参数先发给用户确认，再开始建模。
4. **建分支、复制模板**：`git checkout -b devin/<时间戳>-machine-<name>`，复制最接近的示例到 `machines/<name>/`，改名、清掉示例特有的内容。
5. **按依赖顺序写**：`kin.js`（先在 Node 里跑通几个值）→ `geometry.js` → `stage.js`（含 `look.lo`）→ `console.js` → `timeline.json` + `film.js` → `score.py` → `live.js`。
6. **每写完一层就出静帧**：`npm run stills <name>`，读图，修。不要等全部写完才第一次看画面。
7. **评审循环**：按 `docs/REVIEW.md` 清单逐张查，直到完整一遍没问题。
8. **出片**：先用交付尺寸渲 2 秒测耗时（`node kit/capture.mjs <name>-film --size 1600x900 --dpr 1.2 --to 2 --out teardown-out/probe.mp4`），推算全片时长并告诉用户，再 `npm run film <name>`。读成片静帧表和 `_wave.png`，确认声音落在节拍上。
9. **加进 CI**：把 `<name>` 加进 `.github/workflows/ci.yml` 的 `machine` 矩阵。
10. **开 PR，不合并**：PR 描述附静帧表、交互页截图、出片时长和文件大小，逐条写下面的交付标准结果。

### 做到什么程度算交付

全部满足才算交付：

- [ ] `machines/<name>/` 下八个必需文件齐全，职责符合第 0 节；kit 只通过 `teardown-kit/` 引用。
- [ ] `kin.js` 顶部有参考来源和尺寸表，至少一个手算验证写在注释里。
- [ ] 一个输入参数驱动全部姿态和读数；面板数字与姿态一致。
- [ ] `grep -nE "Math\.random|Date|performance\.now" machines/<name>/*.js` 无结果。
- [ ] `render(0)` 即缩略图：机器完整可见。
- [ ] `npm run build <name>` 成功，交互页 < 1 MB，离线打开能按按钮、拖动、自动巡游。
- [ ] `npm run stills <name>` 成功，静帧表逐张查过：无干涉、无裁切、文字完整、每个状态停留够长。
- [ ] `npm run film <name>` 在无 GPU（lo）环境出片成功，时长等于 `timeline.json` 的 `duration`，配乐落在节拍上（看 `_wave.png`）。
- [ ] `score.py` 不含手写时刻，全部从 `tl["script"]` 推出。
- [ ] CI 矩阵已加入新机器且通过。
- [ ] PR 已开，未合并。
