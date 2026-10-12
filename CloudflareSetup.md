# Daily ranking automation and Cloudflare runtime

The frontend stays React/Vite. A scheduled GitHub Actions workflow precomputes the
next UTC day's ranking with the existing FastText model, then uploads it to a
private Cloudflare R2 bucket. The Worker serves only the date and the result for
a submitted guess; it never returns the ranking map or secret word.

## One-time Cloudflare setup

1. Create a private R2 bucket named `contextai-rankings` (or set the
   `CF_R2_BUCKET` repository variable to a different name).
2. Create an R2 API token with **Object Read & Write** access to that bucket.
3. Add these repository Actions secrets:
   - `CF_ACCOUNT_ID`
   - `CF_R2_ACCESS_KEY_ID`
   - `CF_R2_SECRET_ACCESS_KEY`
4. Bind the same bucket to the Worker in `wrangler.jsonc`.
5. Create a Cloudflare API token with Workers Scripts:Edit and account Workers
   Routes:Edit permissions; use it with `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID` when deploying the Worker.

Do not make the R2 bucket public. The browser should only use `/api/check/{word}`.

## First puzzle and recurring generation

The scheduled job runs at 23:15 UTC and precomputes tomorrow's UTC puzzle, so
the ranking exists before the daily reset. Run **Generate daily rankings**
manually once with today's UTC date to seed the first puzzle. Re-run manually
with `force=true` only when intentionally replacing an already published
puzzle.

The target word is selected deterministically by cycling through
`data/word_list.txt`, anchored at 2026-10-12. The list currently has ten
entries, so extend that curated list before launch to avoid frequent repeats.
The large `data/word_list.json` remains the vocabulary of possible guesses.

## Deploy and test

From the repository root:

```sh
npm --prefix frontend install
npm --prefix frontend run build
npx wrangler dev
```

The Worker reads UTC date keys in R2 named
`rankings/YYYY-MM-DD.json`. Check the health route at `/api/health`, the
date route at `/api/today`, and a guess with `/api/check/example`.
