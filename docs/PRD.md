# WORKMESH MVP Product Requirements

## Summary

WORKMESH is a decentralized, peer-to-peer encrypted labor marketplace for gig employers and workers. The investor-demo MVP proves the full marketplace loop: verified profiles, job posting, matching, encrypted chat, blockchain escrow, completion, reputation, and admin revenue visibility.

Codename: WORKMESH  
Design mode: Deep Mode UI, a dense, high-signal command interface for serious work decisions.  
Primary market: short-duration skilled local and remote gigs where trust, fast matching, and payment assurance matter.

## Privacy-First Global Defaults

All accounts default to privacy-native operation:

- End-to-end encrypted messaging.
- Encrypted job details and attachments.
- Pseudonymous public identity.
- Selective disclosure controls for legal identity, credentials, exact location, contact details, task-sensitive instructions, and payment identity.
- Minimal metadata retention.
- No plaintext server storage of private content.

Public marketplace discovery exposes only matching metadata needed to rank and filter opportunities: category, skill tags, approximate zone, budget band, timing band, urgency, level gate, and reputation thresholds. Users reveal additional identity or task details only when needed for legitimate work completion.

## Goals

- Let employers post gigs, fund escrow, hire matched workers, and release payment.
- Let workers create encrypted profiles, receive ranked opportunities, negotiate through encrypted chat, and build portable reputation.
- Demonstrate platform economics through configurable fee basis points, treasury routing, GMV, take rate, revenue analytics, and non-transaction revenue channels.
- Show credible trust, safety, compliance, and security posture without claiming production legal readiness.

## Non-Goals

- Full regulatory licensing, tax filing, or employment-law automation.
- Production-grade dispute arbitration network.
- Native WORK token launch.
- Fully decentralized storage for every asset.
- Multi-country compliance coverage beyond caveats and design hooks.

## Personas

| Persona | Need | Pain | MVP Win |
| --- | --- | --- | --- |
| Gig employer | Hire reliable workers quickly | No-shows, unclear pricing, payment disputes | Ranked matches, escrow-funded offer, encrypted negotiation |
| Independent worker | Find fair jobs and get paid | Race-to-bottom pricing, delayed payment, weak reputation portability | Suggested rate, escrow proof, levels, reputation |
| Marketplace admin | Monitor liquidity, revenue, and risk | No single view of GMV, disputes, fraud, fees | Admin console with revenue, disputes, fee bps, treasury status |
| Investor/demo viewer | Understand why this marketplace can scale | Hard to see differentiation | One end-to-end loop with cryptographic trust and economics |

## Core Flows

1. Worker onboarding
   - Create account, wallet, worker profile, skill tags, availability, service radius or remote preference.
   - Sensitive profile fields are encrypted; public discovery fields are explicit and editable.
   - Worker receives a starting level and reputation baseline.

2. Employer gig creation
   - Employer posts title, category, required skills, location or remote flag, time window, budget, urgency, and acceptance criteria.
   - Detailed scope is encrypted; public discovery gets minimal matching metadata only.
   - Pricing service suggests a fair range and estimated platform fee.
   - Employer can publish draft or fund escrow immediately.

3. Matching
   - Matching service ranks workers by skill fit, location/time fit, reliability, reputation, price fit, level, and risk signals.
   - Employer sees top matches with explainable score chips, not raw private data.
   - Worker sees compatible gigs and can accept, counter, or decline.

4. Encrypted negotiation
   - Employer and worker chat through end-to-end encrypted messages.
   - Attachments are encrypted before upload.
   - Key safety state is visible in conversation details.

5. Blockchain escrow
   - Employer uses protected payment for first-time counterparties, high-risk categories, high-value tasks, remote deliverables, or low-trust accounts.
   - Supported rails include ACH, card, wallet processor, and stablecoin escrow where lawful.
   - Smart contract stores job id hash, parties, amount, platform fee bps, treasury, state, and deadlines.
   - Funds can be released, refunded, or moved to dispute outcome.

6. Direct settlement eligibility
   - Direct settlement is optional and unlocked only after positive reputation milestones.
   - Eligible pairs must have repeat successful history, low dispute ratio, and approved category/jurisdiction.
   - Direct settlement does not bypass safety, review, messaging, reputation, or platform policy controls.

7. Completion and reputation
   - Worker submits completion evidence.
   - Employer releases payment or opens dispute.
   - Worker and employer rate each other; reputation and levels update after settlement.

