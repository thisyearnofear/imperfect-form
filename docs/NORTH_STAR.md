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

## Phases

1. **Bridge (now):** `coach-station/` scaffold + FormEvent schema + web tap.
   Deliberately "dumb": form issue → scripted demonstration primitive.
2. **Sim choreography:** demonstration primitives against the MuJoCo twin —
   `demonstrate_extension(target_deg)`, `demonstrate_tempo()`,
   `mirror_asymmetry()` — each with per-persona motion profiles.
3. **Hardware bring-up:** `cyberwave pair` on edge hardware, `affect("live")`,
   workspace limits.
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

**Stack:** Python, MediaPipe (station) / MoveNet (browser), MuJoCo, Cyberwave
SDK, Nova 2, SmolVLA, SO-101.
