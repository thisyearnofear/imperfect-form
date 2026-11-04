# PoseLandmarker vs MoveNet — benchmark

Captured: 2026-11-04T01:43:45.160Z
UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/149.0.7827.55 Safari/537.36
Protocol: 15 latency iters (+3 warmup), 8 stability repeats, 4 person frames

Same frames for every row. Confidence columns average over the COCO-17
subset — the honest cross-family comparison. Jitter is arm-chain position
stddev over repeated identical frames, as % of frame dimensions.

| Row                                    | Init (ms) | Median (ms) | p95 (ms) |  FPS | COCO-17 conf | Detected | Jitter % |
| -------------------------------------- | --------: | ----------: | -------: | ---: | -----------: | -------: | -------: |
| movenet-thunder/webgl                  |      2737 |       560.8 |    984.7 |  1.8 |        38.5% |      4/4 |    0.736 |
| movenet-lightning/webgl                |      2776 |        89.3 |    196.1 | 11.2 |        33.3% |      3/4 |    1.717 |
| movenet-thunder/cpu                    |      2563 |      1689.8 |   2080.3 |  0.6 |        38.5% |      4/4 |    0.737 |
| poselandmarker-full/gpu-delegate (GPU) |       279 |       135.9 |      156 |  7.4 |        73.7% |      4/4 |   14.504 |
| poselandmarker-full/cpu-delegate (CPU) |       166 |        31.8 |     51.1 | 31.4 |        74.1% |      4/4 |   10.493 |

## Per-image confidence (COCO-17 subset)

### movenet-thunder/webgl

- images/sandow.jpg: detected, 17 keypoints, coco17=37.2%
- images/bodi.jpg: detected, 17 keypoints, coco17=55.5%
- images/yoga.jpg: detected, 17 keypoints, coco17=20.1%
- images/tango.jpg: detected, 17 keypoints, coco17=41.1%

### movenet-lightning/webgl

- images/sandow.jpg: detected, 17 keypoints, coco17=27.7%
- images/bodi.jpg: detected, 17 keypoints, coco17=70.3%
- images/yoga.jpg: NOT detected, 0 keypoints, coco17=n/a%
- images/tango.jpg: detected, 17 keypoints, coco17=35.4%

### movenet-thunder/cpu

- images/sandow.jpg: detected, 17 keypoints, coco17=37.3%
- images/bodi.jpg: detected, 17 keypoints, coco17=55.5%
- images/yoga.jpg: detected, 17 keypoints, coco17=20.1%
- images/tango.jpg: detected, 17 keypoints, coco17=41.1%

### poselandmarker-full/gpu-delegate

- images/sandow.jpg: detected, 33 keypoints, coco17=74.1%
- images/bodi.jpg: detected, 33 keypoints, coco17=74.8%
- images/yoga.jpg: detected, 33 keypoints, coco17=72.3%
- images/tango.jpg: detected, 33 keypoints, coco17=73.6%

### poselandmarker-full/cpu-delegate

- images/sandow.jpg: detected, 33 keypoints, coco17=74.6%
- images/bodi.jpg: detected, 33 keypoints, coco17=75.5%
- images/yoga.jpg: detected, 33 keypoints, coco17=72.6%
- images/tango.jpg: detected, 33 keypoints, coco17=73.7%

## Caveats

- Headless Chromium ran WebGL on SwiftShader (software). Absolute latencies
  for the tfjs WebGL rows are software-rendered and will shrink on real GPU
  hardware; the tasks-vision CPU delegate (XNNPACK) is near-native speed.
- MoveNet soft scores and MediaPipe `visibility` are different quantities
  on different scales — the COCO-17 column controls for keypoint count, not
  for score semantics. Do not port a score threshold between families.
- Stability here is identical-frame replay against a VIDEO-mode tracker —
  a synthetic worst case, not a live camera stream. Real-motion jitter on
  device is the number to measure before promotion; the in-app edge matrix
  (`window.__IMF_EDGE_MATRIX__`) is the harness for that.
