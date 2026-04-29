# @workmesh/storage

Storage providers for WorkMesh encrypted blobs.

This package exposes:

- `StorageProvider` contract, re-exported from `@workmesh/types`
- `LocalStorageProvider` for browser `localStorage` or in-memory tests
- `IPFSStorageProvider` for IPFS HTTP API nodes
- helpers for storing encrypted profile/message blobs

Providers accept only WorkMesh `EncryptedBlob` values. They do not store raw
profile objects, plaintext messages, private keys, or AES keys.
