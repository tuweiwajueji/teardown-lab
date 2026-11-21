# 评审规则

来自 claude-motion / teardown 的评审规则，适用于每一台机器。**你看不到视频，只能看帧。没有读过当前渲染的静帧表，就不能说一台机器做完了。**

## 评审循环

1. `npm run stills <machine>`：每个 timeline 节拍一张，取节拍后 0.3 s，每张标 `t=`。输出 `teardown-out/<machine>-stills.png`，整帧在 `teardown-out/<machine>-stills-frames/`。
2. 按下面的清单逐张读。
3. 放大看：
   - 一段转场：`npm run stills <machine> -- --stills every:0.2 --from A --to B`
   - 指定时刻：`npm run stills <machine> -- --stills 4.2,9.8`
   - 单张整帧：`node kit/capture.mjs <machine>-film --size 1600x900 --dpr 1.2 --still T`
4. 修改、重建，回到第 1 步。完整一遍没发现问题才停。
5. 出片后：`npm run film <machine>`，再读成片的静帧表 `node kit/sheet.mjs --video teardown-out/<machine>.mp4 --timeline machines/<machine>/timeline.json`（它看的是编码器实际写出的画面），以及 `teardown-out/<machine>-wave.png`（配乐波形叠 timeline 节拍线）。

## 清单（每张都查）

- **机构**：该接触的接触；没有零件穿过另一个零件（干涉）；面板读数和姿态一致。
- **构图**：每帧一个焦点；重要内容离画面边缘不少于 60 px（不裁切）；标注不盖住它指的零件。
- **文字**：没有被截断的文字；关键读数在手机宽度下能读。
- **3D**：bloom 会吃掉细节，自发光层保持在 1.0 以下；近白表面不过曝；低光下的光泽金属会出条纹，大面积表面用 roughness ≥ 0.45、envMapIntensity ≈ 0.5。
- **时序**：每个状态停留足够读完：短语 1 s，超过三个词每词再加 0.25 s。
- **声音**（看 `-wave.png`）：每个声响落在节拍线上或稍后一点；连续运动不配声。

## lo 画质的评审

CI 和无 GPU 机器上用 lo 画质（无 GTAO、无 MSAA、基础阴影）。lo 帧用于查机构、构图、文字、时序；接触阴影、AO 的质感只能在全画质（有 GPU 的机器）上判断。

## three.js 里示例已经踩过的坑

- `smoothstep(a, b, x)` 在 `a > b` 时在 Windows（ANGLE/D3D）上返回 0。写成 `1.0 - smoothstep(b, a, x)`。
- 离地面不到 1 mm 的 `ShadowMaterial` 或贴花，在后期渲染目标里会丢深度测试。给它 `polygonOffset`。
- 贴进地面、映射被镜像的四边形会被当作背面剔除。用 `DoubleSide`。
- 一个 NaN 像素经过 bloom 会把整帧变黑。shader 里每个 `pow()` 的底数都要钳位。
- 剖切模型上的 GTAO 需要在 `gtao.normalMaterial` 上设同样的裁剪平面，否则被切掉的一半会变成淡色幽灵。
- 软件渲染（SwiftShader）下跑全画质（GTAO + 8x MSAA + VSM 阴影），1920×1080 一帧的截图会超时、GPU 进程会挂。无 GPU 时必须用 lo。

## 审美（带数字）

- 缓动：入场 `cubic-bezier(0.16, 1, 0.3, 1)`；出场 `cubic-bezier(0.6, 0, 0.9, 0.35)`，时长为入场一半；状态之间 `cubic-bezier(0.65, 0, 0.35, 1)`。只有连续运动用线性。
- 机器占视口的 60–70%。1080 画布上标注不小于 34 px。
- 只用一个强调色，并且它有含义：正在工作的那个零件。
- 浅色影棚：浅背景在信息流里更易读，深背景会丢掉第一秒。近白零件在浅背景上要加描边或深一点的地面。
- 画面不完全静止：总有一个元素在动。
