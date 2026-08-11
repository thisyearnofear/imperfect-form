# Movement Intelligence — Product Vision and Implementation Plan

> **See how you move today. Understand what is changing. Find the next movement you can unlock.**

Movement Intelligence is the product layer that grows Imperfect Form from a form-correction tool into a persistent, privacy-first understanding of movement. It does not replace the physical-AI Coach. It gives the camera → understand → show loop a durable user outcome: a person can see their movement profile, compare themselves with an appropriate reference group, and follow a credible trajectory over time.

The product should feel like a discovery, not a diagnosis:

> **The app revealed something surprising about how I move — and gave me a clear next unlock.**

## Product thesis

Imperfect Form should become a **private movement intelligence layer**:

1. The camera observes a small, repeatable movement protocol on the user's device.
2. The app turns observations into understandable dimensions such as range, control, symmetry, tempo, and consistency.
3. The user receives a **Movement Card** with one useful insight and one next focus.
4. The user can share a privacy-safe challenge: **Take the same test.**
5. Repeated assessments produce a self-versus-self trajectory.
6. Only after measurement quality and sample size are credible do we add age-band or cohort comparisons.
7. Historical and fictional references become playful archetypes layered on top of real measurements, never presented as scientific equivalence.

## The Movement Passport

The Movement Passport is the persistent, user-owned summary of movement patterns. In the first release, “user-owned” means local-first control with explicit export and delete semantics; it does not imply automatic cloud portability or on-chain storage. It is not a medical record, biological-age claim, or universal fitness score.

### Initial dimensions

- **Range** — how far a joint or movement travels under the protocol.
- **Control** — whether the user can enter, hold, and leave a position steadily.
- **Symmetry** — meaningful left/right differences where the camera evidence supports them.
- **Tempo** — controlled movement versus rushed movement.
- **Consistency** — whether the result repeats across attempts and sessions.
- **Confidence** — how reliable the camera measurement was under the current setup.

The first release should expose only a few dimensions that the existing pose pipeline can measure repeatably. Do not launch a large composite score before the underlying measurements are understood.

### Comparison hierarchy

Comparisons are introduced in this order:

1. **Self versus self** — the primary and safest comparison: “Your overhead reach improved 8°.”
2. **Similar people** — broad age bands or protocol-matched cohorts, only with sufficient sample size and clear uncertainty.
3. **Opt-in groups** — friends, gyms, clubs, workplaces, or event cohorts; prefer supportive progress over a global rank.
4. **Archetypes** — original historical or fictional movement characters that make the result memorable. Real measurements power the score; fiction powers the imagination.

Avoid “body age,” “biological age,” or definitive statements about stiffness, injury, health, or future ability. A webcam can produce useful movement signals, not a clinical diagnosis.

## The engineered distribution loop

The first viral object is not a generic workout share. It is the **Movement Card**:

```text
Private assessment
  → one surprising movement insight
  → Movement Card
  → “Take the same test” challenge
  → recipient completes the same protocol
  → recipient receives their own card
  → recipient shares or challenges someone else
```

The recipient must land on a focused challenge route, not a generic homepage. The route should explain the movement in one sentence, preserve the sender's privacy, require no wallet or account, and make the next action a single camera CTA.

The default share payload is the least revealing aggregate result. An approximate movement trace is a separate, explicit opt-in with a preview of exactly what will be shared. The payload must not include raw camera frames or images unless the user explicitly chooses to share them in a later, separately-consented flow.

## Trajectory design

Trajectory estimates are scenarios, not promises. The language should become more confident only as repeated evidence accumulates:

- **Early estimate** — baseline only; directional and explicitly low confidence.
- **Emerging trend** — two or three comparable assessments.
- **Reliable trend** — repeated measurements under comparable conditions.

Example:

```text
NEXT UNLOCK
Overhead reach without rib flare

Current: 68°
Target: 82°
Recent trend: +3° per week
Estimated window: 4–7 weeks
Confidence: early estimate

Try two controlled mobility sessions this week.
Re-test in 7 days.
```

