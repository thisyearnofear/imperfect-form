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

| Metric                           | Why it matters                          |
| -------------------------------- | --------------------------------------- |
| Avg / median FPS                 | Real-time feedback experience           |
| Median / p95 detection time (ms) | MoveNet inference latency               |
| Avg keypoint confidence          | Robustness under current lighting/angle |
| Pose detected frames             | How often the model loses the subject   |
| Memory growth                    | Leak or runaway memory use              |
| Device info                      | Reproducibility across phones/browsers  |

## Latest run

<!-- Replace this section with the output of window.__IMF_BASELINE__.copyMarkdown() -->

**Run ID:** `placeholder`
**Date:** YYYY-MM-DD
**Duration:** 0.0s
**Frames:** 0

### Device

| Property          | Value    |
| ----------------- | -------- |
| Platform          | desktop  |
| Browser           | chrome   |
| Performance level | high     |
| Memory (GB)       | 8        |
| Cores             | 8        |
| WebGL             | yes      |
| WebGPU            | no       |
| OffscreenCanvas   | yes      |
| Viewport          | 1280x720 |

### Summary

| Metric                     | Value |
| -------------------------- | ----- |
| Avg FPS                    | 0     |
| Median FPS                 | 0     |
| Median detection time (ms) | 0.00  |
| p95 detection time (ms)    | 0.00  |
| Avg keypoint confidence    | N/A   |
| Pose detected frames       | 0 / 0 |
| Memory growth (bytes)      | N/A   |

### Observations

<!-- Add your own notes here: lighting conditions, camera angle, occlusions, model config, etc. -->

- Lighting:
- Camera angle:
- Occlusion:
- MoveNet variant:
- Backend (WebGL/CPU/WebGPU):

## Historical runs

| Date       | Device         | Avg FPS | Median detection (ms) | Avg confidence | Notes       |
| ---------- | -------------- | ------- | --------------------- | -------------- | ----------- |
| YYYY-MM-DD | desktop chrome | 30      | 16                    | 0.45           | placeholder |

## Action thresholds

Use these thresholds to decide whether a change is worth keeping:

- **FPS regression > 5%:** reject the change or put it behind a toggle.
- **Median detection time > 100ms on desktop / > 200ms on mobile:** investigate.
- **Avg keypoint confidence drops by > 10%:** measure robustness before/after the change.
- **Memory growth > 50MB over 60s:** leak suspected.

## Known limitations

- The baseline utility samples frames and keeps a rolling buffer to avoid unbounded memory growth.
- Memory readings rely on `performance.memory`, which is only available in Chromium-based browsers.
- `performance.now()` inside a Web Worker may differ slightly from the main thread; relative numbers are still valid.
