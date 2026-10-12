# Cloudflare runtime and deployment

## Live resources and data format

- Worker: `contextai`
- Static assets binding: `ASSETS`
- Private R2 binding: `RANKINGS` → `contextai-rankings`
- Wrangler configuration: `wrangler.jsonc`

The R2 bucket contains 1,844 binary ranking objects named
`rankings/0000.bin` through `rankings/1843.bin`. Each file stores one 16-bit
rank per word in `worker/manifest.json`. The manifest's `anchor`, `count`, and
`version` select the correct object for each UTC day. Keep the R2 bucket private.

Do not replace these objects with per-date JSON files or publish them as static
assets. The Worker reads them through the private `RANKINGS` binding, validates
the expected byte length, and returns only the submitted guess's rank.

## Deploy

Authenticate Wrangler to the Cloudflare account that owns `contextai`, then
deploy from the repository root:

```sh
node scripts/deploy-cloudflare.mjs
```

This builds the frontend, records the active Worker version, deploys the
Worker and static assets, and checks `/api/health`, `/api/today`, and a known
guess. If a live check fails, it rolls back to the previously active Worker
version and its static assets. Keep the Node runtime current enough for
Wrangler 4.

Never store Cloudflare credentials in the repository. Wrangler's local login
or a secure Cloudflare build connection should provide deployment access.

## Local development

```sh
npm ci --prefix frontend
npm run build --prefix frontend
npx --yes wrangler@4 dev --config wrangler.jsonc
```

Wrangler's local R2 storage is separate from production. To play against the
live rankings locally, configure a remote R2 binding in a local-only override;
do not commit account credentials or change the production binding.

The public API routes are `/api/health`, `/api/today`, and
`/api/check/{word}`. The `/api/today` route checks that the day's R2 object
exists and has the expected size before marking the puzzle ready.
