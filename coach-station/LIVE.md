# Milestone 2 — Live SO-101 bring-up

Software safety is in place. Hardware still needs a physical dead-man and
validated sim → live transfer. **Do not start here until Milestone 1 manual
stage passes** (browser + station; see [README.md](./README.md) checklist and
[ROADMAP.md](../docs/ROADMAP.md) required order).

## Preconditions

- [ ] Milestone 1 software dry-run green: `./scripts/cohort-dry-run.sh`
- [ ] Manual cohort stage proven in **simulation** (console or Cyberwave twin)
      — CoachFoyer → Curls → form cue → demo + TTS (+ twin peek / bay pulse)
- [ ] Clear desk radius around the arm; no people in sweep plane
- [ ] Physical dead-man / e-stop within reach of the operator
- [ ] `cyberwave pair` completed on the edge machine

## Software gates (already shipped)

| Control            | How                                                                  |
| ------------------ | -------------------------------------------------------------------- |
| Live confirm       | `COACH_AFFECT=live` **and** `COACH_LIVE_CONFIRM=1` — else simulation |
| Elbow workspace    | `COACH_ELBOW_MIN` / `COACH_ELBOW_MAX` (live defaults 20–160°)        |
| Speed cap          | `COACH_MAX_SPEED_DEG_S` (live default 45°/s)                         |
| Step / jerk proxy  | `COACH_MAX_STEP_DEG` (live default 3° per tick)                      |
| One demo at a time | server lock + 8s cooldown                                            |

Torque/current limits are **not** yet commanded via the SDK — step/speed
caps are the software stand-in until Cyberwave exposes them.

## Bring-up sequence

```sh
cd coach-station
uv sync --extra cyberwave

# 1) Twin only — prove demos + voice sync against MuJoCo / Playground
COACH_AFFECT=simulation uv run python -m coach_station.demo --demo curl
COACH_AFFECT=simulation uv run python -m coach_station

# 2) Live — only with dead-man armed
COACH_AFFECT=live COACH_LIVE_CONFIRM=1 \
  COACH_MAX_SPEED_DEG_S=25 COACH_MAX_STEP_DEG=2 \
  uv run python -m coach_station.demo --demo curl
```

First live session: **curl only**, slow env caps, operator on dead-man.
Do not run `--demo all` on hardware until curl is stable.

## Validate before compound motions

- [ ] `demonstrate_strict_curl` completes without hitting stops
- [ ] Browser narration still fires (`demonstration` WS event)
- [ ] Killing the dead-man / process leaves the arm idle/safe
- [ ] Re-check elbow clamps against measured hard stops; set env permanently
- [ ] **Twin instrument shows `·obs`** on the degree readout (live) — meaning
      `twin.joints.get_all()` telemetry is flowing and the UI dial tracks the
      encoder, not just the commanded waypoint. If it never appears, encoder
      telemetry isn't reaching the SDK cache and the dial is rendering only
      commanded angles — investigate before compound motions.
- Optional: `COACH_TWIN_ALERTS=1` so aborted/rejected demos surface in the
  Cyberwave dashboard alert feed during first live runs

## Still open

- Real torque / reach clamps via Cyberwave when API available
- Auto-disable live if websocket client disconnects mid-demo (optional)
- Station kiosk mode (Milestone 4)
