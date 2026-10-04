/**
 * Gate vocabulary shared by every check in the coaching and movement layers.
 *
 * A gate is one named threshold with a recorded value, the limit it was judged
 * against, and a sentence explaining a failure. An analysis is accepted only
 * when every gate passes; when something fails, the FIRST failure's reason is
 * the one shown, because the earliest gate in the pipeline is usually the
 * upstream cause of everything after it.
 *
 * Gates are three-state, not two: `no-data` means the gate could not be
 * evaluated at all (no comparable pairs, an auditor that is unavailable, a
 * sensor that never reported). `no-data` never counts as a pass — it holds the
 * verdict at `insufficient-data` so an absent measurement can never be
 * mistaken for a clean one.
 */

export type GateStatus = 'pass' | 'fail' | 'no-data';

export interface GateResult {
  /** Stable identifier, used as the key in reports and doc-sync tests. */
  id: string;
  /** Human-readable gate name. */
  name: string;
  passed: GateStatus;
  /** Measured value, or null when the gate could not be evaluated. */
  value: number | null;
  /** The limit as written for humans, e.g. ">= 2" or "0.30-0.70". */
  limit: string;
  /** Why this gate exists / why it failed. Empty when it passed. */
  why: string;
}

export type GateVerdictStatus = 'passes' | 'reviewable' | 'insufficient-data';

export interface GateVerdict {
  passed: boolean;
  status: GateVerdictStatus;
  gates: GateResult[];
  /** The earliest failing or unevaluable gate — the one reason to show. */
  firstFailure: GateResult | null;
}

/**
 * Build a passing gate.
 */
export function gatePass(id: string, name: string, value: number, limit: string): GateResult {
  return { id, name, passed: 'pass', value, limit, why: '' };
}

/**
 * Build a failing gate. `why` must say what was measured and what was expected,
 * because it is the only text a user sees.
 */
export function gateFail(
  id: string,
  name: string,
  value: number | null,
  limit: string,
  why: string
): GateResult {
  return { id, name, passed: value === null ? 'no-data' : 'fail', value, limit, why };
}

/**
 * Build a gate that could not be evaluated. Distinct from a pass on purpose.
 */
export function gateNoData(id: string, name: string, limit: string, why: string): GateResult {
  return { id, name, passed: 'no-data', value: null, limit, why };
}

/**
 * Collapse gates into a single verdict.
 *
 * Precedence, matching buildMovementRetestReport:
 * 1. all `pass`         -> passes
 * 2. any `no-data`      -> insufficient-data (an unevaluated gate blocks a claim)
 * 3. otherwise          -> reviewable
 *
 * firstFailure stays the earliest gate that is not a pass, so the reason shown
 * is the first problem encountered. Note that an earlier real failure outranks
 * a later no-data gate for that reason, even though no-data still forces the
 * overall verdict to insufficient-data.
 */
export function buildVerdict(gates: GateResult[]): GateVerdict {
  const firstFailure = gates.find((gate) => gate.passed !== 'pass') ?? null;

  if (gates.some((gate) => gate.passed === 'no-data')) {
    return { passed: false, status: 'insufficient-data', gates, firstFailure };
  }
  if (firstFailure) {
    return { passed: false, status: 'reviewable', gates, firstFailure };
  }
  return { passed: true, status: 'passes', gates, firstFailure: null };
}

/**
 * Render gates for display: every gate as a row, then the single reason that
 * matters. Matches the gate table format used in the robot data spec.
 */
export function formatGates(gates: GateResult[]): string {
  if (gates.length === 0) return '';

  const mark: Record<GateStatus, string> = {
    pass: 'PASS',
    fail: 'FAIL',
    'no-data': 'NO DATA',
  };

  const rows = gates.map((gate) => {
    const value = gate.value === null ? '-' : String(gate.value);
    return `| ${gate.id} | ${gate.name} | ${mark[gate.passed]} | ${value} | ${gate.limit} |`;
  });

  const header = '| id | gate | result | value | limit |';
  const divider = '| --- | --- | --- | --- | --- |';
  const verdict = buildVerdict(gates);
  const reason = verdict.firstFailure?.why ? `\n\n${verdict.firstFailure.why}` : '';

  return [header, divider, ...rows].join('\n') + reason;
}
