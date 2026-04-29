# @workmesh/crypto

WebCrypto-based helpers for WorkMesh:

- X25519 agreement keys for shared AES-GCM content keys
- Ed25519 signatures for message authenticity
- AES-GCM encrypted blobs for profiles, messages, and storage payloads
- public-key bundles that are safe to persist server-side

## Threat model notes

WorkMesh servers should store only:

- public key bundles
- encrypted blobs
- signatures
- storage pointers and non-sensitive routing metadata

Servers must not store agreement private keys, signing private keys, plaintext
profiles, plaintext message bodies, or raw AES content keys. Private keys should
remain in the browser, device keystore, or another client-controlled secure
store. This package marks key pairs as local-only and exports only public JWKs
for server-safe bundles.

AES-GCM ciphertext includes the authentication tag as WebCrypto returns it.
Callers should pass stable additional authenticated data for identifiers that
must not be tampered with.
