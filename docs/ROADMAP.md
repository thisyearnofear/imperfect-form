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
- Exercise engine: push-ups, squats, pull-ups, jumps, bicep curls
- AI coaching (Gemini / Groq / Venice / AWS Bedrock / local) with three personas
- Guest identity — PBs, XP, streaks, ghosts with no sign-in
- Recovery register, staged post-workout flow
- Ring 0 e2e guards (`ring0.spec.ts`, `ring0-camera.spec.ts`, `pose-runtime.spec.ts`)
- Tailwind v4 migration, Day-0 foyer, session intent → register
- Studio bay atmosphere with SO-101 cut-outs, gaze parallax, chain ambient
- Avalanche theme token, lightweight 3D SO-101 gaze
- Live twin peek, coach-link clarity, first-visit protocol, reactive Coach Bay
- Demo moment sync, one-screen doorway (no boot gate)

**Shipped (Ring 1/2 — earned upgrades):**

- Multi-chain leaderboards (Base, Celo, Polygon, Monad)
- Self Protocol verified leaderboard on Celo mainnet
- Farcaster mini-app + Farcaster / Twitter sharing
- AI Highlight Card at the celebrate moment
- Ghost challenges (URL-safe trace compression)

**In progress (the gate):**

- Manual stage — browser + station end-to-end (see “What's next” below)

**Shipped (Movement Intelligence local foundation):** versioned curl assessment,
local Movement Card, Movement History, local persistence with verification.
Full details: [`MOVEMENT_INTELLIGENCE.md`](./MOVEMENT_INTELLIGENCE.md).

**Shipped (Movement Intelligence — first distribution slice):** aggregate-only
challenges, `/challenge` recipient route, Web Share + clipboard, five-event funnel.

**Planned (Movement Intelligence — after measurement gates):** setup calibration,
cross-device test–retest, durable funnel analytics, age-band/cohort benchmarks,
archetypes.

The full sequence, guardrails, data boundaries, and success metrics live in
[`MOVEMENT_INTELLIGENCE.md`](./MOVEMENT_INTELLIGENCE.md). This is a product
extension around the camera → understand → show loop; it does not reorder the
manual-stage → hardware → episode gates for the physical Coach.

**Shipped (mobile performance guardrail):** adaptive camera quality tiers
(640×480 → 480×360 → 320×240) with hysteresis and Safari fail-silent.
See [PERFORMANCE_BASELINE.md](./PERFORMANCE_BASELINE.md).

**Shipped (curl evidence surface):** live `CurlFormInstrument` shows elbow angle,
target range, curl phase, drift. Active-arm selection prevents alternating-curl
averaging. See ARCHITECTURE.md.

**Shipped (Milestone 1 — sim choreography software):** WebSocket bridge,
FormEvent → demonstration primitives, per-persona motion profiles, interpolated
trajectories, CyberwaveArm/ConsoleArm adapters, demo voice sync, twin-visibility
alerts, deterministic curl mapping, 45 passing station tests.
See [`coach-station/`](../coach-station/).

## What's next — required order

Do these in order. Polish items are **not** the gate. Movement Intelligence
protocol work can begin as a measurement-quality track after Ring 0 is stable,
but age-band comparisons, cohort rankings, and trajectory claims remain gated by
[`MOVEMENT_INTELLIGENCE.md`](./MOVEMENT_INTELLIGENCE.md) M0–M4 evidence.

| #     | Gate                      | Done when                                                                                                                                                                                                                                                  | Where                                                                    |
| ----- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **1** | **Manual stage**          | Browser + station: curls → form cue → arm moves (console or Cyberwave sim) + TTS + twin instrument / bay pulse. No wallet.                                                                                                                                 | [`coach-station/README.md`](../coach-station/README.md) cohort checklist |
| **2** | **Richer twin telemetry** | ✅ Shipped: peek silhouette is now a dial-driven instrument tracking commanded _and_ observed joint angles + persona-tinted SIM/LIVE badge, still fail-silent                                                                                              | Manual validation remains                                                |
| **3** | **Hardware bring-up**     | One curl demo trustworthy on metal (`demonstrate_strict_curl` first) — **paused after 2026-08-13 servo stall incident** (full-range calibration → hard-stop stall → smoke; elbow_flex servo needs replacement + bounded re-calibration first, see LIVE.md) | [`coach-station/LIVE.md`](../coach-station/LIVE.md)                      |

**Defer until #1–#3:** own Spline scene, Avalanche leaderboard contract, marketing landing, SmolVLA / episode flywheel (Milestone 3).

### Arm Create: AI Optimization Challenge — conditional GO (assessment only)

We assessed the Devpost **Arm Create: AI Optimization Challenge** against this
project and the SO-101 path (full write-up:
[`ARM_AI_CHALLENGE.md`](./ARM_AI_CHALLENGE.md)). Verdict: a credible
**Track 1 — Physical AI** candidate, **not submission-ready yet** — the missing
layer is Arm-targeted optimization evidence (benchmarked Arm64 compute host +
before/after result). The Arm requirement applies to the AI/control compute
workload, not necessarily the servo electronics; an Arm64 host (this Apple
Silicon Mac included) can carry it. **No challenge-specific feature work is
started** until the hardware feasibility gates pass (arm visible → calibrated
→ `cyberwave pair` → one live curl with `·obs` encoder telemetry → Arm64
benchmark). If any gate fails, we stay focused on the existing product and
evidence opportunities.

### Mentor feedback derived gates

These gates sit alongside the hardware gates above and are detailed in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). They can be worked in parallel with Milestone 1 and each other, but they should not delay the manual stage.

