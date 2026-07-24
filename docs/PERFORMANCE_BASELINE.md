# Pose Detection Performance Baseline

> Before changing models, pre-processing, or quantization, measure the current setup. This document is the place to record those numbers.

## How to run the baseline

1. Start the dev server and open the app in the browser/device you want to test.
2. Open the browser console.
3. Start recording:
   ```js
   window.__IMF_BASELINE__.start();
   ```
4. Run a normal workout (or wave/move in front of the camera for ~30–60s).
5. Stop recording:
   ```js
   window.__IMF_BASELINE__.stop();
   ```
6. Copy the markdown report to the clipboard:
   ```js
   window.__IMF_BASELINE__.copyMarkdown();
   ```
7. Paste the output into the **Latest run** section below, replacing the placeholder table.

## What we are measuring

| Metric                            | Why it matters                          |
| --------------------------------- | --------------------------------------- |
| Avg / median FPS                  | Real-time feedback experience           |
| Median / p95 detection time (ms)  | MoveNet inference latency               |
| Median / p95 preprocess time (ms) | Phase 2 CV pipeline overhead            |
| Avg keypoint confidence           | Robustness under current lighting/angle |
| Pose detected frames              | How often the model loses the subject   |
| Memory growth                     | Leak or runaway memory use              |
| Device info                       | Reproducibility across phones/browsers  |

## Latest run

Run date: 2026-07-24
Environment: Playwright Chromium, fake MJPEG testsrc video (640×480 @ 30 fps), no human subject.
Note: WebGL backend was unstable in the headless runner; these numbers reflect the synthetic feed and are best treated as environment sanity checks, not representative production performance.

### All preprocessing OFF

**Run ID:** `1784892118144-ki6cfy`  
**Date:** 2026-07-24T11:21:58.144Z  
**Duration:** 21.3s  
**Frames:** 0

No pose detected; pipeline did not complete a frame in this run.

### Classical only (auto-exposure + lens fix)

**Run ID:** `1784892155782-aoqf2c`  
**Date:** 2026-07-24T11:22:35.782Z  
**Duration:** 24.1s  
**Frames:** 1

| Metric                      | Value   |
| --------------------------- | ------- |
| Avg FPS                     | 0       |
| Median FPS                  | 0       |
| Median detection time (ms)  | 4632.40 |
| p95 detection time (ms)     | 4632.40 |
| Median preprocess time (ms) | 45.60   |
| p95 preprocess time (ms)    | 45.60   |
| Avg keypoint confidence     | 0.06    |
| Pose detected frames        | 1 / 1   |
| Memory growth (bytes)       | 0       |

### All preprocessing ON

**Run ID:** `1784892199491-t1vi9y`  
**Date:** 2026-07-24T11:23:19.491Z  
**Duration:** 21.8s  
**Frames:** 0

No pose detected; pipeline did not complete a frame in this run.

### Observations

- Camera: synthetic MJPEG testsrc (no human subject).
- MoveNet variant: SinglePose.Thunder.
- Backend: WebGL was initialized but unstable in headless Chromium; multiple shader/link errors were logged.
- The single captured frame in the "classical" run shows a preprocess cost of ~45.6 ms, which exceeds the desktop budget (< 20 ms; see Action thresholds).
- Need to re-run in a real browser with a human subject and a functioning GPU for production-representative numbers.

## Historical runs

> The rows below are from an automated, headless Playwright run using a synthetic MJPEG feed. WebGL/TensorFlow.js could not initialize reliably, so most configurations captured 0–1 frames. Treat these as failed/synthetic sanity checks, not production baselines.

| Date       | Device              | Avg FPS | Median detection (ms) | Avg confidence | Notes                                              |
| ---------- | ------------------- | ------- | --------------------- | -------------- | -------------------------------------------------- |
| 2026-07-24 | Playwright Chromium | 0       | 0                     | N/A            | all preprocessing OFF (0 frames)                   |
| 2026-07-24 | Playwright Chromium | 0       | 4632.40               | 0.06           | classical only (auto-exposure + lens fix, 1 frame) |
| 2026-07-24 | Playwright Chromium | 0       | 0                     | N/A            | all preprocessing ON (0 frames)                    |

## Action thresholds

Use these thresholds to decide whether a change is worth keeping:

- **FPS regression > 5%:** reject the change or put it behind a toggle.
- **Median detection time > 100ms on desktop / > 200ms on mobile:** investigate.
- **Median preprocess time > 20ms on desktop / > 40ms on mobile:** the Phase 2 pipeline is too expensive for real-time use.
- **Avg keypoint confidence drops by > 10%:** measure robustness before/after the change.
- **Memory growth > 50MB over 60s:** leak suspected.

## Phase 2 CV robustness measurement

The Phase 2 filters (lens-distortion fix and generative low-light cleanup) are currently gated by `PHASE2_CV_FILTERS_ENABLED` in `src/lib/pose/posePreprocessor.ts`. Only the Phase 1 classical filter (auto-exposure / white balance) runs in main. When the Phase 2 gate is opened, run the baseline for each configuration and compare:

1. **All preprocessing OFF** — baseline FPS/confidence.
2. **Classical only (auto-exposure + lens fix)** — measure latency impact.
3. **Generative cleanup ON** — measure latency impact and confidence improvement in poor lighting.

Copy each markdown report into the **Historical runs** table and note the active preprocessing flags.

## Known limitations

- The baseline utility samples frames and keeps a rolling buffer to avoid unbounded memory growth.
- Memory readings rely on `performance.memory`, which is only available in Chromium-based browsers.
- `performance.now()` inside a Web Worker may differ slightly from the main thread; relative numbers are still valid.
