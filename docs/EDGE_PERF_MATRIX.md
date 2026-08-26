# Edge Performance Matrix

> Systematic A/B testing of pose detection configurations to find the optimal
> mobile performance/accuracy tradeoff. This document records the matrix results
> and the winning configuration.

## Purpose

Find the configuration that gives the best **median FPS × accuracy** product on
a mid-range Android phone and an older iPhone. The goal is to update the default
mobile config without regressing Ring 0 e2e tests.

## Configuration Matrix

| Knob              | Variants                                   | Notes                               |
| ----------------- | ------------------------------------------ | ----------------------------------- |
| **Input size**    | 192×192, 256×256, 640×480 (current)        | Smaller = faster, but less accurate |
| **Model variant** | MoveNet Lightning, Thunder, BlazePose lite | Lightning is current default        |
| **Backend**       | WebGL, WASM, CPU                           | WebGL preferred; WASM fallback      |
| **Quantization**  | FP32 (baseline), INT8                      | INT8 requires WebGL2/WebGPU         |

### Valid Combinations

Not all combinations are feasible. The matrix automatically filters invalid ones:

- **INT8 quantization** requires WebGL2 or WebGPU support
- **BlazePose-lite** doesn't support WASM backend well
- **WebGL backend** requires WebGL support
- **WebGPU backend** requires WebGPU support

## How to Run the Matrix

> **Tooling status:** the console API is registered by a dev-only dynamic
> import in `ClientOnlyProviders` (`process.env.NODE_ENV === 'development'`),
> so run against `pnpm dev` — it is intentionally absent from production
> builds.

### Current limitations

**Config hot-swap is not implemented yet.** The pose pipeline hard-codes
`SinglePose.Lightning` (`poseWorker.ts`, `usePoseDetection.ts`,
`PoseDetectionService.ts`) and the matrix runner only _labels_ each baseline
run with config metadata via `startPoseBaseline` — it does not change the
detector model, input size, backend, or quantization between rows. Until
config application is wired into the detector, every row measures the same
live configuration and the composite-score ranking is **not** a real A/B
result. `start()` prints a console warning to this effect.

What the tooling is good for today:

- **Single-config stability baselines** on real devices (FPS, confidence,
  detection time, memory growth under the current default).
- **Rehearsing the runbook** (start → workout → skip/stop → export) so the
  real A/B pass is mechanical once hot-swap lands.

Remaining work before Gate C can close:

1. Apply `EdgePerfConfig` to the detector (model variant + input resolution at
   `createDetector`, backend selection at TF init) and restart the pipeline
   between rows.
