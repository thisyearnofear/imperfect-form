# Roadmap: Physical AI Coaching

> The north star (see [NORTH_STAR.md](./NORTH_STAR.md)): AI watches you
> exercise, understands your form, and a robot arm physically demonstrates the
> correction. Everything on this roadmap serves that **human-first** loop —
> robot as teacher, not as the hero experience.

## Mentor feedback — Cyberwave / SO-101

We reviewed the roadmap and technical questions with Francesco De Pascale at Cyberwave. His feedback is recorded in [`MENTOR_FEEDBACK.md`](./MENTOR_FEEDBACK.md) and the concrete plan lives in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). The headlines that change this roadmap:

1. **Pose robustness first** — classical CV pre-processing (exposure, calibration) before retraining or generative cleanup.
2. **Deterministic robot mapping before VLAs** — convert human poses → robot-achievable poses → safe trajectories, and record those as LeRobot episodes. SmolVLA only after that pipeline is trustworthy.
3. **Edge performance is a three-knob problem** — input size, model architecture, and quantization. Measure before choosing.

## Where we are

**Shipped (Ring 0 — wallet-free core loop):**

- MoveNet pose detection in-browser (no video leaves the device)
- Exercise engine with per-rep form scoring: push-ups, squats, pull-ups,
  jumps, bicep curls
- AI coaching (Gemini / Venice / AWS Bedrock Nova 2) with three personas
  (SNEL / STEDDIE / RASTA)
- Guest identity (`imf_guestId`) — PBs, XP, streaks, ghosts work with no
  sign-in; workouts merge into a wallet on connect
- Recovery register (breath cooldown + per-exercise stretches)
- Staged post-workout flow: celebrate → recover → analyze
- Ring 0 e2e guards — wallet-free core loop + PoseRuntime:
  - `e2e/ring0.spec.ts` — ungated START, camera primer, studio `CoachFoyer`,
    earned tabs only after XP
  - `e2e/pose-runtime.spec.ts` — curls + forced worker path stays alive
    (session-scoped camera/model; mode is not a remount)
- Tailwind v4 (`@tailwindcss/postcss`) — migrated `globals.css` to
  `@import "tailwindcss"` + `@config` compat; fixed design-token spacing
  collision that was silently breaking `max-w-sm`, `max-w-md`, and other
  named-scale utilities; Google Fonts moved to `<link>` in `layout.tsx`
- Day-0 foyer — studio-default `CoachFoyer` (brand-first, pick a move, start);
  game-loop chrome demoted until first XP; see company posture + energy ladder
  in NORTH_STAR
- Session intent → register — single source of truth in `brandPositioning.ts`,
  persisted `imf_sessionIntent`, `#screen` / `#game-container[data-register]`.
  **Default is Coach / Studio** (`understand`). Train / Arcade is earned play
  energy (Celebrate, UI sound), not the day-0 chooser. Calm is post-set
  recovery (`RecoveryCard`). Summary stages follow intent (Coach→Analyze,
  Breathe→Recover). Marketing landing deferred until acquisition needs category
  copy outside the cabinet.

**Next (product surface):** Dedicated marketing/landing route only if
`CoachFoyer` fails web acquisition. Progress spark + Arcade UI cues are earned
surfaces (Celebrate / dashboard) — keep charts out of the day-0 foyer. Explicit
Train / Arcade cabinet mode is later depth, not a day-0 requirement.

**PoseRuntime guardrails (shipped):** session-scoped camera/model ownership,
mode hot-swap, worker path policy in `src/lib/pose/poseRuntime.ts`, docs in
ARCHITECTURE.md, smoke via `e2e/pose-runtime.spec.ts` (forced worker + curls).

