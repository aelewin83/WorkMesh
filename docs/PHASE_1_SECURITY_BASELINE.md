# Phase 1 Security Baseline

## Implemented Baseline

- Versioned Relai encrypted envelope for sensitive client-originated payloads.
- New API message sends reject plaintext fields and require encryptedPayload envelopes.
- Completion proof notes are stored as encrypted envelopes.
- Server validates envelope shape without decrypting content.
- Session cookies use httpOnly, sameSite=lax, secure in production, expiration, and logout invalidation.
- Passwords are stored with salted scrypt hashes.
- Mutating routes use existing session and ownership checks.
- Basic in-memory rate limiting protects auth, message send, and mutation routes.
- Browser security headers are configured in Next.js.
- Secret examples document private/public env separation.

## Encryption Envelope

Fields:

- version
- algorithm
- keyId
- nonce
- ciphertext
- createdAt
- optional senderPublicKey
- optional recipientPublicKey

Current algorithm label: AES-256-GCM.

## What Backend Stores

- Ciphertext envelopes for new message bodies.
- Ciphertext envelopes for new proof notes.
- Encrypted refs for private profile, job details, and proof/file references.
- Searchable non-sensitive preview metadata only.

## Phase 2 Roadmap

- Replace local-device envelope key with per-user keypair and real per-thread key establishment.
- Add SIWE/passkey-backed key unlock.
- Add encrypted attachment storage adapters for R2/S3.
- Add production distributed rate limiting.
- Add security event audit trails and alerting.
