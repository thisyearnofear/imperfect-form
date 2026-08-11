#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const CONFIDENCE_FLOOR = 0.65;
const SIMILARITY_FLOOR = 0.7;
const REPEATABLE_PAIR_RATE_FLOOR = 0.7;
const MINIMUM_PAIRS = 2;
const MAX_INCONCLUSIVE_RATE = 0.25;
const MAX_LOW_CONFIDENCE_RATE = 0.25;

function usage() {
  console.error(`Usage:
  node scripts/evaluate-movement-retest.mjs \\
    --input evidence/curl-retest-records.json \\
    --protocol curls-baseline \\
    --out evidence/curl-retest-report

Input must be a JSON array of StoredMovementAssessment records, or an object
with a records array. Reports contain descriptive local protocol evidence only;
they do not claim clinical validity or population norms.`);
}

function argValue(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function requireArg(args, name) {
  const value = argValue(args, name);
  if (!value || value.startsWith('--')) throw new Error(`Missing ${name}`);
  return value;
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, finite(value) ? value : min));
}

function isAssessment(value) {
  if (!value || typeof value !== 'object') return false;
  const candidate = value;
  if (
    candidate.version !== '1.0' ||
    candidate.protocolVersion !== '1.0' ||
    typeof candidate.protocolId !== 'string' ||
    typeof candidate.mode !== 'string' ||
    !finite(candidate.capturedAt) ||
    !finite(candidate.confidence) ||
    !['valid', 'inconclusive'].includes(candidate.status)
  ) {
    return false;
  }
  const quality = candidate.quality;
  if (
    !quality ||
    !finite(quality.poseConfidence) ||
    !finite(quality.observedFrameRatio) ||
    !finite(quality.bilateralFrameRatio) ||
    !finite(quality.stableFrameRatio) ||
    !finite(quality.traceFrames) ||
    !finite(quality.repCount)
  ) {
    return false;
  }
  if (candidate.status === 'inconclusive') return candidate.measurements === null;
  const measurements = candidate.measurements;
  return Boolean(
    measurements &&
      finite(measurements.range) &&
      finite(measurements.control) &&
      finite(measurements.traceStability) &&
      (measurements.symmetry === null || finite(measurements.symmetry))
  );
}

function timeOf(record) {
  return record.assessment.capturedAt || record.savedAt;
}

function compare(previous, current) {
  if (
    previous.protocolId !== current.protocolId ||
    previous.protocolVersion !== current.protocolVersion ||
    previous.status !== 'valid' ||
    current.status !== 'valid' ||
    !previous.measurements ||
    !current.measurements
  ) {
    return null;
  }

  const rangeDelta = current.measurements.range - previous.measurements.range;
  const controlDelta = current.measurements.control - previous.measurements.control;
  const traceStabilityDelta =
    current.measurements.traceStability - previous.measurements.traceStability;
  const dimensions = [
    Math.abs(controlDelta),
    Math.abs(traceStabilityDelta),
    ...(current.measurements.symmetry !== null && previous.measurements.symmetry !== null
      ? [Math.abs(current.measurements.symmetry - previous.measurements.symmetry)]
      : []),
  ];
  const distance = Math.sqrt(dimensions.reduce((sum, delta) => sum + delta ** 2, 0));
  const similarity = clamp(1 - distance / Math.sqrt(Math.max(1, dimensions.length)));

  return {
    similarity,
    repeatable: similarity >= SIMILARITY_FLOOR,
    rangeDelta,
    controlDelta,
    traceStabilityDelta,
  };
}

