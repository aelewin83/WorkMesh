# Phase 2 Security Model

Relai protects sensitive workflow content by encrypting message/proof/attachment metadata before storage, limiting server trust, and making sessions device-aware.

Backend services route, authorize, and persist ciphertext. They should not need plaintext message bodies, proof notes, or sensitive attachment metadata.

Security is intentionally practical: it raises the private beta baseline without promising perfect secrecy.
