# Implementation Plan — Mentor Feedback into Action

This plan translates the Q&A with Francesco De Pascale (Cyberwave) into ordered, shippable work. It is designed to be executed **after** the current manual-stage gate, but each phase can start as soon as its dependencies are met.

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

## Phase 1: Pose-robustness pre-processing (1 week)

**Goal:** Reduce lighting and angle failures before they reach MoveNet.

### 1.1 Classical CV pipeline

Add a pre-processing stage that runs on the canvas frame **before** it is sent to the detector. Keep it optional, benchmarked, and fail-silent.

- **Exposure normalization:** histogram equalization or CLAHE-like lightness stretch.
- **White balance:** simple gray-world or (later) learned white-balance.
- **Lens undistortion:** optional, based on a conservative default FOV / device family.
- **Configurable toggle:** `posePreprocessor: 'none' | 'classic' | 'auto'` stored in user prefs.

**Files to touch:**

- New: `src/lib/pose/posePreprocessor.ts`
- `src/modules/poseWorker.ts`
- `src/modules/usePoseDetection.ts`
- `src/services/PoseDetectionService.ts`
- `src/components/game/Webcam.tsx` (where `ImageData` is captured)

### 1.2 Generative cleanup (spike)

After 1.1 is measured, evaluate a lightweight generative enhancement pass (e.g., tiny ONNX or TensorFlow.js enhancement model). This is explicitly a **spike**, not the default path.

**Files to touch:**

- Spike branch only; do not ship to `main` until it beats the classical baseline.

### 1.3 Success criteria

- [ ] Classical pre-processing is a toggle in settings.
- [ ] Median keypoint confidence improves on the “bad lighting” test set by ≥10%.
- [ ] Mobile FPS regression is <5% at worst.
- [ ] Falls back to raw frames if the preprocessor errors.

---

## Phase 2: Human-pose → robot-pose mapping (1.5 weeks)

**Goal:** Build the deterministic bridge that turns a form correction into a safe robot demonstration and records the resulting episode.

### 2.1 Define the mapping contract

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

### 2.2 Implement the mapper

**Files to touch:**

- New: `coach-station/coach_station/mapper/human_to_robot.py`
- New: `coach-station/coach_station/mapper/__init__.py`
- Update: `coach-station/coach_station/primitives.py` to use the mapper
- Update: `coach-station/coach_station/schema.py` to accept human joint angles in `FormEvent`
- Update: `src/services/coachStation.ts` to send richer `FormEvent` payloads

### 2.3 Record episodes

Every time a demo fires, append a LeRobot-format episode slice to disk (not yet to a remote).

**Files to touch:**

- New: `coach-station/coach_station/recorder.py`
- Update: `coach-station/coach_station/server.py` to call the recorder
- Update: `coach-station/coach_station/safety.py` to ensure recording cannot override safety gates

### 2.4 Success criteria

- [ ] Curls → bad elbow form → `elbow_swing` → robot maps to a corrected elbow angle and plays a trajectory.
- [ ] Each recorded episode includes: timestamp, user/session id, exercise mode, detected issue, detected human angle, target human angle, robot waypoints, persona.
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
```

Phase 1 and Phase 2 can run in parallel after Phase 0. Phase 3 should wait until Phase 1 is done so we do not conflate pre-processing effects with model/quantization effects.

---

## What we are explicitly not doing yet

- **End-to-end VLA:** Per Francesco, learned policies are a Phase 4 milestone, not a Phase 1 shortcut.
- **Robot mirroring by default:** Third-person demonstration is safer and clearer; mirror is a later experiment.
- **Lower-body robot demonstrations:** Out of scope for SO-101, consistent with `docs/NORTH_STAR.md`.
- **Remote data lake:** Episodes are local/edge first; batch export to Cyberwave/LeRobot comes after we trust the pipeline.

---

## Checklist before closing this plan

- [ ] Phase 0 baseline written
- [ ] Phase 1 pre-processor toggle shipped and measured
- [ ] Phase 2 human→robot mapper records first LeRobot episode
- [ ] Phase 3 edge perf matrix decided and default config updated
- [ ] `docs/ROADMAP.md` updated with the new gates
