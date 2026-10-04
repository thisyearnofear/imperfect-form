# Coach gates

Every form check the coaching engine runs, with the number it judges against.
The thresholds live in `src/lib/coachingEngine.ts` as `FORM_CHECK_THRESHOLDS`
and are asserted by `src/lib/gates.test.ts` and `src/lib/movementRetestDocSync.test.ts`.
Change a number here and those tests fail until you change the table.

## How a gate works

A gate is one named threshold with a measured value, the limit it was judged
against, and a sentence explaining a failure. Gates are three-state:

| result    | meaning                                                  |
| --------- | -------------------------------------------------------- |
| `pass`    | measured and inside the limit                            |
| `fail`    | measured and outside the limit                           |
| `no-data` | the gate could not be evaluated — never counts as a pass |

An analysis is accepted only when every gate passes. When something fails, the
**first** failing gate's reason is the one shown, because the checks are ordered
by issue priority and the earliest problem is usually the upstream cause of
everything after it.

A gate that a given exercise cannot answer is **omitted**, not reported as a
pass. Curls are not graded on normalized depth (they have a dedicated
elbow-angle instrument in the live session), and ankle mobility is only
observable in a squat.

Verdict precedence, matching the movement-retest report:

1. every gate passes → `passes`
2. any gate is `no-data` → `insufficient-data`
3. otherwise → `reviewable`

## Form gates

### Depth (normalized range of motion, 0-1)

| limit  | meaning                                                       |
| ------ | ------------------------------------------------------------- |
| `0.3`  | below this is critical — "Go deeper!" / "Lower down more!"    |
| `0.6`  | below this is a warning — "Add more depth" / "Extend further" |
| `0.85` | the target reported on the issue                              |
| `0.9`  | above this is positive feedback, at the lowest priority       |

Skipped entirely for curls.

### Trunk lean (degrees, forward bend)

| limit | meaning                                                          |
| ----- | ---------------------------------------------------------------- |
| `15`  | warning threshold for most exercises                             |
| `30`  | warning threshold for squats, which tolerate more lean           |
| `45`  | critical for every mode; an absolute line, not a per-mode target |

### Knee valgus (degrees, inward collapse)

| limit | meaning                          |
| ----- | -------------------------------- |
| `30`  | warning — "Keep knees aligned"   |
| `50`  | critical — "Push knees outward!" |
| `20`  | the target reported on the issue |

### Ankle mobility (degrees, squats only)

| limit | meaning                                             |
| ----- | --------------------------------------------------- |
| `60`  | below this is info-level — "Improve ankle mobility" |
| `80`  | the target reported on the issue                    |

### Left/right balance (1 = even)

| limit | meaning                                           |
| ----- | ------------------------------------------------- |
| `0.7` | below this is a warning — "Balance weight evenly" |
| `0.9` | the target reported on the issue                  |

### Stability

Not a numeric gate. The rep either has `isStable = true` or it does not; an
unstable rep is always the highest-priority critical issue.

## Why these numbers

These thresholds are the existing coaching behavior, hoisted into one table so
they can be reviewed together. They are **not** yet clinically validated — they
are descriptive product copy. Two honest caveats:

- The confidence values attached to each issue (`FORM_CHECK_CONFIDENCE`) reflect
  how much the signal is trusted in the UI, not a measured detection accuracy.
- Movement-intelligence claims are gated on real pilot data; see
  `docs/MOVEMENT_INTELLIGENCE.md`. The screening floors for the test-retest
  protocol live in `src/lib/movementRetest.ts` and are documented in
  `docs/MOVEMENT_RETEST_PROTOCOL.md`.

Neither set may be cited as clinical validity. A **passes** result means the
observed sample looked stable enough to discuss, nothing more.
