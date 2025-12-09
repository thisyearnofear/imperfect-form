# Phase 6 Research: Memory Protocol & Farcaster Mini Apps (December 2025)

## Executive Summary

This research covers two critical platforms for Phase 6 integration:

1. **Memory Protocol** - Cross-platform identity graphs & data monetization
2. **Farcaster Mini Apps** - New mini app standard (December 2025) with wallet-first pivot

**Key Finding**: Farcaster has pivoted from social-first to wallet-first strategy. This changes how we should approach integration.

---

## 1. Memory Protocol Overview

### What is Memory Protocol?

A protocol that connects user identities and data across platforms, enabling:

- **Unified Identity Graphs** - Single query resolves all user identities (Web2/Web3)
- **Data Monetization** - Users earn $MEM tokens by sharing data
- **Cross-Platform Discovery** - Seamless identity verification across social platforms

### Core Capabilities

#### Identity Graph Resolution

Users can be queried by:

- Wallet address (0x...)
- ENS/Basename (_.eth, _.base.eth)
- Farcaster username/FID
- Twitter/X username
- GitHub, Lens, Zora profiles

**API Response Structure**:

```typescript
interface IdentityNode {
  id: string;
  platform: 'ethereum' | 'farcaster' | 'twitter' | 'github' | 'lens' | 'ens' | 'basenames';
  username?: string;
  avatar?: string;
  url?: string;
  social?: {
    followers: number;
    following: number;
    verified?: boolean;
  };
  sources: Array<{
    id: string;
    platform: string;
    verified: boolean;
  }>;
}
```

#### Data Monetization

- **Public data** (Twitter/Farcaster follows) - Auto-indexed, users earn passively
- **Private data** - Users explicitly upload & earn from queries
- **Structured data** - User fitness data, workout history, performance metrics
- **Unstructured data** - Raw data with custom schemas

#### Current Status

- ✅ Live and operational (December 2025)
- ✅ Supports 9+ platform integrations
- ✅ Identity graph lookup working
- ✅ Data upload pipeline available
- 🔄 Data curation/quality scoring in development

### Integration Points for Imperfect Form

1. **Leaderboard Enhancement**
   - Resolve all identities for leaderboard users
   - Show cross-platform follower counts
   - Display verified status across platforms

2. **User Profiles**
   - Unified identity display (Farcaster, Twitter, ENS)
   - Cross-platform follower counts
   - Social proof badges

3. **Data Monetization**
   - Users can upload fitness datasets
   - Earn $MEM from leaderboard/workout queries
   - High-quality data = higher rewards

4. **Social Challenges**
   - Query user's social followers (Farcaster/Twitter)
   - Create challenges with cross-platform friends
   - Verify participants via identity graphs

---

## 2. Farcaster Mini Apps Standard (December 2025)

### What Changed in December 2025?

**Strategic Pivot**: Farcaster shifted from "social-first" to **"wallet-first"** strategy.

**Key Statement from Dan Romero** (Farcaster Co-founder):

> "We tried social-first for 4.5 years... It didn't work for us. Wallet has been growing so we're doubling down on that direction."

### Why This Matters for Us

- Farcaster's primary growth vector is now **financial/wallet features**
- Social features are layered _on top_ of the wallet
- Integration should prioritize **wallet functionality** + social engagement
- "Come for the wallet, stay for the network"

### Mini Apps Specification

#### 1. Discovery & Entry

**Mini App Embed Meta Tags**:

```html
<meta name="fc:miniapp" content="{stringified JSON}" />
<!-- Backward compatibility -->
<meta name="fc:frame" content="{stringified JSON}" />
```

**Embed Schema**:

```typescript
{
  version: "1",
  imageUrl: "https://...",  // 3:2 aspect ratio
  button: {
    title: "Open App",        // Max 32 chars
    action: {
      type: "launch_frame",   // or "view_token"
      name: "Imperfect Form",
      url: "https://app.com",
      splashImageUrl: "https://...", // 200x200px
      splashBackgroundColor: "#fcb131"
    }
  }
}
```

#### 2. Mini App Manifest

Published at `/.well-known/farcaster.json`

**Required**:

