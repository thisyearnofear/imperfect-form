# Pose stack — tasks-vision PoseLandmarker spike

> **Status update (2026-11-04): integrated, not promoted.** The integration
> below has landed as a _new tracker option_, gated exactly as this note
> recommended — `'poselandmarker-full'` is in `TRACKERS`, built through
> `createPoseDetector` via `src/lib/pose/poseLandmarkerAdapter.ts`, runs in
> both the worker and main-thread paths, and is a row in the edge perf
> matrix. WASM + `.task` assets are served from `public/mediapipe/` — no
> runtime CDN. `DEFAULT_POSE_CONFIG` stays MoveNet Lightning and
> `READING_POSE_CONFIG` stays MoveNet Thunder. First headless benchmark
> numbers: `evidence/pose-landmarker-benchmark.md` (runner:
> `scripts/pose-landmarker-benchmark.mjs`). `@mediapipe/tasks-vision@1.2.0`
> is in `package.json`; the `@mediapipe/pose` stub remains — it services the
> tfjs pose-detection import, not the tasks runtime.

Spike note only. No dependency added, no integration landed. (`@mediapipe/tasks-vision`
is absent from `package.json`; `@mediapipe/pose` is deliberately stubbed — see
`src/stubs/mediapipe-pose.js` and the aliases in `next.config.mjs`.)

Related live change: protocol reading sessions now run MoveNet Thunder via
`READING_POSE_CONFIG` / the `forReading` knob in
`src/lib/pose/trackerRegistry.ts`. This note asks whether PoseLandmarker is the
next step beyond that.

## Current stack (what we'd be replacing)

- `@tensorflow-models/pose-detection` MoveNet Lightning/Thunder, 17 COCO
  keypoints, tfjs backends. One resolution path: `TRACKERS` +
  `createPoseDetector` in `src/lib/pose/trackerRegistry.ts`; the worker builds
  it in `src/modules/poseWorker.ts` (`init`/`configure` handlers,
  `initTfBackend` cascade webgpu → webgl → cpu), the main-thread fallback in
  `src/modules/usePoseDetection.ts` builds the identical resolved config.
- BlazePose-33 already exists in the registry (`blazepose`, tfjs runtime) but
  is not wired into any session — the exercise engine consumes the
  MoveNet-shaped 17 (`keypointShape: 'blazepose-33'` documents this).
- Downstream consumers assume COCO-17 **names**: `readArm` in
  `src/lib/exercise-engine/reachProcessor.ts` and `curlProcessor.ts` does
  `keypoints.find(k => k.name === 'left_shoulder' | 'left_elbow' | 'left_wrist' | 'left_hip')`;
  `src/lib/movementAssessment.ts` (`ARM_CHAIN_KEYPOINTS`, `visibleKeypoints`
  0.4 score floor) does the same. Visibility thresholds are tuned to MoveNet's
  soft scores — `MIN_SCORE = 0.4` in both processors — and the reach
  missing-arm cue (`reachProcessor` `leftHiddenSince`/`rightHiddenSince`
  bookkeeping) is a heuristic built on those scores.

## What PoseLandmarker buys

- **33 BlazePose landmarks** (hands, feet, face) — a superset of what the arm
  protocols need, and an enabler for protocols MoveNet cannot read (wrist
  position, hip-hinge detail).
- **Real per-landmark `visibility` and `presence` fields** vs MoveNet's single
  soft score. The reach "can't see your … arm" cue and the assessment
  visibility gates are currently inferred from a 0.4 score floor; genuine
  visibility scores make the missing-limb read honest instead of tuned.
- **Accuracy / occlusion**: BlazePose-family tracking holds limbs through
  partial occlusion better than MoveNet single-shot. That is exactly the
  reach-baseline failure mode (arm exits frame at peak elevation).
- **World landmarks** (metric 3D, meters) — the only depth-adjacent signal
  available without a second camera. Not a measurement yet, but a real input
  for future protocols.
- Model tiers `lite` / `full` / `heavy` ship as separate `.task` files, so the
  speed/accuracy knob survives the migration.

## What the migration costs

This is a **new runtime**, not a tracker swap. Nothing in the tfjs path is
reusable as-is:

- **API**: `PoseLandmarker.createFromOptions` with `FilesetResolver.forVisionTasks()`
  (WASM runtime + `.task` model asset), `delegate: 'GPU' | 'CPU'`, then
  `detectForVideo(video, timestampMs)` per frame — not `estimatePoses`, and it
  requires monotonic timestamps. `poseWorker.ts` `initTfBackend` /
  `BACKEND_FALLBACKS` / warmup don't apply; backend capability becomes
  GPU-delegate availability, not `tf.setBackend`.
- **Bundling**: the WASM files and `.task` model must be served from `public/`
  or fetched at init — megabytes on first load, and a decision point for the
  local-first story (CDN default vs self-hosted assets). The worker is created
  via `new Worker(new URL('./poseWorker.ts', import.meta.url))`; tasks-vision
  inside a module worker + Next/Turbopack needs verification (the
  `@mediapipe/pose` stub exists precisely because MediaPipe packaging fights
  this bundler).
- **Landmark names**: PoseLandmarker returns positional `NormalizedLandmark[]`
  — no names. Everything downstream (`readArm`, `movementAssessment`,
  `poseDrawing`, readiness) keys on COCO strings. Needs a static
  index → name map (`11→left_shoulder, 13→left_elbow, 15→left_wrist,
23→left_hip`, …) adapting output to `EngineKeypoint[]`, or a processors
  rewrite. The 0.4 thresholds in `MIN_SCORE` / `visibleKeypoints` /
  `readiness.ts` would need re-measurement against `visibility`, not porting —
  the edge matrix docs already warn against carrying score thresholds across
  tracker families.
- **Type surface**: `PoseTrackerId` (`src/types/mediapipe.ts`), `TrackerSpec`
  needs a runtime discriminator (`'tfjs' | 'tasks-vision'`), `createPoseDetector`
  branches or a parallel factory, `isConfigSupported` redefined for
  WASM+delegate, `supportedOptions` rewritten (minPoseScore →
  `minPoseDetectionConfidence`/`minPosePresenceConfidence`/`minTrackingConfidence`),
  and the edge matrix's `TRACKER_IDS`/`toDetectorConfig`/`applied` flow assumes
  `PoseDetectorConfig`. `detectorRef` in `usePoseDetection` is typed to the
  tfjs `PoseDetector`.

## Recommendation

- **Do not migrate the coaching loop.** Lightning latency is a feature for
  live cueing; PoseLandmarker is unproven here and the migration cost is real.
- **If adopted, adopt narrowly**: protocol readings only, `full` model
  (accuracy where the meter's honesty lives), behind a `PoseTrackerId` +
  `forReading` path so the rest of the app keeps MoveNet. `heavy` is the
  benchmark row to measure, not the default.
- **Prove it before shipping it**: land the tracker as a row in the edge perf
  matrix and compare against `movenet-thunder` on the reading protocols —
  detection time, keypoint confidence, and (the number MoveNet can't give)
  missing-arm cue quality from real `visibility` fields. Only then decide.
- The immediate honest-accuracy win is already shipped: readings run Thunder
  with the 512 multi-pose cap on every device tier except `low`.
