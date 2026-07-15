# Coach Station

The physical half of Imperfect Form's [north star](../docs/NORTH_STAR.md):
a Python service that receives live form events from the web app and drives
the SO-101 arm ("Coach") to physically demonstrate corrections.

## Run (console simulation, no hardware or SDK needed)

```sh
cd coach-station
uv sync
uv run python -m coach_station
```

Then start the web app with the bridge enabled:

```sh
NEXT_PUBLIC_COACH_STATION=ws://localhost:8765 pnpm dev
```

Do a workout with bad form and watch the station log the demonstrations the
arm would perform.

## Run against the Cyberwave twin

```sh
uv sync --extra cyberwave
cyberwave pair                      # once, on the edge device
uv run python -m coach_station     # simulation twin (default)
COACH_AFFECT=live uv run python -m coach_station   # real SO-101
```

## Layout

- `coach_station/schema.py` — FormEvent contract (mirrors `src/services/coachStation.ts`)
- `coach_station/primitives.py` — form issue → demonstration, persona motion profiles
- `coach_station/arm.py` — Cyberwave twin backend + zero-dependency console sim
- `coach_station/server.py` — WebSocket server, cooldowns, one-demo-at-a-time