**Studio bay atmosphere (shipped → next):** day-0 `StudioAtmosphere` with
Apache-2.0 SO-101 **alpha cut-outs** (`so101-*-cutout.webp`), gaze parallax,
and soft Celo / Base / Avalanche / Monad colour blooms (not a day-0 ThemeSync
takeover). ChainAmbient / ThemeSync still gated until first XP. Avalanche is a
full theme token once earned / wallet-switched.

**Shipped (atmosphere next beats):**

- **Avalanche theme token** — `ChainId: 'avalanche'`, full `CHAIN_THEMES` entry,
  wagmi/network switching (C-Chain `43114`), ambient CSS; leaderboard contract
  optional via `NEXT_PUBLIC_AVALANCHE_CONTRACT_ADDRESS`
- **Lightweight 3D SO-101 gaze** — CSS perspective stage on Apache cut-outs
  (no third-party Spline); fine-pointer desktop gets stronger rotateY/X follow

**Shipped (physical-AI presence):**

- **Live twin peek** — `CoachTwinPeek` when `NEXT_PUBLIC_COACH_STATION` is set
  (fail-silent status + data-driven silhouette/progress during demos;
  Cyberwave/MuJoCo stay on the station machine — no browser embed)
- **Demo moment sync** — form cues / `demonstration` set `body[data-coach-pulse]`
  so bay arc + glow pulse; earned shell gets a fallback bloom
- **Weisdevice-lite entry** — studio boot “Enter the bay / Enter quietly” sound
  consent (auto-skip for automation / reduced-motion / returning session)

**Shipped (Ring 1/2 — earned upgrades):**

- Multi-chain leaderboards (Base, Celo, Polygon, Monad)
- Self Protocol verified leaderboard on Celo mainnet
- Farcaster mini-app + Farcaster / Twitter sharing
- AI Highlight Card at the celebrate moment
- Ghost challenges (URL-safe trace compression)

**In progress (the gate):**

- Manual stage — browser + station end-to-end (see “What's next” below)

**Shipped (Milestone 1 — sim choreography software):**

- `coach-station/` — WebSocket bridge + FormEvent → demonstration primitives
  (`demonstrate_strict_curl`, `demonstrate_extension`, `demonstrate_tempo`,
  `mirror_asymmetry`) with per-persona motion profiles; interpolated
  trajectories + elbow workspace clamps; CyberwaveArm uses
  `cw.affect("simulation")` + `joints.set`; ConsoleArm for zero-dep local runs
- Browser bridge (`src/services/coachStation.ts`) — FormEvent + session
  start/end, fail-silent; engine `formCheckSpeak` (e.g. `elbow_swing` on curls)
  streams through the pose loop
- Demo voice sync — station emits `demonstration` (narration + duration); web
  TTS cascade ElevenLabs → Amazon Polly → browser Web Speech; user preference
  via settings VOICE ENGINE (`prefTtsProvider`); not Nova-locked
- Demo CLI: `cd coach-station && uv run python -m coach_station.demo --demo all`
- Recordings CLI: `uv run python -m coach_station.recordings --since ...`
  fetches twin actuation recordings (per-joint telemetry) for the SmolVLA
  episode pipeline
- Versioned station feedback: `robot_state`, `trajectory_progress`, and
  `command_result` events correlate through `command_id`; trajectory progress
  is throttled to at most 10Hz and rendered accessibly in the twin peek;
  `trajectory_progress.measured_deg` (additive in v1) surfaces the observed
  elbow from `twin.joints.get_all()` when the adapter can read it, versus
  echoing only commanded waypoints (UI `·obs` suffix)
- Twin-visibility alerts (`COACH_TWIN_ALERTS=1`): aborted/rejected demos post
  to the Cyberwave dashboard alert feed via `twin.alerts.create`, not just
  station logs
- Station tests: `uv sync --extra dev && uv run pytest` (41 passing)
- Soft dry-run: `./scripts/cohort-dry-run.sh`

## What's next — required order

Do these in order. Polish items are **not** the gate.

| #     | Gate                      | Done when                                                                                                                                                     | Where                                                                    |
| ----- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **1** | **Manual stage**          | Browser + station: curls → form cue → arm moves (console or Cyberwave sim) + TTS + twin instrument / bay pulse. No wallet.                                    | [`coach-station/README.md`](../coach-station/README.md) cohort checklist |
| **2** | **Richer twin telemetry** | ✅ Shipped: peek silhouette is now a dial-driven instrument tracking commanded _and_ observed joint angles + persona-tinted SIM/LIVE badge, still fail-silent | Manual validation remains                                                |
| **3** | **Hardware bring-up**     | One curl demo trustworthy on metal (`demonstrate_strict_curl` first)                                                                                          | [`coach-station/LIVE.md`](../coach-station/LIVE.md)                      |

**Defer until #1–#3:** own Spline scene, Avalanche leaderboard contract, marketing landing, SmolVLA / episode flywheel (Milestone 3).

### Mentor feedback derived gates

These gates sit alongside the hardware gates above and are detailed in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). They can be worked in parallel with Milestone 1 and each other, but they should not delay the manual stage.