```typescript
{
  accountAssociation: {
    header: "base64_encoded_jfs_header",
    payload: "base64_encoded_payload",
    signature: "base64_encoded_signature"
  },
  miniapp: {
    name: "Imperfect Form",
    homeUrl: "https://app.com",
    iconUrl: "https://...",
    primaryCategory: "health-fitness",
    description: "AI fitness tracking with blockchain rewards",
    screenshotUrls: [ /* max 3 screenshots */ ],
    tags: ["fitness", "ai", "blockchain", "social"]
  }
}
```

**Manifest Verification**:

- Uses JSON Farcaster Signature (JFS)
- Domain ownership verified via signature
- Custody or auth address required

#### 3. SDK API

**Context (User Information)**:

```typescript
{
  user: {
    fid: number,
    username: string,
    displayName: string,
    pfpUrl: string
  },
  client: {
    safeAreaInsets: { top, bottom, left, right }
  }
}
```

**Key Actions**:

- `sdk.actions.ready()` - Hide splash screen
- `sdk.actions.composeCast(text, embeds)` - Prompt user to cast
- `sdk.actions.viewProfile(fid)` - Show profile
- `sdk.actions.addMiniApp()` - Prompt to save app
- `sdk.actions.openUrl(url)` - Open external link

**Wallet Access**:

```typescript
const provider = sdk.wallet.getEthereumProvider(); // EIP-1193
// Or viem/ethers
await provider.request({ method: 'eth_sendTransaction', params: [...] })
```

#### 4. Notifications

Mini Apps can send push notifications:

```typescript
POST {notificationUrl} {
  notificationId: "unique_id",
  title: "New challenge",
  body: "Beat your friend's score",
  targetUrl: "https://app.com/challenge/123"
}
```

**Requirements**:

- User must opt-in explicitly
- Separate token per client/user
- Webhook to register app additions/removals

#### 5. Multi-Chain Wallet Support

- Ethereum (primary)
- Solana (experimental)
- Multi-chain transactions supported
- Users can switch chains

### Size & Orientation

| Platform    | Size              | Notes        |
| ----------- | ----------------- | ------------ |
| Mobile      | Device dimensions | Full screen  |
| Desktop Web | 424x695px         | Fixed size   |
| Orientation | Vertical only     | Modal format |

### Latest Features (Dec 2025)

✅ **Token Swaps** - `sdk.actions.swapToken()`
✅ **Token Sends** - `sdk.actions.sendToken()`
✅ **Token Viewing** - `sdk.actions.viewToken()`
✅ **Multi-chain** - Support for Base, Ethereum, Solana
✅ **Server Events** - miniapp_added, miniapp_removed, notifications_enabled/disabled

---

## 3. Design Implications for Phase 6

### Strategic Approach: "Fitness Gateway to Wallet"

Given Farcaster's wallet-first pivot, our integration should follow:

```
User discovers Imperfect Form
    ↓
Opens Mini App (lightweight, no sign-up)
    ↓
Completes workout → gets fitness credentials
    ↓
Can swap/send rewards → uses in-app wallet
    ↓
Gets social proof → shares on Farcaster
    ↓
Joins challenges with followers → stays for social
```

### Technical Architecture for Phase 6

