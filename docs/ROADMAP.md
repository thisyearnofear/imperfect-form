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
  (fail-silent status + silhouette curl on demos; Cyberwave/MuJoCo stay on the
  station machine — no browser embed)
- **Demo moment sync** — form cues / `demonstration` set `body[data-coach-pulse]`
  so bay arc + glow pulse; earned shell gets a fallback bloom
- **Weisdevice-lite entry** — studio boot “Enter the bay / Enter quietly” sound
  consent (auto-skip for automation / reduced-motion / returning session)

**Next beats:**

1. **Optional Spline upgrade** — only if we author/host our own scene with
   clear rights; keep cut-out CSS 3D as fallback.
2. **Richer twin telemetry** — optional joint-angle stream from station → peek
   (still fail-silent).

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
