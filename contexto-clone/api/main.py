from fastapi import FastAPI
import json
import random
import datetime
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:5173",
    "https://context-ai-beta.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load word list from JSON
def load_word_list(filepath="data/word_list.json"):
    with open(filepath, "r") as file:
        words = json.load(file)["words"]  # Adjust if your JSON structure is different
    return words

# Store the daily word
daily_word_data = {"word": None, "last_updated": None}

@app.get("/daily-word")
def get_daily_word():
    """Returns the daily challenge word, refreshing every 24 hours."""
    global daily_word_data

    today = datetime.date.today().isoformat()
    if daily_word_data["last_updated"] != today:
        words = load_word_list()
        daily_word_data["word"] = random.choice(words)  # Pick a new word
        daily_word_data["last_updated"] = today

    return {"word": daily_word_data["word"]}
