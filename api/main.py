from fastapi import FastAPI
import json
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(
    filename="contexto.log",
    level=logging.DEBUG,  # Change to ERROR for less logging
    format="%(asctime)s - %(levelname)s - %(message)s",
)

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://35.179.97.80",
    "http://35.179.97.80:5173",
    "http://35.179.97.80",
    "http://18.169.128.30",
    "http://18.169.128.30:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load daily word
def load_daily_word(filepath="data/daily_word.json"):
    try:
        with open(filepath, "r") as file:
            return json.load(file)
    except Exception as e:
        logging.error(f"Error loading daily word: {str(e)}")
        return {"error": "Failed to load daily word"}

# Load rankings
def load_rankings(filepath="data/rankings.json"):
    try:
        with open(filepath, "r") as file:
            return json.load(file)
    except Exception as e:
        logging.error(f"Error loading rankings: {str(e)}")
        return {}

@app.get("/")
def root():
    return {"message": "Contexto API is running!"}

@app.get("/daily_word")
def get_daily_word():
    return load_daily_word()

@app.get("/check/{word}")
def check_word(word: str):
    rankings = load_rankings()
    
    if not rankings:
        logging.error("Rankings data is empty or failed to load.")
        return {"error": "Rankings data not available"}

    rank = rankings.get(word.lower(), -1)

    logging.info(f"Checking word: {word}, Rank: {rank}")

    if rank == 1:
        return {"word": word, "rank": rank, "status": "correct"}
    elif rank > 0:
        return {"word": word, "rank": rank, "status": "try again"}
    else:
        return {"word": word, "rank": rank, "status": "word not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)