function average(values) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function rounded(value, decimals = 4) {
  if (value === null || !finite(value)) return null;
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function buildReport(records, protocolId, capturedAt) {
  const protocolRecords = records.filter(
    (record) =>
      Boolean(record) &&
      isAssessment(record.assessment) &&
      record.assessment.protocolId === protocolId
  );
  const validReads = protocolRecords.filter((record) => record.assessment.status === 'valid');
  const inconclusiveReads = protocolRecords.length - validReads.length;
  const inconclusiveRate =
    protocolRecords.length > 0 ? inconclusiveReads / protocolRecords.length : null;
  const lowConfidenceValidReads = validReads.filter(
    (record) => record.assessment.confidence < CONFIDENCE_FLOOR
  );
  const lowConfidenceRate =
    validReads.length > 0 ? lowConfidenceValidReads.length / validReads.length : null;
  const qualifying = validReads
    .filter((record) => record.assessment.confidence >= CONFIDENCE_FLOOR)
    .sort((a, b) => timeOf(a) - timeOf(b));
  const pairs = [];
  for (let index = 1; index < qualifying.length; index += 1) {
    const pair = compare(qualifying[index - 1].assessment, qualifying[index].assessment);
    if (pair) pairs.push(pair);
  }

  const averageConfidence = rounded(average(qualifying.map((record) => record.assessment.confidence)));
  const averageSimilarity = rounded(average(pairs.map((pair) => pair.similarity)));
  const repeatablePairRate = rounded(average(pairs.map((pair) => (pair.repeatable ? 1 : 0))));
  const spanDays =
    qualifying.length > 1
      ? rounded((timeOf(qualifying[qualifying.length - 1]) - timeOf(qualifying[0])) / 86400000, 2)
      : null;
  const gates = {
    enoughPairs: pairs.length >= MINIMUM_PAIRS,
    confidenceFloor:
      averageConfidence === null ? null : averageConfidence >= CONFIDENCE_FLOOR,
    similarityFloor: averageSimilarity === null ? null : averageSimilarity >= SIMILARITY_FLOOR,
    repeatablePairRateFloor:
      repeatablePairRate === null ? null : repeatablePairRate >= REPEATABLE_PAIR_RATE_FLOOR,
    inconclusiveRate:
      inconclusiveRate === null ? null : inconclusiveRate <= MAX_INCONCLUSIVE_RATE,
    lowConfidenceRate:
      lowConfidenceRate === null ? null : lowConfidenceRate <= MAX_LOW_CONFIDENCE_RATE,
  };

  return {
    schema: 'imperfect-form.movement-retest.v1',
    protocolId,
    capturedAt,
    totalRecords: records.length,
    protocolRecords: protocolRecords.length,
    malformedRecords: records.length - protocolRecords.length,
    validReads: validReads.length,
    inconclusiveReads,
    lowConfidenceValidReads: lowConfidenceValidReads.length,
    inconclusiveRate: rounded(inconclusiveRate),
    lowConfidenceRate: rounded(lowConfidenceRate),
    qualifyingReads: qualifying.length,
    comparablePairs: pairs.length,
    averageConfidence,
    averageSimilarity,
    repeatablePairRate,
    averageAbsoluteRangeDelta: rounded(average(pairs.map((pair) => Math.abs(pair.rangeDelta)))),
    averageAbsoluteControlDelta: rounded(average(pairs.map((pair) => Math.abs(pair.controlDelta)))),
    averageAbsoluteTraceStabilityDelta: rounded(
      average(pairs.map((pair) => Math.abs(pair.traceStabilityDelta)))
    ),
    spanDays,
    status:
      !gates.enoughPairs
        ? 'insufficient-data'
        : gates.confidenceFloor &&
            gates.similarityFloor &&
            gates.repeatablePairRateFloor &&
            gates.inconclusiveRate &&
            gates.lowConfidenceRate
          ? 'passes-screen'
          : 'reviewable',
    gates,
    notes: [
      'Descriptive local protocol evidence only; this report is not clinical validation or a population norm.',
      'Only valid, protocol-matched reads at or above the confidence floor contribute to comparable pairs.',
      'Review setup, device, lighting, camera angle, and warm-up conditions alongside these aggregates.',
    ],
  };
}

function renderMarkdown(report, inputFile) {
  const lines = [
    '# Movement assessment test–retest evidence',
    '',
    `- **Protocol:** ${report.protocolId}`,
    `- **Input:** ${basename(inputFile)}`,
    `- **Captured:** ${report.capturedAt}`,
    `- **Status:** ${report.status}`,
    '',
    '## Sample quality',
    '',
    '| Measure | Result |',
    '| --- | ---: |',
    `| Total records | ${report.totalRecords} |`,
    `| Protocol records | ${report.protocolRecords} |`,
    `| Malformed / other protocol | ${report.malformedRecords} |`,
    `| Valid reads | ${report.validReads} |`,
    `| Inconclusive reads | ${report.inconclusiveReads} |`,
    `| Inconclusive rate | ${report.inconclusiveRate ?? 'n/a'} |`,
    `| Low-confidence valid reads | ${report.lowConfidenceValidReads} |`,
    `| Low-confidence rate | ${report.lowConfidenceRate ?? 'n/a'} |`,
    `| Qualifying reads | ${report.qualifyingReads} |`,
    `| Study span (days) | ${report.spanDays ?? 'n/a'} |`,
    '',
    '## Test–retest signal',
    '',
    '| Measure | Result |',
    '| --- | ---: |',
    `| Comparable pairs | ${report.comparablePairs} |`,
    `| Average confidence | ${report.averageConfidence ?? 'n/a'} |`,
    `| Average similarity | ${report.averageSimilarity ?? 'n/a'} |`,
    `| Repeatable pair rate | ${report.repeatablePairRate ?? 'n/a'} |`,
    `| Average absolute range delta | ${report.averageAbsoluteRangeDelta ?? 'n/a'} |`,
    `| Average absolute control delta | ${report.averageAbsoluteControlDelta ?? 'n/a'} |`,
    `| Average absolute trace-stability delta | ${report.averageAbsoluteTraceStabilityDelta ?? 'n/a'} |`,
    '',
    '## Screening gates',
    '',
    `- Minimum pair count (≥ ${MINIMUM_PAIRS}): ${report.gates.enoughPairs ? 'pass' : 'not met'}`,
    `- Average confidence (≥ ${CONFIDENCE_FLOOR}): ${report.gates.confidenceFloor === null ? 'n/a' : report.gates.confidenceFloor ? 'pass' : 'not met'}`,
    `- Average similarity (≥ ${SIMILARITY_FLOOR}): ${report.gates.similarityFloor === null ? 'n/a' : report.gates.similarityFloor ? 'pass' : 'not met'}`,
    `- Repeatable pair rate (≥ ${REPEATABLE_PAIR_RATE_FLOOR}): ${report.gates.repeatablePairRateFloor === null ? 'n/a' : report.gates.repeatablePairRateFloor ? 'pass' : 'not met'}`,
    `- Inconclusive rate (≤ ${MAX_INCONCLUSIVE_RATE}): ${report.gates.inconclusiveRate === null ? 'n/a' : report.gates.inconclusiveRate ? 'pass' : 'not met'}`,
    `- Low-confidence rate (≤ ${MAX_LOW_CONFIDENCE_RATE}): ${report.gates.lowConfidenceRate === null ? 'n/a' : report.gates.lowConfidenceRate ? 'pass' : 'not met'}`,
    '',
    '## Interpretation guardrails',
    '',
    ...report.notes.map((note) => `- ${note}`),
    '',
    'Raw exported records should be preserved beside this report. Do not treat a screening pass as clinical validation, a population benchmark, or a guarantee of future movement ability.',
    '',
  ];
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    usage();
    return;
  }
  const inputFile = resolve(requireArg(args, '--input'));
  const protocolId = argValue(args, '--protocol', 'curls-baseline');
  const outBase = resolve(requireArg(args, '--out'));
  const raw = JSON.parse(await readFile(inputFile, 'utf8'));
  const records = Array.isArray(raw) ? raw : raw?.records;
  if (!Array.isArray(records)) throw new Error('Input must be an array or an object with a records array');

  const report = buildReport(records, protocolId, new Date().toISOString());
  await mkdir(dirname(outBase), { recursive: true });
  await writeFile(`${outBase}.json`, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(`${outBase}.md`, renderMarkdown(report, inputFile));
  console.log(`Wrote ${outBase}.json`);
  console.log(`Wrote ${outBase}.md`);
}

main().catch((error) => {
  console.error(`movement-retest: ${error.message}`);
  process.exitCode = 1;
});
