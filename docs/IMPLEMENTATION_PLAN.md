# Implementation Plan — Mentor Feedback into Action

> Product extension: [`MOVEMENT_INTELLIGENCE.md`](./MOVEMENT_INTELLIGENCE.md)
> defines the Movement Passport vision and the separate M0–M5 product gates.

This plan translates the Q&A with Francesco De Pascale (Cyberwave) into ordered, shippable work. The existing CV, robot-mapping, and edge-performance phases protect the physical-AI gate. The Movement Intelligence M0–M3 product track may begin once Ring 0 is stable, while M4–M5 remain gated by validated population data and privacy review; none of it reorders the manual-stage → hardware → episode path.

## Guiding principle

> Build the deterministic pipeline first, generate data from real coaching sessions, and only then consider learned policies. — Francesco

We already ship scripted robot primitives in `coach-station/`; this plan adds upstream CV robustness, a formal human-pose → robot-pose mapping, and controlled edge-performance experiments.

---

## Phase 0: Baseline measurements (1–2 days) — in progress

**Goal:** Know where we stand before changing anything.

| Measurement                   | Tool / Method                                                            | Output                                             |
| ----------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| Pose detection FPS on mobile  | `src/utils/performanceMonitor.ts`, Chrome DevTools, Safari Web Inspector | Median FPS, p95 frame time, battery impact (5 min) |
| Failure modes on bad lighting | Manual test: dim room, side light, back light                            | Log of dropped frames / confidence collapses       |
| Failure modes on off-angle    | Place laptop/phone at 30°, 45° low/high                                  | Keypoint stability score                           |
| Current model variant         | `PoseDetectionService.getDetectorConfig` / `usePoseDetection.ts`         | MoveNet Lightning vs Thunder, input resolution     |
| Existing pre-processing       | Search for `ImageData`, canvas filters, contrast                         | Document what we do today (likely none)            |

**Files to touch:**

- `src/services/PoseDetectionService.ts`
- `src/modules/usePoseDetection.ts`
- `src/utils/performanceMonitor.ts`
- `src/utils/deviceDetection.ts`
- `src/lib/pose/poseBaseline.ts` ✅ added
- `docs/PERFORMANCE_BASELINE.md` ✅ added

**Usage:**

```js
window.__IMF_BASELINE__.start();
// ... workout ...
window.__IMF_BASELINE__.stop();
window.__IMF_BASELINE__.copyMarkdown();
```

**Success criteria:** A short `docs/PERFORMANCE_BASELINE.md` with reproducible numbers.

---

## Phase 1: Pose-robustness pre-processing (1 week) — in progress

**Goal:** Reduce lighting and angle failures before they reach MoveNet.

### 1.1 Classical CV pipeline ✅ shipped

A lightweight pre-processing stage now runs on the canvas frame **before** it is sent to the detector. It is optional, benchmarked, and fail-silent.

- **Exposure normalization + white balance:** a sampled gray-world heuristic with a strength blend and mild contrast stretch.
- **Configurable toggle:** stored in `localStorage` under `prefPosePreprocessor`; surfaced in `GameControls`.
- **Scope:** Main-thread and Web Worker paths both support the pre-processor.
- **Overhead:** a full-pixel JavaScript pass adds per-frame CPU cost; expect a small FPS dip on low-end devices. Use `window.__IMF_BASELINE__` to compare on/off runs.
- **Out of scope for Phase 1.0:** lens undistortion; generative cleanup.  
  The code for these Phase 2 filters exists in `src/lib/pose/posePreprocessor.ts` but is gated by `PHASE2_CV_FILTERS_ENABLED` (default `false`). They do not run in main builds until the flag is flipped after passing real-world baselines.

**Files touched:**

