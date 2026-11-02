# Niggleometer — an honest meter for a nagging body

_(Formerly Imperfect Form — see [NAMING.md](./docs/NAMING.md). Product:
**Niggleometer** · company/story layer: **Sandow** · exhibit: **The Sandow
Machine**, a cabinet-scale niggleometer.)_

Your niggle, measured. The camera reads how a nagging joint moves today —
on-device, private, every read labelled Clear / Usable / Early — and week
over week you watch whether it's actually changing. When the coach bay is
connected, an SO-101 robot arm physically demonstrates the fix. Many apps do
pose detection — almost none close the feedback loop with physical AI.

**Who it's for:** the person whose wrist / knee / trapezius nags — a problem,
not a doctor — or someone mid-rehabilitation who needs nudges and milestones
to finish the journey well. A chatbot can talk about your niggle; a
niggleometer measures it.

**Heritage:** Britain invented the AI form-check in 1897 — Eugen Sandow graded
photographs by post and sold a spring-grip dumbbell (Royal Warrant, King Edward
VII) as a mechanical form-corrector. We finished the loop with a robot. See
[The Cræft Prize](./docs/CRAFFT_PRIZE.md) and [North Star → Heritage](./docs/NORTH_STAR.md).

**Product posture:** Studio-first day-0 doorway (private camera coaching);
game-loop play is earned after the first coached feel; the robot exists to
**teach the human** — not as a stand-alone manipulation demo. See
[North Star](./docs/NORTH_STAR.md) (“What we are”).

⭐ **[North Star](./docs/NORTH_STAR.md)** — human-first coaching · SO-101 ("Coach") ·
pose → form events → physical demonstration · Cyberwave twin · SmolVLA flywheel
from real sessions.

**Movement Intelligence:** validated curl signals now produce a private Movement
Card, self-versus-self history, a local trajectory/next-unlock surface, and a
privacy-safe **Take the same test** challenge with a focused recipient route. A
repeatable curl test–retest protocol and local evidence harness are ready for
study; a fail-silent PostHog free-tier sink captures the full aggregate
assessment journey — share → open → start → complete → reply — for organic
baselines and incoming-challenge replies alike (free-tier key configured in
Vercel). Stronger trajectory claims, age-band comparisons, and cohorts remain
gated by real measurement quality, sample size, privacy review, and validated
durable analytics. See the [Movement Intelligence plan](./docs/MOVEMENT_INTELLIGENCE.md).

**✅ Self Protocol**: Live on Celo Mainnet - Real passport verification with zero-knowledge proofs.

## Features

- **AI Pose Detection**: Real-time rep counting and form analysis (MoveNet/TensorFlow.js, in-browser — no video leaves your device)
- **Physical AI Coach** _(simulation stage; live paused after servo incident)_: the SO-101 can demonstrate upper-body corrections via the [coach station](./coach-station/) when the Coach link is connected; camera coaching remains usable when offline
- **AI Coaching**: Multi-provider (Gemini / Groq / Venice / AWS Bedrock / local heuristics) with coach personas 🐌 SNEL · 🐢 STEDDIE · 🐙 RASTA
- **Exercises**: Push-ups, squats, curls, pull-ups, and jumps (engine-verified rep counting with per-rep form scoring)
- **Recovery**: Optional guided breathing cooldown and per-exercise stretches
- **Multi-Chain Support**: Base, Celo, Polygon, Monad, and Avalanche themes (leaderboards where contracts are live)
- **Human Verification**: Self Protocol integration for verified leaderboards
- **Social Integration**: ghost replays, quests and XP (Farcaster mini-app paused — see NAMING.md)
- **Movement Intelligence** _(local assessment + evidence slice shipped)_: repeatable curl assessment, private Movement Cards, self-versus-self history, local trajectory/next-unlock guidance, a wallet-free **Take the same test** route, and a test–retest evidence harness; population benchmarking remains gated
- **Mobile-First**: Responsive design optimized for mobile fitness tracking

## Live Demo

🌐 **[imperfectform.vercel.app](https://imperfectform.vercel.app)** - Private camera coaching with a path into physical AI _(home is moving to `niggleometer.*` — see [NAMING.md](./docs/NAMING.md))_

## Quick Start

```sh
pnpm install
pnpm dev
```

Visit `http://localhost:3000` to see the app running.

## Documentation

Project source is MIT where applicable; bundled third-party assets retain their own licenses (see [`public/atmosphere/NOTICE.md`](./public/atmosphere/NOTICE.md)).

- [Naming](./docs/NAMING.md) - Niggleometer decision, ICP shift, brand architecture
- [North Star](./docs/NORTH_STAR.md) - Differentiation, three rings, data flywheel, Sandow heritage
- [The Cræft Prize](./docs/CRAFFT_PRIZE.md) - Submission strategy: Sandow lineage + arcade cabinet exhibit
- [Roadmap](./docs/ROADMAP.md) - **Required next order** (manual stage → telemetry → hardware)
- [Movement Intelligence](./docs/MOVEMENT_INTELLIGENCE.md) - Movement Passport vision, distribution loop, guardrails, and implementation gates
- [First-visit + manual-stage protocol](./docs/FIRST_VISIT_AND_MANUAL_STAGE.md) - User clarity test, Coach-link states, and repeatable simulation evidence
- [Coach station checklist](./coach-station/README.md) - Cohort day stage steps
- [Architecture Overview](./docs/ARCHITECTURE.md) - PoseRuntime primary; station as subscriber
- [Development Guide](./docs/DEVELOPMENT.md) - Setup, testing, and security
- [Deployment Guide](./docs/DEPLOYMENT.md) - Smart contracts and network configuration