Use “people with a similar starting profile often…” only when the product has a defensible cohort and protocol. Never state that a user will definitely reach a movement milestone by a particular date.

## Relationship to the Physical AI North Star

Movement Intelligence and physical AI reinforce each other:

- **Camera coaching** provides the mass-market entry and the measurement surface.
- **Movement Cards and trajectories** turn a single correction into a persistent reason to return.
- **Ghost / assessment challenges** turn the user's result into a recipient acquisition path.
- **The physical Coach** makes corrections demonstrable and gives the category a memorable moat.
- **Validated sessions** can later provide structured, privacy-safe episodes for the robot data flywheel.

The robot remains a teacher, not a measurement gimmick. The Movement Passport is a product outcome around the coaching loop, not a reason to weaken the current manual-stage and hardware gates.

## Data model boundary

Keep assessment data separate from workout scores and on-chain transaction data. The first implementation should define typed, versioned domain objects similar to:

- `MovementAssessment` — protocol version, exercise/movement, normalized measurements, confidence, repeatability, timestamp, and local-only provenance.
- `MovementProfile` — the latest dimensions and their confidence state.
- `MovementCard` — a share-safe headline insight, next focus, and optional approximate trace.
- `MovementChallenge` — protocol, sender payload, recipient state, and challenge analytics metadata.
- `TrajectoryEstimate` — current value, target milestone, trend window, confidence, and recommendation.

Raw video, face imagery, wallet addresses, and unnecessary identifiers do not belong in the share payload. A local guest ID is sufficient for the first self-history loop.

## Guardrails

### Measurement

- Start with a small number of movements and publish the protocol, not just the score.
- Calibrate camera distance, angle, lighting, and visibility before a valid assessment.
- Record pose confidence and repeatability; allow an assessment to be marked inconclusive.
- Do not compare measurements collected under materially different conditions without a clear caveat.
- Reuse existing pose and exercise outputs; do not create a second detector for the Passport.

### Health and safety

- Use general-wellness language: range signal, movement control, observed asymmetry, form consistency.
- Do not diagnose stiffness, injury, disease, mobility impairment, or biological age.
- Do not promise a medical or athletic outcome.
- Provide a stop/pause path for pain or discomfort and direct users to qualified professionals for clinical concerns.
- Use supportive progress language; do not make shame, punishment, or aggressive streak pressure the core loop.

### Privacy

- Camera and pose processing remain on-device wherever possible.
- Share aggregate results by default; approximate traces require explicit opt-in, and raw video is never shared by default.
- Make age-band and cohort participation optional and explain how aggregation works.
- Provide deletion and reset paths for local Passport history.
- Keep analytics metadata separate from movement payloads and never let analytics block coaching.

## Implementation sequence

### M0 — Assessment protocol and measurement quality

**Status: local curl baseline shipped; broader protocol validation remains open.**

The current implementation provides a fixed five-rep `curls-baseline` protocol using
existing pose/session telemetry. It records confidence and quality dimensions,
requires bilateral evidence, returns explicit inconclusive states, and keeps the
assessment local. It does not yet claim cross-device test–retest validity.

**Goal:** Prove that one or two movement assessments are repeatable before introducing rankings or predictions.

Deliverables:

- Choose one flagship protocol and one fallback protocol from movements the current pose engine already understands.
- Define camera/setup instructions, valid-attempt rules, confidence thresholds, and inconclusive states.
- Add a measurement-quality record to the local result; do not yet expose a percentile.
- Run test–retest sessions across lighting, angle, distance, device, and warm-up conditions.
- Document the protocol and baseline results.

Gate:

- A user can repeat the protocol and receive a materially similar result under comparable conditions.
- Invalid or low-confidence attempts are not silently turned into scores.
- Ring 0 camera coaching and the physical-AI manual-stage path remain unchanged.

