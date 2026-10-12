# Daily ranking automation and Cloudflare runtime

The frontend stays React/Vite. A scheduled GitHub Actions workflow precomputes
the next UTC day's ranking with the existing FastText model, then uploads it to
a private Cloudflare R2 bucket. The Worker serves only the date and the result
for a submitted guess; it never returns the ranking map or secret word.

## Cloudflare resources

The private R2 bucket `contextai-rankings` has already been created in the
Cloudflare account. It is in the Western Europe location and uses the Standard
storage class. Its public `r2.dev` domain is disabled. Keep the bucket private.

The Worker in `wrangler.jsonc` binds to this bucket as `RANKINGS`. If you
rename the bucket, update the Worker binding and the `CF_R2_BUCKET` Actions
variable together.

## One-time GitHub Actions setup

1. Create an R2 API token with **Object Read & Write** access limited to the
   `contextai-rankings` bucket.
2. Add these repository Actions secrets:
   - `CF_ACCOUNT_ID`
   - `CF_R2_ACCESS_KEY_ID`
   - `CF_R2_SECRET_ACCESS_KEY`
   - `DAILY_WORD_SEED` — generate with
     `python -c 'import secrets; print(secrets.token_urlsafe(48))'` and store
     the output as a private random value. Keep it unchanged so the answer
     order remains stable.
3. For Worker deployment, create an account API token using Cloudflare's
   **Edit Cloudflare Workers** permission policy and scope it to this account.
   Add it to repository Actions secrets as `CLOUDFLARE_API_TOKEN` and add
   `CLOUDFLARE_ACCOUNT_ID` as a secret too. No zone route permission is
   needed for the current workers.dev deployment; add it only if a custom
   route or domain is configured later.
4. Optionally set the repository Actions variable `CF_R2_BUCKET` to
   `contextai-rankings`; the workflow uses that name by default.

Do not make the R2 bucket public. The browser should only use
`/api/check/{word}`.

## Daily answer and ranking generation

The scheduled job runs at 23:15 UTC and precomputes tomorrow's UTC puzzle, so
the ranking exists before the daily reset. Run **Generate daily rankings**
manually once with today's UTC date to seed the first puzzle. Re-run manually
with `force=true` only when intentionally replacing an already published
puzzle.

Answers come from the existing guess vocabulary, restricted to single-token
ASCII English words of 4–12 letters with a word-frequency score of at least 3.
A private seed chooses a pseudo-random answer order; consecutive dates use
different answers until the eligible list cycles. The current ten-entry
`data/word_list.txt` is retained as legacy data and no longer limits the
daily answer pool. The frequency source is pinned to wordfreq 3.1.1. Its
frequency data includes SUBTLEX lists by Marc Brysbaert and colleagues; retain
that attribution if redistributing the frequency data.

## Deploy and test

From the repository root:

```sh
npm --prefix frontend ci
npm --prefix frontend run build
npx --yes wrangler@4 dev --config wrangler.jsonc
```

The Worker reads UTC date keys in R2 named
`rankings/YYYY-MM-DD.json`. Check the health route at `/api/health`, the
date route at `/api/today`, and a guess with `/api/check/example`.
