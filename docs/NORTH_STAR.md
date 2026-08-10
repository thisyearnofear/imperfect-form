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

**Do this next:** Manual stage — browser + station, curls → arm moves + voice
(see [ROADMAP.md](./ROADMAP.md) required order +
[`coach-station/README.md`](../coach-station/README.md) checklist). Then richer
twin telemetry, then hardware. Do not start SmolVLA before that proof.

1. **Bridge (shipped):** `coach-station/` WebSocket + FormEvent schema + web
   tap (`coachStation.ts`). Fail-silent when the station is offline.
   Deliberately "dumb": form issue → scripted demonstration primitive.
2. **Sim choreography (software shipped · stage gate open):** demonstration
   primitives against the Cyberwave MuJoCo / Playground twin via
   `cw.affect("simulation")` + interpolated `joints.set` trajectories —
   `demonstrate_strict_curl` (flagship), `demonstrate_extension`,
   `demonstrate_tempo`, `mirror_asymmetry` — each with per-persona motion
   profiles and narration. Station emits `demonstration` for voice sync +
   bay/twin UI; web TTS is provider-agnostic. Demo CLI:
   `python -m coach_station.demo`. **Manual stage still required** before
   calling the cohort closed.
3. **Hardware bring-up:** after manual stage —
   `cyberwave pair`, `affect("live")`, clamps (`LIVE.md`). Curl-first.
4. **Flywheel:** record every coached session via Cyberwave (face anonymization
   keeps privacy-first intact); slice episodes; SmolVLA experiments that start
   from _human form cues_, not from teleop-only datasets.

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

**Aesthetic registers** — intentional mix (see `src/lib/brandPositioning.ts`
and root `design.md`):

> **Studio is the chassis. Arcade is punctuation. Calm/Lab are phase modes.**

- **Night studio (DEFAULT chassis)** — Coach / `understand` intent. Day-0
  foyer (`CoachFoyer`), camera primer, live coaching HUD, earned shell chrome:
  readable sans (Manrope), teal glass on black. Brass (`sandow-spine`) only
  as quiet grade hairlines on chassis surfaces.
- **Arcade punctuation** — celebrate / first signal / level-up / ghost accept
  / grade stamp / XP tick: brief gold flash + arcade UI sound, then return to
  studio. Press Start 2P only on these bursts — never as Stats/tab wallpaper.
- **Arcade full cabinet** — explicit Train intent + `/lore` Cræft: loud gold,
  Press Start allowed on the whole surface. **Cræft / Sandow cabinet** is the
  Victorian seaside strength-tester variant for the [Cræft Prize](./CRAFFT_PRIZE.md).
- **Calm** — Recover / breathe: post-workout recovery + optional calm entry.
  Soft light, Manrope — no scoreboard energy.
- **Lab** — post-workout AI clinical review only: precise, alive, not arcade-loud.

**Energy ladder** (not a mid-rep theme toggle):

1. **Session 0 — Studio trust** — `CoachFoyer` → primer → live cues.
2. **First celebrate — arcade punctuation** — ProgressSpark, Arcade UI sound,
   brass grade accents — then back to studio chassis.
3. **Earned shell — studio + brass** — XP/level use brass accents; no yellow
   SaaS dashboard skins.
4. **Explicit Train / Arcade cabinet** — later depth for users who want the
   game cabinet; same engine, different chrome.

| Intent               | Register | When it surfaces                        | Job                        |
| -------------------- | -------- | --------------------------------------- | -------------------------- |
| Coach (`understand`) | Studio   | **Day-0 default** (`CoachFoyer`)        | Trust + form understanding |
| Train                | Arcade   | Earned / explicit play mode (not foyer) | Challenge + play           |
| Breathe (`recover`)  | Calm     | Post-set recovery; optional calm entry  | Stillness + recover        |

Rules:

1. **Intentional mix, not accidental collision** — studio chassis may carry
   quiet brass; arcade bursts are scored moments. Never paint whole earned
   screens in yellow/violet Tailwind that ignore studio tokens. Never mix
   Press Start gold with calm glass on the same viewport.
2. **Studio opens the door** — day-0 commits Coach / Studio
   (`DEFAULT_SESSION_INTENT = understand`). No intent chooser on the first
   viewport. Register stays for the session via `imf_sessionIntent`.
3. **Landing is deferred** — deepen `CoachFoyer` + register chrome before
   spinning a separate marketing route. Ship a landing when acquisition data
   says the foyer is not enough.
4. **Same engine under all registers** — camera → understanding → guidance.
   Different door and chrome; not three apps.
5. **Alive lives in the loop** — cue timing, persona voice, settle motion,
   celebrate hits, twin peek / bay pulse when the station is linked. Not
   puerile foyer slogans.

**App one-liner:** Private camera coaching with game-quality feedback, and
a path into physical AI that can show the correction. (See
`src/lib/brandPositioning.ts`.)

**Stack:** Python, MediaPipe (station) / MoveNet (browser), MuJoCo, Cyberwave
SDK, Nova 2, SmolVLA, SO-101.
