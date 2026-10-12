# Daily ranking automation and Cloudflare runtime

The frontend stays React/Vite. A scheduled GitHub Actions workflow precomputes
the next UTC day's ranking with the existing FastText model, then uploads it to
a private Cloudflare R2 bucket. The Worker serves only the date and the result
for a submitted guess; it never returns the ranking map or secret word.

## One-time Cloudflare setup

1. Create a private R2 bucket named `contextai-rankings` (or set the
   `CF_R2_BUCKET` repository variable to a different name).
2. Create an R2 API token with **Object Read & Write** access to that bucket.
3. Add these repository Actions secrets:
   - `CF_ACCOUNT_ID`
   - `CF_R2_ACCESS_KEY_ID`
   - `CF_R2_SECRET_ACCESS_KEY`
   - `DAILY_WORD_SEED` — a private random value of at least 32 characters.
     Keep it unchanged so scheduled retries select the same daily answers.
4. Bind the same bucket to the Worker in `wrangler.jsonc`.
5. Create a Cloudflare API token with Workers Scripts:Edit and account Workers
   Routes:Edit permissions; use it with `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID` when deploying the Worker.

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
daily answer pool.

## Deploy and test

From the repository root:

```sh
npm --prefix frontend ci
npm --prefix frontend run build
npx wrangler dev
```

The Worker reads UTC date keys in R2 named
`rankings/YYYY-MM-DD.json`. Check the health route at `/api/health`, the
date route at `/api/today`, and a guess with `/api/check/example`.
