# ContextAI development workflow

## Run locally

```sh
npm ci --prefix frontend
npm run build --prefix frontend
npx --yes wrangler@4 dev --config wrangler.jsonc
```

Wrangler serves the frontend and Worker API. Local R2 storage is separate from
production; the live daily ranking is stored in the private Cloudflare bucket.

## Deploy to Cloudflare

Authenticate Wrangler with the account that owns the `contextai` Worker, then
run this from the repository root:

```sh
node scripts/deploy-cloudflare.mjs
```

The deploy script builds the frontend, deploys through Wrangler, verifies the
live game endpoints, and rolls back if the puzzle or guess check fails.
