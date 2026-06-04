# Device Trust Model

Each session is treated as a device session with:

- sessionId
- createdAt
- lastActiveAt
- approximate region
- device fingerprint hash
- device name
- trust state
- revoked state

Users can list devices, revoke one session, revoke other sessions, and mark a device trusted or suspicious. Fingerprints are coarse browser hashes and should not be marketed as strong hardware identity.
