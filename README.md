# WORKMESH

WORKMESH is a production-grade MVP scaffold for a decentralized, peer-to-peer,
encrypted labor marketplace for gig employers and contractors.

The monorepo contains:

- `apps/web` - mobile-first Next.js Deep Mode investor demo.
- `apps/api` - Fastify-style TypeScript API with Prisma schema and in-memory demo store.
- `contracts` - Solidity escrow, gig, agreement, and reputation contracts.
- `packages/*` - shared types, matching, pricing, crypto, and encrypted storage packages.
- `docs` - PRD, architecture, security, compliance, monetization, and test plan.

## Quick Start

```bash
pnpm install
pnpm dev:web:mock
```

Network installation is intentionally not run by default in this environment.
Once dependencies are installed, use the scripts in the root `package.json`.

### Run Mock Mode

Mock mode uses browser-local adapters for fast offline UI development.

```bash
pnpm dev:web:mock
```

### Run API Mode

API mode uses the Next.js `/api` contract routes with file-backed development
storage in `apps/web/.workmesh-dev`.

```bash
pnpm dev:web:api
```

### Test API Contracts

```bash
pnpm test:api
```

### Build Production API Mode

```bash
pnpm build:web:api
```

## Modes Explained

- `NEXT_PUBLIC_DATA_MODE=mock` keeps the contractor console on local mock adapters.
- `NEXT_PUBLIC_DATA_MODE=api` switches the contractor console to route-backed adapters.
- `NEXT_PUBLIC_API_BASE_URL` is optional. Leave it blank for same-origin `/api` routes.
- `NEXT_PUBLIC_ENABLE_MOCK_MAP=true` keeps the local mock map panel enabled.
- `NEXT_PUBLIC_ENABLE_TESTNET_PAYMENTS=false` keeps wallet/escrow in mock-chain mode.

Example env files are included at the repo root and under `apps/web`:

- `.env.mock.example`
- `.env.api.example`
- `apps/web/.env.local.example`

## Scripts

```bash
pnpm dev:web:mock      # Next dev server with mock adapters
pnpm dev:web:api       # Next dev server with API-backed adapters
pnpm build:web:mock    # Build web in mock mode
pnpm build:web:api     # Build web in API mode
pnpm test:api          # Build API mode and run HTTP contract tests
pnpm test:contracts    # Run smart contract tests
pnpm typecheck         # Typecheck all packages
pnpm verify            # Typecheck, API contract tests, and API build
```

## Troubleshooting

- If API mode appears to use mock data, rebuild with `pnpm build:web:api`; public Next env vars are compiled into the client bundle.
- If route state looks stale, remove `apps/web/.workmesh-dev` and restart API mode.
- If a port is busy, run from `apps/web` with `NEXT_PUBLIC_DATA_MODE=api node_modules/.bin/next dev -p 3020`.
- If Tailwind styling disappears, make sure commands run from `apps/web` or use the root scripts above.

## MVP Acceptance Flow

1. Worker creates an encrypted pseudonymous profile.
2. Employer posts a gig.
3. Matching engine recommends eligible workers.
4. Pricing quote and fee transparency are shown.
5. Employer funds escrow.
6. Worker completes the task.
7. Escrow releases payout, deducts the platform fee, and records reputation.
8. Admin dashboard displays treasury revenue.
