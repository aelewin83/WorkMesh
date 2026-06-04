# Encrypted Attachment Flow

1. Client encrypts file bytes locally.
2. Client encrypts attachment metadata as a Relai envelope.
3. Backend stores encrypted refs and encrypted metadata only.
4. Retrieval must require thread/agreement authorization.
5. No public object URLs should be used.

Phase 2 validates encrypted metadata and refs. Production file storage remains a Phase 3 adapter task.
