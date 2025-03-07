# 🚀 Development Workflow for Contexto on AWS VPS

## 1️⃣ Development Environment: Work Locally in VS Code

### ✅ Set Up Your Local Dev Environment
- Open **VS Code**.
- Clone your repository:
  ```bash
  git clone https://github.com/NathanielJames97/ContextAI.git
  cd ContextAI
  ```
- Create a **Python virtual environment** (for backend):
  ```bash
  cd backend
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  ```
- Install frontend dependencies:
  ```bash
  cd ../frontend
  npm install
  ```

### ✅ Run Locally for Testing
- **Run FastAPI locally**:
  ```bash
  cd backend
  uvicorn main:app --host 127.0.0.1 --port 8000 --reload
  ```
- **Run React frontend locally**:
  ```bash
  cd frontend
  npm run dev
  ```
- Open the game at `http://localhost:5173/`.

### ✅ Push Your Code to GitHub
After making changes:
```bash
git add .
git commit -m "Updated feature XYZ"
git push origin main  # Or your dev branch
```

---

## 2️⃣ Deploy Changes to AWS VPS

### ✅ SSH into the Server
```bash
ssh -i your-key.pem ubuntu@your-server-ip
```

### ✅ Navigate to Your Project Directory
```bash
cd /home/ubuntu/ContextAI
```

### ✅ Pull Latest Code
```bash
git pull origin main  # Or your branch
```

### ✅ Restart Backend API

#### (If Using Supervisor)
```bash
sudo supervisorctl restart contexto
```

#### (If Using Screen)
1. Reconnect to the running session:
   ```bash
   screen -r contexto
   ```
2. Stop the old process (`CTRL + C`).
3. Restart the FastAPI server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
4. Detach from the session (`CTRL + A`, then `D`).

---

### ✅ Rebuild & Restart Frontend
```bash
cd frontend
npm install
npm run build
pm2 restart contexto_frontend
```

---

### ✅ Verify the Application is Running
- **Check if the backend is running**:
  ```bash
  curl http://your-server-ip:8000/
  ```
  It should return:
  ```json
  {"message": "Contexto API is running!"}
  ```
- **Check if the frontend is accessible**:
  Open **`http://your-server-ip`** in a browser.

---

## 3️⃣ Optional: Automate Deployments

### ✅ Use GitHub Webhooks (CI/CD)
- Set up GitHub Actions or a **pull & deploy script** on the server that automatically pulls changes when you push to GitHub.

### ✅ Use Nginx for Reverse Proxy
- Ensure Nginx forwards requests from `http://your-domain.com` to `http://127.0.0.1:8000` (backend) and `http://127.0.0.1:3000` (frontend).

---

## 4️⃣ Debugging & Logs

### ✅ Backend API Logs
- If using Supervisor:
  ```bash
  tail -f /var/log/contexto.out.log
  ```
- If using Screen:
  ```bash
  screen -r contexto
  ```

### ✅ Frontend Logs
- If using PM2:
  ```bash
  pm2 logs contexto_frontend
  ```

---

# 🎯 Summary of Your Workflow

| Task | Command |
|------|---------|
| **Develop locally** | Edit code in VS Code, run API (`uvicorn`), run frontend (`npm run dev`) |
| **Push to GitHub** | `git add . && git commit -m "message" && git push origin main` |
| **Deploy on VPS** | `ssh ubuntu@your-server-ip && cd /home/ubuntu/ContextAI && git pull origin main` |
| **Restart backend** | `sudo supervisorctl restart contexto` or `screen -r contexto` |
| **Restart frontend** | `cd frontend && npm run build && pm2 restart contexto_frontend` |
| **Check backend logs** | `tail -f /var/log/contexto.out.log` |
| **Check frontend logs** | `pm2 logs contexto_frontend` |

---
