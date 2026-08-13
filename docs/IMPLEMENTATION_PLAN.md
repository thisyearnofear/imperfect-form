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

**Current runtime guardrail:** Ordinary mobile sessions now ship an adaptive
camera-quality controller in `src/lib/pose/mobileQuality.ts` and
`src/modules/usePoseDetection.ts`. It measures sustained completed-loop FPS and
`estimatePoses()` latency, moves between balanced/high/light camera profiles with
hysteresis, verifies actual track settings, and leaves rep/station semantics
untouched. This protects the live experience while the broader model/input/
quantization matrix remains open; Farcaster keeps its dedicated camera path.

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

- [x] Adaptive mobile camera quality is guarded by sustained FPS and detection latency, with focused controller tests.
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

> **Single source of truth:** [`MOVEMENT_INTELLIGENCE.md`](./MOVEMENT_INTELLIGENCE.md)
> defines the full M0–M5 vision, gates, guardrails, data model, and current
> implementation boundary. The sections below summarize ordering and dependencies
> only — do not duplicate M-track prose here.

### M-track ordering

| Track | Goal                                        | Status                                  |
| ----- | ------------------------------------------- | --------------------------------------- |
| M0    | Assessment protocol and measurement quality | Local curl baseline shipped             |
| M1    | Local Movement Card                         | Local card shipped; delete/export open  |
| M2    | Assessment challenge and recipient route    | Full funnel wired; distribution open    |
| M3    | Self trajectory and next unlocks            | Local trajectory shipped; evidence open |
| M4    | Age-band and cohort benchmarking            | Gated by M0–M3 evidence                 |
| M5    | Historical and fictional archetypes         | Gated by M4                             |

### Current implementation boundary

The current code has shipped the M0/M1/M3 local foundation for the curl protocol,
plus the first M2 challenge slice. Setup calibration and real test–retest
evidence, durable production funnel analytics, trajectory experiments, cohorts,
and archetypes remain pending.

### Definition of done

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