- `src/lib/pose/posePreprocessor.ts` ✅ new utility
- `src/lib/pose/posePreprocessor.test.ts` ✅ unit tests
- `src/modules/poseWorker.ts` ✅ applies preprocessor in worker path
- `src/modules/usePoseDetection.ts` ✅ applies preprocessor in main-thread path
- `src/types/mediapipe.ts` ✅ `PosePreprocessorSettings` + worker `init` message field
- `src/components/game/GameControls.tsx` ✅ user-facing toggle

### 1.2 Generative cleanup / Phase 2 CV filters (spike)

The Phase 2 filter code (lens-distortion fix and generative low-light cleanup) lives in `src/lib/pose/posePreprocessor.ts` but is gated by `PHASE2_CV_FILTERS_ENABLED` (default `false`). This keeps the experimental code close to the production pipeline while ensuring only the validated Phase 1 classical filter (auto-exposure / white balance) runs in main.

**Files to touch:**

- Spike branch only; do not flip `PHASE2_CV_FILTERS_ENABLED` to `true` in `main` until the filters beat the classical baseline on real-world measurements.
- When ready to ship, update `docs/PERFORMANCE_BASELINE.md` with the three-configuration baseline and un-gate the toggles.

### 1.3 Success criteria

- [x] Classical pre-processing is a toggle in settings.
- [ ] Median keypoint confidence improves on the “bad lighting” test set by ≥10%.
- [ ] Mobile FPS regression is <5% at worst.
- [ ] Falls back to raw frames if the preprocessor errors.

---

## Phase 2: Human-pose → robot-pose mapping (1.5 weeks) — in progress

**Goal:** Build the deterministic bridge that turns a form correction into a safe robot demonstration and records the resulting episode.

**Current state:** The first elbow-first slice is shipped for curls. The browser
captures the elbow angle associated with an `elbow_swing` cue, sends it as
`FormEvent.current`, and sends a deterministic 50° correction as
`FormEvent.target`. The station clamps both values to the active simulation or
live workspace before producing the `elbow_flex` intent and interpolated
trajectory. The session also exposes an evidence-first `CurlFormInstrument`
that formats the active arm's elbow angle, target range, phase, and drift from
the same processor output; curl depth and coaching copy use that same reading.
The remaining gate is recording and validating a coached episode in LeRobot
format.

### 2.1 Define the mapping contract ✅ shipped for curl elbow flexion

Create a small, typed pipeline:

```
HumanPose (MoveNet keypoints)
  ↓
HumanAngles (elbow, shoulder, hip, etc.)
  ↓
RobotAngles (SO-101 joint targets, elbow-first)
  ↓
Trajectory (interpolated waypoints with clamps)
  ↓
CyberwaveArm / ConsoleArm
```

**Key decisions:**

- **Mirroring vs. third-person:** Start with **third-person demonstration** (robot shows the correction from a canonical viewpoint) because it avoids left/right ambiguity. Mirror mode is a later toggle.
- **Elbow-first primitives:** Continue the existing `demonstrate_strict_curl`, `demonstrate_extension`, `mirror_asymmetry` primitives. Add `demonstrate_shoulder_protraction`, `demonstrate_wrist_neutral`.

### 2.2 Implement the mapper ✅ first curl slice shipped

The first slice intentionally stays inside the existing primitive and safety
layers rather than introducing a new mapper package:

- `src/lib/exercise-engine/curlProcessor.ts` identifies the visible arm that
  triggered `elbow_swing` and exposes its observed elbow angle.
- `src/modules/usePoseDetection.ts` and `src/modules/poseWorker.ts` forward
  that angle through the browser bridge.
- `src/services/coachStation.ts` sends `current` plus the 50° curl target.
- `coach-station/coach_station/primitives.py` normalizes dynamic endpoints to
  the active workspace and resolves `demonstrate_strict_curl`.
- `coach-station/coach_station/trajectory.py` interpolates the safe
  `elbow_flex` waypoints with speed and per-step clamps.

Future joints and corrections can move into a dedicated mapper package once
this curl path is validated on the station.

### 2.3 Record episodes

Every time a demo fires, append a LeRobot-format episode slice to disk (not yet to a remote).

**Files to touch:**

