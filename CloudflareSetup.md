# Daily ranking automation and Cloudflare runtime

The frontend is built locally and hosted with the Worker as Cloudflare Workers
Static Assets. Generate each UTC day's ranking locally with the existing
FastText model, then upload it to the private Cloudflare R2 bucket. The Worker
serves only the date and the result for a submitted guess; it never returns the
ranking map or secret word.

## Cloudflare resources

The private R2 bucket `contextai-rankings` has already been created in the
Cloudflare account. It is in the Western Europe location and uses the Standard
storage class. Its public `r2.dev` domain is disabled. Keep the bucket private.

The Worker in `wrangler.jsonc` binds to this bucket as `RANKINGS`. If you
rename the bucket, update the Worker binding and the commands below.

## Local credentials

Wrangler must be authenticated to the Cloudflare account for deployment and
R2 uploads. Ranking generation also needs a stable private `DAILY_WORD_SEED`.
Generate one once with:

```sh
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Store it in a local environment variable or a private environment file that is
excluded from Git. Keep the same seed so the answer order remains stable.

Do not make the R2 bucket public. The browser should only use
`/api/check/{word}`.

## Daily answer and ranking generation

Generate and upload tomorrow's UTC puzzle before the daily reset. To seed the
first puzzle, use today's UTC date. Replacing an already published ranking
changes that day's answer and should be done only intentionally.

```sh
python -m pip install -r requirements-ranking.txt
python src/precompute_ranking.py --target-date YYYY-MM-DD
npx --yes wrangler@4 r2 object put contextai-rankings/rankings/YYYY-MM-DD.json --file data/daily/YYYY-MM-DD.json --content-type application/json --remote
```

Replace each `YYYY-MM-DD` with the same target date. The generator does not
print the answer. Keep the generated ranking file private; it contains every
word's rank and reveals the answer.

Answers come from the existing guess vocabulary, restricted to single-token
ASCII English words of 4–12 letters with a word-frequency score of at least 3.
A private seed chooses a pseudo-random answer order; consecutive dates use
different answers until the eligible list cycles. The current ten-entry
`data/word_list.txt` is retained as legacy data and no longer limits the
daily answer pool. The frequency source is pinned to wordfreq 3.1.1. Its
frequency data includes SUBTLEX lists by Marc Brysbaert and colleagues; retain
that attribution if redistributing the frequency data.

## Deploy and check

From the repository root:

```sh
npm --prefix frontend ci
npm --prefix frontend run build
npx --yes wrangler@4 deploy --config wrangler.jsonc
```

The Worker reads UTC date keys in R2 named
`rankings/YYYY-MM-DD.json`. Check the health route at `/api/health`, the
date route at `/api/today`, and a guess with `/api/check/example`.
