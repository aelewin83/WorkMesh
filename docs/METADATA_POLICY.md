# Relai Metadata Policy

Relai minimizes metadata by default while preserving the information needed for secure hiring workflows.

## Stored Metadata

- Wallet/session identity needed for authorization.
- Public handle, public operational focus, public capabilities, approximate region, availability, and reputation summary.
- Request title, broad operational focus, approximate region, compensation range, status, and safe preview fields.
- Agreement, escrow, and payment state required for workflow integrity.
- Message thread participants, thread IDs, read state, and encrypted payload timestamps.

## Sensitive Data Handling

- Message bodies should be encrypted before API persistence.
- Proof notes and sensitive proof refs should be encrypted.
- Exact location is not stored unless explicitly disclosed.
- Sensitive profile fields belong in encrypted private blobs or encrypted refs.
- Disclosure audit logs record field names and purpose, not secret values.

## Logging Guidance

- Do not log plaintext messages, passwords, proof notes, private profile fields, or private keys.
- Redact encrypted envelopes and transaction hashes in operational logs where practical.
- Avoid retaining search queries beyond immediate request processing unless there is an explicit safety need.

## Known Limitations

- Development fixtures may include non-production sample metadata.
- Production observability needs a formal retention schedule before open beta.