Likely reuse points: `PoseRuntime`, the exercise engine, `SessionLogger`, `SessionSummary`, `poseBaseline`, and the existing curl evidence instrument.

### M1 — Local Movement Card

**Status: first local card shipped; delete/export and broader profile surfaces remain open.**

The recap now presents a private curl Movement Card with range signal, control,
trace stability, supported symmetry, confidence, protocol label, and a neutral
next-step prompt. Inconclusive captures explain what prevented a card. Assessment
telemetry is stored in a separate local namespace and is not embedded in workout
or wallet-sync payloads.

**Goal:** Turn one valid assessment into a useful, shareable personal result without an account or wallet.

Deliverables:

- Add a local `MovementAssessment` store using the existing offline-first patterns; a separate `MovementProfile` projection remains a later surface.
- Expand the recap surface into a Movement Card: one insight, one next focus, measurement confidence, and protocol label.
- Keep the first result self-referential; do not show age comparisons yet.
- Add reset/delete behavior and copy that explains the result is general wellness guidance.
- Add unit tests for scoring, confidence, inconclusive states, and local persistence.

Gate:

- A new user can finish an assessment, understand the card without explanation, and return to it later.
- The card gives a concrete next action rather than only a number.

Likely reuse points: `SessionRecap`, `coachingStory`, `FormSignature`, `OfflineDataStore`, `WorkoutDataAdapter`, and the studio/lab recap register.

### M2 — Assessment challenge and recipient route

**Goal:** Engineer distribution into the result itself.

Deliverables:

- Generate a versioned, share-safe challenge payload: protocol, headline, next action, and optional approximate trace.
- Add a focused recipient route with one CTA: **Take the same test**.
- Support native Web Share, Farcaster share, and clipboard fallback without requiring a wallet.
- Track `assessment_card_shared`, `assessment_challenge_opened`, `assessment_started`, `assessment_completed`, and `assessment_replied` without camera payloads.
- Preserve existing Ghost challenge links; add a distinct assessment challenge type rather than overloading workout races.

Gate:

- A recipient can open a challenge and begin the protocol without onboarding confusion.
- The sender's card remains useful if sharing is cancelled or unavailable.
- The challenge payload contains no raw images or frames.

Likely reuse points: `GhostService`, `SessionRecap`, `ChallengeWidget`, `PlatformContext`, `challengeAnalytics`, and the existing `/race` handling patterns.

Primary metric:

> Accepted assessment challenges per activated user.

### M3 — Self trajectory and next unlocks

**Status: compact local Movement History shipped; trajectory estimates remain open.**

The recap loads user-scoped local assessment history, orders valid protocol-matched
reads newest-first, shows recent baseline rows, and compares the latest valid read
with the previous valid read using explicit range and trace-stability deltas. It
suppresses deltas for inconclusive or malformed records and treats storage failure
as an empty-history fallback. This is self-comparison only, not a population norm,
health score, or future-ability prediction.

**Goal:** Make the product worth returning to because the user's own movement history changes.

Deliverables:

- Compare only protocol-matched, sufficiently confident assessments.
- Add a compact trend view and a next-milestone model with confidence states.
- Recommend one practice focus and a sensible re-test interval; do not encourage compulsive daily testing.
- Add “restart design” for missed sessions, travel, illness, or changed conditions.
- Share milestone cards as outcomes, not shameful missed-streak notifications.

Gate:

- The trajectory never implies certainty from one baseline.
- The user can see why a trend is or is not considered reliable.
- The result remains useful when progress is flat or a session is inconclusive.

Primary metric:

> Percentage of users completing a second valid assessment within 7–14 days.

### M4 — Age-band and cohort benchmarking

**Goal:** Add meaningful comparison only after the measurement protocol and data population are credible.

Deliverables:

