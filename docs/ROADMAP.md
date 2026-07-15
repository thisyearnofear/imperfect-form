# Roadmap: Physical AI Coaching

> The north star (see [NORTH_STAR.md](./NORTH_STAR.md)): AI watches you
> exercise, understands your form, and a robot arm physically demonstrates the
> correction. Everything on this roadmap serves that loop.

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
- Ring 0 e2e guard (`e2e/ring0.spec.ts`) — 7/7 passing ✅:
  - START is enabled for a guest with no wallet
  - first START shows the camera primer before any permission prompt
  - primer "not now" backs out without starting
  - returning guest (primer seen) starts directly
  - day-0 foyer sells form understanding (default Train / Arcade)
  - intent chooser commits register (Train / Coach / Breathe) without gating START
  - Breathe intent opens calm session without camera primer
- Tailwind v4 (`@tailwindcss/postcss`) — migrated `globals.css` to
  `@import "tailwindcss"` + `@config` compat; fixed design-token spacing
  collision that was silently breaking `max-w-sm`, `max-w-md`, and other
  named-scale utilities; Google Fonts moved to `<link>` in `layout.tsx`
- Day-0 foyer / onboarding pass — brand-first pre-start (`PreStartFoyer`),
  positioning-aligned onboarding (`brandPositioning.ts`), game-loop chrome
  demoted until first XP; see company posture in NORTH_STAR
- Session intent → register (Train / Coach / Breathe) — single source of truth
  in `brandPositioning.ts`, persisted `imf_sessionIntent`, foyer chooser +
  `#screen` / `#game-container[data-register]`; default Train/Arcade keeps Ring 0
  ungated. Control chrome, mid-workout studio HUD / coach tray, and Calm entry
  (camera-free breathe + stretch via `RecoveryCard` panel + light-tone sequences);
  summary stages open on the intent’s home tab (Coach→Analyze, Breathe→Recover).
  Marketing landing deferred until acquisition needs category copy outside the cabinet.

**Next (product surface):** Dedicated marketing/landing route only if foyer
doorways fail web acquisition.

**Shipped (Ring 1/2 — earned upgrades):**

- Multi-chain leaderboards (Base, Celo, Polygon, Monad)
- Self Protocol verified leaderboard on Celo mainnet
- Farcaster mini-app + Farcaster / Twitter sharing
- AI Highlight Card at the celebrate moment
- Ghost challenges (URL-safe trace compression)

**Scaffolded / in progress:**

- _(none — Milestone 1 voice sync shipped)_

**Shipped (Milestone 1 — sim choreography):**

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
- Station tests: `uv sync --extra dev && uv run pytest` (21 passing)
- Soft dry-run: `./scripts/cohort-dry-run.sh`

## What's next

### Milestone 1 — Sim choreography ✅ (cohort-ready)

Goal: camera on, curls, arm moves in MuJoCo (or console [SIM]), voice narrates.

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
- [ ] Manual stage: browser + optional Cyberwave twin (see
      `coach-station/README.md` cohort checklist)

Demo without the browser: `cd coach-station && uv run python -m coach_station.demo --demo all`

### Milestone 2 — Hardware bring-up (SO-101 "Coach")

Runbook: [`coach-station/LIVE.md`](../coach-station/LIVE.md).

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

- [ ] Every coached session records to Cyberwave in LeRobot-format episodes
- [ ] Built-in face anonymization on-device (privacy-first stays true)
- [ ] Episode slicing per exercise / per persona / per form-issue class
- [ ] SmolVLA fine-tuning experiment #1: extension-cue → arm motion
      end-to-end (small closed dataset, sim-only first)

### Milestone 4 — Coach station wedge

- [ ] Kiosk mode for a paired camera + arm at a gym
- [ ] Per-station telemetry back to Cyberwave
- [ ] Persona selection for the station (matches app)

## What we're deliberately not doing

- **Cross-platform identity aggregation.** The Memory Protocol integration
  (Phase 6) is descoped: upstream `memoryproto.co` returns
  `DEPLOYMENT_DISABLED`, our API key 500s, and the graceful-degradation path
  already covers what users actually see. The Farcaster + Neynar path we
  already own delivers the identity slice we need. If a cross-platform graph
  becomes a real requirement, we'll pick a live provider then.
- **Gating training on-chain.** Ring 0 stays wallet-free. On-chain is an
  earned upgrade at value moments (PB, streak milestone, verified board).
- **Lower-body demonstrations on SO-101.** A desk arm can't credibly show
  squat depth or jump form. The flagship demos stay upper-body: curls
  (cohort), push-ups, and pull-ups.

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