| #     | Gate                        | Done when                                                                                                                                 | Where                                 |
| ----- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **A** | **CV robustness**           | Pre-processing toggle (exposure / calibration) improves keypoint confidence on bad lighting by ≥10% with <5% mobile FPS regression        | `docs/IMPLEMENTATION_PLAN.md` Phase 1 |
| **B** | **Human → robot mapping**   | `FormEvent` carries human joint angles; station maps them to SO-101 waypoints; first LeRobot episode recorded from a coached curl session | `docs/IMPLEMENTATION_PLAN.md` Phase 2 |
| **C** | **Edge performance matrix** | MoveNet A/B matrix (input size / model variant / quantization) decides a new default mobile config with no Ring 0 e2e regression          | `docs/IMPLEMENTATION_PLAN.md` Phase 3 |

**Rule of thumb:** `A` and `B` can start as soon as the manual stage is solid; `C` waits until `A` is done so pre-processing and model/quantization effects are not conflated. All three are inputs to the SmolVLA milestone, not blockers for it.

### Milestone 1 — Sim choreography (software ✅ · stage gate open)

Goal: camera on, curls, arm moves in MuJoCo (or console [SIM]), voice narrates.
Software path is shipped; **cohort is not closed until manual stage passes.**

- [x] Wire `coach-station/` to FormEvent stream at `ws://localhost:8765`
      (client tap live; station server receives + dispatches primitives)
- [x] Fail-silent client behavior when no station is running
      (`coachStation.test.ts` + `e2e/coach-station.spec.ts`)
- [x] Three demonstration primitives against the MuJoCo twin
      (`cw.affect("simulation")` via CyberwaveArm + trajectory executor):
  - [x] `demonstrate_extension(target_deg)` — pull-up extension 150° → 155°
  - [x] `demonstrate_tempo()` — pace correction
  - [x] `mirror_asymmetry()` — L/R asymmetry >30°
  - plus cohort flagship `demonstrate_strict_curl` (curls + `elbow_swing`)
- [x] Per-persona motion profiles: SNEL slow-deliberate, STEDDIE
      smooth-centered, RASTA fast-energetic
- [x] Demo voice sync (station `demonstration` event + provider-agnostic TTS:
      ElevenLabs → Polly → browser; user preference in settings)
- [x] Software dry-run: `./scripts/cohort-dry-run.sh`
- [ ] **Manual stage (required next):** browser + optional Cyberwave twin —
      see `coach-station/README.md` cohort checklist. Telemetry is implemented;
      this gate still requires a real browser/session validation.

Demo without the browser: `cd coach-station && uv run python -m coach_station.demo --demo all`

### Milestone 2 — Hardware bring-up (SO-101 "Coach")

**Start only after Milestone 1 manual stage.** Runbook:
[`coach-station/LIVE.md`](../coach-station/LIVE.md).

