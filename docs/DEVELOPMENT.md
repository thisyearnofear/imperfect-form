# Development Guide

## Prerequisites

- [pnpm](https://pnpm.io/) v8.15.1+
- [Node.js](https://nodejs.org/) v18+

## Setup

```sh
pnpm install
```

## Development

```sh
pnpm dev
```

## Build

```sh
pnpm build
```

## Testing

```sh
pnpm test
pnpm test:e2e
```

### Coach station (Python)

Zero-dep console sim + optional Cyberwave twin. From `coach-station/`:

```sh
uv sync --extra dev
uv run pytest
uv run python -m coach_station.demo --demo curl   # or: extension|tempo|asymmetry|all
uv run python -m coach_station                    # WebSocket on ws://localhost:8765
```

Pair with the web app:

```sh
NEXT_PUBLIC_COACH_STATION=ws://localhost:8765 pnpm dev
```

Cyberwave sim (optional): `uv sync --extra cyberwave`, then same demo/server
commands (`COACH_AFFECT=simulation` is the default). See
[`coach-station/README.md`](../coach-station/README.md).

## Linting

```sh
pnpm lint
pnpm lint:fix
```

## Design System Integration

### Phase 4: Design Tokens System

**Status**: ✅ Complete - Core tokens and utilities implemented

**Key Files**:

- `src/lib/designTokens.ts` - Single source of truth (colors, spacing, typography, shadows, transitions, z-index, sizes, breakpoints)
- `src/hooks/useDesignTokens.ts` - Type-safe token access
- `tailwind.config.js` - Tailwind v4 compat config (loaded via `@config` in `globals.css`)
- `src/lib/designTokens.ts` - Includes `validateTokenUsage()` for color migration guidance

> **⚠️ Spacing token caution:** Only numeric keys from `designTokens.spacing`
> (`0, 1, 2, 3…`) are spread into `theme.extend.spacing` via the `numericSpacing`
> filter in `tailwind.config.js`. The semantic names (`xs/sm/md/lg/xl`) are
> intentionally excluded — they override Tailwind's built-in named-scale
> utilities (`max-w-sm`, `text-sm`, etc.) with wrong values.

**Implementation Pattern**:

```javascript
// Import tokens
import { designTokens } from '@/lib/designTokens';

// Inline styles with tokens
style={{ color: designTokens.colors.primary }}

// Via hook
const tokens = useDesignTokens();
style={{ padding: tokens.spacing.md }}

// Define local style maps (for variants/themes)
const NETWORK_STYLES = {
  base: { bg: 'bg-blue-900/50', text: 'text-blue-300' },
  celo: { bg: 'bg-green-900/50', text: 'text-green-300' },
};
```

**Migration Guide**:

1. Replace hardcoded colors with token references
2. Use `validateTokenUsage()` to check for unmigrated values
3. Prefer Tailwind classes where possible (e.g., `bg-primary`, `text-success`)
4. Use inline `designTokens` for dynamic/runtime values

**Completed Integrations**:

- AccessibleDialog - Full token migration for colors, spacing, shadows, z-index, transitions
- InitializationScreen - Primary color token
- SummaryModal - Network badge styles + status color constants

## Phase 5: API Integration & Real-time Data Sync

**Status**: ✅ Complete - Unified leaderboard data with DataSyncService

**Key Files**:

- `src/services/DataSyncService.ts` - Unified data management with caching, mutations, subscriptions
- `src/services/OfflineDataStore.ts` - IndexedDB-backed offline persistence with sync queue
- `src/hooks/useDataSync.ts` - React integration (useDataSync, useQuery, useMutation)

**Architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                   Component Layer                       │
│        useQuery / useMutation / useDataSync              │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│            DataSyncService (Singleton)                  │
│  • Cache Management (5-min TTL by default)              │
│  • Optimistic Updates with Rollback                     │
│  • Real-time Subscriptions with Polling Fallback        │
│  • Duplicate Request Deduplication                      │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌───▼──────┐  ┌────▼────┐  ┌────▼─────┐
    │  API     │  │  Local  │  │ Offline  │
    │  Services│  │  Cache  │  │  Store   │
    │(Contracts)│  │         │  │ (IDBx)   │
    └──────────┘  └─────────┘  └──────────┘
```

**Core Patterns**:

```typescript
// Simple data fetching with automatic caching
const { data, loading, error, refetch } = useQuery(
  'leaderboard:pushups',
  () => fetchLeaderboardData('pushups'),
  { ttl: 5 * 60 * 1000 }
);

// Data mutation with optimistic updates
const { mutate, loading } = useMutation('user:score', async (score) => await submitScore(score), {
  optimistic: newScore,
  rollbackOnError: true,
});

// Full data sync with subscriptions
const { data, mutate, invalidate } = useDataSync(
  createDataKey('user:profile'),
  {
    fetch: () => API.getProfile(),
    mutate: (updates) => API.updateProfile(updates),
  },
  { pollInterval: 30000 }
);
```

**Key Features**:

- **Automatic Caching**: TTL-based cache with fresh/stale states
- **Optimistic Updates**: Instant UI updates, automatic rollback on error
- **Real-time Sync**: Native subscriptions with polling fallback
- **Offline-first**: IndexedDB persistence with sync queue
- **Deduplication**: Prevents duplicate in-flight requests
- **Error Handling**: Automatic retry with exponential backoff
- **Developer Experience**: Minimal boilerplate, type-safe

**Migration from Legacy Patterns**:

Old (manual caching):

```typescript
const [data, setData] = useState(null);
useEffect(() => {
  fetchData().then(setData);
}, []);
```

New (with DataSyncService):

```typescript
const { data } = useQuery('key', fetchData);
```

**Cache Invalidation**:

```typescript
// Invalidate single key
invalidate(createDataKey('leaderboard:pushups'));

// Invalidate pattern
service.invalidate('leaderboard:*');

// Automatic on mutation success
mutate(data, { optimistic: newData });
```

**Offline Support**:

```typescript
const store = getOfflineDataStore();
await store.set('key', data);
const cached = await store.get('key');
const pending = await store.getPendingSync();
```

## Phase 6: Farcaster Mini Apps

**Status**: ✅ Complete - Wallet-first mini app with cross-chain score submission

**Key Files**:

- `public/.well-known/farcaster.json` - Mini app manifest (JFS-signed)
- `src/utils/farcasterMiniApp.ts` - SDK integration, provider detection, chain switching
- `src/contexts/PlatformContext.tsx` - Unified platform detection (Farcaster, mobile, desktop, PWA)
- `src/hooks/useEnhancedProfile.ts` - Local-only profile stub (Memory Protocol descoped)
- `src/app/api/miniapp/webhook/route.ts` - Mini app event handling

**Mini App Flow**:

```typescript
// User opens mini app in Farcaster
// → Auto-connects Farcaster wallet
// → Can submit score immediately (wallet-first)
// → Claims rewards on Base/Celo/Polygon
// → Optionally shares to Farcaster feed
```

**Cross-Platform Identity (descoped)**: The Memory Protocol integration
was removed after upstream `memoryproto.co` went dark. See
`docs/ROADMAP.md` for the current "not doing" list.

## Security

### NPM Supply Chain Protection

The project is protected against npm supply chain attacks:

- Dependencies are pinned via `pnpm-lock.yaml`
- Regular security audits with `pnpm audit`
- Safe versions confirmed for critical packages (chalk, debug)

### Age Configuration

For users experiencing age-related verification issues:

- Minimum age requirement: 18 years
- Age verification handled through Self Protocol
- Fallback mechanisms for edge cases

## Environment Setup

Copy environment files:

```sh
cp next/.env.example next/.env.local
```

Required environment variables documented in `.env.example`.
