#!/usr/bin/env node

/**
 * Edge Performance Matrix Comparator
 *
 * Compares two or more matrix results to find the winning configuration.
 *
 * Usage:
 *   node scripts/edge-perf-matrix.mjs \
 *     --baseline evidence/matrix-iphone12.json \
 *     --optimized evidence/matrix-pixel6.json \
 *     --target "iPhone 12 vs Pixel 6" \
 *     --out evidence/matrix-comparison
 *
 * Input files are JSON exported from window.__IMF_EDGE_MATRIX__.exportJson().
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

function usage() {
  console.error(`Usage:
  node scripts/edge-perf-matrix.mjs \\
    --baseline evidence/matrix-baseline.json \\
    --optimized evidence/matrix-optimized.json \\
    --target "Device comparison description" \\
    --out evidence/matrix-comparison

The input files are JSON copied from window.__IMF_EDGE_MATRIX__.exportJson().
The command compares the analysis results and finds the winning configuration.`);
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

function loadMatrixShape(matrix, label, file) {
  if (!matrix || typeof matrix !== 'object') {
    throw new Error(`${label} file (${file}) is not a valid matrix`);
  }
  if (!matrix.analysis || typeof matrix.analysis !== 'object') {
    throw new Error(`${label} file (${file}) has no analysis`);
  }
  if (!matrix.matrix || typeof matrix.matrix !== 'object') {
    throw new Error(`${label} file (${file}) has no matrix data`);
  }
  return {
    label,
    file: basename(file),
    matrixId: matrix.matrix.matrixId ?? null,
    device: matrix.matrix.device ?? null,
    analysis: matrix.analysis,
  };
}

function buildComparison({ baseline, optimized, target }) {
  const base = loadMatrixShape(baseline, 'Baseline', baseline.__file ?? 'baseline');
  const opt = loadMatrixShape(optimized, 'Optimized', optimized.__file ?? 'optimized');

  // Compare best configs
  const baseBest = base.analysis.bestConfig;
  const optBest = opt.analysis.bestConfig;
  const baseBestLabel = baseBest
    ? `${baseBest.model} / ${baseBest.inputSize} / ${baseBest.backend} / ${baseBest.quantization}`
    : 'none';
  const optBestLabel = optBest
    ? `${optBest.model} / ${optBest.inputSize} / ${optBest.backend} / ${optBest.quantization}`
    : 'none';

  // Compare summary metrics
  const baseSummary = base.analysis.summary ?? { avgFps: 0, avgConfidence: 0 };
  const optSummary = opt.analysis.summary ?? { avgFps: 0, avgConfidence: 0 };

  const fpsChange = baseSummary.avgFps > 0
    ? ((optSummary.avgFps - baseSummary.avgFps) / baseSummary.avgFps) * 100
    : null;

  const confidenceChange = baseSummary.avgConfidence > 0
    ? ((optSummary.avgConfidence - baseSummary.avgConfidence) / baseSummary.avgConfidence) * 100
    : null;

  return {
    schema: 'imperfect-form.edge-perf-matrix.v1',
    measured: 'from-matrices',
    target,
    capturedAt: new Date().toISOString(),
    runs: {
      baseline: base,
      optimized: opt,
    },
    comparison: {
      baselineBestConfig: baseBestLabel,
      optimizedBestConfig: optBestLabel,
      baselineAvgFps: baseSummary.avgFps,
      optimizedAvgFps: optSummary.avgFps,
      fpsChangePercent: fpsChange,
      baselineAvgConfidence: baseSummary.avgConfidence,
      optimizedAvgConfidence: optSummary.avgConfidence,
      confidenceChangePercent: confidenceChange,
      baselineValidRuns: base.analysis.rankings?.length ?? 0,
      optimizedValidRuns: opt.analysis.rankings?.length ?? 0,
    },
    notes: [
      'Comparison is based on composite score (FPS × confidence / detection time).',
      'Both matrices should be run on comparable devices with the same exercise and lighting.',
      'Review the full rankings in each matrix before applying the winning config.',
    ],
  };
}

function renderMarkdown(comparison) {
  const { runs, comparison: comp, target } = comparison;
  const lines = [
    '# Edge Performance Matrix Comparison',
    '',
    `- **Target:** ${target}`,
    `- **Captured:** ${comparison.capturedAt}`,
    `- **Baseline:** ${runs.baseline.label} (${runs.baseline.file})`,
    `- **Optimized:** ${runs.optimized.label} (${runs.optimized.file})`,
    '',
    '## Summary',
    '',
    '| Metric | Baseline | Optimized | Change |',
    '| --- | ---: | ---: | ---: |',
    `| Best Config | ${comp.baselineBestConfig} | ${comp.optimizedBestConfig} | - |`,
    `| Avg FPS | ${comp.baselineAvgFps.toFixed(1)} | ${comp.optimizedAvgFps.toFixed(1)} | ${comp.fpsChangePercent === null ? 'n/a' : `${comp.fpsChangePercent > 0 ? '+' : ''}${comp.fpsChangePercent.toFixed(1)}%`} |`,
    `| Avg Confidence | ${(comp.baselineAvgConfidence * 100).toFixed(1)}% | ${(comp.optimizedAvgConfidence * 100).toFixed(1)}% | ${comp.confidenceChangePercent === null ? 'n/a' : `${comp.confidenceChangePercent > 0 ? '+' : ''}${comp.confidenceChangePercent.toFixed(1)}%`} |`,
    `| Valid Runs | ${comp.baselineValidRuns} | ${comp.optimizedValidRuns} | - |`,
    '',
    '## Baseline Top 5',
    '',
    '| Rank | Model | Input | Backend | Quant | Composite Score |',
    '| ---: | --- | --- | --- | --- | ---: |',
  ];

  const baseRankings = runs.baseline.analysis.rankings?.slice(0, 5) ?? [];
  baseRankings.forEach((rank, i) => {
    lines.push(
      `| ${i + 1} | ${rank.config.model} | ${rank.config.inputSize} | ${rank.config.backend} | ${rank.config.quantization} | ${rank.compositeScore.toFixed(2)} |`
    );
  });

  lines.push('');
  lines.push('## Optimized Top 5');
  lines.push('');
  lines.push('| Rank | Model | Input | Backend | Quant | Composite Score |');
  lines.push('| ---: | --- | --- | --- | --- | ---: |');

  const optRankings = runs.optimized.analysis.rankings?.slice(0, 5) ?? [];
  optRankings.forEach((rank, i) => {
    lines.push(
      `| ${i + 1} | ${rank.config.model} | ${rank.config.inputSize} | ${rank.config.backend} | ${rank.config.quantization} | ${rank.compositeScore.toFixed(2)} |`
    );
  });

  lines.push('');
  lines.push('## Recommendation');
  lines.push('');

  if (comp.fpsChangePercent !== null && comp.fpsChangePercent > 5) {
    lines.push(`✅ **Optimized configuration shows ${comp.fpsChangePercent.toFixed(1)}% FPS improvement.**`);
  } else if (comp.fpsChangePercent !== null && comp.fpsChangePercent < -5) {
    lines.push(`⚠️ **Optimized configuration shows ${Math.abs(comp.fpsChangePercent).toFixed(1)}% FPS regression.**`);
  } else {
    lines.push('ℹ️ **FPS difference is within 5% margin.**');
  }

  lines.push('');
  lines.push('### Implementation');
  lines.push('');
  lines.push('Update the default mobile config in `src/services/PoseDetectionService.ts`:');
  lines.push('');
  lines.push('```typescript');
  lines.push('static getDetectorConfig(isMobile: boolean) {');
  lines.push('  return {');
  lines.push(`    modelType: '${comp.optimizedBestConfig.split(' / ')[0]}',`);
  lines.push('    enableSmoothing: false,');
  lines.push('    minPoseScore: isMobile ? 0.2 : 0.25,');
  lines.push('    multiPoseMaxDimension: isMobile ? undefined : 512,');
  lines.push('    enableTracking: false,');
  lines.push('  };');
  lines.push('}');
  lines.push('```');

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

  const baseline = JSON.parse(await readFile(baselineFile, 'utf8'));
  const optimized = JSON.parse(await readFile(optimizedFile, 'utf8'));
  baseline.__file = baselineFile;
  optimized.__file = optimizedFile;

  const comparison = buildComparison({ baseline, optimized, target });

  await mkdir(dirname(outBase), { recursive: true });
  await writeFile(`${outBase}.json`, `${JSON.stringify(comparison, null, 2)}\n`);
  await writeFile(`${outBase}.md`, renderMarkdown(comparison));
  console.log(`Wrote ${outBase}.json`);
  console.log(`Wrote ${outBase}.md`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`edge-perf-matrix: ${error.message}`);
    process.exitCode = 1;
  });
}
