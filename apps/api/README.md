# WorkMesh API

Node.js TypeScript MVP API for the WorkMesh worker, matching, pricing, messaging, reputation, market signal, and admin revenue surfaces.

The demo uses an in-memory fixture service, so it can run without PostgreSQL. A Prisma schema for the intended PostgreSQL data model is included in `prisma/schema.prisma`.

## Run

```bash
npm install
npm run dev
```

By default the server listens on `http://localhost:4000`.

## Endpoints

- `POST /users/register`
- `GET /users/:wallet`
- `POST /gigs/create`
- `GET /gigs/search`
- `GET /gigs/recommended/:wallet`
- `POST /match/score`
- `POST /pricing/quote`
- `POST /messages/send`
- `GET /messages/thread/:id`
- `GET /levels/:wallet`
- `POST /reviews/create`
- `GET /market/signals`
- `GET /admin/revenue`
- `GET /admin/fees`

## Example Requests

```bash
curl -X POST http://localhost:4000/users/register \
  -H 'content-type: application/json' \
  -d '{"wallet":"0xDAVE","displayName":"Dave Lee","skills":["TypeScript","React"]}'
```

```bash
curl 'http://localhost:4000/gigs/search?skill=typescript&remote=true'
```

```bash
curl -X POST http://localhost:4000/gigs/create \
  -H 'content-type: application/json' \
  -d '{"buyerWallet":"0xbob","title":"Local urgent pickup","description":"Encrypted details are stored off-service.","budgetMin":80,"budgetMax":120,"requiredSkills":["courier"],"requiredLevel":1}'
```

```bash
curl -X POST http://localhost:4000/match/score \
  -H 'content-type: application/json' \
  -d '{"wallet":"0xalice","gigId":"gig-escrow-audit"}'
```

```bash
curl -X POST http://localhost:4000/pricing/quote \
  -H 'content-type: application/json' \
  -d '{"gigId":"gig-worker-dashboard","wallet":"0xcarol","complexity":4,"timelineDays":7}'
```

```bash
curl -X POST http://localhost:4000/messages/send \
  -H 'content-type: application/json' \
  -d '{"fromWallet":"0xalice","toWallet":"0xcarol","encryptedPayload":{"algorithm":"AES-GCM","ciphertext":"base64url-ciphertext","nonce":"base64url-nonce"}}'
```
