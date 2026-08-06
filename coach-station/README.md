# Coach Station

The physical half of Imperfect Form's [north star](../docs/NORTH_STAR.md):
a Python service that receives live form events from the web app and drives
the SO-101 arm ("Coach") to **physically demonstrate corrections** — so the
robot can teach the human after the camera has understood their form.

This service is a **subscriber** to Ring 0 coaching. The web app must remain
fully usable when the station is offline (fail-silent). Scripted joint-space
primitives come before any learned policy; see NORTH_STAR “What we are.”

## Run (console simulation, no hardware or SDK needed)

```sh
cd coach-station
uv sync --extra dev
uv run python -m coach_station
```

Then start the web app with the bridge enabled:

```sh
NEXT_PUBLIC_COACH_STATION=ws://localhost:8765 pnpm dev
```

Do a workout with bad form and watch the station log the demonstrations the
arm would perform. For curls, an `elbow_swing` cue carries the observed elbow
angle as `current` and a deterministic 50° correction as `target`; the station
clamps both to the active workspace before generating the `elbow_flex`
trajectory. Clients that omit those optional fields retain the scripted 160°
→ 50° fallback. When a demo starts, the station also emits a JSON
`demonstration` event (narration + duration) back to the browser so voice can
sync to the arm — TTS is provider-agnostic on the web client (ElevenLabs →
Polly → browser).

## Demo CLI (no browser)

Exercise the Milestone 1 primitives against the arm backend:

```sh
uv run python -m coach_station.demo --demo curl        # flagship strict curl
uv run python -m coach_station.demo --demo extension   # pull-up ROM
uv run python -m coach_station.demo --demo tempo
uv run python -m coach_station.demo --demo asymmetry
uv run python -m coach_station.demo --demo all
```

Force console logging even if Cyberwave is installed: `COACH_ARM=console`.
For quick local iteration only, `COACH_SIM_SPEED_SCALE=0.25` accelerates
console playback; leave it unset (the default `1`) when validating narration,
trajectory progress, and twin timing against the reported `duration_s`.

## Run against the Cyberwave twin (MuJoCo / Playground sim)

```sh
uv sync --extra cyberwave
cyberwave pair                      # once, on the edge device
uv run python -m coach_station     # COACH_AFFECT=simulation (default)
COACH_AFFECT=live uv run python -m coach_station   # real SO-101 — Milestone 2
```

Twin slug default: `the-robot-studio/so101` (override with `COACH_TWIN`).
Joint commands use `twin.joints.set(name, deg, degrees=True)` with an
interpolated trajectory (see `coach_station/trajectory.py`).

Elbow workspace + motion clamps (env-overridable; live defaults tighter):

- `COACH_ELBOW_MIN` / `COACH_ELBOW_MAX` — position workspace
- `COACH_MAX_SPEED_DEG_S` — persona speed ceiling
- `COACH_MAX_STEP_DEG` — max |Δθ| per command tick (jerk/torque proxy)

See [`LIVE.md`](./LIVE.md) for Milestone 2 hardware bring-up.

## Twin integration surface (Cyberwave)

Three opt-in seams keep the station honest about what's really happening:

- **Measured telemetry** (`TrajectoryProgressV1.measured_deg`): the adapter
  reads `twin.joints.get_all()` per progress tick and threads the _observed_
  elbow angle alongside the commanded one. The UI dial renders observed when
  available (`·obs` suffix on the readout), falls back to commanded otherwise
  (e.g. `ConsoleArm`, or when the SDK hasn't received a state update yet).
  Read failures never interrupt coaching — `observe()` errors are logged at
  DEBUG and the emitter continues.
- **Twin alerts** (`COACH_TWIN_ALERTS=1`): when a demo fails (`aborted`,
  `rejected`), the station posts a `coach_demo_fault` alert to the Cyberwave
  twin so the failure shows up in the dashboard alert feed, not just our
  logs. Off by default so simulation doesn't spam the alert feed.
- **Programmatic recordings fetch** — the Cyberwave SDK has no
  start/stop recording API (capture is driven from Live Mode in the
  dashboard). The companion CLI fetches robot-actuation recordings for a
  session window so you can trim them into training episodes for the
  SmolVLA flywheel:

  ```sh
  CYBERWAVE_API_KEY=... uv run python -m coach_station.recordings \
    --since 2026-08-03 --until 2026-08-04
  CYBERWAVE_API_KEY=... uv run python -m coach_station.recordings --inspect
  ```

## Tests

```sh
uv sync --extra dev
uv run pytest
```

From repo root, automated software dry-run (vitest + pytest + demo CLI):

```sh
./scripts/cohort-dry-run.sh
```

## Cohort day checklist

For the complete first-visit clarity test, camera-only/station-connected variants,
and evidence requirements, see [`docs/FIRST_VISIT_AND_MANUAL_STAGE.md`](../docs/FIRST_VISIT_AND_MANUAL_STAGE.md).
The browser foyer reports camera coaching readiness in every state and distinguishes
Coach bay connected / connecting / offline; the fixed bay readout also mirrors the
selected movement and camera/AI/tracking handoff. Local cues remain visible without
the station. A link connection is not claimed to be mechanical arm readiness.

**Required next gate** (see [ROADMAP.md](../docs/ROADMAP.md) “What's next —
required order”): pass this manual browser/session stage before hardware
bring-up. Versioned twin telemetry is shipped in the software path, but the
cohort gate still requires observing it in a real browser session.

**Software (this script):** station bridge tests, TTS prefs, all primitives in console.

```sh
./scripts/cohort-dry-run.sh   # from repo root
```

**Stage (manual) — pass criteria:**

1. `cd coach-station && COACH_SIM_SPEED_SCALE=1 uv run python -m coach_station`
   (console or Cyberwave sim; use the default scale for timing validation)
2. From repo root: `NEXT_PUBLIC_COACH_STATION=ws://localhost:8765 pnpm dev`
3. Browser (Ring 0, no wallet): **CoachFoyer** → pick **Curls** → press **Try one
   rep** → allow camera → produce bad elbow form (`elbow_swing`)
4. Expect: foyer status remains camera-ready · bay readout follows the session
   handoff · station logs a demo · browser speaks narration · twin peek / bay pulse
   react (when UI is on the day-0 shell)
5. Deterministic UI-only rehearsal: open the app with `?twin=1`, start a session,
   and then see the DEMO twin instrument and progress loop; this never drives a
   real arm and does not close the manual-stage gate
6. Optional Cyberwave twin: `uv sync --extra cyberwave`, `COACH_AFFECT=simulation`
7. **Live hardware never** without `COACH_AFFECT=live` **and** `COACH_LIVE_CONFIRM=1`
   **and** a physical dead-man (Milestone 2 — only after this stage passes)

## Live mode (Milestone 2)

Full checklist: [`LIVE.md`](./LIVE.md).

```sh
# Refuses live without confirm — falls back to simulation
COACH_AFFECT=live uv run python -m coach_station

# Only when dead-man is armed (tighter speed/step via safety.py defaults):
COACH_AFFECT=live COACH_LIVE_CONFIRM=1 uv run python -m coach_station
```

## Layout

- `coach_station/safety.py` — affect resolve + workspace/speed/step limits
- `coach_station/schema.py` — FormEvent contract (mirrors `src/services/coachStation.ts`); optional `current`/`target` angle fields
- `coach_station/primitives.py` — form issue → demonstration, dynamic curl angle normalization, persona motion profiles
- `coach_station/trajectory.py` — interpolated joint waypoints + safety clamps
- `coach_station/arm.py` — Cyberwave twin backend (`joints.set`, `joints.get_all()`, alerts) + console sim
- `coach_station/recordings.py` — fetch twin recordings for a session window (episode pipeline, SmolVLA flywheel)
- `coach_station/demo.py` — CLI to fire primitives without the web app
- `coach_station/server.py` — WebSocket server, cooldowns, one-demo-at-a-time
- `LIVE.md` — Milestone 2 hardware bring-up runbook
