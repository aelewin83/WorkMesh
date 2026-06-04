# Hardening Gap Analysis

## Closed In This Phase

- Sessions now carry device metadata, last-active tracking, trust state, and revocation.
- Security events record login/logout/revoke/trust changes with redacted metadata.
- Envelopes now include crypto suite, version 2 metadata, conversation ID, and rotation counters.
- Attachment metadata requires encrypted refs and encrypted metadata envelopes.
- Notifications use safer generic copy for sensitive updates.

## Remaining Gaps

- Device fingerprints are coarse browser hashes, not hardware attestations.
- Key rotation is local-device scaffolding, not per-recipient rekeying.
- Attachment file bytes need a production object-storage adapter.
- Recovery package flow is a placeholder until real key backup UX is built.
- Rate limiting is still in-memory in local/dev mode.
