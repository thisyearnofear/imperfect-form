#!/usr/bin/env node

/**
 * PoseLandmarker vs MoveNet benchmark runner.
 *
 * Bundles scripts/pose-landmarker-benchmark-entry.ts with esbuild, serves it
 * alongside the local MediaPipe assets (public/mediapipe) and a set of person
 * photos on a localhost port, then drives it in headless Chromium via
 * Playwright.
 *
 * What it measures, through the REAL registry path (resolvePoseConfig +
 * createPoseDetector — the same code poseWorker.ts runs):
 *   - per-row inference latency (median/p95, FPS) over the same frames
 *   - COCO-17-subset keypoint confidence (the honest cross-family comparison)
 *   - per-frame detection rate
 *   - arm-chain position jitter over repeated identical frames (stability)
 *
 * Usage:
 *   node scripts/pose-landmarker-benchmark.mjs [--out evidence/pose-landmarker-benchmark]
 *
 * The matrix rows are defined in the entry file. No commit, no camera needed:
 * inputs are static person photos, so every row sees identical frames.
 */

import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const benchDir = '/tmp/imf-pose-bench';
const port = 8791;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function argValue(args, name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

async function bundle() {
  const entry = join(repoRoot, 'scripts/pose-landmarker-benchmark-entry.ts');
  const out = join(benchDir, 'bench.js');
  execFileSync(join(repoRoot, 'node_modules/.bin/esbuild'), [
    entry,
    '--bundle',
    '--format=esm',
    '--target=es2020',
    `--alias:@mediapipe/pose=${join(repoRoot, 'src/stubs/mediapipe-pose.js')}`,
    `--outfile=${out}`,
  ], { cwd: repoRoot, stdio: 'inherit' });
  return out;
}

async function prepareBenchDir() {
  await mkdir(join(benchDir, 'images'), { recursive: true });
  const link = join(benchDir, 'mediapipe');
  const target = join(repoRoot, 'public/mediapipe');
  if (!existsSync(link)) await symlink(target, link, 'dir');
  await writeFile(
    join(benchDir, 'index.html'),
    `<!doctype html><meta charset="utf-8"><script>
      window.__POSE_BENCH_IMAGES__ = [
        'images/sandow.jpg',
        'images/bodi.jpg',
        'images/yoga.jpg',
        'images/tango.jpg',
      ];
    </script><script type="module" src="./bench.js"></script>`
  );
}

function serve() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      let path = decodeURIComponent(url.pathname);
      if (path === '/') path = '/index.html';
      const file = join(benchDir, path);
      if (!file.startsWith(benchDir)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      const body = await readFile(file);
      const ext = path.slice(path.lastIndexOf('.'));
      res.writeHead(200, {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

function renderMarkdown(result) {
  const lines = [
    '# PoseLandmarker vs MoveNet — benchmark',
    '',
    `Captured: ${result.capturedAt}`,
    `UA: ${result.userAgent}`,
    `Protocol: ${result.latencyIters} latency iters (+${result.warmupIters} warmup), ` +
      `${result.stabilityRepeats} stability repeats, ${result.images.length} person frames`,
    '',
    'Same frames for every row. Confidence columns average over the COCO-17',
    'subset — the honest cross-family comparison. Jitter is arm-chain position',
    'stddev over repeated identical frames, as % of frame dimensions.',
    '',
    '| Row | Init (ms) | Median (ms) | p95 (ms) | FPS | COCO-17 conf | Detected | Jitter % |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const r of result.rows) {
    lines.push(
      `| ${r.label}${r.resolvedDelegate ? ` (${r.resolvedDelegate})` : ''} | ${r.initMs} | ${r.medianMs} | ${r.p95Ms} | ${r.framesPerSecond} | ${(r.meanCoco17Confidence * 100).toFixed(1)}% | ${r.detectedFrames}/${result.images.length} | ${r.meanArmChainJitterPct === null ? 'n/a' : r.meanArmChainJitterPct.toFixed(3)} |`
    );
  }
  lines.push('', '## Per-image confidence (COCO-17 subset)', '');
  for (const r of result.rows) {
    lines.push(`### ${r.label}`);
    for (const img of r.perImage) {
      lines.push(
        `- ${img.image}: ${img.poseDetected ? 'detected' : 'NOT detected'}, ${img.keypointCount} keypoints, coco17=${img.coco17Confidence === null ? 'n/a' : (img.coco17Confidence * 100).toFixed(1)}%`
      );
    }
    lines.push('');
  }
  lines.push(
    '## Caveats',
    '',
    '- Headless Chromium ran WebGL on SwiftShader (software). Absolute latencies',
    '  for the tfjs WebGL rows are software-rendered and will shrink on real GPU',
    '  hardware; the tasks-vision CPU delegate (XNNPACK) is near-native speed.',
    '- MoveNet soft scores and MediaPipe `visibility` are different quantities',
    '  on different scales — the COCO-17 column controls for keypoint count, not',
    '  for score semantics. Do not port a score threshold between families.',
    '- Stability here is identical-frame replay against a VIDEO-mode tracker —',
    '  a synthetic worst case, not a live camera stream. Real-motion jitter on',
    '  device is the number to measure before promotion; the in-app edge matrix',
    '  (`window.__IMF_EDGE_MATRIX__`) is the harness for that.',
    ''
  );
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const outBase = resolve(argValue(args, '--out', join(repoRoot, 'evidence/pose-landmarker-benchmark')));

  console.log('[bench] bundling entry…');
  await bundle();
  await prepareBenchDir();
  const server = await serve();

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({
    args: [
      // Software WebGL — headless runs have no GPU; honest fallback is what we
      // are measuring anyway (the adapter reports its resolved delegate).
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
    ],
  });

  try {
    const page = await browser.newPage();
    page.on('console', (m) => {
      if (m.type() === 'warning' || m.type() === 'error') console.log(`[page:${m.type()}]`, m.text());
    });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => (window).__POSE_BENCH__, { timeout: 30_000 });

    console.log('[bench] running (tf model download + wasm init may take a minute)…');
    const result = await page.evaluate(() => (window).__POSE_BENCH__.run());
    console.log(JSON.stringify(result, null, 2));

    await mkdir(dirname(outBase), { recursive: true });
    await writeFile(`${outBase}.json`, JSON.stringify(result, null, 2));
    await writeFile(`${outBase}.md`, renderMarkdown(result));
    console.log(`[bench] wrote ${outBase}.json / .md`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error('[bench] failed:', e);
  process.exitCode = 1;
});
