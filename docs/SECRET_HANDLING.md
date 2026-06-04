# Secret Handling

## Rules

- Never commit .env, .env.local, .env.testnet, private keys, wallet seed phrases, database passwords, or RPC secrets.
- Public browser variables must use NEXT_PUBLIC_ and must never contain private keys.
- Server-only variables include DATABASE_URL, PRIVATE_KEY, BASE_SEPOLIA_RPC_URL, and admin/internal secrets.
- Rotate leaked RPC keys or private keys immediately.

## Required Private Beta Env Posture

- RELAI_REQUIRE_AUTH=true for non-local environments.
- RELAI_ALLOW_DEV_AUTH_HEADERS=false outside local development.
- HTTPS-only deployment.
- Separate deploy, testnet, and local credentials.
- Store secrets in Vercel/project secret management, not in the repo.

## Rotation Basics

1. Revoke or rotate the provider credential.
2. Update deployment secrets.
3. Redeploy.
4. Review logs for suspicious usage.
5. Invalidate affected sessions if auth secrets are involved.
