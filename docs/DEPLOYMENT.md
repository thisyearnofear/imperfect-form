# Deployment Guide

## Smart Contract Addresses

> Source of truth: `src/config/contract-addresses.ts` and
> `src/config/networks.ts`. Addresses below are reconciled against code as of
> 2026-08-13.

### Mainnet Deployments

- **Base Mainnet**: `0x58DC4867f87473BF9874892dE8e62C48958c8d96`
- **Celo Mainnet**: `0xB0cbC7325EbC744CcB14211CA74C5a764928F273` (standard) /
  `0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03` (verified)
- **Polygon Mainnet**: `0x28FE19798fe0A0276CF474f2DCC3749313f1aC0A`
- **Monad Mainnet**: env-configured (`NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS`);
  chainId 143, RPC `https://rpc3.monad.xyz`

### Testnet Deployments

- **Celo Alfajores**: `0x18082d110113B40A24A41dF10b4b249Ee461D3eb`

## Self Protocol Deployment

Deploy Self Protocol contracts:

```sh
pnpm self:switch-mainnet
pnpm deploy:self
```

Verify deployment:

```sh
pnpm self:verify-config
pnpm self:health
```

## Application Deployment

### Vercel Deployment

1. Connect repository to Vercel
2. Set environment variables
3. Deploy from main branch

### Environment Variables

Required for production:

- `NEXT_PUBLIC_SELF_PROTOCOL_ADDRESS`
- `NEXT_PUBLIC_CHAIN_ID`
- Network-specific RPC URLs
- API keys for external services

Durable analytics (optional, free tier):

- `POSTHOG_API_KEY` — PostHog project key for the **write path** (event
  capture through the privacy allowlist in `src/lib/posthogSink.ts`). Unset
  means the durable sink stays disabled.
- `POSTHOG_PERSONAL_API_KEY` — PostHog personal key (`phx_...`) for the
  **read path**: the `/analytics` dashboard queries real aggregates via the
  PostHog Query API (HogQL). Unset means the dashboard reports "sink not
  configured" instead of serving aggregates.
- `ANALYTICS_API_KEY` — access code for the `/analytics` dashboard and the
  analytics API (also accepted as `Authorization: Bearer <key>`). Production
  without this value keeps analytics closed (default-deny); development stays
  open and labels its data as a local echo.
- `POSTHOG_HOST` — optional PostHog host override (defaults to the US cloud).
- `POSTHOG_PROJECT_ID` — optional; skips the one-time project lookup on the
  first query.
- `POSTHOG_DISABLED` — set `true` to force-disable the sink without removing
  the key.

## Network Configuration

### Chain Setup

Each network requires:

- Contract deployment
- Environment configuration
- Theme customization
- Testing verification

### Monitoring

- Contract event monitoring
- User verification tracking
- Performance metrics
- Error logging

## Security Considerations

### Smart Contracts

- Standard Solidity access control (see `UnifiedVerifiedFitnessLeaderboard.sol`
  in `artifacts/contracts/`)
- No proxy/upgradeable pattern — redeploy + re-verify for upgrades
- Multi-sig not implemented in contract; relies on deployer EOA

### Application

- Environment variable security
- API rate limiting
- User data protection
- Secure authentication flows
