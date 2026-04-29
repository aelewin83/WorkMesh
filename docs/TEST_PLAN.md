# WORKMESH MVP Test Plan

## Test Objectives

- Prove the end-to-end marketplace loop works for investor demo.
- Verify encrypted chat/profile behavior and escrow fee reconciliation.
- Validate matching, pricing, reputation, levels, and admin revenue surfaces.
- Catch obvious compliance, security, accessibility, and UX failures before demo.

## Environments

| Environment | Purpose | Data |
| --- | --- | --- |
| Local | Developer smoke tests | Seeded fake users, fake jobs, local/test chain |
| Demo | Investor walkthrough | Curated personas, deterministic matches, test wallets |
| Staging | Pre-beta hardening | Synthetic data plus limited internal test users |

## Test Coverage Matrix

| Area | P0 Tests | Owner |
| --- | --- | --- |
| Onboarding | Worker/employer signup, wallet link, profile create/edit | Product QA |
| Matching | Ranked workers, score reasons, blocked/ineligible filtering | Backend QA |
| Pricing | Suggested rate, fee preview, edge budgets, fee bps versioning | Backend QA |
| Chat | E2EE send/receive, attachment encryption, failed decrypt state | Security QA |
| Escrow | Fund, release, refund request, dispute open, event reconciliation | Smart contract QA |
| Reputation | Review submission, score update, level progression | Backend QA |
| Admin | Revenue dashboard, disputes list, fee config, audit log | Product QA |
| Compliance | Required disclosures, terms links, tax/crypto notices | Ops/legal |
| Accessibility | Keyboard nav, focus states, color contrast, screen-reader labels | Frontend QA |
| Performance | Search/match response, dashboard load, chain event lag | Engineering |

## Functional Test Cases

| ID | Scenario | Expected Result |
| --- | --- | --- |
| F-001 | Employer posts valid gig | Gig appears as published and searchable. |
| F-002 | Employer omits required budget | Form blocks publish and explains field error. |
| F-003 | Worker completes profile with skills | Worker appears in eligible match pool. |
| F-004 | Matching runs for job | Ranked list shows score and reasons. |
| F-005 | Worker outside service radius | Worker is excluded or receives low geo score. |
| F-006 | Pricing preview for urgent job | Urgency multiplier affects suggested range and explanation. |
| F-007 | Employer sends encrypted message | Recipient decrypts; database stores ciphertext only. |
| F-008 | Attachment upload | File is encrypted before storage and decrypts for recipient. |
| F-008A | Employer posts private gig details | Search index contains only category, skill tags, approximate zone, budget band, timing band, urgency, level gate, and reputation thresholds. |
| F-009 | Employer accepts worker offer | Offer status changes to accepted and escrow funding is requested. |
| F-010 | Escrow funded event received twice | Backend records one funded transition only. |
| F-011 | Employer releases payment | Worker net and treasury fee reconcile to chain event. |
| F-011A | First-time/high-risk/high-value/remote task quote | Protected payment is required and direct settlement is locked with a visible reason. |
| F-011B | Trusted repeat counterparty quote | Direct settlement can appear only after reputation, category, and jurisdiction gates pass. |
| F-012 | Worker opens dispute | Job enters disputed state and release is blocked. |
| F-013 | Admin resolves dispute | Contract and app state match resolution. |
| F-014 | Review submitted after release | Reputation and level recalculate once. |
| F-015 | Fee bps changed after funding | Existing escrow keeps original fee snapshot. |

## Security Tests

- Confirm no plaintext chat bodies in API logs, database rows, analytics, or crash reports.
- Attempt role escalation from worker to admin endpoint.
- Attempt replay of escrow event payload.
- Attempt release by non-party wallet.
- Attempt fee bps above configured cap.
- Attempt treasury address change without finance-admin permissions.
- Verify encrypted backup restore does not expose unwrapped sensitive fields.
- Run dependency, static analysis, and smart contract checks before demo freeze.

## Smart Contract Tests

- Fund escrow with correct amount, parties, fee bps, and job hash.
- Reject funding with zero amount, invalid worker, invalid treasury, or excessive fee bps.
- Release pays worker net and platform fee to treasury.
- Refund path respects state and authorization.
- Dispute path blocks normal release.
- Dispute resolution cannot overpay total escrow amount.
- Reentrancy guard covers release, refund, and resolve.
- Pause blocks fund/release/resolve where intended.
- Events include enough data for idempotent backend reconciliation.

## Compliance and Policy Checks

- Terms, privacy notice, escrow terms, tax notice, and crypto risk notice are reachable.
- Fee preview appears before offer acceptance and escrow funding.
- Users are told not to share seed phrases.
- Public profile fields are distinguishable from private encrypted fields.
- Public marketplace discovery metadata is intentionally sparse and never includes plaintext job details, exact address, legal identity, phone, email, attachment contents, or hidden profile data.
- Delete/deactivate flow exists or is documented as manual for MVP.
- Admin export actions are permissioned and logged.
- Prohibited services are blocked in seeded categories.

## Accessibility and UX Checks

- Complete employer and worker flows with keyboard only.
- Confirm focus indicators are visible in Deep Mode UI.
- Check contrast for text, chips, status states, and charts.
- Verify button text and labels fit on mobile and desktop.
- Confirm escrow state, match score, and fee details are understandable without relying only on color.

## Investor Demo Script

1. Open WORKMESH in employer mode.
2. Create a same-day skilled gig with required skills, time window, and budget.
3. Show pricing recommendation and transparent platform fee.
4. Publish job and open ranked match list.
5. Explain top match using score reasons: skill, availability, reputation, price.
6. Switch to worker mode and accept/counter the matched gig.
7. Send an encrypted chat message and show ciphertext-only storage in admin/debug view.
8. Return to employer mode, accept worker, and fund escrow with test wallet.
9. Show chain event and escrow-funded state.
10. Submit worker completion evidence.
11. Release payment and show worker net, platform fee, and treasury transaction.
12. Submit mutual reviews and show reputation/level update.
13. Switch to admin mode and show GMV, recognized revenue, fee bps, treasury inflow, and dispute queue.

## Demo Exit Criteria

- All P0 functional tests pass.
- No plaintext chat/profile sensitive data appears in inspected storage.
- Escrow release reconciles to revenue ledger and treasury event.
- Matching and pricing explanations are deterministic for seeded demo data.
- Admin dashboard loads accurate GMV, revenue, and pending escrow values.
- Known legal/compliance gaps are documented as caveats, not hidden.
- Demo can be reset to a clean seeded state in under 5 minutes.
