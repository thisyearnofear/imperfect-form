# First-visit clarity + manual-stage protocol

This protocol tests the two claims we need a new person to understand:

1. **AI watches your exercise form** — camera coaching is useful on its own.
2. **Coach can show the correction** — the robot demonstration is the differentiator when a station is connected.

Do not explain the product before the first-visit test. The point is to measure what
someone understands from the front door, not what we can explain after the fact.

## First-visit test

### Setup

- Use a fresh browser profile or clear site storage.
- Use the production URL or a deployed preview.
- Do not connect a wallet.
- Do not configure `NEXT_PUBLIC_COACH_STATION` for the camera-only variant.
- Have the same observer script ready for every participant.

### Observer script

Say only:

> “Please use this as if you just found it. Tell me what you think it is and what you would do next.”

Do not define “Coach”, “physical AI”, “SO-101”, pose detection, or the robot before
these questions are answered.

### Ask before helping

Record the participant’s first answer to each question:

1. What do you think this is?
2. What do you think will happen if you press **Start camera coaching**?
3. What is the difference between this and a normal workout counter?
4. Which movement would you choose, and why?
5. Did you notice that camera coaching is private/on-device?
6. Did you understand that the robot demonstration is conditional on Coach being connected?

### Success criteria

A first-time visitor passes if, without help, they can say:

- it watches or coaches exercise form with the camera;
- it gives live feedback, not only a rep count;
- Curls are the clearest route to the robot demonstration;
- camera coaching still works without a connected robot.

If they fail question 1 or 2, change the first viewport copy/layout before adding
more features. If they fail question 6, clarify availability—not the core promise.

### Variants to compare

Run the same script with:

- **Camera-only:** no station configured;
- **Station connected:** local simulation running and `NEXT_PUBLIC_COACH_STATION` set;
- **Mobile portrait:** the primary acquisition viewport.

Keep notes by variant. Do not average away confusion caused by station availability.

## Manual simulation stage

This is the required Milestone 1 gate before physical hardware.

### Start the station

Terminal A:

```sh
cd coach-station
COACH_ARM=console COACH_SIM_SPEED_SCALE=1 uv run python -m coach_station
```

Terminal B:

```sh
NEXT_PUBLIC_COACH_STATION=ws://localhost:8765 pnpm dev
```

### Browser sequence

1. Open a fresh browser profile at `http://localhost:3000`.
2. Confirm the foyer says **Camera coaching ready** and shows the current Coach state.
3. Confirm **Curls** is selected by default.
4. Start camera coaching without connecting a wallet.
5. Allow the camera.
6. Produce the `elbow_swing` form cue.

### Pass criteria

- The camera session starts even if the station is stopped.
- With the station running, the foyer reports `Camera coaching ready · Coach link connected`.
- The station logs the form event and dispatches the curl demonstration.
- The browser speaks the station narration.
- The active twin instrument shows the correction state and progress.
- The instrument shows `SIM` for the console/simulation affect.
- Observed telemetry is shown as `·obs` when the adapter provides it.
- The bay pulse reacts to the form cue/demonstration.
- Stopping the station returns the app to normal camera coaching without a blocking error.

### Deterministic visual proof

For a repeatable UI-only rehearsal, open the app with `?twin=1` and start a
session. The scripted twin bus mounts with the active workout and never connects
to or drives a real arm. It is useful for checking the `DEMO` instrument,
progress animation, narration copy, and screen recording composition. It does
**not** close the manual-stage gate; the real browser + station simulation above
is still required.

Capture one short screen recording plus the station terminal output. This is the
minimum evidence for closing the manual-stage gate.

## What not to do yet

- Do not run `COACH_AFFECT=live` during this stage.
- Do not use a physical arm until the manual stage passes and the `LIVE.md`
  preconditions are satisfied.
- Do not start SmolVLA or a broader episode flywheel from simulated-only evidence.
