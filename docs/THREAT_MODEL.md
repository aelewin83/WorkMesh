# Relai Phase 1 Threat Model

Relai is positioned as secure hiring for trusted work. Phase 1 raises the private beta baseline without claiming nation-state resistance.

## Realistic Adversaries

- Malicious users attempting cross-account reads or mutations.
- Compromised or stolen sessions.
- Curious operators with database access.
- Database leaks.
- API abuse, spam, brute-force login attempts, and username probing.
- Malicious employers or contributors trying to access unrelated workflows.
- Leaked frontend bundle configuration.
- Compromised object storage containing encrypted refs.
- Basic network attackers.
- Dependency and supply-chain risk.

## Protected In Phase 1

- New message bodies and proof notes are required to use a versioned encrypted envelope before API persistence.
- Auth sessions are server-validated, httpOnly cookie based, expiring, and revocable.
- Mutating workflow routes derive actor identity from session/ownership checks instead of trusting request bodies alone.
- Basic rate limits slow auth abuse, message spam, and mutation floods.
- Security headers reduce common browser attack surface.
- Public previews and disclosure audits minimize sensitive profile exposure.

## Known Non-Goals

- Fully compromised user devices.
- Advanced malware or browser extension compromise.
- Nation-state endpoint compromise.
- Perfect forward secrecy.
- Full Signal protocol, multi-device key sync, or hardware-backed keys.
- Compelled user disclosure.
- Sophisticated traffic correlation.
- Production KYC, fiat rails, or passkeys.

## Highest Remaining Risks

- The current E2EE model is an MVP envelope and key abstraction, not a mature audited messaging protocol.
- Dev fallback sessions remain available unless RELAI_REQUIRE_AUTH=true.
- Local development storage and fixture data are for private beta validation, not production secrecy guarantees.
- Object storage encryption is architecture-ready but not yet a production media pipeline.
