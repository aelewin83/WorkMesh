# Relai

Relai is a privacy-first secure hiring scaffold for trusted work, private coordination, and protected settlement.

The monorepo contains:

- `apps/web` - responsive Next.js contributor, secure hiring, admin, and landing surfaces.
- `apps/api` - TypeScript API service scaffold with Prisma-ready infrastructure.
- `contracts` - Solidity escrow, request, agreement, and trust contracts.
- `apps/indexer` - chain event reconciliation scaffold for escrow state sync.
- `packages/*` - shared types, matching, pricing, crypto, and encrypted storage packages.
- `docs` - PRD, architecture, security, compliance, monetization, test plan, and infrastructure notes.

## Quick Start

```bash
pnpm install
pnpm dev:web:mock
```

Network installation is intentionally not run by default in this environment. Once dependencies are installed, use the scripts in the root `package.json`.

### Run Mock Mode

Mock mode uses browser-local adapters for fast offline UI development.

```bash
pnpm dev:web:mock
```

### Run API Mode

API mode uses the Next.js `/api` contract routes with file-backed development storage in `apps/web/.relai-dev`.

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

- `NEXT_PUBLIC_DATA_MODE=mock` keeps the trusted work console on local mock adapters.
- `NEXT_PUBLIC_DATA_MODE=api` switches the trusted work console to route-backed adapters.
- `RELAI_STORAGE_MODE=file-dev` keeps local JSON persistence for development and tests.
- `DATABASE_URL` and `RELAI_STORAGE_MODE=postgres` enable the PostgreSQL-backed state store.
- `NEXT_PUBLIC_API_BASE_URL` is optional. Leave it blank for same-origin `/api` routes.
- `NEXT_PUBLIC_ENABLE_TESTNET_PAYMENTS=false` keeps wallet/escrow in mock-chain mode until testnet secrets are configured.

Example env files are included at the repo root and under `apps/web`.

## Infrastructure

PostgreSQL schema and the blockchain boundary are documented in `docs/INFRASTRUCTURE.md`. The baseline migration is at `apps/web/db/migrations/001_relai_contractor_workflow.sql`.

## Scripts

```bash
pnpm dev:web:mock      # Next dev server with mock adapters
pnpm dev:web:api       # Next dev server with API-backed adapters
pnpm build:web:mock    # Build web in mock mode
pnpm build:web:api     # Build web in API mode
pnpm test:api          # Build API mode and run HTTP contract tests
pnpm test:contracts    # Run smart contract tests
pnpm typecheck         # Typecheck API and UI packages
pnpm verify            # Typecheck, API contract tests, contract tests, and web builds
```

## Troubleshooting

- If API mode appears to use mock data, rebuild with `pnpm build:web:api`; public Next env vars are compiled into the client bundle.
- If route state looks stale, remove `apps/web/.relai-dev` and restart API mode.
- If a port is busy, run from `apps/web` with `NEXT_PUBLIC_DATA_MODE=api node_modules/.bin/next dev -p 3020`.
- If Tailwind styling disappears, make sure commands run from `apps/web` or use the root scripts above.

## MVP Acceptance Flow

1. Trusted contributor creates an encrypted pseudonymous profile.
2. Hiring team creates a secure request.
3. Matching engine recommends eligible work.
4. Pricing quote and fee transparency are shown.
5. Hiring team funds protected settlement.
6. Trusted contributor completes the work.
7. Escrow releases payout, deducts the platform fee, and records reputation.
8. Admin panel shows lightweight private beta operations.

## Database Mode

File-dev storage remains the default fallback. To use PostgreSQL locally:

```bash
cp .env.example .env.local
pnpm db:start
DATABASE_URL=postgresql://relai:relai@127.0.0.1:5432/relai pnpm db:migrate
DATABASE_URL=postgresql://relai:relai@127.0.0.1:5432/relai pnpm db:seed
DATABASE_URL=postgresql://relai:relai@127.0.0.1:5432/relai RELAI_STORAGE_MODE=postgres pnpm dev:web:api
```

Useful database commands:

```bash
pnpm db:start       # Start Docker Postgres, or Homebrew postgresql@15 if Docker is unavailable
pnpm db:status      # Show the local Postgres service status
pnpm db:logs        # Tail local Postgres logs
pnpm db:stop        # Stop local Postgres
pnpm db:migrate
pnpm db:seed
pnpm db:reset
pnpm db:test:reset
```

The first Postgres adapter stores the stable trusted work DTO in `relai_state_snapshots` so existing API contracts remain unchanged. The normalized tables are present for the next repository split.

## Testnet Escrow

Base Sepolia is configured in Hardhat. Set secrets in your shell or an uncommitted env file:

```bash
BASE_SEPOLIA_RPC_URL=...
PRIVATE_KEY=...
TREASURY_WALLET=...
PLATFORM_FEE_BPS=500
pnpm --dir contracts hardhat run scripts/deploy.js --network baseSepolia
```

Deployment artifacts are written to `contracts/deployments/`. Do not commit private keys or RPC secrets.

## Live Indexer

After deploying escrow and running migrations:

```bash
DATABASE_URL=...
RELAI_RPC_URL=...
RELAI_ESCROW_CONTRACT_ADDRESS=...
RELAI_CHAIN_ID=84532
pnpm indexer:live
```

The indexer stores decoded chain events idempotently and updates escrow state from contract events.