- Define broad age bands and optional demographic context only where it materially improves interpretation.
- Aggregate only protocol-matched, confidence-qualified observations.
- Show sample size, comparison scope, and uncertainty; suppress comparisons when the cohort is too small. Define the minimum threshold before launch.
- Use pseudonymous aggregation: never expose exact age, timestamps, device metadata, or raw traces to other users.
- Make participation opt-in, explain data use in plain language, and document retention, deletion, and what withdrawal can and cannot remove after an aggregate is published.
- Limit age-band benchmarking to the product's eligible adult population; do not imply norms for minors.
- Prefer supportive cohort views (“your group is improving”) over a global leaderboard.

Gate:

- The benchmark is not materially distorted by device, protocol, or selection effects.
- The UI does not imply that the comparison is a medical norm or a destiny.
- Privacy review passes before population data is exposed.

### M5 — Archetypes and historical / fictional layer

**Goal:** Make movement intelligence memorable without confusing narrative with evidence.

Deliverables:

- Create original archetypes first; add historical references only with documented provenance and fictional references only with appropriate rights.
- Map archetypes to movement patterns, not claims that a user is physically equivalent to a character.
- Keep the real measurement and confidence visible beneath the playful layer.
- Use archetypes in cards, challenge prompts, and progression unlocks.

Gate:

- Users can distinguish measured result, cohort comparison, and playful interpretation.
- Archetypes improve sharing or retention in experiments without worsening trust or safety signals.

## Instrumentation and success metrics

### Activation

- Visitor → assessment started.
- Assessment started → valid result.
- Time to first useful insight.
- Percentage of users who can explain what the result means in a first-visit test.

### Distribution

- Movement Card share rate.
- Challenge open rate.
- Challenge start rate.
- Challenge completion rate.
- Recipient → sharer conversion.
- Accepted challenges per activated user.

### Engagement

- Second valid assessment within 7–14 days.
- Third valid assessment within 30 days.
- Recommendation completion rate.
- Trajectory view rate.
- Reminder opt-in and re-test completion.

### Trust and quality

- Test–retest variance.
- Pose confidence and inconclusive rate.
- Camera/setup failure rate.
- User-reported confusion or unsafe guidance.
- Privacy choice, deletion, and reset usage.
- Percentage of shares containing only aggregate or approximate-trace data.

## Explicit non-goals for the first release

- No “body age” or “biological age.”
- No universal flexibility or stiffness leaderboard.
- No medical, injury, diagnostic, or guaranteed-outcome claims.
- No raw camera upload required for an assessment or challenge.
- No wallet, transaction, or on-chain requirement for the Movement Card.
- No new pose detector; use the existing PoseRuntime and exercise-engine outputs.
- No broad multi-movement composite score until individual protocols are validated.

## Current implementation boundary

Shipped in the first local slice:

- Versioned `MovementAssessment` types and pure protocol evaluation.
- Fixed five-rep curl baseline with valid/inconclusive outcomes and confidence quality.
- Local-only assessment persistence with user-scoped upsert, ordered writes, verification, and guest-to-wallet re-keying.
- Recap Movement Card and compact self-versus-self Movement History.
- Focused tests for scoring, persistence, comparison, malformed records, and inconclusive states.

Still gated:

- Setup calibration and cross-device test–retest evidence.
- Assessment challenge recipient route and distribution analytics.
- Trajectory estimates and next-milestone recommendations.
- Age-band/cohort benchmarking and historical/fictional archetypes.

## Definition of done for the first public slice

A user who has never seen Imperfect Form can:

1. Start the flagship assessment without a wallet or account.
2. Understand the setup and receive either a valid card or a clear inconclusive result.
3. See one useful movement insight, one next focus, and a confidence indicator.
4. Share a privacy-safe **Take the same test** challenge.
5. Have a recipient open the challenge and begin their own assessment.
6. Return later and see a self-versus-self comparison after a second valid attempt.

The first public slice is successful when it proves the loop:

```text
valid assessment → useful card → accepted challenge → recipient assessment → repeat test
```

Only then should the product invest in age-band benchmarks, cohort comparisons, or a richer archetype system.