- New: `coach-station/coach_station/recorder.py`
- Update: `coach-station/coach_station/server.py` to call the recorder
- Update: `coach-station/coach_station/safety.py` to ensure recording cannot override safety gates

### 2.4 Success criteria

- [x] Curls → bad elbow form → `elbow_swing` → station maps to a corrected,
      safety-clamped elbow angle and plays a trajectory.
- [x] Curl session shows the measured active-arm angle, 50–70° target range,
      curl phase, and elbow drift without adding a second detector.
- [x] Curl depth and generic correction status are aligned to the same active
      arm; stale curl telemetry is cleared when tracking is lost.
- [ ] Browser + station manual stage validates the mapping in simulation with
      narration and twin telemetry.
- [ ] Each recorded episode includes: timestamp, user/session id, exercise mode,
      detected issue, detected human angle, target human angle, robot waypoints,
      persona.
- [ ] Episode format is documented and importable by `lerobot`.

---

## Phase 3: Edge performance experiments (1 week)

**Goal:** Find the cheapest latency / battery win on mobile browsers.

### 3.1 Three-knob matrix

Run controlled A/B tests. Use the baseline from Phase 0.

| Knob          | Variants                                                  | Measurement                               |
| ------------- | --------------------------------------------------------- | ----------------------------------------- |
| Input size    | 192×192, 256×256, current                                 | FPS, accuracy (rep count vs ground truth) |
| Model variant | MoveNet Lightning, Thunder, BlazePose lite                | Same as above                             |
| Quantization  | FP32 (baseline), INT8 if TF.js supports it, WASM vs WebGL | Same as above                             |

### 3.2 Files to touch

- `src/services/PoseDetectionService.ts` (detector config, model type)
- `src/modules/usePoseDetection.ts`
- `src/utils/tfUtils.ts`
- `src/utils/performanceMonitor.ts`
- `src/utils/deviceDetection.ts` (add “supports INT8 / WebGL / WASM” flags)

### 3.3 Decision rule

Pick the configuration that gives the best **median FPS × accuracy** product on a mid-range Android phone and an older iPhone.

### 3.4 Success criteria

- [ ] A matrix of results checked into `docs/EDGE_PERF_MATRIX.md`.
- [ ] Default mobile config is updated to the winning configuration.
- [ ] No regression on Ring 0 e2e tests (`e2e/ring0.spec.ts`, `e2e/pose-runtime.spec.ts`).

---

## Phase 4: Movement Intelligence first public slice

**Goal:** Turn validated camera observations into a durable, privacy-safe product
loop without weakening the Physical AI gates.

This is a product track around the existing PoseRuntime and exercise engine. It
is not permission to introduce a second detector, a global leaderboard, or
unsupported health predictions.

### 4.1 M0 — Assessment protocol and measurement quality

**Status: first local curl protocol shipped; validation across setup/device conditions remains open.**

- Select one flagship protocol and one fallback from movements the current pose
  engine already understands.
- Define setup calibration, valid-attempt rules, confidence thresholds, and an
  explicit inconclusive state.
- Record protocol version, normalized measurements, confidence, repeatability,
  timestamp, and local provenance.
- Run test–retest sessions across lighting, camera angle, distance, device, and
  warm-up conditions.
- Reuse `PoseRuntime`, the exercise engine, `SessionLogger`, `SessionSummary`,
  `poseBaseline`, and the existing curl evidence instrument.

**Gate:** Comparable attempts under comparable conditions produce materially
similar results; low-confidence attempts are not silently scored.

### 4.2 M1 — Local Movement Card

**Status: local curl Movement Card shipped; profile export/delete surfaces remain open.**

- Add typed local `MovementAssessment` and `MovementProfile` objects using the
  existing offline-first store patterns. Keep them in a versioned assessment
  namespace in `OfflineDataStore`, separate from `LocalWorkout`, wallet-sync,
  and leaderboard records; “user-owned” means local-first control and explicit
  export/delete semantics, not automatic cloud or on-chain portability.
