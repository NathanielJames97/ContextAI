from fastapi import FastAPI
import json
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()  # ✅ Only one instance of FastAPI

# ✅ Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://context-ai-beta.vercel.app/"],  # ✅ Replace with your actual Vercel domain
    allow_credentials=True,
    allow_methods=["*"],  # ✅ Allow all HTTP methods
    allow_headers=["*"],  # ✅ Allow all headers
)

# Load precomputed rankings
def load_rankings(filepath="data/rankings.json"):
    with open(filepath, "r") as file:
        return json.load(file)

@app.get("/")
def root():
    return {"message": "Contexto API is running!"}

@app.get("/check/{word}")
def check_word(word: str):
    rankings = load_rankings()
    rank = rankings.get(word.lower(), -1)

    if rank == 1:
        return {"word": word, "rank": rank, "status": "correct"}
    elif rank > 0:
        return {"word": word, "rank": rank, "status": "try again"}
    else:
        return {"word": word, "rank": rank, "status": "word not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
