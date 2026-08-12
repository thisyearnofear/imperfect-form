# Movement assessment test–retest evidence

- **Protocol:** curls-baseline
- **Input:** sample-curl-retest-records.json
- **Captured:** 2026-08-11T23:19:48.686Z
- **Status:** passes-screen

## Sample quality

| Measure                    | Result |
| -------------------------- | -----: |
| Total records              |     12 |
| Protocol records           |     10 |
| Malformed / other protocol |      2 |
| Valid reads                |      8 |
| Inconclusive reads         |      2 |
| Inconclusive rate          |    0.2 |
| Low-confidence valid reads |      1 |
| Low-confidence rate        |  0.125 |
| Qualifying reads           |      7 |
| Study span (days)          |     11 |

## Test–retest signal

| Measure                                | Result |
| -------------------------------------- | -----: |
| Comparable pairs                       |      6 |
| Average confidence                     |   0.84 |
| Average similarity                     | 0.9379 |
| Repeatable pair rate                   | 0.8333 |
| Average absolute range delta           | 0.0383 |
| Average absolute control delta         | 0.0717 |
| Average absolute trace-stability delta | 0.0633 |

## Screening gates

- Minimum pair count (≥ 2): pass
- Average confidence (≥ 0.65): pass
- Average similarity (≥ 0.7): pass
- Repeatable pair rate (≥ 0.7): pass
- Inconclusive rate (≤ 0.25): pass
- Low-confidence rate (≤ 0.25): pass

## Interpretation guardrails

- Descriptive local protocol evidence only; this report is not clinical validation or a population norm.
- Only valid, protocol-matched reads at or above the confidence floor contribute to comparable pairs.
- Review setup, device, lighting, camera angle, and warm-up conditions alongside these aggregates.

Raw exported records should be preserved beside this report. Do not treat a screening pass as clinical validation, a population benchmark, or a guarantee of future movement ability.
