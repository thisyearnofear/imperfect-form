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
- Ring 0 e2e guard (`e2e/ring0.spec.ts`) — 4/4 passing ✅:
  - START is enabled for a guest with no wallet
  - first START shows the camera primer before any permission prompt
  - primer "not now" backs out without starting
  - returning guest (primer seen) starts directly
- Tailwind v4 (`@tailwindcss/postcss`) — migrated `globals.css` to
  `@import "tailwindcss"` + `@config` compat; fixed design-token spacing
  collision that was silently breaking `max-w-sm`, `max-w-md`, and other
  named-scale utilities; Google Fonts moved to `<link>` in `layout.tsx`
- Day-0 foyer / onboarding pass — brand-first pre-start (`PreStartFoyer`),
  positioning-aligned onboarding (`brandPositioning.ts`), game-loop chrome
  demoted until first XP; see company posture in NORTH_STAR

**Next (product surface, after this lands):** evaluate whether a dedicated
marketing/landing route is still needed, or whether the app foyer + refined
onboarding is enough for web acquisition. Prefer deepening the in-app first
10 seconds over spinning a separate site until data says otherwise.

**Shipped (Ring 1/2 — earned upgrades):**

- Multi-chain leaderboards (Base, Celo, Polygon, Monad)
- Self Protocol verified leaderboard on Celo mainnet
- Farcaster mini-app + Farcaster / Twitter sharing
- AI Highlight Card at the celebrate moment
- Ghost challenges (URL-safe trace compression)

**Scaffolded, not yet live:**

- `coach-station/` — Python websocket bridge from browser FormEvents to a
  local station (see NORTH_STAR § Architecture)
- Browser bridge (`src/services/coachStation.ts`) — FormEvent + session
  start/end, fail-silent when `NEXT_PUBLIC_COACH_STATION` is unset or the
  socket is down; engine `formCheckSpeak` (e.g. `elbow_swing` on curls)
  now streams through the pose loop

## What's next

### Milestone 1 — Sim choreography (this milestone is the demo)

Goal: on the cohort day, camera on, curls, arm moves in MuJoCo.

- [x] Wire `coach-station/` to FormEvent stream at `ws://localhost:8765`
      (client tap live; station server receives + dispatches primitives)
- [x] Fail-silent client behavior when no station is running
      (`coachStation.test.ts` + `e2e/coach-station.spec.ts`)
- [ ] Three demonstration primitives against the MuJoCo twin
      (`cw.affect("simulation")`):
  - [ ] `demonstrate_extension(target_deg)` — pull-up extension 150° → 155°
  - [ ] `demonstrate_tempo()` — pace correction
  - [ ] `mirror_asymmetry()` — L/R asymmetry >30°
- [ ] Per-persona motion profiles: SNEL slow-deliberate, STEDDIE
      smooth-centered, RASTA fast-energetic
- [ ] Nova 2 voice track synced to the primitive being demonstrated

### Milestone 2 — Hardware bring-up (SO-101 "Coach")

- [ ] `cyberwave pair` on the edge machine
- [ ] `affect("live")` behind a physical dead-man switch
- [ ] Workspace limits (joint range, torque, reach clamps)
- [ ] One-primitive-at-a-time policy (no compound motions until sim →
      hardware transfer is validated)

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
  squat depth or jump form. The flagship demos stay upper-body: push-ups and
  pull-ups.

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
**Station scaffold:** [`coach-station/`](../coach-station/)
