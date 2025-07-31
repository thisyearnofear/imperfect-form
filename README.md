# Imperfect Form Monorepo

This is a **backend-less Turborepo monorepo** for the Imperfect Form app, built with Next.js, smart contracts, and shared packages. All business logic is handled client-side or via on-chain contracts and typed SDKs.

## Structure

```
imperfect-form/
├── apps/
│   └── web/               # Next.js app (migrated from `next/`)
├── packages/
│   ├── ui/                # Shared UI components (empty scaffold)
│   ├── hooks/             # Shared React hooks (empty scaffold)
│   ├── types/             # Shared TypeScript types (empty scaffold)
│   ├── sdk-neynar/        # Neynar API wrapper (empty scaffold)
│   └── sdk-contracts/     # TypeChain bindings (empty scaffold)
├── public/
├── turbo.json
├── tsconfig.base.json
├── .npmrc
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- [pnpm](https://pnpm.io/) v8.15.1+
- [Node.js](https://nodejs.org/) v18+

### Install dependencies

```sh
pnpm install
```

### Development

```sh
pnpm dev
```

### Build

```sh
pnpm build
```

### Test

```sh
pnpm test
```

### Lint

```sh
pnpm lint
```

## Monorepo Notes

- All apps and packages use [pnpm workspaces](https://pnpm.io/workspaces).
- `tsconfig.base.json` provides path aliases for all packages.
- Future backend logic should use Next.js API routes or Vercel Edge Functions.
- See each package's README for further details as they are developed.