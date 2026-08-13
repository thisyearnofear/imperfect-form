# North Star: Physical AI Coaching

> **AI watches you exercise, understands your form, and a robot arm physically
> demonstrates the correction. Imperfect Form closes the feedback loop that a
> screen can't.**

Many apps do pose detection. Almost none do physical AI. We are building toward
that category with the **Cyberwave** platform and an **SO-101 arm ("Coach")** —
always as the teacher in a human coaching product, never as a stand-alone
manipulation demo.

## Heritage: the Sandow lineage

This is not a stretch metaphor — it is documented history. **Eugen Sandow**
ran his "Institute of Physical Culture" in London in the 1890s and built the
first global fitness brand. His actual mechanic: men across Britain photographed
themselves shirtless, mailed the photos to Sandow's London office, and got their
proportions graded against his "ideal" measurement tables — a Victorian, postal
version of pose-estimation feedback. He also sold a **spring-grip dumbbell**,
stamped _"Supplied to King Edward VII by Royal Letters Patent,"_ as a mechanical
device to correct grip and form.

That is the imperfect-form loop, 130 years early: photo in → graded against an
ideal → correction out. The Royal Mail was the transport layer; the camera is
now the transport layer. The spring-grip dumbbell was the "physical AI" of its
day — a mechanical form-corrector with a Royal Warrant. The SO-101 arm is the
same loop, closed with a robot.

This matters for positioning and for the [Cræft Prize](./CRAFFT_PRIZE.md):
Britain invented the AI form-check in 1897. We finished the job — with a robot.
The aesthetic lineage is the British seaside arcade ("Test Your Strength"
high-strikers, penny arcades) — playful, viral, but a real working instrument
under the cabinet. Satire with a steel core.

## What we are (and are not)

**We are:** a mass-market, privacy-first **camera coaching product**. The robot
exists to **teach a human** — demonstration as motor learning — then to compound
into a gym-station wedge and a session → episode → policy flywheel.

**We are not:**

- A teleop / pick-and-place / household-task robot as the hero experience
- A VLA demo that starts at the arm and treats the person as optional
- A robotics brochure with a thin web shell bolted on
- A desk arm pretending to coach lower-body mechanics it cannot show

| Principle                         | Implication                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------- |
| **Human is the primary actor**    | Day-0 is camera trust (Ring 0). Robot demos are fail-silent subscribers.     |
| **Understand before show**        | PoseRuntime + form events unlock demonstration; demos never gate coaching.   |
| **Show beats describe**           | Scripted joint-space primitives first; learned policies after real sessions. |
| **Honest robot scope**            | Upper-body corrections the SO-101 can literally sweep (curls, extension…).   |
| **Product before platform flash** | Cyberwave twin / Edge power the loop; imperfectform.fun owns the story.      |

## The loop

```
you exercise ──► camera ──► pose estimation ──► joint-angle analysis
                                                      │
        ┌─────────────────────────────────────────────┤
        ▼                             ▼               ▼
  on-screen HUD              AI coach voice     SO-101 "Coach"
  (studio → earned arcade)   (persona TTS)      physically demonstrates
                                                the correct joint angle
        │                             │               │
        └─────────────┬───────────────┴───────────────┘
                      ▼
        session recorded via Cyberwave (LeRobot format)
                      ▼
        SmolVLA fine-tuning → end-to-end physical coaching
```

**Story spine:** Trust opens the door → play keeps them → physical AI makes
them tell someone. Screens coach first; robots prove the category.

## Why a robot changes the product

- **Demonstration beats description.** "Extend your elbows more" is weak;
  watching an arm sweep from your 120° to the target 155° is motor learning.
- **A data flywheel rooted in real coaching.** Every coached session can become
  LeRobot-format episodes through Cyberwave — training data for SmolVLA and
  eventual end-to-end visuomotor coaching. The human session is the dataset,
  not an afterthought to teleop.
