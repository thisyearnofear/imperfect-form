# Phase B — the reading session: implementation plan

Written 2026-11-02. Follows [DESIGN_EVOLUTION.md](./DESIGN_EVOLUTION.md)
(decisions locked) and Phase A (doorway, shipped).

**Goal:** the session _is_ a reading. The user doesn't "do a workout and get
a score" — they watch the meter get a clean read on the joint that nags.
Everything in this phase serves that framing.

**Design references:**

- _Body as technical illustration_ (jakubkrehel/skills → `teardown`): a
  Victorian anatomical-plate figure — line art, brass annotations — that
  shows which joints the meter reads. On-heritage, not decoration.
- _Instrument finish_ (shader-effects-inc/shaders): WebGPU shader quality
  for gauge and atmosphere. **Constraint:** WebGPU is patchy on iOS/Safari —
  shaders are an enhancement layer over CSS/canvas, never a dependency. All
  motion respects `prefers-reduced-motion` (house rule).

## Slices (in build order)

### B1 — The ReadGauge: confidence as furniture

**What:** a persistent instrument element during the session — a small
semicircular dial, needle live-tracking read quality, three brass zones
(Clear / Usable / Early). Pinned in session chrome, not a caption at the end.

**Plumbing:** a pure `readQuality(poseConfidence, trackingStability) →
{level, needlePosition}` mapping fed from signals the engine already emits
(`useStableTracking`, pose confidence). No engine changes in this slice —
the gauge only _shows_ what exists. SVG dial + CSS needle first; shader
ambient later (B5).

**Files:** `src/components/readings/ReadGauge.tsx`,
`src/lib/readQuality.ts` (+ tests), session chrome mount point.

### B2 — Session framing: protocol language, calibration, pain exit

**Protocol language:** the start sequence becomes calibration — "the meter
needs a clean view" (existing Camera→AI→positioning rail already reads as
setup; copy pass to instrument voice). Rep instructions = protocol
instructions ("5 controlled reps, your own pace").

**Pain exit:** a persistent, gentle "It hurts — stop" affordance in session
chrome. Tapping ends the session into a designed exit surface (not an
error): "That's the right call — a meter shouldn't hurt to use. If pain
persists, see a professional." Optional: mark which joint hurt (feeds the
niggle profile). Never framed as failure.

**Files:** session shell component + a new `PainExit` surface, copy in
`brandPositioning.ts` session strings.

### B3 — Inconclusive is an honest answer

**What:** designed treatment for inconclusive reads (already typed:
`insufficient_reps`, `low_visibility`, `unstable_tracking`, `high_noise`…).
"The meter couldn't get a clean read" + the one fixable cause (move back /
more light / hold the phone steady) + retry CTA. Distinct register from
error — brass, not red.

**Files:** `SessionRecap` inconclusive branch + `INCONCLUSIVE_COPY`
(review vs. plain-English fix-per-reason).

### B4 — BodyPlate: the anatomical instrument figure

**What:** one SVG figure — Sandow-plate line art, brass measurement
hairlines — with named, tappable joint zones matching the intake catalog
(neck-shoulders / lower back / knee / arm-elbow / not-sure).

**Three uses:**

1. **Intake** — tap the joint on the body (chips remain as text fallback
   and for a11y; the figure is progressive enhancement).
2. **Pre-read explainer** — "the meter reads these joints": the figure
   annotates the keypoint chain the protocol actually measures (MoveNet
   points for that mode). This is the "explain how it works" surface.
3. **Pain exit / card watermark** — mark where it hurt; small plate mark on
   the Movement Card.

**Files:** `src/components/body/BodyPlate.tsx` (SVG, interactive zones),
`src/lib/bodyZones.ts` (zone → joint → keypoint-chain map). Style:
line-engraving register, `sandow-spine` tokens, brass annotations, Manrope
labels (no Press Start — this is lab, not arcade).

### B5 — Instrument finish: ambient + gauge polish

**What:** shader-quality finish over the working surfaces: bay atmosphere
grain/noise, gauge ambient glow, subtle needle physics. Feature-detect
WebGPU; CSS/canvas fallback is the shipped baseline. **Hard rule:** nothing
shader-driven may sit in the camera frame's read path or add bundle weight
that slows session start — the meter's speed is part of its honesty.

## Verification

- `readQuality` unit tests (mapping, thresholds, hysteresis so the needle
  doesn't flapping between zones).
- Pain-exit e2e: tap → session ends → exit surface → return path.
- Inconclusive e2e: forced bad capture → honest-read surface, no error copy.
- `prefers-reduced-motion` audit on dial + figure animations.
- Existing `ring0` / `pose-runtime` specs updated where session copy changed.

## Explicit non-goals

- **Direction note (2026-11-02):** we are evolving **beyond stick figures**
  as fast as possible. The live pose skeleton overlay stays for now, but the
  visual language of "a body being read" is the anatomical figure
  (BodyPlate), not keypoint lines — a later phase replaces the session
  skeleton with a body figure driven by the same keypoints. Don't build new
  skeleton-chrome; build the figure.
- No new protocols (that's Phase D — overhead reach is next after B).
- No shader dependency — enhancement only.
- No diagnosis language anywhere in session surfaces; the meter reads, it
  does not judge.
- Chips stay — the body figure never removes the text path.

## Suggested order

B1 → B2 → B3 (the honest-instrument core, all engine-free) → B4 (the
figure, biggest visual lift) → B5 (finish pass, optional).
