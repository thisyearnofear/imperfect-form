# Self Protocol Integration

**Status**: ✅ Live on Celo Mainnet

Privacy-first human verification using real government passports and zero-knowledge proofs.

## Quick Facts

- **Network**: Celo Mainnet (`42220`)
- **Hub**: `0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF`
- **Verification**: Real passports only (age 13+)
- **Flow**: QR code (desktop) / deep link (mobile)
- **Benefit**: Verified badge on leaderboard

## Environment Setup

```bash
NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT=<contract_address>
NEXT_PUBLIC_SELF_SCOPE=<calculated_scope>
NEXT_PUBLIC_SELF_NETWORK=celo
NEXT_PUBLIC_SELF_CHAIN_ID=42220
```

## Usage

```tsx
import { VerificationIntegration } from '@/components/verification';

<VerificationIntegration
  userAddress="0x..."
  onVerificationSuccess={() => console.log('Verified!')}
/>;
```

## Configuration

All settings managed in `src/config/self-protocol.ts`:

- Network configuration
- Hub addresses
- Verification requirements
- Deployment settings

## Deployment

```bash
npm run deploy:self  # Deploy contract
npm run self:verify-config  # Validate setup
```

## Architecture

- **Frontend**: Modal-based verification UI
- **Backend**: `/api/self/verify` endpoint
- **Contract**: Extends `SelfVerificationRoot`
- **Verification**: Real-time passport validation

## Support

- Real government IDs required
- One-time verification per user
- Cross-device synchronization
- Automatic network switching
