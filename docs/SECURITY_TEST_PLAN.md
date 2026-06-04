# Security Test Plan

## Crypto

- Encrypted envelopes parse and validate.
- Message send rejects plaintext fields.
- Message send rejects malformed encryptedPayload values.
- Proof submission stores encrypted proof notes.
- Decryption failures render safely on the client.

## Auth

- Session create/restore/logout.
- Expired or revoked sessions rejected.
- Password hashes stored instead of plaintext passwords.
- Login/register/check-username are rate limited.
- Wallet/session mismatch is blocked.

## Permissions

- Contractor cannot edit another profile.
- Employer cannot manage another employer request or agreement.
- Contractor cannot access employer-only routes.
- Admin routes require admin role.
- Message threads are visible only to participants/admin.
- Payment history is visible only to the wallet owner/admin.

## Metadata

- Public profile preview excludes private fields by default.
- Disclosure logs do not store secret values.
- Proof notes and message bodies are not stored as plaintext for new writes.

## Regression

- pnpm --filter @relai/web typecheck
- pnpm test:api
- pnpm build:web:api
