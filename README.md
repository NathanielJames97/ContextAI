# ContextAI

ContextAI is a daily word-guessing game. Submit a word and the Worker returns its
semantic rank for the day's answer. Guess history and progress are saved in the
browser.

## Stack

- React, Vite, and Tailwind CSS for the frontend
- Cloudflare Workers for the game API and static assets
- A private Cloudflare R2 bucket for precomputed ranking files
- GloVe 6B (50-dimensional) rankings

The Worker returns only a guess's rank; ranking files and the answer are not
served to the browser.

## Run locally

```sh
npm ci --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
npx --yes wrangler@4 dev --config wrangler.jsonc
```

The local frontend is built to `frontend/dist`. A full local game also needs the
`contextai-rankings` R2 bucket bound as `RANKINGS` and populated with ranking
objects.

## Deploy

Cloudflare Workers Builds watches the `rebuild/cloudflare-native` branch.
Pushing to that branch runs the frontend lint and build, then deploys the Worker
with Wrangler. The build configuration is managed in Cloudflare.

The Worker reads private objects named `rankings/NNNN.bin` from the
`contextai-rankings` bucket. Keep this bucket private; the browser should only
call `/api/today` and `/api/check/{word}`.

See [CloudflareSetup.md](CloudflareSetup.md) for the runtime and deployment
details.
