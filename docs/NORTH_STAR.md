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

**Aesthetic registers** (one surface, one register — see
`src/lib/brandPositioning.ts`):

- **Arcade** — Train intent. Workout shell (`#screen`), START/controls, XP
  play: Press Start 2P, black / white / gold (`#fcb131`). Inherited from
  imperfect-form’s game cabinet.
- **Night studio** — Coach / “understand” intent + trust surfaces (onboarding,
  camera primer): readable sans, teal glass on black. Inherited from
  imperfectcoach’s clinical lab tone.
- **Calm** — Recover / breathe intent + post-workout recovery: soft light,
  Manrope, teal fields — no dark mode for this register. Inherited from
  imperfect-breath.
- **Lab** — post-workout AI clinical review only (not an entry intent): purple
  / mono metrics.

**UI optionality (intent → register):** Arcade is a choice, not the universal
UI. Optionality widens audience **when it maps to why someone showed up**, not
when it is a mid-session theme toggle.

| Intent (chooser) | Register | Sibling DNA | Job                        |
| ---------------- | -------- | ----------- | -------------------------- |
| Train            | Arcade   | Form        | Challenge + play           |
| Coach            | Studio   | Coach       | Trust + form understanding |
| Breathe          | Calm     | Breath      | Stillness + recover        |

Rules:

1. **One surface, one register** — never mix Press Start gold with calm glass
   on the same viewport.
2. **Chooser, then commit** — pre-start foyer picks intent; register stays for
   the session (`imf_sessionIntent`). Default remains Train / Arcade so Ring 0
   stays ungated.
3. **Landing is deferred** — deepen the in-app doorway (chooser + register
   chrome) before spinning a separate marketing route. A marketing landing is
   for strangers who need category copy without locking Press Start as the
   brand; ship it when acquisition data says the foyer is not enough.
4. **Same engine under all three** — camera → understanding → guidance.
   Different door and chrome; not three apps.

**App one-liner:** Private camera coaching with game-quality feedback, and
a path into physical AI that can show the correction. (See
`src/lib/brandPositioning.ts`.)

**Stack:** Python, MediaPipe (station) / MoveNet (browser), MuJoCo, Cyberwave
SDK, Nova 2, SmolVLA, SO-101.
