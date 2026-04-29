# @workmesh/types

Shared TypeScript contracts for WorkMesh worker, client, request, pricing,
matching, crypto, and storage packages.

These types intentionally keep private key material out of server-safe DTOs.
Persistable crypto structures contain public keys, encrypted blobs, signatures,
and storage pointers only.