- Expand the recap surface into a card with one useful insight, one next focus,
  protocol label, and measurement confidence.
- Keep the first result self-referential; no age percentile or global rank.
- Add local reset/delete behavior and general-wellness copy.
- Add unit tests for scoring, confidence, inconclusive states, and persistence.

**Gate:** A first-time user understands the card without explanation and receives
a concrete next action rather than only a number.

### 4.3 M2 — Assessment challenge and recipient route

**Status: full five-event funnel journey wired end-to-end with the free-tier sink key configured in Vercel; distribution experiments remain open.**

The recap creates a strict `curls-baseline@1.0` aggregate-only payload, shares
through Web Share or clipboard, and sends recipients to `/challenge` with one
**Take the same test** CTA. The existing Ghost/form-line share remains separate.
All five funnel events are emitted client-side at their lifecycle moments — the
organic baseline path (start → complete → share) and the incoming-challenge
path (open → start → complete → reply) — with `challengeId` so PostHog can
stitch one card's journey. Events are validated at the API boundary and
forwarded to a durable, fail-silent PostHog sink through a strict metadata
allowlist (no raw payloads, traces, or addresses). The free-tier key is set in
Vercel (Production/Preview/Development) and end-to-end delivery through
`posthog-node` is verified. The current in-memory tracker remains the fallback;
rate-limit and dashboard review are still required before using the funnel as
production truth.

- Create a versioned, share-safe payload containing protocol, headline, next
  action, and optional approximate trace.
- Add a focused recipient route with one CTA: **Take the same test**.
- Reuse `GhostService`, `SessionRecap`, `ChallengeWidget`, `PlatformContext`, and
  `challengeAnalytics`, but keep assessment challenges distinct from workout
  races.
- Add non-blocking events: `assessment_card_shared`,
  `assessment_challenge_opened`, `assessment_started`,
  `assessment_completed`, and `assessment_replied`.
- Never place raw video, images, or unnecessary identifiers in the payload.

**Gate:** A recipient can begin the same protocol without a wallet or confusing
onboarding, and the sender's card remains useful if sharing is cancelled. The
share sheet must preview the exact payload, default to the least revealing
aggregate form, and require an explicit opt-in before including an approximate
trace.

**Primary metric:** accepted assessment challenges per activated user.

### 4.4 M3 — Self trajectory and next unlocks

**Status: local self-trajectory and next-unlock slice shipped; measurement evidence remains open.**

- Compare only protocol-matched, sufficiently confident assessments. **Shipped locally** for the curl protocol.
- Add a compact trend view and next-milestone model with early/emerging/reliable
  confidence states. **Shipped locally** as a pure confidence-aware trajectory
  model and recap surface.
- Recommend one practice focus and a sensible re-test interval; do not encourage
  daily measurement or shame-based streak pressure. **Shipped locally** with an
  approximately-seven-day retest prompt.
- Support restart design for missed sessions, illness, travel, and changed setup.
- Validate repeated comparable reads before strengthening trajectory language or
  opening later benchmark surfaces.

**Gate:** The trajectory explains its confidence and remains useful when progress
is flat or a session is inconclusive.

**Primary metric:** second valid assessment within 7–14 days.

### 4.5 M4 — Age-band and cohort benchmarking

Only after M0–M3 evidence passes:

- Define broad age bands and protocol-matched cohort rules. Benchmarking is
  limited to the product's eligible adult population; it must not imply norms
  for minors.
- Aggregate only confidence-qualified observations and suppress small samples
  below a documented minimum cohort threshold.
- Use pseudonymous aggregation with no exact age, timestamps, device metadata,
  or raw traces exposed to other users. Document retention, deletion, and what
  withdrawal can and cannot remove after an aggregate has been published.
- Show scope, sample size, and uncertainty.
- Prefer supportive cohorts over a universal leaderboard.
- Make participation optional with plain-language data-use copy.

