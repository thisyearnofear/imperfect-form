# North Star: Physical AI Coaching

> **AI watches you exercise, understands your form, and a robot arm physically
> demonstrates the correction. Imperfect Form closes the feedback loop that a
> screen can't.**

Many apps do pose detection. Almost none do physical AI. This is our
differentiation in the market, backed by the **Cyberwave builders cohort** and
an **SO-101 arm ("Coach")**.

## The loop

```
you exercise ──► camera ──► pose estimation ──► joint-angle analysis
                                                      │
        ┌─────────────────────────────────────────────┤
        ▼                             ▼               ▼
  on-screen HUD              AI coach voice     SO-101 "Coach"
  (arcade register)          (Nova 2, persona)  physically demonstrates
                                                the correct joint angle
        │                             │               │
        └─────────────┬───────────────┴───────────────┘
                      ▼
        session recorded via Cyberwave (LeRobot format)
                      ▼
        SmolVLA fine-tuning → end-to-end physical coaching
```

## Why a robot changes the product

- **Demonstration beats description.** "Extend your elbows more" is weak;
  watching an arm sweep from your 120° to the target 155° is motor learning.
- **A data flywheel nobody else has.** Every coached session records to
  LeRobot-format episodes through Cyberwave — training data for SmolVLA and
  eventual end-to-end visuomotor coaching.
- **Three-tier positioning.** The app stays mass-market; the robot is
  (1) the brand moat / the demo nobody else can give, (2) a premium "coach
  station" wedge for gyms, (3) the data asset that compounds.

## How it maps onto what exists

| Existing system                              | Role in the loop                                                                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Exercise engine (`src/lib/exercise-engine/`) | Emits the trigger signal: form issues with current + target joint angles (pull-up extension 150°/155°, asymmetry >30°, ROM)      |
| Coaching engine + AI providers (Nova 2 live) | The voice that narrates while the arm demonstrates, in persona tone                                                              |
| Coach personas (SNEL / STEDDIE / RASTA)      | Arm motion profiles: slow-deliberate / smooth-centered / fast-energetic                                                          |
| Design registers (arcade / lab / studio)     | The robot is the **lab register made physical** — the AI Clinical Review reaching out of the screen                              |
| Pull-ups + push-ups                          | Flagship demos: elbow-joint corrections are what a desk arm can literally perform (lower-body demos are out of scope for SO-101) |

## Architecture

```
Browser (Next.js, MoveNet/TFJS)            coach-station/ (Python)
┌──────────────────────────────┐           ┌─────────────────────────────┐
│ pose worker → exercise engine│           │ websockets server            │
│ coaching engine → FormEvent  │──ws:8765─►│ FormEvent → primitive lookup │
│ (fail-silent if no station)  │           │ persona motion profiles      │
└──────────────────────────────┘           │ Cyberwave twin (SO-101)      │
                                           │ cw.affect("simulation"|"live")│
                                           └─────────────────────────────┘
```

Sim-first: everything develops against the MuJoCo twin
(`cw.affect("simulation")`) before touching hardware.

## Product shape: three rings

Hard lesson from past projects: gating actions on-chain kills adoption.
On-chain is an earned delight, never a prerequisite.

- **Ring 0 — just train (no account):** the full loop - camera, all five
  exercises, AI coach, personas, recovery, robot demos - plus all progression
  (XP, quests, streaks, PBs, ghosts) keyed to a local guest ID
  (`imf_guestId`). A user can reach level 5 without ever seeing a wallet.
- **Ring 1 — connect (free, zero transactions):** identity and social. Names
  on things, global rank preview, Farcaster sharing, cross-device continuity.
  Guest data merges into the address on connect (`migrateGuestWorkouts`).
- **Ring 2 — on-chain delights, catered to chain primitives:** permanence
  (etch a PB - offered at the PB moment, when the user is euphoric), global
  competition (leaderboard submission), provable humanity (verified board),
  collectibility (mint the AI highlight card), and later social stakes
  (wager on beating a friend's ghost). Rewards you've earned the right to
  take - never tolls.

The cohort demo is Ring 0 by design: camera on, curls, robot moves. No
wallet popup on stage.

## Phases

1. **Bridge (shipped):** `coach-station/` WebSocket + FormEvent schema + web
   tap (`coachStation.ts`). Fail-silent when the station is offline.
   Deliberately "dumb": form issue → scripted demonstration primitive.
2. **Sim choreography (shipped, minus voice sync):** demonstration primitives
   against the Cyberwave MuJoCo / Playground twin via
   `cw.affect("simulation")` + interpolated `joints.set` trajectories —
   `demonstrate_strict_curl` (cohort flagship), `demonstrate_extension`,
   `demonstrate_tempo`, `mirror_asymmetry` — each with per-persona motion
   profiles. Demo CLI: `python -m coach_station.demo`. Remaining: Nova 2
   voice track synced to the primitive.
3. **Hardware bring-up:** `cyberwave pair` on edge hardware, `affect("live")`,
   torque / reach clamps (elbow angle clamps already in trajectory layer).
4. **Flywheel:** record every session via Cyberwave (built-in face
   anonymization keeps the privacy-first story intact); slice episodes; SmolVLA
   fine-tuning experiments.

## Pitch (cohort)

**Team:** Imperfect Form · **Robot:** SO-101 ("Coach")

AI watches you exercise through a camera, estimates your pose in real time,
and when your form is off, the arm physically demonstrates the correct joint
angle. It's a 3D reference that a screen can't provide. Most AI fitness
coaches only give on-screen feedback — Imperfect Form turns AI corrections
into physical demonstration, closing the feedback loop.

**Company posture (imperfectform.fun):** Approachable physical AI for
movement. Better form for millions through crafted game design and UI —
not gym-bro slogans, not a sterile robotics brochure. Screens coach first;
robots prove the category and become the gym-station wedge. Game-loop
chrome (XP, ghosts, chain) is earned after the first coached feel.

**App one-liner:** Private camera coaching with game-quality feedback, and
a path into physical AI that can show the correction. (See
`src/lib/brandPositioning.ts`.)

**Stack:** Python, MediaPipe (station) / MoveNet (browser), MuJoCo, Cyberwave
SDK, Nova 2, SmolVLA, SO-101.
