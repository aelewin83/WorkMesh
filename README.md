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
pnpm dev
```

Network installation is intentionally not run by default in this environment.
Once dependencies are installed, use the scripts in the root `package.json`.

## MVP Acceptance Flow

1. Worker creates an encrypted pseudonymous profile.
2. Employer posts a gig.
3. Matching engine recommends eligible workers.
4. Pricing quote and fee transparency are shown.
5. Employer funds escrow.
6. Worker completes the task.
7. Escrow releases payout, deducts the platform fee, and records reputation.
8. Admin dashboard displays treasury revenue.
