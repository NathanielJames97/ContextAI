# Contexto Word Game Clone

## 🎮 About the Game

Contexto is a word-guessing game where players attempt to find a secret word based on **semantic similarity** rather than exact definitions. The game uses **AI-powered ranking** to provide feedback on guesses, making it a unique and engaging challenge.

## 🚀 Features

- **Daily Challenge Mode** – A new secret word every 24 hours.
- **Leaderboard** – Visual ranking with progress bars.
- **Streaks & Progress Tracking** – Rewards for long streaks.
- **Word History & Analysis** – Review past guesses and closest attempts.
- **Dark & Light Mode Toggle** – Customizable UI.
- **Mobile Optimization** – Fullscreen mode and swipe gestures.
- **Multi-language Support** (Upcoming) – Play in different languages.
- **Multiplayer Mode** (Upcoming) – Compete with friends.

## 🏗️ Tech Stack

### **Frontend** (React + Vite)

- **React (Vite)** – Fast and optimized UI rendering.
- **Tailwind CSS** – Modern styling.
- **Framer Motion** – Smooth animations.
- **Axios** – API communication.
- **Cloudflare Workers Static Assets** – Hosts the frontend and API together.

### **Backend** (FastAPI)

- **Cloudflare Workers** – Serves the same-origin game API.
- **Cloudflare R2** – Stores private, precomputed daily rankings.
- **FastText (Gensim)** – Computes each day's ranking in a scheduled GitHub Actions job.

## 📂 Project Structure

```
📦 Contexto-Clone
├── 📁 backend (FastAPI)
│   ├── main.py (API logic)
│   ├── word_list.json (Word dataset)
│   ├── requirements.txt (Dependencies)
│   └── Dockerfile (For deployment)
│
├── 📁 frontend (React + Vite)
│   ├── src/
│   │   ├── components/ (Game UI)
│   │   ├── pages/ (Game screens)
│   │   ├── App.tsx (Main app structure)
│   │   ├── index.tsx (Entry point)
│   │   ├── api.ts (Handles API requests)
│   │   ├── styles.css (Custom styles)
│   └── package.json (Dependencies)
│
├── 📁 deployment
│   ├── railway.json (Railway hosting config)
│   ├── vercel.json (Vercel hosting config)
│   └── docker-compose.yml (For local setup)
│
└── README.md (Project documentation)
```

## 🛠️ Installation & Setup

### Local Cloudflare runtime

```sh
npm ci --prefix frontend
npm run build --prefix frontend
npx --yes wrangler@4 dev --config wrangler.jsonc
```

The local Worker serves `/api/health`. To play the daily puzzle locally, configure
an R2 bucket and generate a ranking using the instructions in
[CloudflareSetup.md](CloudflareSetup.md).

### Cloudflare deployment

After adding the Cloudflare deployment secrets and creating the private R2
bucket, pushes to `master` deploy the frontend and Worker through GitHub Actions.
A second scheduled workflow precomputes tomorrow's daily ranking and publishes
it to R2. Follow [CloudflareSetup.md](CloudflareSetup.md) for the one-time setup
and first-puzzle bootstrap.

## 🎯 Roadmap

- ✅ **Basic UI & Word Guessing**
- ✅ **Leaderboard with similarity ranking**
- 🚧 **Daily Challenge Mode** (In progress)
- 🔜 **Multiplayer & Themed Rounds**
- 🔜 **Mobile App Version (APK)**
- 🔜 **Optimized Hosting on VPS**

## 📌 Contributing

Feel free to **fork**, submit **PRs**, and contribute! Open an **issue** if you find any bugs or want to suggest features.

## 📄 License

MIT License - Free to use and modify.

---

💡 **Want to play?** Visit the [Live Demo](https://contextai.vercel.app/)
