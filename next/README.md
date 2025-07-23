# Imperfect Form - Fitness App

A Next.js fitness tracking application with blockchain integration and human verification.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Self Protocol Integration

**Human Verification**: Integrated with Self Protocol for privacy-first human verification using zero-knowledge proofs.

- **Status**: Live on Celo Alfajores testnet
- **Contract**: `0xc51065eCBe91E7DbA69934F37130DCA29E516189`
- **Trigger**: Automatic prompt after successful score submission
- **UX**: Smart network switching from Celo Mainnet to Alfajores for verification
- **Benefits**: Verified badge on leaderboard, one-time setup, privacy-preserving (age 16+ only)
- **Flow**: QR code (desktop) / deep link (mobile) to Self app verification to on-chain verification status

## Features

- Multi-chain fitness tracking (Polygon, Base, Celo, Monad)
- Real-time pose detection using MediaPipe
- Blockchain-based leaderboards
- Farcaster integration and sharing
- Human verification with Self Protocol
- Mobile-optimized experience

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Blockchain**: Ethers v6, Wagmi v2, Viem
- **Verification**: Self Protocol (zero-knowledge proofs)
- **Pose Detection**: MediaPipe, TensorFlow.js
- **Styling**: Tailwind CSS
- **Social**: Farcaster integration

## Deployment

The app is deployed on Vercel. Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.