| #     | Gate                        | Done when                                                                                                                                                                          | Where                                 |
| ----- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **A** | **CV robustness**           | Pre-processing toggle (exposure / calibration) improves keypoint confidence on bad lighting by ≥10% with <5% mobile FPS regression                                                 | `docs/IMPLEMENTATION_PLAN.md` Phase 1 |
| **B** | **Human → robot mapping**   | ✅ Deterministic curl angle mapping + safety-clamped SO-101 waypoints shipped; first LeRobot episode still needs recording from a coached curl session                             | `docs/IMPLEMENTATION_PLAN.md` Phase 2 |
| **C** | **Edge performance matrix** | Adaptive mobile camera guardrail shipped; MoveNet A/B matrix (input size / model variant / quantization) still needs to decide the validated default with no Ring 0 e2e regression | `docs/IMPLEMENTATION_PLAN.md` Phase 3 |

**Rule of thumb:** `A` and `B` can start as soon as the manual stage is solid; `C` waits until `A` is done so pre-processing and model/quantization effects are not conflated. All three are inputs to the SmolVLA milestone, not blockers for it.

### Milestone 1 — Sim choreography (software ✅ · stage gate open)

Software shipped: WebSocket bridge, four demonstration primitives, per-persona
profiles, demo voice sync, deterministic curl mapping. **Cohort not closed until
manual stage passes.** Dry-run: `./scripts/cohort-dry-run.sh`

### Milestone 2 — Hardware bring-up (SO-101 "Coach")

**Start only after Milestone 1 manual stage.** Runbook:
[`coach-station/LIVE.md`](../coach-station/LIVE.md).
Paused after 2026-08-13 servo stall incident — elbow_flex servo needs
replacement + bounded re-calibration.

- [ ] `cyberwave pair` on the edge machine
- [~] `affect("live")` behind dead-man (software gate shipped)
- [~] Workspace + motion clamps (shipped; true torque limits open until SDK)
- [x] One-primitive-at-a-time policy
- [ ] Validate sim → hardware transfer (curl-first)

### Milestone 3 — Data flywheel (SmolVLA)

**Start only after hardware curl proof.** Episodes from coached human sessions,
not teleop-only datasets.

- [ ] LeRobot-format episode recording from coached sessions
- [ ] Face anonymization, episode slicing, SmolVLA experiment #1

### Milestone 4 — Coach station wedge

- [ ] Kiosk mode for paired camera + arm at a gym
- [~] Per-station telemetry (fault alerts shipped)
- [ ] Persona selection for the station

### Milestone 5 — Movement Intelligence

M0–M3 may run as a parallel product track once Ring 0 is stable; M4–M5 remain
gated by validated population data and privacy review.
See [`MOVEMENT_INTELLIGENCE.md`](./MOVEMENT_INTELLIGENCE.md) for the detailed plan.

- [x] M0/M1/M3 local foundation shipped (curl protocol, card, history, trajectory)
- [x] M2 foundation shipped (challenge route, five-event funnel)
- [ ] M0 completion: setup calibration + cross-device test–retest evidence
- [ ] M2 completion: funnel experiments + distribution
- [ ] M3 completion: cross-device evidence + trajectory experiments
- [ ] M4: age-band / opt-in cohort benchmarks (after privacy review)
- [ ] M5: historical / fictional archetypes

**First-slice success:** accepted assessment challenges per activated user,
plus a second valid assessment within 7–14 days.

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
- **Premature Movement Intelligence comparison.** We do not ship body age,
  biological age, a universal stiffness/flexibility leaderboard, or guaranteed
  trajectory outcomes before protocol quality, sample size, and privacy gates
  pass. Self-versus-self progress and challenge flows come first.
- **Cross-platform identity aggregation.** The Memory Protocol integration
  (Phase 6) is descoped: upstream `memoryproto.co` returns
  `DEPLOYMENT_DISABLED`, our API key 500s, and the graceful-degradation path
  already covers what users actually see. Farcaster / Neynar remain an optional
  mini-app path, not a day-0 identity requirement. If a cross-platform graph
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
**First-visit + manual-stage protocol:** [`FIRST_VISIT_AND_MANUAL_STAGE.md`](./FIRST_VISIT_AND_MANUAL_STAGE.md)
**Station:** [`coach-station/`](../coach-station/) — see README for sim CLI,
Cyberwave twin, and pytest.