8. Admin revenue and risk
   - Admin views GMV, net revenue, fee bps, treasury inflow, dispute rate, and flagged users.
   - Admin can pause categories, flag jobs, adjust fee configuration, and monitor payment-rail eligibility through guarded controls.

## MVP Scope

| Area | P0 Demo | P1 Investor Follow-Up | P2 Later |
| --- | --- | --- | --- |
| Account and wallets | Email/social auth, wallet connect, role selection | Passkeys, delegated wallets | DID portability |
| Profiles | Worker/employer profiles, encrypted private fields | Credential verification | Zero-knowledge credential proofs |
| Jobs | Create, search, status timeline | Templates, recurring gigs | Workforce scheduling |
| Matching | Ranked list with explainability | Feedback-driven ranking | Graph and on-chain reputation scoring |
| Pricing | Suggested rate/range and fees | Category liquidity multipliers | Auction and surge model |
| Chat | E2EE 1:1 chat and encrypted attachments | Group threads for teams | Federated relay network |
| Payments | Protected payment rails, smart contract escrow, fee split, direct settlement policy | Partial milestones, ACH/card/wallet processor integrations | Multi-chain and cross-rail settlement |
| Reputation | Ratings, completion rate, no-show rate, levels | Weighted credibility model | Portable reputation attestations |
| Admin | Revenue dashboard, disputes list, fee config | Fraud queues, compliance exports | DAO-style governance |

## User Stories

| Priority | Story | Acceptance Criteria |
| --- | --- | --- |
| P0 | As an employer, I can post a gig so that workers can discover it. | Required fields validate; draft and published states exist. |
| P0 | As an employer, I can see ranked workers so that I choose quickly. | Ranking includes score, fit reasons, rate, availability, reputation. |
| P0 | As a worker, I can view matched gigs so that I find relevant work. | Gig cards show pay, timing, distance/remote, requirements, escrow status. |
| P0 | As both parties, I can chat privately so that negotiation is confidential. | Message body and attachments are encrypted; server stores ciphertext. |
| P0 | As an employer, I can see which payment rails are allowed so that the job follows trust and compliance rules. | UI shows protected payment requirement, eligible rails, direct settlement lock state, and reasons. |
| P0 | As an employer, I can fund escrow so that the worker trusts payment. | Contract or processor event confirms funded state; UI shows amount, fee, treasury, and rail. |
| P0 | As a worker, I can get paid after completion. | Release sends worker net and platform fee to treasury. |
| P0 | As an admin, I can see revenue so that the business model is visible. | Dashboard shows GMV, take rate, treasury inflow, disputes. |
| P1 | As an admin, I can open disputes so that risky jobs are contained. | Dispute status, evidence, and outcome are auditable. |
| P1 | As a worker, I can improve levels through reliable work. | Level changes are deterministic and explained. |
| P2 | As a power employer, I can create repeat gigs. | Templates and saved worker lists exist. |

## Deep Mode UI Requirements

- First screen is the working marketplace, not a marketing page.
- Use a dark, information-dense layout with search, ranked panels, escrow state, and revenue widgets.
- Surface trust as operational signals: verified, escrow funded, response time, completion rate, dispute risk.
- Avoid decorative explanations inside the product surface; keep controls direct and scannable.
- Provide investor-demo toggles for persona mode: employer, worker, admin.

## Success Metrics

- Time from posted gig to first qualified match: under 60 seconds in demo data.
- Escrow funding completion: under 2 minutes with test wallet.
- Match acceptance rate: target 25%+ for seeded local gigs.
- Dispute rate: under 5% in simulated demo cohort.
- Platform revenue visibility: 100% of escrow releases reconcile to treasury events.
- Chat confidentiality: server stores no plaintext message body.

## Roadmap

| Phase | Timeline | Outcome |
| --- | --- | --- |
| Demo MVP | Weeks 0-6 | End-to-end marketplace loop with escrow, E2EE chat, matching, pricing, admin revenue |
| Closed Beta | Weeks 7-14 | Real employers/workers in one metro/category, KYC/KYB, dispute ops, analytics |
| Liquidity Expansion | Months 4-6 | More categories, referral loops, credential verification, milestone escrow |
| Regulated Scale | Months 7-12 | State-by-state compliance review, payments partners, tax reporting workflows |
| Network Mode | Year 2 | Portable reputation, federated relays, multi-chain escrow, governance experiments |
