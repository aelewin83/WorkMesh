# WORKMESH MVP Monetization

## Revenue Thesis

WORKMESH monetizes trust, liquidity, privacy, and operational workflow. Employers pay to hire faster, workers accept because protected payment improves payment certainty, and the marketplace captures transparent value through settlement fees, verification, priority distribution, team tools, and compliance services.

## Primary Revenue Model

MVP settlement revenue is a configurable platform fee expressed in basis points. It is important that WorkMesh does not rely solely on transaction fees, especially because trusted counterparties may later unlock direct settlement.

```text
platform_fee = gross_escrow_amount * platform_fee_bps / 10000
take_rate = platform_fee / gross_merchandise_value
worker_net = gross_escrow_amount - worker_fee - adjustments
employer_total = gross_escrow_amount + employer_fee + network_fee
```

Investor-demo default:

| Fee | Default | Notes |
| --- | --- | --- |
| Total platform fee | 500 bps | 5.0% blended take rate |
| Employer side | 350 bps | Shown before escrow funding |
| Worker side | 150 bps | Shown before offer acceptance |
| Treasury | 100% of platform fee | Routed to multisig treasury |
| Network/gas fee | Pass-through | Not counted as platform revenue |

Example:

| Item | Amount |
| --- | ---: |
| Gig gross pay | $1,000.00 |
| Employer fee at 350 bps | $35.00 |
| Worker fee at 150 bps | $15.00 |
| Employer total before gas | $1,035.00 |
| Worker net | $985.00 |
| Platform revenue | $50.00 |

## Multi-Rail Settlement Policy

Supported rails:

| Rail | MVP Status | Monetization Notes |
| --- | --- | --- |
| Protected escrow | Demo default | Fee captured on successful release. |
| ACH/card processor | Integration-ready | Processor costs are pass-through; platform can charge service fee. |
| Wallet processor | Integration-ready | Useful for wallet-native users without forcing crypto-first language. |
| Stablecoin escrow | Where lawful | Smart contract fee split and treasury routing. |
| Direct settlement | Reputation-gated | No mandatory take rate; monetized through trust, workflow, verification, and SaaS-style tools. |

Protected payment is required for first-time counterparties, high-risk categories, high-value tasks, remote deliverables, low-trust accounts, and restricted jurisdictions. Direct settlement can unlock after positive reputation milestones such as repeat successful engagements, low dispute ratio, fast response behavior, and category approval.

## Secondary Revenue Options

| Product | Buyer | Timing | Notes |
| --- | --- | --- | --- |
| Verified employer badge | Employer | Beta | Covers KYB and trust lift. |
| Priority posting | Employer | Beta | Boosts job visibility with clear labeling. |
| Worker pro profile | Worker | Later | Portfolio, credential highlights, lower fee tier. |
| Team hiring tools | Employer | Later | Saved crews, templates, scheduling. |
| Dispute premium | Employer or worker | Later | Optional faster mediation, only if legally reviewed. |
| Data products | Internal only initially | Later | Aggregated market-rate insights; no personal data resale in MVP. |
| Privacy vault / selective disclosure tools | Employer or worker | Later | Advanced consent logs, credential packets, and encrypted proof exports. |
| Direct-settlement trust membership | Repeat counterparties | Later | Subscription or account fee for reputation-gated off-platform coordination tools. |

## Marketplace Economics

Core metrics:

```text
GMV = sum(gross_escrow_amount for released escrows)
recognized_revenue = sum(platform_fee for released escrows)
non_transaction_revenue = verification + priority_placement + team_tools + compliance_services
net_revenue = recognized_revenue + non_transaction_revenue - refunds - chargebacks - payment_partner_costs
liquidity = qualified_workers_per_open_gig
activation_rate = users_with_first_completed_job / onboarded_users
repeat_rate = users_with_2plus_completed_jobs / users_with_first_completed_job
```

Marketplace health targets for demo narrative:

| Metric | Demo Target | Why It Matters |
| --- | ---: | --- |
| Qualified workers per open gig | 5+ | Shows supply liquidity. |
| Time to first match | < 60 sec | Shows matching utility. |
| Offer acceptance | 25%+ | Shows price and trust fit. |
| Escrow funding rate | 70%+ of accepted offers | Shows employer intent. |
| Completed job rate | 85%+ | Shows operational quality. |
| Dispute rate | < 5% | Shows trust and safety baseline. |
| Take rate | 5% | Simple investor-demo economics. |

## Pricing Strategy

Suggested pricing should protect liquidity, not just maximize fees.

```text
suggested_rate =
  category_base_rate *
  market_multiplier *
  urgency_multiplier *
  complexity_multiplier *
  level_multiplier *
  reputation_multiplier *
  availability_multiplier
  + travel_premium
```

Controls:

- `category_base_rate`: seeded from market research and early platform history.
- `market_multiplier`: local supply/demand and cost-of-living proxy.
- `urgency_multiplier`: increases for same-day or narrow time windows.
- `complexity_multiplier`: increases for licensing, tools, seniority, or risk.
- `level_multiplier`: rewards proven workers.
- `reputation_multiplier`: modest premium for high-confidence reliability.
- `availability_multiplier`: increases when qualified supply is scarce.
- `travel_premium`: distance and parking/tool transport compensation.

## Levels and Reputation

Worker levels:

| Level | Name | Criteria | Benefit |
| --- | --- | --- | --- |
| L0 | New | Profile complete, wallet linked | Can accept low-risk gigs. |
| L1 | Active | 1 completed job, no unresolved dispute | Higher match confidence. |
| L2 | Reliable | 5 completed jobs, 4.6+ rating, low cancellation | Larger escrow limit. |
| L3 | Pro | 15 completed jobs, credential or specialty | Higher ranking for complex jobs. |
| L4 | Elite | 40 completed jobs, strong repeat rate | Premium pricing signal. |
| L5 | Guild | Invite/reviewed cohort, very low dispute rate | Early access to enterprise gigs. |

Reputation score:

```text
reputation =
  bayesian_rating * 0.35 +
  completion_rate * 0.25 +
  on_time_rate * 0.15 +
  repeat_hire_rate * 0.10 +
  dispute_free_rate * 0.10 +
  verification_bonus * 0.05
```

Employer reputation uses similar inputs: funded-offer rate, release speed, dispute rate, worker rating, repeat hiring, and verification.

## Admin Revenue Dashboard

P0 widgets:

- GMV released.
- Pending escrow value.
- Recognized platform revenue.
- Current fee bps by category.
- Treasury address and latest treasury transaction.
- Refunds and disputed value.
- Revenue by category, market, and employer segment.
- Fee reconciliation status: app ledger vs chain events.

## Fee Governance

- Fee bps changes require finance-admin role and step-up auth.
- Fee configs are versioned and never mutate historical escrow terms.
- Smart contract stores the fee bps snapshot used at funding time.
- Treasury changes require multisig approval and visible audit log.
- Promotions use explicit fee overrides with expiration dates.
