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
- **Vercel** – Hosting.

### **Backend** (FastAPI)

- **FastAPI** – Handles word similarity ranking and game logic.
- **FastText (Gensim)** – AI-based similarity engine.
- **JSON Word List** – Stores precomputed rankings.
- **CORS Middleware** – Enables frontend-backend communication.
- **Railway** – API hosting.

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

### **1️⃣ Clone the repository**

```sh
git clone https://github.com/NathanielJames97/ContextAI.git
cd ContextAI
```

### **2️⃣ Backend Setup (FastAPI + FastText)**

```sh
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### **3️⃣ Frontend Setup (React + Vite)**

```sh
cd frontend
npm install
npm run dev
```

### **4️⃣ Deployment**

- **Frontend:** Deploy on **Vercel**
- **Backend:** Deploy on **Railway**

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