- [ ] `cyberwave pair` on the edge machine
- [~] `affect("live")` behind dead-man — software gate shipped:
  `COACH_AFFECT=live` requires `COACH_LIVE_CONFIRM=1` else falls back to
  simulation (`resolve_affect`); physical dead-man still required
- [~] Workspace + motion clamps — `coach_station/safety.py`:
  elbow min/max, `COACH_MAX_SPEED_DEG_S`, `COACH_MAX_STEP_DEG` (live
  defaults tighter than sim); CyberwaveArm re-clamps every waypoint.
  True torque/current limits still open until SDK exposes them
- [x] One-primitive-at-a-time policy (server lock + demo cooldown already in
      `coach_station/server.py`)
- [ ] Validate sim → hardware transfer before compound motions (curl-first)

### Milestone 3 — Data flywheel (SmolVLA)

**Start only after hardware curl proof (Milestone 2).** Episodes come from
**coached human sessions** (form cue → demonstration), not from teleop-only
datasets as the product’s starting point.

- [ ] Every coached session records to Cyberwave in LeRobot-format episodes
      — fetch/inspect plumbing shipped via `coach_station/recordings.py`;
      capture still dashboard-driven per Cyberwave SDK (no programmatic
      start/stop API, verified against current docs)
- [ ] Built-in face anonymization on-device (privacy-first stays true)
- [ ] Episode slicing per exercise / per persona / per form-issue class
- [ ] SmolVLA fine-tuning experiment #1: extension-cue → arm motion
      end-to-end (small closed dataset, sim-only first)

### Milestone 4 — Coach station wedge

- [ ] Kiosk mode for a paired camera + arm at a gym
- [~] Per-station telemetry back to Cyberwave — fault alerts shipped behind
  `COACH_TWIN_ALERTS=1` (`coach_station/arm.py::publish_fault`,
  surfaced as twin alerts in the Cyberwave dashboard); broader twin-state
  mirroring deferred
- [ ] Persona selection for the station (matches app)

## What we're deliberately not doing

- **Robot-as-hero product.** The SO-101 teaches the human; it is not the
  day-0 experience. Teleop / pick-and-place / household-task demos are out of
  scope as the primary story — see NORTH_STAR “What we are (and are not).”
- **VLA before proof.** Learned policies (SmolVLA) come after scripted
  understand → show works on sim and hardware, and after coached sessions can
  become episodes. We do not ship a thin web shell around a teleop dataset.
- **Lower-body demonstrations on SO-101.** A desk arm can't credibly show
  squat depth or jump form. Flagship demos stay upper-body: curls (cohort),
  push-ups, and pull-ups. Engine still coaches those moves on-screen.
- **Gating training on-chain.** Ring 0 stays wallet-free. On-chain is an
  earned upgrade at value moments (PB, streak milestone, verified board).
- **Cross-platform identity aggregation.** The Memory Protocol integration
  (Phase 6) is descoped: upstream `memoryproto.co` returns
  `DEPLOYMENT_DISABLED`, our API key 500s, and the graceful-degradation path
  already covers what users actually see. The Farcaster + Neynar path we
  already own delivers the identity slice we need. If a cross-platform graph
  becomes a real requirement, we'll pick a live provider then.

## Success criteria

- **Cohort demo:** camera on, curls, robot moves in MuJoCo. No wallet
  popup on stage. Ring 0 e2e still passes.
- **Post-demo:** at least one paired hardware session recorded to Cyberwave
  in LeRobot format.
- **Post-post-demo:** SmolVLA fine-tune on real recorded episodes runs
  end-to-end in sim, even if quality is poor.

---

**Live app:** https://imperfectform.fun
**North star:** [NORTH_STAR.md](./NORTH_STAR.md)
**Station:** [`coach-station/`](../coach-station/) — see README for sim CLI,
Cyberwave twin, and pytest.