- **Three-tier positioning.** The app stays mass-market; the robot is
  (1) the brand moat / the demo a screen can't give, (2) a premium "coach
  station" wedge for gyms, (3) the data asset that compounds.

## How it maps onto what exists

| Existing system                                 | Role in the loop                                                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Exercise engine (`src/lib/exercise-engine/`)    | Trigger signal: form issues with current + target joint angles                                            |
| Coaching engine + AI providers (text)           | Persona-toned cues; cloud LLM cascade                                                                     |
| TTS providers (ElevenLabs / Polly / browser)    | Voice that narrates while the arm demonstrates — preference + fail-silent cascade                         |
| Coach personas (SNEL / STEDDIE / RASTA)         | Arm motion profiles: slow-deliberate / smooth-centered / fast-energetic                                   |
| Design registers (arcade / studio / calm / lab) | Robot presence = **lab register made physical** in the bay                                                |
| Studio bay + twin peek                          | Product surface for physical AI (gaze, pulse, station status) — felt in-app, not only on the edge machine |
| Curls + pull-ups + push-ups                     | Flagship demos: elbow corrections a desk arm can perform (lower-body demos out of scope)                  |

## Architecture

```
Browser (Next.js, MoveNet/TFJS)            coach-station/ (Python)
┌──────────────────────────────┐           ┌─────────────────────────────┐
│ PoseRuntime (session owner)  │           │ websockets server            │
│ pose → exercise engine       │           │ FormEvent → primitive lookup │
│ coaching → FormEvent         │──ws:8765─►│ persona motion profiles      │
│ twin peek / bay pulse (UI)   │◄─ demo ──│ Cyberwave twin (SO-101)      │
│ (fail-silent if no station)  │           │ cw.affect("simulation"|"live")│
└──────────────────────────────┘           └─────────────────────────────┘
```

**Design rules for this split:**

1. **PoseRuntime owns the session** — camera/model until Stop; station never
   remounts or blocks coaching.
2. **Station is a subscriber** — unset `NEXT_PUBLIC_COACH_STATION` ⇒ no-op.
3. **Scripted primitives before learned policies** — Milestone 1–2 prove
   understand → show; Milestone 3 turns sessions into episodes / SmolVLA.
4. **Sim-first** — develop against MuJoCo (`cw.affect("simulation")`) before
   hardware (`LIVE.md`).

## Product shape: three rings

Hard lesson from past projects: gating actions on-chain kills adoption. On-chain is an earned delight, never a prerequisite.

## Movement Intelligence: the durable product outcome

The physical-AI loop gives Imperfect Form its moat; **Movement Intelligence** gives
that loop a reason to compound. A privacy-first **Movement Passport** records
range, control, symmetry, tempo, consistency, and measurement confidence — without
becoming a medical record or universal fitness score. The first distribution
object is the **Movement Card**: one insight, one next focus, and a privacy-safe
**Take the same test** challenge.

```
valid assessment → useful card → accepted challenge → recipient assessment → repeat test
```

Camera coaching remains Ring 0, the Coach remains a teacher, and the
manual-stage → hardware → episode order remains the robotics gate. Full plan:
[`MOVEMENT_INTELLIGENCE.md`](./MOVEMENT_INTELLIGENCE.md).

## Phases

See [ROADMAP.md](./ROADMAP.md) for the required order, hardware bring-up gates,
and current status. The short version: Bridge → Sim choreography → Manual stage →
Hardware bring-up → Data flywheel. Do not start SmolVLA before the manual stage
passes.

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

**Loop principle:** Trust opens the door. Play keeps them. Physical AI makes
them tell someone.

**Differentiation in one line:** The robot exists to teach the human —
private camera coaching first, physical demonstration second, learned policies
from real sessions third.

**Aesthetic registers** — Studio is the chassis, Arcade is punctuation, Calm/Lab
are phase modes. See `src/lib/brandPositioning.ts` and root `design.md` for the
full register spec, energy ladder, and design rules.

**Stack:** Python, MoveNet (browser), MuJoCo, Cyberwave SDK, SmolVLA, SO-101.
