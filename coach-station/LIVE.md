# Milestone 2 — Live SO-101 bring-up

Software safety is in place. Hardware still needs a physical dead-man and
validated sim → live transfer. **Do not start here until Milestone 1 manual
stage passes** (browser + station; see [README.md](./README.md) checklist and
[ROADMAP.md](../docs/ROADMAP.md) required order).

## Safety incident — 2026-08-13 (elbow_flex stall → smoke)

A commanded live move stalled the **elbow_flex servo (ID 3)** at a physical
hard stop; stall current overheated it to ~66 °C and produced smoke. The
operator cut power immediately; the servo is presumed damaged (windings or
board-side driver) and must be replaced before the arm is powered again.

**Root cause.** `shoulder_lift` and `elbow_flex` were calibrated at _full
encoder range_ (0–4095): they were swept a full turn during calibration, so
the radians→raw conversion had no real mechanical bounds and a modest
command (0.50 rad) landed the servo at a hard stop, where it kept pushing
against the stall.

**Lessons (now enforced rules):**

1. The calibration warning **`Full range (0-4095 or very close) detected -
not physically possible` is FATAL** — never proceed past it. The sufficiency
   check passing does NOT clear it. Re-calibrate that joint with a _bounded_
   sweep: move it slowly to each mechanical stop, never through a full turn.
2. First commanded motion on a fresh calibration must be a **single tiny
   nudge (≤ 5°)**, watched visually and confirmed, before any streamed
   trajectory is allowed.
3. **Monitor servo temperature** during the first live session. ~66 °C with
   smoke = stall → **cut power immediately** (dead-man exists for exactly this).
4. Torque/current limits are **not** yet commanded via the SDK; step/speed
   caps are a software stand-in and do NOT protect against hard-stop stalls.

## Preconditions

- [ ] Milestone 1 software dry-run green: `./scripts/cohort-dry-run.sh`
- [ ] Manual cohort stage proven in **simulation** (console or Cyberwave twin)
      — CoachFoyer → Curls → form cue → demo + TTS (+ twin peek / bay pulse)
- [x] Browser curl evidence surface available: active-arm angle, 50–70° target
      range, phase, and elbow drift are visible in `CurlFormInstrument`; this
      is local camera evidence only and does not prove station or hardware motion.
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

## Hardware feasibility sprint — pre-bring-up gate

The Devpost Arm Create: AI Optimization Challenge assessment
([`docs/ARM_AI_CHALLENGE.md`](../docs/ARM_AI_CHALLENGE.md)) defines a five-step
feasibility sprint that gates live hardware work. **Steps 1–3 are hard
preconditions before any live motion.** Step 4 is the first live curl (the
bring-up sequence below). Step 5 is the challenge-evidence follow-on once the
curl is stable. If any gate fails, stay in simulation and keep the product
path focused — the challenge is an evidence sprint, not a pivot.

### Step 1 — Connect and identify the arm

With the SO-101 powered and its controller plugged in:

```sh
ls /dev/cu.*
system_profiler SPUSBDataType
```

Expect a new USB serial device (Feetech / motor-bus). **Do not move the arm
yet.**

- [ ] New serial device visible after power + connect

### Step 2 — Validate controller + calibration

Official SO-101/LeRobot setup flow **before** our application process
connects: identify the serial port, confirm servo IDs, verify the power
supply, calibrate, and perform only the prescribed safe first-motion check.

- [ ] Serial port identified
- [ ] Servo IDs confirmed
- [ ] Power supply verified
- [ ] Calibration complete (safe first-motion check passed)

**Calibration must record BOUNDED ranges.** When sweeping each joint during
the recording phase, move it slowly to its mechanical stops and back — do
**not** rotate it a full turn. A recorded range of ~0–4095 (encoder wrap) is
flagged by the driver as `Full range ... not physically possible`: treat that
as a hard failure and re-calibrate the joint with a bounded sweep. See the
safety incident above for why this is fatal.

### Step 3 — Pair Cyberwave

`cyberwave pair` on the machine connected to the arm (see preconditions
above). Confirm the SO-101 twin is visible and `twin.joints.get_all()` returns
joint telemetry **before** any live motion.

- [ ] `cyberwave pair` succeeds; twin visible
- [ ] Joint telemetry readable (`get_all` non-empty)

### Step 4 — Live curl demo (slow, dead-man armed)

Run the bring-up sequence below: `demonstrate_strict_curl` only, slow env
caps, operator on dead-man. Confirm the `·obs` encoder readout appears.

- [ ] One live curl completes with `·obs` encoder telemetry

### Step 5 — Arm-target benchmark

The challenge needs Arm-targeted optimization evidence on the compute host,
not the servo electronics. Follow the single capture/compare workflow in
[`docs/PERFORMANCE_BASELINE.md`](../docs/PERFORMANCE_BASELINE.md).

- [ ] Target, model, backend, camera, and path recorded
- [ ] Before/after p50/p95 latency, FPS, memory, and quality retained
- [ ] Raw JSON plus generated Markdown preserved for the submission

**GO** to the bring-up sequence only when Steps 1–3 pass. **STOP** (stay on
the existing product/evidence path) if the arm cannot connect / power /
calibrate, Cyberwave live pairing is unavailable, live telemetry is
unobtainable, the arm is sim-only, or a credible Arm benchmark can't be
produced in time.

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

### Live bring-up — recorded path (2026-08-13)

Environment details that made live motion work, in order:

1. **Driver**: `so101-remoteoperate` (cyberwave-edge-so101) must be running
   against the same twin. `cyberwave pair` / `edge install` needs Docker
   Desktop; the direct driver path does not:
   ```sh
   cd ~/Dev/cyberwave-edge-so101
   set -a; source ~/Dev/imperfect-form/.env.local; set +a
   .venv/bin/so101-remoteoperate --follower-port /dev/cu.usbmodem… \
     --twin-uuid <twin-uuid>
   ```
2. **Twin**: create it in the operator's own workspace
   (`cyberwave twin create the-robot-studio/so101 -e <env-uuid> -y`) — API
   tokens cannot write twins into other workspaces (403).
3. **Station env**: the SDK resolves `the-robot-studio/so101` only inside the
   right environment; set these before starting the station:
   ```sh
   export CYBERWAVE_ENVIRONMENT_ID=<env-uuid-of-the-twin>
   export SSL_CERT_FILE=$(uv run python -c "import certifi; print(certifi.where())")
   ```
   `SSL_CERT_FILE` is required — Python 3.14 on macOS has no system CA bundle.
4. **Schema keys**: the SDK rejects friendly joint names when the schema is
   loaded; the station maps them internally (see `schema_joint` in
   `coach_station/arm.py`). `twin.joints.get()` returns `_1`…`_6`, not
   `elbow_flex`.
5. First commanded motion was a **single ≤ 5° nudge**, verified visually
   before any trajectory. (The servo responded to the first command and the
   under-execution/stall behavior observed afterward is what this incident
   documents.)

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

- Real torque / reach clamps via Cyberwave when API available — **the gap
  that caused the 2026-08-13 servo stall**; do not run compound live motion
  until commanded current/torque limits exist
- Re-calibrate `shoulder_lift` / `elbow_flex` with bounded ranges and replace
  the burned elbow_flex servo before the next live attempt
- Auto-disable live if websocket client disconnects mid-demo (optional)
- Station kiosk mode (Milestone 4)