2. Record real-device runs (below) and paste them into [Latest runs](#latest-runs).
3. Pick the validated default per the [Decision Rules](#decision-rules) with no
   Ring 0 e2e regression.

### Quick Start

1. Open the app on your target device
2. Open the browser console
3. Start the matrix:

```javascript
window.__IMF_EDGE_MATRIX__.start({
  exercise: 'curls',
  durationPerConfig: 30, // seconds per configuration
  target: 'iPhone 12 / iOS 16',
  camera: 'iPhone 12 rear camera',
  lighting: 'indoor, overhead fluorescent',
});
```

4. Wait for all configurations to complete (or use `skip()` to skip one)
5. Stop and export:

```javascript
const matrix = window.__IMF_EDGE_MATRIX__.stop();
copy(window.__IMF_EDGE_MATRIX__.exportMarkdown(matrix));
```

6. Paste the results into the [Latest runs](#latest-runs) section below

### Console Commands

| Command                                         | Description                          |
| ----------------------------------------------- | ------------------------------------ |
| `__IMF_EDGE_MATRIX__.start(options)`            | Start a new matrix run               |
| `__IMF_EDGE_MATRIX__.stop()`                    | Stop current run and return results  |
| `__IMF_EDGE_MATRIX__.skip()`                    | Skip current config and move to next |
| `__IMF_EDGE_MATRIX__.getProgress()`             | Get current progress (current/total) |
| `__IMF_EDGE_MATRIX__.getMatrix()`               | Get current matrix state             |
| `__IMF_EDGE_MATRIX__.exportMarkdown(matrix)`    | Export results as markdown           |
| `__IMF_EDGE_MATRIX__.exportJson(matrix)`        | Export results as JSON               |
| `__IMF_EDGE_MATRIX__.getConfigurations(device)` | List all valid configurations        |

## Metrics

| Metric                  | Why it matters                          | Decision threshold                   |
| ----------------------- | --------------------------------------- | ------------------------------------ |
| **Median FPS**          | Real-time feedback experience           | > 20 FPS for usable coaching         |
| **Keypoint confidence** | Robustness under current lighting/angle | > 0.5 average for reliable detection |
| **Detection time (ms)** | MoveNet inference latency               | < 100ms desktop, < 200ms mobile      |
| **Pose detection rate** | How often the model loses the subject   | > 90% for consistent coaching        |
| **Memory growth**       | Leak or runaway memory use              | < 50MB over 60s                      |

## Composite Score

The winning configuration is chosen by a composite score that balances all factors:

```
compositeScore = (medianFPS × confidence × 100) / detectionTimeMs
```

Higher is better. This rewards configurations that are:

- **Fast** (high FPS)
- **Accurate** (high confidence)
- **Responsive** (low detection time)

## Real-device runbook (Gate C)

Gate C needs measurements from physical devices — headless CI cannot produce
them (WebGL pose boot is unreliable headless, which is also why
`pose-runtime.spec.ts` is treated as environmental there). One operator with a
phone and a laptop is enough.

**Target devices (minimum):** one mid-range Android (Chrome) and one older
iPhone (Safari). Record the exact model + OS in the matrix metadata.

1. **Serve a dev build the phone can reach.** On the laptop:
   `pnpm dev`, then open `http://<laptop-lan-ip>:3000` on the phone (same
   Wi-Fi). Dev mode is required so `window.__IMF_EDGE_MATRIX__` registers.
2. **Fix the conditions.** Same room, same lighting, same camera distance and
   angle for every row. Note them — lighting changes move keypoint confidence
   more than most config knobs.
3. **Start the matrix** in the phone's devtools console (Safari: Develop menu →
   the phone; Chrome: `chrome://inspect`):

   ```javascript
   window.__IMF_EDGE_MATRIX__.start({
     exercise: 'curls',
     durationPerConfig: 30,
     target: 'Pixel 7a / Android 15',
     camera: 'front camera, propped 1.5m away',
     lighting: 'indoor, overhead LED',
   });
   ```

4. **Do the exercise** while each config runs; use `skip()` if a config is
   unusable (e.g. backend unsupported). Watch `getProgress()`.
5. **Export and save both formats:**

   ```javascript
   const m = window.__IMF_EDGE_MATRIX__.stop();
   copy(window.__IMF_EDGE_MATRIX__.exportJson(m)); // save to evidence/edge-matrix/<device>-<date>.json
   copy(window.__IMF_EDGE_MATRIX__.exportMarkdown(m)); // paste into Latest runs
   ```

6. **Analyze:** `window.__IMF_EDGE_MATRIX__.analyzeMatrix(m)` ranks rows by the
   composite score. Remember the [Current limitations](#current-limitations) —
   until hot-swap lands, this ranks one config's stability, not variants.
7. Raw JSON reports live under `evidence/edge-matrix/` (gitignored-friendly:
   keep them small or link instead of committing multi-MB frames).

## Latest runs

> Paste your matrix results here after running on a target device.
>
> **No real device runs have been recorded yet.** The examples below are
> illustrative placeholders to show the expected format. Do not use these
> numbers for configuration decisions.

### Illustrative example: iPhone 12 / iOS 16

**Matrix ID:** `matrix-example-ios`
**Device:** ios / safari
**Performance Level:** medium
**Memory:** 4 GB
**Cores:** 6
**WebGL:** yes (WebGL2: yes)
**WebGPU:** no
**Duration:** 900.0s
**Runs:** 18

| Rank | Model                | Input   | Backend | Quant |  FPS | Confidence | Detection (ms) | Composite Score |
| ---: | -------------------- | ------- | ------- | ----- | ---: | ---------: | -------------: | --------------: |
|    1 | SinglePose.Lightning | 192×192 | webgl   | fp32  | 28.5 |      0.723 |           35.2 |            58.6 |
|    2 | SinglePose.Lightning | 256×256 | webgl   | fp32  | 24.1 |      0.781 |           42.1 |            44.9 |
|    3 | SinglePose.Lightning | 640×480 | webgl   | fp32  | 18.2 |      0.815 |           55.3 |            26.8 |
|  ... | ...                  | ...     | ...     | ...   |  ... |        ... |            ... |             ... |

### Illustrative example: Mid-range Android / Chrome

> **Note:** Composite scores below are illustrative and do not match the
> ranking order — rank 2 has a higher composite than rank 1. This table is a
> formatting template, not real measurement data.

**Matrix ID:** `matrix-example-android`
**Device:** android / chrome
**Performance Level:** medium
**Memory:** 3 GB
**Cores:** 4
**WebGL:** yes (WebGL2: no)
**WebGPU:** no
**Duration:** 900.0s
**Runs:** 12

| Rank | Model                | Input   | Backend | Quant |  FPS | Confidence | Detection (ms) | Composite Score |
| ---: | -------------------- | ------- | ------- | ----- | ---: | ---------: | -------------: | --------------: |
|    1 | SinglePose.Lightning | 256×256 | webgl   | fp32  | 22.3 |      0.689 |           45.2 |            34.1 |
|    2 | SinglePose.Lightning | 192×192 | webgl   | fp32  | 25.1 |      0.624 |           38.7 |            40.3 |
|    3 | SinglePose.Lightning | 640×480 | webgl   | fp32  | 14.8 |      0.732 |           68.1 |            15.9 |
|  ... | ...                  | ...     | ...     | ...   |  ... |        ... |            ... |             ... |

## Recommendation

> **Based on matrix results, update the default mobile config here.**

```typescript
// src/modules/poseWorker.ts — update modelType and input resolution
// src/lib/pose/poseRuntime.ts — update runtime defaults
// See PERFORMANCE_BASELINE.md for single-run baseline measurements
```

## Decision Rules

1. **Pick the configuration with the highest composite score** on a mid-range Android phone and an older iPhone.
2. **No regression on Ring 0 e2e tests** (`e2e/ring0.spec.ts`, `e2e/pose-runtime.spec.ts`).
3. **FPS must be > 20** for the configuration to be considered viable.
4. **Confidence must be > 0.5** average for reliable detection.
5. **Detection time must be < 200ms** on mobile for responsive feedback.

## Notes

- Run the matrix in the same lighting and angle conditions for each device.
- Keep the exercise and duration consistent across runs.
- Record the camera model and setup in the matrix metadata.
- Save raw JSON reports alongside the markdown summary.
- Re-run the matrix when changing TensorFlow.js or MoveNet versions.

## References

- [Performance Baseline](./PERFORMANCE_BASELINE.md) - Single-run baseline measurements
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Phase 3: Edge performance experiments
- [Architecture](./ARCHITECTURE.md) - PoseRuntime and path selection
