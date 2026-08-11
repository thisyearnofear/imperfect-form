# Arm Create: AI Optimization Challenge — Assessment

> Status: **assessment only — conditional GO.** No challenge-specific feature
> work is started until the hardware and Arm-compute gates below pass.
> Decision date: August 6, 2026. Deadline: **August 14, 2026** (verify on the
> Devpost page before planning).

## Verdict

The project is a **credible candidate for Track 1 — Physical AI**, using the
SO-101 ("Coach") as the physical embodiment — **but not submission-ready
today**. The missing proof layer is not the product; it is **Arm-targeted
optimization evidence**: an identified Arm-powered compute target, a
benchmark on that target, and a before/after optimization result.

> **Do not build challenge-specific features yet.** The correct next action
> is a hardware feasibility check. Once the arm can move through the current
> Cyberwave path and an Arm64 target can be benchmarked, this becomes an
> evidence sprint layered onto the existing product — not a pivot.

## Why Track 1 — Physical AI fits

The challenge's Physical AI definition (sensor input → AI-informed decision →
physical-machine action) maps directly onto the shipped loop:

```text
camera observes form
→ AI identifies elbow drift (elbow_swing FormEvent)
→ correction intent is generated (observed angle → 50° target)
→ safe SO-101 trajectory is produced (safety-clamped waypoints)
→ arm demonstrates the correction (demonstrate_strict_curl)
→ measured telemetry confirms motion (twin.joints.get_all())
```

The strongest existing evidence:

- `coach-station/coach_station/primitives.py` — form events → robot demos
- `coach-station/coach_station/trajectory.py` — interpolated joint waypoints
- `coach-station/coach_station/safety.py` — joint-angle + speed constraints
- `coach-station/coach_station/arm.py` — ConsoleArm / CyberwaveArm adapters
- `coach-station/coach_station/server.py` — WebSocket orchestration
- `src/lib/exercise-engine/curlProcessor.ts` — `elbow_swing` correction signal
- `src/services/coachStation.ts` — intent ↔ robot state ↔ command result
- 45 station tests passing (safety, trajectories, telemetry, primitives,
  protocol)

## The SO-101 path — technically feasible

### Hardware facts (documented)

- Six Feetech STS3215 serial-bus servos
- USB motor-bus controller
- External power
- Host-side calibration + serial communication (LeRobot-compatible tooling)

### The control route we already implement

```text
Imperfect Form (browser)
→ WebSocket (ws:8765)
→ Coach Station (Python)
→ Cyberwave SDK
→ paired SO-101
```

The adapter is aligned with the documented SDK model:

```python
cw.affect("live")
twin.joints.set("elbow_flex", angle, degrees=True)
twin.joints.get_all()  # measured telemetry
```

Already in the repository: SO-101 twin identifier, Cyberwave adapter,
live/simulation affect separation, workspace clamps, speed caps, per-step
limits, explicit live confirmation (`COACH_AFFECT=live` +
`COACH_LIVE_CONFIRM=1`), measured joint telemetry (`·obs`), live bring-up
runbook, dead-man/E-stop requirement. **No direct Feetech/LeRobot driver is
needed for the low-risk path** — Cyberwave covers it.

### The Arm requirement (key distinction)

The challenge applies the Arm-architecture requirement to the **AI/control
compute workload**, not necessarily to the servo electronics. A defensible
architecture:

```text
Arm-powered host (Arm64)
  ├─ local MoveNet camera inference
  ├─ form classification
  └─ correction intent / control orchestration
          ↓
SO-101 via Cyberwave
```

Candidates: Apple Silicon Mac (arm64), Arm Android phone/tablet, Raspberry Pi,
or another Arm64 edge machine — as long as the workload runs there and is
benchmarked there.

## Local environment findings (this machine)

- **Host:** Apple Silicon MacBook (`uname -m` → arm64) — already an Arm
  compute environment
- **Python 3.12, Node 24** — sufficient for the station + browser paths
- **No SO-101 serial device currently visible** (`/dev/cu.*` shows only
  Bluetooth/audio/debug ports; no Feetech / Waveshare / USB motor-bus port)
- **No Cyberwave env vars set** in the shell

The code is ready for the SO-101 path; **the local machine is not currently
showing the SO-101 hardware**. That is the gating fact.

## Minimum feasibility sprint

### Step 1 — Connect and identify the arm

With the SO-101 powered and its controller plugged in:

```sh
ls /dev/cu.*
system_profiler SPUSBDataType
```

Expect a new USB serial device. **Do not move the arm yet.**

### Step 2 — Validate controller + calibration

Official SO-101/LeRobot setup flow: identify serial port, confirm servo IDs,
verify power supply, calibrate, perform only the prescribed safe first-motion
check. This happens before our application process is connected.

### Step 3 — Pair Cyberwave

On the machine connected to the arm:

```sh
sudo cyberwave pair
```

Confirm the SO-101 twin is visible and joint telemetry is readable before any
live motion.

### Step 4 — Live curl demo (slow, dead-man armed)

Per `coach-station/LIVE.md`: `demonstrate_strict_curl` only, slow env caps,
operator on dead-man. Confirm `·obs` encoder telemetry appears.

### Step 5 — Arm-target benchmark

Produce the missing optimization proof, e.g. MoveNet baseline vs. reduced
input resolution / alternate backend / smaller model on the Arm64 target:
inference latency, FPS, startup time, memory, form-detection quality retained.

## Binary go / no-go

**GO** (proceed as an evidence sprint) when all of:

- [ ] SO-101 controller is recognized by the host
- [ ] Calibration + safe first-motion verified
- [ ] `cyberwave pair` succeeds and the twin is visible
- [ ] One live curl demo completes with encoder telemetry (`·obs`)
- [ ] An Arm64 compute target is benchmarked (before/after)

**STOP** (stay focused on existing product/evidence opportunities) if:

- The arm cannot be connected / powered / calibrated in time
- Cyberwave live pairing is unavailable (a direct Feetech driver would be a
  much larger, riskier diversion against the deadline)
- Live telemetry cannot be obtained
- The arm can only be demonstrated in simulation
- A credible Arm-target benchmark cannot be produced in time

## Submission kit

- **Benchmark:** use the single canonical workflow in
  [`PERFORMANCE_BASELINE.md`](./PERFORMANCE_BASELINE.md); keep both raw reports
  plus the generated comparison.
- **Live proof:** Arm host inference → `elbow_swing` → safe intent → live SO-101
  → measured `·obs` telemetry. Keep simulation clearly labeled.
- **Hygiene:** public repo, visible MIT project license, exact setup command,
  raw evidence, one <3-minute demo, and limitations. Claims stay conditional
  until tomorrow's hardware and Arm measurements exist.

## What we are NOT doing

- No challenge-specific feature development before the gates above
- No product pivot (no teleop/pick-and-place hero stories; NORTH_STAR
  "robot as teacher" stance unchanged)
- No direct Feetech/LeRobot driver unless Cyberwave is confirmed unavailable

---

**Related:** [ROADMAP.md](./ROADMAP.md) (required order, hardware bring-up),
[`coach-station/LIVE.md`](../coach-station/LIVE.md) (live runbook),
[NORTH_STAR.md](./NORTH_STAR.md) (robot-as-teacher product stance),
[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) (mentor-derived gates).
