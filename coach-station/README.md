# Coach Station

The physical half of Imperfect Form's [north star](../docs/NORTH_STAR.md):
a Python service that receives live form events from the web app and drives
the SO-101 arm ("Coach") to physically demonstrate corrections.

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
arm would perform. When a demo starts, the station also emits a JSON
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

Elbow workspace clamps (env-overridable):

- `COACH_ELBOW_MIN` (default `0`)
- `COACH_ELBOW_MAX` (default `180`)

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

**Software (this script):** station bridge tests, TTS prefs, all primitives in console.

**Stage (manual):**

1. `cd coach-station && uv run python -m coach_station` (console or Cyberwave sim)
2. `NEXT_PUBLIC_COACH_STATION=ws://localhost:8765 pnpm dev`
3. Browser: **Train** → curls → bad form → station logs demo + browser speaks narration
4. Optional twin: `uv sync --extra cyberwave`, `COACH_AFFECT=simulation`
5. **Live hardware never** without `COACH_AFFECT=live` **and** `COACH_LIVE_CONFIRM=1`
   **and** a physical dead-man (Milestone 2)

## Live mode (Milestone 2)

```sh
# Refuses live without confirm — falls back to simulation
COACH_AFFECT=live uv run python -m coach_station

# Only when dead-man is armed:
COACH_AFFECT=live COACH_LIVE_CONFIRM=1 uv run python -m coach_station
```

## Layout

- `coach_station/schema.py` — FormEvent contract (mirrors `src/services/coachStation.ts`)
- `coach_station/primitives.py` — form issue → demonstration, persona motion profiles
- `coach_station/trajectory.py` — interpolated joint waypoints + workspace clamps
- `coach_station/arm.py` — Cyberwave twin backend (`joints.set`) + console sim
- `coach_station/demo.py` — CLI to fire primitives without the web app
- `coach_station/server.py` — WebSocket server, cooldowns, one-demo-at-a-time
