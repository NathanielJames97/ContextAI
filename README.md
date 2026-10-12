# ContextAI

ContextAI is a daily word game about meaning. Guess words, follow their semantic ranks, and find the hidden answer. A new puzzle is published for each UTC day.

## How to play

- Enter a word and check its rank.
- A smaller rank means the word is closer in meaning to the answer; rank **1** is the answer.
- Keep guessing. Your valid guesses are ordered from closest to furthest.
- Your daily progress and personal stats are saved in this browser on this device.
- After solving, share a spoiler-free result. The share grid shows rank bands without revealing the answer.

The game currently includes daily puzzles, ranked guess history, on-device play and solve counts, a daily solve streak, and spoiler-free sharing. Stats stay in the browser and do not sync between devices.

## Tech stack

- **Frontend:** React, Framer Motion, and Tailwind CSS
- **Build tool:** Vite builds the static frontend bundle
- **Live hosting and API:** Cloudflare Workers Static Assets
- **Daily rankings:** Private Cloudflare R2 bucket
- **Puzzle generation:** Generated locally and published to Cloudflare R2

The Worker returns the date and the result of an individual guess. The private ranking map and answer are not sent to the browser.

## Run locally

```sh
npm ci --prefix frontend
npm run build --prefix frontend
npx --yes wrangler@4 dev --config wrangler.jsonc
```

The Worker exposes `/api/health`, `/api/today`, and `/api/check/{word}`. To load a playable local puzzle, configure the R2 binding and seed a daily ranking using [CloudflareSetup.md](CloudflareSetup.md).

## Deploy

Build and deploy from the repository root with Wrangler:

```sh
npm ci --prefix frontend
npm run build --prefix frontend
npx --yes wrangler@4 deploy --config wrangler.jsonc
```

Daily rankings are generated locally and uploaded to the private R2 bucket. See [CloudflareSetup.md](CloudflareSetup.md) for the commands and required credentials.

See [CloudflareSetup.md](CloudflareSetup.md) for R2 setup, first-puzzle bootstrap, and deployment details. The live workers.dev address is shown for the `contextai` Worker in the Cloudflare dashboard under **Workers & Pages → contextai → Settings → Domains & Routes**.

## Repository layout

```text
frontend/                 React game and static assets
worker/index.js           Daily puzzle and guess API
src/                      Ranking generation and game data logic
data/                     Source word data
wrangler.jsonc             Worker, static assets, and R2 binding
CloudflareSetup.md         Cloudflare deployment and ranking setup
```

## Roadmap

- Puzzle archive and cross-device progress
- More ways to explore semantic relationships
- Multiplayer and themed rounds

## License

MIT
