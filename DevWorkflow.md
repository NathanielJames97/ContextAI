# ContextAI development workflow

## Run locally

```sh
npm ci --prefix frontend
npm run dev --prefix frontend
npx --yes wrangler@4 dev --config wrangler.jsonc
```

Wrangler runs the Worker and serves the frontend assets. The local Worker
needs access to the `RANKINGS` R2 binding and a ranking for the current UTC
date to provide a playable puzzle.

## Deploy to Cloudflare

Authenticate Wrangler with the Cloudflare account that owns the `contextai`
Worker, then run:

```sh
npm ci --prefix frontend
npm run build --prefix frontend
npx --yes wrangler@4 deploy --config wrangler.jsonc
```

## Publish a daily puzzle

Follow [CloudflareSetup.md](CloudflareSetup.md) to generate and upload the
ranking JSON for the target UTC date. Keep that generated file private.
