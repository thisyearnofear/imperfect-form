# Self Protocol Integration Setup

## 📦 Package Installation

Add these dependencies to your `next/package.json`:

```bash
cd next
npm install @selfxyz/qrcode @selfxyz/core @selfxyz/contracts ethers
```

## 🔧 Environment Variables

Add to your `.env.local`:

```env
# Self Protocol Configuration
NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT=0x18082d110113B40A24A41dF10b4b249Ee461D3eb # Deployed on Celo Alfajores
NEXT_PUBLIC_SELF_SCOPE=imperfect-form-fitness
NEXT_PUBLIC_SELF_HUB_TESTNET=0x68c931C9a534D37aa78094877F46fE46a49F1A51
NEXT_PUBLIC_SELF_HUB_MAINNET=0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF
```

## 🚀 Deployment Steps

### 1. Deploy Contract to Celo Testnet

```bash
# Install Hardhat/Foundry for deployment
npm install --save-dev hardhat @nomiclabs/hardhat-ethers

# Deploy script:
npx hardhat run scripts/deploy-verified-fitness.js --network celoAlfajores
```

### Deployed Contract Details
- **Network**: Celo Alfajores Testnet
- **VerifiedFitnessContract**: `0xc51065eCBe91E7DbA69934F37130DCA29E516189`
- **VerifiedFitnessLeaderboard**: `0x18082d110113B40A24A41dF10b4b249Ee461D3eb`
- **Block Explorer**: [View on Celoscan](https://alfajores.celoscan.io/address/0x18082d110113B40A24A41dF10b4b249Ee461D3eb)
- **Deployed**: July 22, 2025
- **Configuration**: 10% verification bonus, 60s cooldown, max 100 score per submission

### 2. Contract Deployment Parameters

```javascript
// Deploy with these parameters:
const identityVerificationHub = "0x68c931C9a534D37aa78094877F46fE46a49F1A51"; // Celo testnet
const scope = ethers.encodeBytes32String("imperfect-form-fitness");
const configId = ethers.encodeBytes32String("fitness-config-v1");

const contract = await VerifiedFitnessLeaderboard.deploy(
  identityVerificationHub,
  scope,
  configId
);
```

## 🔗 Integration Points

### 1. Add to Submission Flow

In `SubmitScoreWithWagmi.tsx`, after successful score submission:

```tsx
import { VerificationIntegration } from '@/components/verification';

// After successful score submission
{submissionStatus === 'success' && (
  <VerificationIntegration
    onVerificationComplete={() => {
      // Refresh leaderboard or update UI
      console.log("User verified!");
    }}
  />
)}
```

### 2. Add Badges to Leaderboard

In `Leaderboard.tsx`:

```tsx
import { VerificationBadge } from '@/components/verification';

// In leaderboard entry display
<div className="flex items-center space-x-2">
  <span>{displayName || shortenAddress(entry.user)}</span>
  <VerificationBadge isVerified={entry.isVerified} size="sm" />
</div>
```

## 📱 Mobile Deep Link Strategy

The verification modal automatically detects mobile and shows:

- **Mobile**: Direct "Open Self App" button (deep link)
- **Desktop**: QR code for cross-device scanning
- **Fallback**: Both options available

## 🧪 Testing Flow

1. **Deploy contract** to Celo testnet
2. **Update environment** variables with contract address
3. **Test verification** with Self app (testnet uses mock passports)
4. **Verify badges** appear in leaderboard
5. **Test mobile** deep links work properly

## 🔄 User Journey

1. User completes workout → Score submitted to existing contracts
2. Success screen shows → "Get Verified" prompt appears
3. User taps "Verify Now" → Modal opens with QR/deep link
4. User scans/taps → Self app opens for verification
5. Verification completes → Contract marks user as verified
6. Future scores → Automatically show verified badge

## 🎯 Key Benefits

- ✅ **No backend required** - Pure on-chain verification
- ✅ **Mobile-first UX** - Deep links for seamless experience  
- ✅ **Privacy-preserving** - Only age verification (16+)
- ✅ **One-time setup** - Verification persists forever
- ✅ **Integrates cleanly** - Works with existing architecture

## 🚨 Important Notes

- Contract scope must match frontend configuration exactly
- Age requirement (16+) is hardcoded in contract
- Testnet uses mock passports, mainnet uses real documents
- Verification is permanent and cross-session
- Deep links work best on mobile devices with Self app installed