# Movement Intelligence — evidence collection

Local, de-identified test–retest evidence for the `curls-baseline@1.0` protocol.
Follow [`docs/MOVEMENT_RETEST_PROTOCOL.md`](../docs/MOVEMENT_RETEST_PROTOCOL.md)
for the study matrix, capture rules, and review checklist.

## Contents

- `sample-curl-retest-records.json` — **synthetic, de-identified** sample
  fixture. It demonstrates the input schema, the setup-matrix cells, and the
  screening gates. It is not participant data and not evidence of any real
  person's movement.
- `sample-curl-retest-report.json` / `sample-curl-retest-report.md` — harness
  output for the sample (regenerate anytime with the command below).

## Run the harness

```sh
pnpm evaluate:movement-retest -- \
  --input evidence/sample-curl-retest-records.json \
  --protocol curls-baseline \
  --out evidence/sample-curl-retest-report
```

Writes `sample-curl-retest-report.json` (machine-readable) and
`sample-curl-retest-report.md` (human-readable).

## Rules for real evidence

- De-identify: replace `userId` and `sourceSessionId` with study-local
  pseudonyms; keep the raw export private.
- Do not commit participant-level records unless a privacy review explicitly
  allows it. This folder is for de-identified artifacts and the evidence log.
- No frames, images, wallet addresses, or unnecessary identity fields.
- Record setup context (device, lighting, angle, warm-up) per record so the
  review can inspect conditions alongside the aggregates.
- Label pilots as **insufficient data** when they do not meet the minimum pair
  count. A screening pass is not clinical validation, a population norm, or a
  guaranteed trajectory.
