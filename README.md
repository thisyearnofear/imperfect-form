# Imperfect Form - Physical AI Fitness Coaching

AI watches you exercise, understands your form, and a robot arm physically
demonstrates the correction. Many apps do pose detection — almost none close
the feedback loop with physical AI.

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
Card, self-versus-self history, and a privacy-safe **Take the same test** challenge
with a focused recipient route. Trajectories, age-band comparisons, and cohorts
remain gated by measurement quality, sample size, privacy review, and durable
production analytics. See the [Movement Intelligence plan](./docs/MOVEMENT_INTELLIGENCE.md).

**✅ Self Protocol**: Live on Celo Mainnet - Real passport verification with zero-knowledge proofs.

## Features

- **AI Pose Detection**: Real-time rep counting and form analysis (MoveNet/TensorFlow.js, in-browser — no video leaves your device)
- **Physical AI Coach** _(simulation stage)_: the SO-101 can demonstrate upper-body corrections via the [coach station](./coach-station/) when the Coach link is connected; camera coaching remains usable when offline
- **AI Coaching**: Multi-provider (Gemini / Venice / AWS Bedrock Nova 2) with coach personas 🐌 SNEL · 🐢 STEDDIE · 🐙 RASTA
- **Exercises**: Push-ups, squats, curls, pull-ups, and jumps (engine-verified rep counting with per-rep form scoring)
- **Recovery**: Optional guided breathing cooldown and per-exercise stretches
- **Multi-Chain Support**: Base, Celo, Polygon, Monad, and Avalanche themes (leaderboards where contracts are live)
- **Human Verification**: Self Protocol integration for verified leaderboards
- **Social Integration**: Farcaster mini-app, ghost replays, quests and XP
- **Movement Intelligence** _(local challenge slice shipped)_: repeatable curl assessment, private Movement Cards, self-versus-self history, and a wallet-free **Take the same test** route; trajectories and population benchmarking remain planned
- **Mobile-First**: Responsive design optimized for mobile fitness tracking

## Live Demo

🌐 **[imperfectform.fun](https://imperfectform.fun)** - Private camera coaching with a path into physical AI

## Quick Start

```sh
pnpm install
pnpm dev
```

Visit `http://localhost:3000` to see the app running.

## Documentation

Project source is MIT where applicable; bundled third-party assets retain their own licenses (see [`public/atmosphere/NOTICE.md`](./public/atmosphere/NOTICE.md)).

- [North Star](./docs/NORTH_STAR.md) - Differentiation, three rings, data flywheel, Sandow heritage
- [The Cræft Prize](./docs/CRAFFT_PRIZE.md) - Submission strategy: Sandow lineage + arcade cabinet exhibit
- [Roadmap](./docs/ROADMAP.md) - **Required next order** (manual stage → telemetry → hardware)
- [Movement Intelligence](./docs/MOVEMENT_INTELLIGENCE.md) - Movement Passport vision, distribution loop, guardrails, and implementation gates
- [First-visit + manual-stage protocol](./docs/FIRST_VISIT_AND_MANUAL_STAGE.md) - User clarity test, Coach-link states, and repeatable simulation evidence
- [Coach station checklist](./coach-station/README.md) - Cohort day stage steps
- [Architecture Overview](./docs/ARCHITECTURE.md) - PoseRuntime primary; station as subscriber
- [Development Guide](./docs/DEVELOPMENT.md) - Setup, testing, and security
- [Deployment Guide](./docs/DEPLOYMENT.md) - Smart contracts and network configuration
