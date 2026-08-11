#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const METRICS = [
  ['medianFps', 'Median FPS', 'higher'],
  ['avgFps', 'Average FPS', 'higher'],
  ['medianDetectionTimeMs', 'Median detection (ms)', 'lower'],
  ['p95DetectionTimeMs', 'p95 detection (ms)', 'lower'],
  ['medianPreprocessTimeMs', 'Median preprocess (ms)', 'lower'],
  ['p95PreprocessTimeMs', 'p95 preprocess (ms)', 'lower'],
  ['avgKeypointConfidence', 'Average keypoint confidence', 'higher'],
  ['memoryGrowthBytes', 'Memory growth (bytes)', 'lower'],
];

function usage() {
  console.error(`Usage:
  node scripts/arm-benchmark.mjs \\
    --baseline evidence/baseline.json \\
    --optimized evidence/optimized.json \\
    --target "Arm device name" \\
    --baseline-label "Thunder / WebGL" \\
    --optimized-label "Lightning / WebGL" \\
    --out evidence/arm-comparison

The input files are JSON copied from window.__IMF_BASELINE__.exportJson().
The command never invents measurements: missing or zero-frame reports fail.`);
}

function argValue(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function requireArg(args, name) {
  const value = argValue(args, name);
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function readFinite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function loadReportShape(report, label, file) {
  const summary = report?.summary;
  if (!summary || typeof summary !== 'object') {
    throw new Error(`${label} report (${file}) has no summary`);
  }
  if (!Number.isFinite(summary.frames) || summary.frames <= 0) {
    throw new Error(`${label} report (${file}) has no usable frames`);
  }
  if (
    !Number.isFinite(summary.poseDetectedFrames) ||
    summary.poseDetectedFrames < 0 ||
    summary.poseDetectedFrames > summary.frames
  ) {
    throw new Error(`${label} report (${file}) has an invalid poseDetectedFrames value`);
  }
  return {
    label,
    file: basename(file),
    runId: report.runId ?? null,
    startedAt: report.startedAt ?? null,
    device: report.device ?? null,
    metadata: report.metadata ?? {},
    summary,
  };
}

function assertComparableTargets(base, opt, target) {
  const requiredKeys = [
    'target',
    'input',
    'camera',
    'exercise',
    'lighting',
    'path',
    'model',
    'backend',
  ];
  for (const key of requiredKeys) {
    if (typeof base.metadata[key] !== 'string' || typeof opt.metadata[key] !== 'string') {
      throw new Error(`Both reports must include string metadata.${key}`);
    }
  }

  // Model/backend are the variables under test; the capture conditions are not.
  const invariantKeys = ['target', 'input', 'camera', 'exercise', 'lighting', 'path'];
  for (const key of invariantKeys) {
    const baseValue = base.metadata[key];
    const optValue = opt.metadata[key];
    if (baseValue !== optValue) {
      throw new Error(`Reports differ on ${key}: ${baseValue} vs ${optValue}`);
    }
  }

  if (base.metadata.target !== target) {
    throw new Error(`Baseline target metadata does not match --target: ${base.metadata.target}`);
  }
  if (opt.metadata.target !== target) {
    throw new Error(`Optimized target metadata does not match --target: ${opt.metadata.target}`);
  }
}

function percentChange(baseline, optimized) {
  if (baseline === null || optimized === null || baseline === 0) return null;
  return ((optimized - baseline) / Math.abs(baseline)) * 100;
}

function formatValue(key, value) {
  if (value === null) return 'n/a';
  if (key === 'avgKeypointConfidence') return value.toFixed(3);
  if (key.includes('Fps')) return value.toFixed(2);
  if (key.includes('Time')) return `${value.toFixed(2)} ms`;
  if (key === 'memoryGrowthBytes') return `${value} B`;
  return String(value);
}

function formatDelta(key, baseline, optimized) {
  const change = percentChange(baseline, optimized);
  if (change === null) return 'n/a';
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

export function buildComparison({ baseline, optimized, target, baselineLabel, optimizedLabel }) {
  const base = loadReportShape(baseline, baselineLabel, baseline.__file ?? 'baseline');
  const opt = loadReportShape(optimized, optimizedLabel, optimized.__file ?? 'optimized');
  assertComparableTargets(base, opt, target);
  const rows = METRICS.map(([key, name, direction]) => {
    const baselineValue = readFinite(base.summary[key]);
    const optimizedValue = readFinite(opt.summary[key]);
    const change = percentChange(baselineValue, optimizedValue);
    const improved =
      change === null || change === 0 ? null : direction === 'higher' ? change > 0 : change < 0;
    return {
      key,
      name,
      direction,
      baseline: baselineValue,
      optimized: optimizedValue,
      changePercent: change,
      improved,
    };
  });

  return {
    schema: 'imperfect-form.arm-benchmark.v1',
    measured: 'from-reports',
    target,
    capturedAt: new Date().toISOString(),
    runs: {
      baseline: base,
      optimized: opt,
    },
    metrics: rows,
    quality: {
      baselineDetectionRate: base.summary.poseDetectedFrames / Math.max(1, base.summary.frames),
      optimizedDetectionRate: opt.summary.poseDetectedFrames / Math.max(1, opt.summary.frames),
      confidenceChangePercent:
        rows.find((row) => row.key === 'avgKeypointConfidence')?.changePercent ?? null,
    },
    notes: [
      'Model and backend may differ; target, camera, input, exercise, lighting, and path are held constant.',
      'Report p50/p95 and quality together; do not claim an optimization from latency alone.',
      'This artifact contains measured reports only; review labels and configuration before submission.',
    ],
  };
}

function renderMarkdown(comparison) {
  const { runs, metrics, quality, target } = comparison;
  const lines = [
    '# Arm benchmark comparison',
    '',
    `- **Target:** ${target}`,
    `- **Captured:** ${comparison.capturedAt}`,
    `- **Baseline:** ${runs.baseline.label} (${runs.baseline.file})`,
    `- **Optimized:** ${runs.optimized.label} (${runs.optimized.file})`,
    '',
    '| Metric | Baseline | Optimized | Change | Direction |',
    '| --- | ---: | ---: | ---: | --- |',
  ];

  for (const row of metrics) {
    lines.push(
      `| ${row.name} | ${formatValue(row.key, row.baseline)} | ${formatValue(row.key, row.optimized)} | ${formatDelta(row.key, row.baseline, row.optimized)} | ${row.direction} is better |`
    );
  }

  lines.push(
    '',
    '## Quality guardrails',
    '',
    `- Baseline pose detection rate: ${(quality.baselineDetectionRate * 100).toFixed(1)}%`,
    `- Optimized pose detection rate: ${(quality.optimizedDetectionRate * 100).toFixed(1)}%`,
    `- Confidence change: ${quality.confidenceChangePercent === null ? 'n/a' : `${quality.confidenceChangePercent.toFixed(1)}%`}`,
    '',
    '## Reproduction notes',
    '',
    ...comparison.notes.map((note) => `- ${note}`),
    '',
    'Raw reports are preserved beside this comparison. Do not replace them with rounded values.',
    ''
  );
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    usage();
    return;
  }

  const baselineFile = resolve(requireArg(args, '--baseline'));
  const optimizedFile = resolve(requireArg(args, '--optimized'));
  const outBase = resolve(requireArg(args, '--out'));
  const target = requireArg(args, '--target');
  const baselineLabel = argValue(args, '--baseline-label', basename(baselineFile));
  const optimizedLabel = argValue(args, '--optimized-label', basename(optimizedFile));

  const baseline = JSON.parse(await readFile(baselineFile, 'utf8'));
  const optimized = JSON.parse(await readFile(optimizedFile, 'utf8'));
  baseline.__file = baselineFile;
  optimized.__file = optimizedFile;
  const comparison = buildComparison({
    baseline,
    optimized,
    target,
    baselineLabel,
    optimizedLabel,
  });

  await mkdir(dirname(outBase), { recursive: true });
  await writeFile(`${outBase}.json`, `${JSON.stringify(comparison, null, 2)}\n`);
  await writeFile(`${outBase}.md`, renderMarkdown(comparison));
  console.log(`Wrote ${outBase}.json`);
  console.log(`Wrote ${outBase}.md`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`arm-benchmark: ${error.message}`);
    process.exitCode = 1;
  });
}
