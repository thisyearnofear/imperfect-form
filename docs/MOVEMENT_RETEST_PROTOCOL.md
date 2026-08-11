# Curl Movement Assessment Test–Retest Protocol

> Evidence study for `curls-baseline@1.0`. This is a local protocol-quality
> study, not clinical validation, a population norm, or a prediction of future
> movement ability.

## Purpose

Establish whether the current five-rep curl assessment produces a sufficiently
stable movement signal under comparable capture conditions to support the local
Movement History and confidence-aware trajectory surfaces.

The study must measure the capture protocol—not the user's worth, health,
fitness identity, or guaranteed capacity.

## Standard setup

Use the same setup instructions for every planned retest:

- Place the camera at approximately shoulder height, in landscape or the
  documented product default.
- Keep the full upper body and both arms visible throughout the five reps.
- Use stable, front-facing lighting; record whether the room is bright, mixed,
  dim, or backlit.
- Stand at the same approximate distance and orientation for a paired retest.
- Use the same curl mode and complete exactly five controlled repetitions.
- Avoid intentionally changing pace, range, clothing contrast, or camera angle
  between paired captures.
- Stop if there is pain or discomfort. This protocol is general wellness
  guidance, not a clinical test.

## Required study matrix

Capture at least three paired reads per setup cell before interpreting a cell.
A pair means the same participant repeats the protocol under the same planned
conditions, ideally after a short reset rather than immediately rushing into a
second capture.

| Dimension       | Minimum conditions                                                      |
| --------------- | ----------------------------------------------------------------------- |
| Same setup      | 3 paired repeats on the same device and day                             |
| Time separation | Repeat on at least two days; target 7–14 days for trajectory evidence   |
| Lighting        | Normal light plus one controlled lower-light condition                  |
| Camera          | At least one desktop/laptop camera and one mobile camera when available |
| Angle           | Front-facing baseline plus one documented small angle variation         |
| Warm-up         | Record whether the participant was fresh, warmed up, or post-session    |

The first pass can be smaller for a pilot, but label it **insufficient data**
when it does not meet the minimum pair count. Do not silently combine materially
different protocol conditions.

## Capture record

Export only the assessment records needed for the analysis harness. The records
may remain local and should be de-identified for any shared evidence package.
Do not include raw frames, images, wallet addresses, or unnecessary identity
fields.

The harness accepts either:

```json
[
  {
    "id": "read-1",
    "userId": "study-participant-1",
    "sourceSessionId": "session-1",
    "savedAt": 1730000000000,
    "assessment": { "...": "MovementAssessment" }
  }
]
```

or:

```json
{ "records": [] }
```

For a public or externally shared artifact, replace `userId` and
`sourceSessionId` with study-local pseudonyms and keep the raw export private.

## Run the analysis

```sh
node scripts/evaluate-movement-retest.mjs \
  --input evidence/curl-retest-records.json \
  --protocol curls-baseline \
  --out evidence/curl-retest-report
```

The command writes:

- `evidence/curl-retest-report.json` — versioned machine-readable report.
- `evidence/curl-retest-report.md` — reviewable human-readable summary.

Keep the raw exported records beside the report in a private evidence location;
do not commit participant-level records unless the privacy review explicitly
allows it.

## Metrics and screening gates

The report includes:

- valid, inconclusive, malformed, other-protocol, and low-confidence counts
- qualifying reads and comparable sequential pairs
- average confidence and similarity
- repeatable pair rate
- inconclusive rate
- average absolute range, control, and trace-stability deltas
- study span in days

The initial screening thresholds are deliberately descriptive and should be
revisited after real pilot data:

- at least 2 comparable pairs
- average confidence ≥ `0.65`
- average similarity ≥ `0.70`
- repeatable pair rate ≥ `0.70`
- inconclusive rate ≤ `0.25`
- low-confidence valid-read rate ≤ `0.25`

A **passes-screen** result means the observed sample is stable enough for a
review conversation. It does not establish clinical validity or justify age
norms, rankings, biological-age language, or guaranteed trajectory windows.
A **reviewable** result needs human inspection of setup conditions and outliers.
An **insufficient-data** result means collect more comparable reads; it is not a
failed participant result.

## Review checklist

Before changing product language or opening M4 benchmarking, review:

- Were the same camera, angle, distance, lighting, and warm-up conditions used?
- Did the inconclusive rate change by setup cell?
- Are outliers explained by capture conditions rather than hidden in an average?
- Does confidence correlate with similarity?
- Are range and control drifting together, or is one dimension unstable?
- Does the seven-to-fourteen-day repeat remain comparable?
- Are raw exports retained privately and deleted on the documented schedule?

Record the setup matrix, participant count, raw-report location, report hash or
run identifier, reviewer, and decision in the evidence log. Do not promote a
screening result to a product claim without this review.
