// Paths, binaries and browser flags for the kit. Everything resolves from the repo root, so commands run from any folder.
// Override any of them with an environment variable.

import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const KIT = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(KIT, '..');
export const MACHINES = path.join(ROOT, 'machines');

// three, esbuild, fonts, playwright and the ffmpeg binaries: `npm install` at the repo root puts them here.
export const DEPS = process.env.TEARDOWN_DEPS || path.join(ROOT, 'node_modules');
export const fromDeps = (id) => createRequire(path.join(DEPS, 'x.js'))(id);
export const playwright = () => fromDeps('playwright');

const bundled = (id, pick) => {
  try {
    const p = pick(fromDeps(id));
    return p && fs.existsSync(p) ? p : undefined;
  } catch {
    return undefined;
  }
};
// ffmpeg-static / ffprobe-static ship the binaries with npm install; a system ffmpeg works too.
export const FFMPEG = process.env.FFMPEG || bundled('ffmpeg-static', (m) => m) || 'ffmpeg';
export const FFPROBE = process.env.FFPROBE || bundled('ffprobe-static', (m) => m.path) || 'ffprobe';
export const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

// Unset: playwright uses the Chromium that `npm install` downloaded (postinstall).
export const CHROMIUM = process.env.CHROMIUM || undefined;

// GPU mode. TEARDOWN_GPU=hw | swiftshader | auto (default). auto picks SwiftShader on Linux and in CI, where headless
// Chromium has no GPU: without these flags WebGL2 fails to start and the page never becomes ready.
export const GPU_MODE = (() => {
  const v = (process.env.TEARDOWN_GPU || 'auto').toLowerCase();
  if (v === 'hw' || v === 'swiftshader') return v;
  return process.env.CI || process.platform === 'linux' ? 'swiftshader' : 'hw';
})();

// Quality. TEARDOWN_QUALITY=hi | lo | auto (default). auto is lo under SwiftShader: the full-quality stage (GTAO, 8x
// MSAA, VSM shadows) crashes or stalls the software rasteriser, lo (no GTAO, no MSAA, basic shadows) renders fine.
export const QUALITY = (() => {
  const v = (process.env.TEARDOWN_QUALITY || 'auto').toLowerCase();
  if (v === 'hi' || v === 'lo') return v;
  return GPU_MODE === 'swiftshader' ? 'lo' : 'hi';
})();

const HW_ARGS = [
  // On Windows d3d11 plus --force_high_performance_gpu keeps ANGLE off an integrated GPU when a discrete one exists.
  ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []),
  '--force_high_performance_gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-webgl',
];
const SWIFTSHADER_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
export const CHROMIUM_ARGS = [...(GPU_MODE === 'swiftshader' ? SWIFTSHADER_ARGS : HW_ARGS), '--hide-scrollbars'];

// Builds and renders land in <repo>/teardown-out unless TEARDOWN_OUT says otherwise.
export const OUT = path.resolve(process.env.TEARDOWN_OUT || path.join(ROOT, 'teardown-out'));
export const DIST = path.join(OUT, 'dist');