**Gate:** Measurement and privacy review pass; comparison cannot be mistaken for a
medical norm, destiny, or diagnosis.

### 4.6 M5 — Historical and fictional movement archetypes

- Create original archetypes before using third-party fictional characters.
- Keep measured result and confidence visible beneath the playful interpretation.
- Map archetypes to movement patterns, never claims of physical equivalence.
- Experiment on sharing and retention before making archetypes a major surface.

**Gate:** Users can distinguish measurement, cohort comparison, and narrative
interpretation.

### 4.7 Current implementation boundary

The current code has shipped the M0/M1/M3 local foundation for the curl protocol,
plus the first M2 challenge slice: versioned assessment evaluation, explicit
inconclusive states, local-only persistence, a recap Movement Card, a
protocol-matched self-history view, a strict aggregate-only payload, and a
focused `/challenge` recipient route, and a local test–retest evidence harness.
Setup calibration and real test–retest evidence, durable production funnel
analytics, trajectory experiments, cohorts, and archetypes remain pending.

### 4.8 Movement Intelligence definition of done

The first public slice is complete when a new user can:

1. Start the flagship assessment without a wallet or account.
2. Receive a valid card or a clear inconclusive result.
3. Understand one insight, one next focus, and confidence.
4. Share a privacy-safe **Take the same test** challenge.
5. Have a recipient open the challenge and start their own assessment.
6. Return later and see a self-versus-self comparison after a second valid attempt.

The loop to prove is:

```text
valid assessment → useful card → accepted challenge → recipient assessment → repeat test
```

## Ordering and dependencies

```
Phase 0 (baseline)
    │
    ▼
Phase 1 (CV robustness) ──────┐
    │                         │
    ▼                         │
Phase 2 (robot mapping)        │
    │                         │
    ▼                         │
Phase 3 (edge perf) ◄──────────┘
    │
    ▼
Phase 4 (Movement Intelligence local M0/M1/M3 foundation) ──► M2 challenges ──► M3 trajectory evidence ──► M4 benchmarks ──► M5 archetypes
```

Phase 1 and Phase 2 can run in parallel after Phase 0. Phase 3 should wait until Phase 1 is done so we do not conflate pre-processing effects with model/quantization effects. Movement Intelligence M0 can begin once Ring 0 is stable, but its comparisons and trajectory claims remain gated by protocol quality. It does not reorder the manual-stage → hardware → episode gates for the physical Coach.

---

## What we are explicitly not doing yet

- **End-to-end VLA:** Per Francesco, learned policies remain a later robotics/data-flywheel milestone after the manual stage, hardware proof, and trusted episodes; they are not a Phase 1 shortcut.
- **Robot mirroring by default:** Third-person demonstration is safer and clearer; mirror is a later experiment.
- **Lower-body robot demonstrations:** Out of scope for SO-101, consistent with `docs/NORTH_STAR.md`.
- **Remote data lake:** Episodes are local/edge first; batch export to Cyberwave/LeRobot comes after we trust the pipeline.
- **Body age or universal mobility ranking:** Self-versus-self progress and assessment challenges come before age bands, cohorts, or global leaderboards.
- **Medical or guaranteed trajectory claims:** Movement Intelligence is general wellness guidance with explicit confidence, not diagnosis or a promise of future ability.
- **Raw-camera distribution:** Movement Cards and challenges share aggregate results or approximate traces by default, never raw video by default.

---

## Checklist before closing this plan

- [ ] Phase 0 baseline written
- [ ] Phase 1 pre-processor toggle shipped and measured
- [ ] Phase 2 human→robot mapper records first LeRobot episode
- [ ] Phase 3 edge perf matrix decided and default config updated
- [x] Phase 4 Movement Intelligence local M0/M1/M3 foundation shipped
- [ ] Phase 4 Movement Intelligence setup/test–retest/trajectory evidence and durable funnel validated (protocol + local harness shipped; real evidence still open)
- [ ] `docs/ROADMAP.md` updated with the new gates
