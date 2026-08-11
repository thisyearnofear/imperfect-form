# Deployment Guide

## Smart Contract Addresses

### Mainnet Deployments

- **Base Mainnet**: `0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B`
- **Celo Mainnet**: `0xB0cbC7325EbC744CcB14211CA74C5a764928F273`
- **Polygon Mainnet**: `0xc783d6E12560dc251F5067A62426A5f3b45b6888`

### Testnet Deployments

- **Celo Alfajores**: `0x18082d110113B40A24A41dF10b4b249Ee461D3eb`
- **Monad Testnet**: `0x653d41Fba630381aA44d8598a4b35Ce257924d65`

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

- `POSTHOG_API_KEY` — PostHog project key for the aggregate assessment funnel.
  Unset means the durable sink stays disabled and the in-memory tracker remains
  the only store.
- `POSTHOG_HOST` — optional PostHog host override (defaults to the US cloud).
- `POSTHOG_DISABLED` — set `true` to force-disable the sink without removing
  the key.
- `POSTHOG_PERSONAL_API_KEY` — optional PostHog personal key (`phx_...`) used
  only for read/verification API queries; the app itself never needs it.

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

- Multi-signature wallet integration
- Upgrade mechanisms
- Access control patterns

### Application

- Environment variable security
- API rate limiting
- User data protection
- Secure authentication flows
