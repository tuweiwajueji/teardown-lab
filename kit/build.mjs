#!/usr/bin/env node
// Bundles a machine into self-contained HTML pages (three.js, fonts, CSS inlined; opens from file://, works offline):
//
//   teardown-out/dist/<machine>.html       the live page: machines/<machine>/live.js, runLive()
//   teardown-out/dist/<machine>-film.html  the film page: machines/<machine>/film.js, run(); capture.mjs drives it
//
//   node kit/build.mjs v8 [cessna ...]     (npm run build <machine>)
//
// Machine code imports the kit as 'teardown-kit/runtime.js', 'teardown-kit/util.js' and so on.
import fs from 'node:fs';
import path from 'node:path';
import {DEPS, DIST, KIT, MACHINES, fromDeps} from './paths.mjs';

const esbuild = fromDeps('esbuild');
export const MAX_LIVE_BYTES = 1024 * 1024;

const font = (weight) => {
  const file = path.join(DEPS, `@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${weight}-normal.woff2`);
  const b64 = fs.readFileSync(file).toString('base64');
  return `@font-face{font-family:'JetBrains Mono';font-weight:${weight};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
};
const fonts = () => {
  const inter = fs.readFileSync(path.join(DEPS, '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')).toString('base64');
  return [400, 600, 700].map(font).join('\n') +
    `\n@font-face{font-family:'Inter';font-weight:100 900;font-style:normal;font-display:block;src:url(data:font/woff2;base64,${inter}) format('woff2');}`;
};

const kitPlugin = {
  name: 'teardown-kit',
  setup(b) {
    b.onResolve({filter: /^teardown-kit\//}, (args) => ({path: path.join(KIT, 'runtime', args.path.slice('teardown-kit/'.length))}));
  },
};

export const machineDir = (name) => {
  const dir = path.join(MACHINES, name);
  if (!fs.existsSync(path.join(dir, 'film.js')) || !fs.existsSync(path.join(dir, 'live.js'))) {
    const have = fs.readdirSync(MACHINES).filter((d) => fs.existsSync(path.join(MACHINES, d, 'film.js')));
    throw new Error(`no machine "${name}" (machines/${name}/film.js and live.js). Machines: ${have.join(', ')}`);
  }
  return dir;
};

const page = async (dir, title, entry) => {
  const res = await esbuild.build({
    plugins: [kitPlugin],
    stdin: {contents: entry, resolveDir: dir, sourcefile: `${title}.entry.js`, loader: 'js'},
    bundle: true,
    nodePaths: [DEPS],
    format: 'esm',
    minify: !process.env.SIMS_DEBUG,
    write: false,
    target: 'es2022',
    legalComments: 'none',
    loader: {'.woff2': 'base64'},
    logLevel: 'warning',
  });
  const js = res.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
  const css = fs.existsSync(path.join(dir, 'style.css')) ? fs.readFileSync(path.join(dir, 'style.css'), 'utf8') : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<style>
${fonts()}
${fs.readFileSync(path.join(KIT, 'runtime/style.css'), 'utf8')}
${css}
</style>
</head>
<body>
<div id="app"></div>
<script type="module">
${js}
</script>
</body>
</html>
`;
};

export async function build(name) {
  const dir = machineDir(name);
  fs.mkdirSync(DIST, {recursive: true});
  const out = {};
  for (const [kind, file, entry] of [
    ['live', `${name}.html`, `import {runLive} from './live.js';\nrunLive();\n`],
    ['film', `${name}-film.html`, `import {run} from './film.js';\nrun();\n`],
  ]) {
    const t0 = Date.now();
    const html = await page(dir, kind === 'live' ? name : `${name}-film`, entry);
    const dest = path.join(DIST, file);
    fs.writeFileSync(dest, html);
    const bytes = Buffer.byteLength(html);
    console.log(`${dest}  ${(bytes / 1024).toFixed(0)} KB  ${Date.now() - t0} ms`);
    if (kind === 'live' && bytes >= MAX_LIVE_BYTES) throw new Error(`${file} is ${(bytes / 1024).toFixed(0)} KB, over the 1 MB budget`);
    out[kind] = dest;
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const names = process.argv.slice(2);
  if (!names.length) {
    console.error('usage: node kit/build.mjs <machine> [...]');
    process.exit(1);
  }
  for (const n of names) await build(n);
}
