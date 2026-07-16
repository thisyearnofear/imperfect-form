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

| Existing system                                 | Role in the loop                                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Exercise engine (`src/lib/exercise-engine/`)    | Emits the trigger signal: form issues with current + target joint angles (pull-up extension 150°/155°, asymmetry >30°, ROM)      |
| Coaching engine + AI providers (text)           | Persona-toned cues; cloud LLM cascade (Gemini → Groq → …)                                                                        |
| TTS providers (ElevenLabs / Polly / browser)    | Voice that narrates while the arm demonstrates — preference + fail-silent cascade; not vendor-locked                             |
| Coach personas (SNEL / STEDDIE / RASTA)         | Arm motion profiles: slow-deliberate / smooth-centered / fast-energetic                                                          |
| Design registers (arcade / studio / calm / lab) | Robot = **lab register made physical**; entry intents map arcade←Form, studio←Coach, calm←Breath                                 |
| Pull-ups + push-ups                             | Flagship demos: elbow-joint corrections are what a desk arm can literally perform (lower-body demos are out of scope for SO-101) |

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
   profiles and narration. Station emits `demonstration` for voice sync;
   web TTS is provider-agnostic (ElevenLabs → Polly → browser). Safety layer
   caps elbow workspace / speed / step (tighter live defaults). Demo CLI:
   `python -m coach_station.demo`. Live bring-up: `coach-station/LIVE.md`.
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

**Loop principle:** Trust opens the door. Play keeps them. Physical AI makes
them tell someone.

**Aesthetic registers** (one surface, one register — see
`src/lib/brandPositioning.ts`):

- **Night studio (DEFAULT doorway)** — Coach / `understand` intent. Day-0
  foyer (`CoachFoyer`), camera primer, live coaching HUD: readable sans
  (Manrope), teal glass on black. Inherited from imperfectcoach DNA.
- **Arcade** — Train / play energy. Earned after the first coached feel
  (Celebrate, XP, UI sound) and a future explicit Train mode — not the
  mass-market front door. Press Start 2P, black / white / gold (`#fcb131`).
- **Calm** — Recover / breathe: post-workout recovery + optional calm entry.
  Soft light, Manrope, teal fields — no dark mode. Not competing in the
  day-0 hero viewport. Inherited from imperfect-breath.
- **Lab** — post-workout AI clinical review only (not an entry intent): purple
  / mono metrics.

**Energy ladder** (not a mid-rep theme toggle):

1. **Session 0 — Studio trust** — `CoachFoyer` → primer → live cues. Brand +
   one promise + pick a move + start. Physical AI is path, not day-0 pitch.
2. **First celebrate — introduce play** — ProgressSpark, Arcade UI sound,
   gold accents on Celebrate / earned dashboard.
3. **Explicit Train / Arcade cabinet** — later depth for users who want the
   game cabinet; same engine, different chrome.

| Intent               | Register | When it surfaces                        | Job                        |
| -------------------- | -------- | --------------------------------------- | -------------------------- |
| Coach (`understand`) | Studio   | **Day-0 default** (`CoachFoyer`)        | Trust + form understanding |
| Train                | Arcade   | Earned / explicit play mode (not foyer) | Challenge + play           |
| Breathe (`recover`)  | Calm     | Post-set recovery; optional calm entry  | Stillness + recover        |

Rules:

1. **One surface, one register** — never mix Press Start gold with calm glass
   on the same viewport.
2. **Studio opens the door** — day-0 commits Coach / Studio
   (`DEFAULT_SESSION_INTENT = understand`). No intent chooser on the first
   viewport. Register stays for the session via `imf_sessionIntent`.
3. **Landing is deferred** — deepen `CoachFoyer` + register chrome before
   spinning a separate marketing route. Ship a landing when acquisition data
   says the foyer is not enough.
4. **Same engine under all registers** — camera → understanding → guidance.
   Different door and chrome; not three apps.
5. **Alive lives in the loop** — cue timing, persona voice, settle motion,
   celebrate hits. Not puerile foyer slogans.

**App one-liner:** Private camera coaching with game-quality feedback, and
a path into physical AI that can show the correction. (See
`src/lib/brandPositioning.ts`.)

**Stack:** Python, MediaPipe (station) / MoveNet (browser), MuJoCo, Cyberwave
SDK, Nova 2, SmolVLA, SO-101.
