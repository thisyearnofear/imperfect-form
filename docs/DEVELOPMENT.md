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

## Linting

```sh
pnpm lint
pnpm lint:fix
```

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
