# Cloudflare runtime and deployment

## Resources

- Worker: `contextai`
- Static assets binding: `ASSETS`
- Private R2 bucket binding: `RANKINGS` → `contextai-rankings`
- Wrangler configuration: `wrangler.jsonc`

The bucket contains 1,844 ranking objects named `rankings/NNNN.bin`. Each
object is 56,536 bytes and stores the rank for each word in the Worker's
vocabulary. Keep the bucket private. The Worker reads the ranking for the
current daily target and returns only the submitted guess's rank.

The Worker manifest pins the ranking set and its daily rotation anchor. The
game does not depend on a GitHub Actions job or runtime model inference to
generate each day's answer.

## Git deployment

Cloudflare Workers Builds is connected to the GitHub repository
`NathanielJames97/ContextAI` and watches `rebuild/cloudflare-native`.
Code changes pushed to this branch run:

```sh
npm --prefix frontend ci
npm --prefix frontend run lint
npm --prefix frontend run build
npx wrangler deploy --config wrangler.jsonc
```

The build token is managed by Cloudflare. Do not put Cloudflare credentials in
the repository. The build produces `frontend/dist` for frontend validation. The deploy script
uploads the Worker module and preserves the currently published static UI assets
and the private R2 ranking objects. This keeps the live interface intact while
the recovered frontend source is reconciled with the deployed UI.

## Local checks

```sh
npm ci --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
npx --yes wrangler@4 dev --config wrangler.jsonc
```

The API routes are `/api/health`, `/api/today`, and
`/api/check/{word}`. Do not expose the ranking objects or answer to the
browser; the frontend should use these API routes.
