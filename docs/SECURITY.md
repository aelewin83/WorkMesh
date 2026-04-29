# WORKMESH MVP Security

## Security Posture

WORKMESH handles sensitive identity, job, payment, wallet, location, reputation, and chat data. The MVP must demonstrate privacy by design, strong key handling, least-privilege administration, and smart-contract safety, even if a production audit remains a launch blocker.

## Threat Model

| Threat | Risk | MVP Control |
| --- | --- | --- |
| Plaintext chat exposure | High user trust damage | End-to-end encrypted messages; server stores ciphertext |
| Profile data breach | Sensitive identity and work history leakage | Field-level encryption for private profile attributes |
| Wallet takeover | Escrow theft or fraudulent release | Wallet signatures, session risk checks, transaction previews |
| Smart contract bug | Locked or misrouted funds | Minimal contract surface, tests, caps, pause, multisig treasury |
| Admin abuse | Data misuse or unfair dispute outcomes | Role-based access, audit logs, approval gates |
| Matching manipulation | Marketplace unfairness | Explainable scoring, velocity checks, moderation queue |
| Fraudulent employer/worker | Payment, scam, or safety risk | KYC/KYB hooks, reputation, disputes, sanctions screening |
| Metadata leakage | Work patterns and relationships exposed | Minimize metadata retention; hide private fields from search |
| Direct-settlement abuse | Risky work moved outside protected payment | Require protected payment for first-time, high-risk, high-value, remote, low-trust, or restricted flows |
| Sybil accounts | Reputation gaming | Wallet uniqueness checks, device/session signals, verification tiers |

## Encryption Model

### Chat

- Use end-to-end encryption for 1:1 chat.
- MVP-friendly model: X25519 key agreement plus per-message symmetric keys; production path can upgrade to Double Ratchet or MLS.
- Server stores `ciphertext`, nonce, sender id, thread id, created time, and key version.
- Attachments are encrypted client-side before upload; object storage never receives plaintext.
- Key safety state appears in conversation details.

### Profiles and Job Details

- Public discovery fields: display name, skills, approximate location, level, public rating.
- Private fields: legal name, exact address, tax profile, documents, sensitive bio notes, internal risk notes.
- Private job details and attachments are encrypted by default. Public marketplace discovery exposes only minimal matching metadata: category, skill tags, approximate zone, budget band, timing band, urgency, level gate, and reputation thresholds.
- Private fields use envelope encryption:
  - Data encrypted with data encryption keys.
  - Data encryption keys wrapped by a KMS-managed key.
  - High-sensitivity fields can additionally use client-held keys.

### Wallet and Escrow

- App never asks for seed phrases.
- All escrow actions require wallet confirmation with clear amount, fee, counterparty, and chain.
- Contract job id is hashed before going on chain to avoid leaking gig details.
- Treasury must be a multisig outside local/demo environments.
- ACH/card/wallet processor rails tokenize payment identity; raw payment credentials are never stored by WorkMesh.
- Stablecoin escrow is enabled only where lawful and after sanctions/risk screening.
- Direct settlement eligibility is enforced server-side and audited; UI controls are never trusted as the policy boundary.

## Key Management

- Rotate application secrets on a defined schedule and immediately after suspected exposure.
- Separate keys by environment.
- Store private infrastructure keys in a managed secrets system, not source control.
- Keep encryption key identifiers in records; do not reuse keys across unrelated domains.
- Add key revocation and re-encryption runbooks before beta.

## Authentication and Authorization

- Role model: worker, employer, admin, dispute resolver, finance admin, support.
- Require step-up auth for wallet linking, payout changes, fee config changes, dispute resolution, and admin exports.
- Admin access is least privilege and fully audited.
- Rate-limit auth endpoints, chat send, job posting, match refresh, and dispute creation.
- Block role escalation through server-side checks only; UI state is never trusted.

## Smart Contract Audit Notes

MVP contract review must cover:

- Reentrancy protection around release, refund, and dispute resolution.
- Fee bps upper bound and immutable fee snapshot per escrow.
- Treasury address validation and change governance.
- Correct split math under rounding, partial refunds, and zero-fee cases.
- State machine validity: draft, funded, in progress, completed, disputed, released, refunded.
- Idempotent event handling by backend listener.
- Emergency pause limits and unpause authorization.
- Replay protection across chains and duplicate job hashes.
- No hidden upgrade path unless proxy governance is explicit and disclosed.

## Security Checklist

| Area | MVP Requirement |
| --- | --- |
| Data minimization | Collect only fields needed for matching, escrow, compliance hooks, and support. |
| Encryption | Encrypt sensitive profile fields, chat bodies, attachments, and backups. |
| Secrets | No secrets in repo, logs, analytics, or client bundles. |
| Access control | Enforce role checks on every protected endpoint. |
| Logging | Log administrative and financial actions, not plaintext sensitive content. |
| Monitoring | Alert on escrow mismatch, suspicious auth velocity, payout changes, and admin export spikes. |
| Backups | Encrypt backups; test restore before demo freeze. |
| Dependencies | Run dependency and container scanning before investor demo. |
| Smart contracts | Run unit, fuzz, and static analysis tests; document unresolved findings. |
| Incident response | Maintain contact tree, severity matrix, and user notification draft. |

## Abuse and Trust Controls

- Block direct sharing of seed phrases, external payment steering, and suspicious links in chat metadata filters where legally permissible.
- Do not read chat plaintext server-side for abuse controls; rely on client-side warnings, metadata signals, reporting, reputation gates, and settlement-policy enforcement.
- Escalate repeated cancellations, no-shows, refund requests, and chargeback-like behavior.
- Keep manual review hooks for high-value gigs and new accounts with unusual velocity.
- Use progressive trust: larger escrow limits unlock with completed work, verification, and dispute-free history.

## Pre-Demo Audit Readiness

- Security design review completed.
- Threat model reviewed by product, engineering, and operations.
- Contract tests pass with coverage for release, refund, dispute, and fee split.
- Chain event reconciliation tested against duplicate and delayed events.
- Admin audit log reviewed for all finance and dispute actions.
- Sample encrypted records verified as unreadable from database console.
