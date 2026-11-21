#!/usr/bin/env node
// One entry point for every machine:
//
//   npm run build  <machine>   → teardown-out/dist/<machine>.html (live page, offline, < 1 MB) + <machine>-film.html
//   npm run film   <machine>   → teardown-out/<machine>.mp4 (every frame rendered, score muxed) + <machine>-wave.png
//   npm run stills <machine>   → teardown-out/<machine>-stills.png (one tile per timeline beat) + full frames
//
// film and stills capture at 1600x900 CSS px, dpr 1.2 (1920x1080 out); pass --size/--dpr to override
// film options:   --fps 60 (default)  --crf 16  --from/--to (seconds, a preview cut)
// stills options: --stills beats (default) | 0,4,9 | every:0.5   --cols 3
// Environment:    TEARDOWN_GPU=auto|hw|swiftshader  TEARDOWN_QUALITY=auto|hi|lo  TEARDOWN_OUT=<dir>
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {build} from './build.mjs';
import {FFMPEG, GPU_MODE, KIT, MACHINES, OUT, PYTHON, QUALITY} from './paths.mjs';

const [cmd, machine, ...rest] = process.argv.slice(2);
const usage = 'usage: npm run <build|film|stills> <machine> [options]';
if (!['build', 'film', 'stills'].includes(cmd) || !machine) {
  console.error(usage);
  process.exit(1);
}
const opt = (k) => {
  const i = rest.indexOf(`--${k}`);
  return i === -1 ? undefined : rest[i + 1];
};
const run = (bin, args, env = {}) => {
  const r = spawnSync(bin, args, {stdio: 'inherit', env: {...process.env, ...env}});
  if (r.status !== 0) {
    console.error(`failed: ${bin} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
};
// every console is a fixed 1600 x 900 CSS layout; dpr 1.2 makes the output 1920 x 1080
const SIZE = [...(rest.includes('--size') ? [] : ['--size', '1600x900']), ...(rest.includes('--dpr') ? [] : ['--dpr', '1.2'])];
const capture = (args) => run(process.execPath, [path.join(KIT, 'capture.mjs'), `${machine}-film`, ...SIZE, ...args]);

try {
  await build(machine);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
if (cmd === 'build') process.exit(0);

console.log(`capture: gpu ${GPU_MODE}, quality ${QUALITY}`);
const dir = path.join(MACHINES, machine);
const timeline = path.join(dir, 'timeline.json');
fs.mkdirSync(OUT, {recursive: true});

if (cmd === 'stills') {
  const out = path.join(OUT, `${machine}-stills.png`);
  // capture.mjs reads the first occurrence of a flag, so defaults go in only when not passed
  const dflt = (k, v) => (rest.includes(`--${k}`) ? [] : [`--${k}`, v]);
  capture([...dflt('stills', 'beats'), ...dflt('cols', '4'), ...dflt('timeline', timeline), ...dflt('out', out), ...rest]);
  process.exit(0);
}

// film: picture and sound both come from timeline.json, then one mux
const silent = path.join(OUT, `${machine}-silent.mp4`);
const wav = path.join(OUT, `${machine}-score.wav`);
const out = path.join(OUT, `${machine}.mp4`);
capture(['--out', silent, '--fps', opt('fps') ?? '60', ...rest.filter((x, i) => x !== '--fps' && rest[i - 1] !== '--fps')]);
run(PYTHON, [path.join(KIT, 'run_sfx.py'), path.join(dir, 'score.py'), '--timeline', timeline, '--out', wav]);
const from = Number(opt('from') ?? 0);
run(FFMPEG, ['-loglevel', 'error', '-y', '-i', silent, '-ss', String(from), '-i', wav, '-map', '0:v', '-map', '1:a',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out]);
fs.rmSync(silent);
run(process.execPath, [path.join(KIT, 'wave.mjs'), out, '--timeline', timeline]);
console.log(`→ ${out}`);