```
┌─────────────────────────────────────────────────────────┐
│                Imperfect Form Mini App                  │
│                                                          │
│  ┌──────────────┐  ┌─────────────────────────────────┐ │
│  │  Game/Pose   │  │    Farcaster Mini App SDK       │ │
│  │ Detection    │  │  • User context                 │ │
│  │              │  │  • Wallet access (EIP-1193)     │ │
│  │              │  │  • Actions (cast, notification) │ │
│  └──────────────┘  │  • Events                       │ │
│         │          └──────────┬──────────────────────┘ │
│         │                     │                        │
│         └─────────┬───────────┘                        │
│                   │                                    │
│         ┌─────────▼─────────┐                         │
│         │  DataSync Layer   │                         │
│         │  (Phase 5)        │                         │
│         │  • Leaderboard    │                         │
│         │  • User stats     │                         │
│         │  • Cache mgmt     │                         │
│         └────────┬──────────┘                         │
│                  │                                    │
│         ┌────────▼─────────┐                         │
│         │ Memory Protocol  │                         │
│         │ • Identity graphs│                         │
│         │ • Data uploads   │                         │
│         └────────┬─────────┘                         │
│                  │                                    │
│         ┌────────▼──────────┐                        │
│         │   Reward System   │                        │
│         │   • $MEM tokens   │                        │
│         │   • Wallet tx     │                        │
│         │   • On-chain cred │                        │
│         └───────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Checklist for Phase 6

### Phase 6A: Mini App Foundation

- [ ] Create `/.well-known/farcaster.json` manifest
- [ ] Implement mini app embed meta tags
- [ ] Set up JFS signing for manifest
- [ ] Initialize SDK and call `sdk.actions.ready()`
- [ ] Add splash screen configuration
- [ ] Implement user context retrieval

### Phase 6B: Wallet Integration

- [ ] Add wallet provider access (EIP-1193)
- [ ] Implement on-chain credential minting
- [ ] Add token swap/send actions
- [ ] Connect to reward distribution contract
- [ ] Test multi-chain wallet switching

### Phase 6C: Memory Protocol Integration

- [ ] Create Memory API client wrapper
- [ ] Implement identity graph lookups
- [ ] Display cross-platform identities in profiles
- [ ] Add data upload interface for fitness datasets
- [ ] Set up earnings tracking for data monetization

### Phase 6D: Social & Notifications

- [ ] Implement `composeCast` for sharing
- [ ] Add notification webhook setup
- [ ] Create notification triggers (achievements, challenges)
- [ ] Implement challenge creation with followers
- [ ] Add `viewProfile` for cross-platform profiles

### Phase 6E: Polish & Launch

- [ ] Test on Farcaster clients (web + mobile)
- [ ] Optimize payload sizes
- [ ] Add error boundaries
- [ ] Create promotional assets (screenshots, descriptions)
- [ ] Submit to Farcaster mini app directory

---

## 5. Key Decisions for Design

### Should we build a traditional Mini App or a Lite Client?

**Recommendation: Hybrid Approach**

1. **Mini App Entry** (discovery layer)
   - Lightweight splash screen
   - Quick stats overview
   - Call-to-action to full app

2. **Full Web App** (for heavy features)
   - Pose detection
   - Leaderboard browsing
   - Detailed workouts
   - Opened via deeplinking from mini app

3. **Mini App + Wallet** (the loop)
   - Quick workouts (if SDK supports)
   - Immediate reward claims
   - Social sharing
   - Challenge quick links

### Should we monetize with $MEM tokens directly?

**Recommendation: Dual Approach**

1. **Immediate** - Custom fitness reward token (already have)
2. **Phase 6C+** - Optional $MEM integration for data sales
   - Users can sell performance data
   - Passive income from leaderboard queries
   - Premium datasets with better quality scores

---

## 6. Risk Assessment

| Risk                      | Likelihood | Impact | Mitigation                                       |
| ------------------------- | ---------- | ------ | ------------------------------------------------ |
| Farcaster pivots again    | Medium     | High   | Build standalone web app, mini app is entry only |
| Memory API rate limits    | Low        | Medium | Implement aggressive caching (DataSync)          |
| Manifest signature issues | Low        | Medium | Use Memory Protocol's JFS signing tools          |
| Wallet tx failures        | Low        | High   | Implement retry logic + gas estimation           |
| Low mini app adoption     | Medium     | Low    | Market aggressively on Farcaster                 |

---

## 7. Next Steps

1. **Validate** - Confirm design approach with user feedback
2. **Prototype** - Build mini app skeleton with SDK
3. **Test** - Deploy to Farcaster testnet (if available)
4. **Integrate** - Connect Memory Protocol identity graphs
5. **Launch** - Submit to Farcaster directory + promote

---

## References

- [Farcaster Mini Apps Docs](https://miniapps.farcaster.xyz/)
- [Farcaster Mini Apps Specification](https://miniapps.farcaster.xyz/docs/specification)
- [Memory Protocol Docs](https://docs.memoryproto.co/)
- [Memory Identity Graphs](https://docs.memoryproto.co/essentials/identities)
- [Farcaster Wallet-First Strategy](https://farcaster.xyz/dwr/0xd29fe760)
