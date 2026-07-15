# Imperfect Form - Physical AI Fitness Coaching

AI watches you exercise, understands your form, and a robot arm physically
demonstrates the correction. Many apps do pose detection — almost none close
the feedback loop with physical AI.

⭐ **[North Star](./docs/NORTH_STAR.md)** — Cyberwave builders cohort · SO-101 arm ("Coach") · pose detection → joint-angle analysis → physical demonstration → SmolVLA data flywheel.

**✅ Self Protocol**: Live on Celo Mainnet - Real passport verification with zero-knowledge proofs.

## Features

- **AI Pose Detection**: Real-time rep counting and form analysis (MoveNet/TensorFlow.js, in-browser — no video leaves your device)
- **Physical AI Coach** _(in development)_: SO-101 robot arm demonstrates correct joint angles via the [coach station](./coach-station/)
- **AI Coaching**: Multi-provider (Gemini / Venice / AWS Bedrock Nova 2) with coach personas 🐌 SNEL · 🐢 STEDDIE · 🐙 RASTA
- **Exercises**: Push-ups, squats, pull-ups, and jumps (engine-verified rep counting with per-rep form scoring)
- **Recovery**: Optional guided breathing cooldown and per-exercise stretches
- **Multi-Chain Support**: Base, Celo, Polygon, and Monad leaderboards
- **Human Verification**: Self Protocol integration for verified leaderboards
- **Social Integration**: Farcaster mini-app, ghost replays, quests and XP
- **Mobile-First**: Responsive design optimized for mobile fitness tracking

## Live Demo

🌐 **[imperfectform.fun](https://imperfectform.fun)** - Try the AI fitness tracker with blockchain verification

## Quick Start

```sh
pnpm install
pnpm dev
```

Visit `http://localhost:3000` to see the app running.

## Documentation

- [Development Guide](./docs/DEVELOPMENT.md) - Setup, testing, and security
- [Architecture Overview](./docs/ARCHITECTURE.md) - Self Protocol, theming, and cross-chain UX
- [Deployment Guide](./docs/DEPLOYMENT.md) - Smart contracts and network configuration
- [Memory Integration Roadmap](./docs/ROADMAP.md) - Memory API implementation plan
