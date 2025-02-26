from fastapi import FastAPI
import json
import random
import datetime
import os
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

# File to store the daily word persistently
DAILY_WORD_FILE = "data/daily_word.json"

def load_word_list(filepath="data/word_list.json"):
    """Load words from JSON file."""
    with open(filepath, "r") as file:
        words = json.load(file)["words"]  # Adjust if JSON structure is different
    return words

def save_daily_word(word, date):
    """Save the daily word and timestamp to a file."""
    with open(DAILY_WORD_FILE, "w") as file:
        json.dump({"word": word, "last_updated": date}, file)

def load_daily_word():
    """Load the daily word from the file, or return None if not found."""
    if os.path.exists(DAILY_WORD_FILE):
        with open(DAILY_WORD_FILE, "r") as file:
            try:
                return json.load(file)
            except json.JSONDecodeError:
                return None  # Handle file corruption
    return None

@app.get("/daily-word")
def get_daily_word():
    """Returns the daily challenge word, refreshing every 24 hours."""
    today = datetime.date.today().isoformat()
    
    # Try to load the saved daily word
    daily_word_data = load_daily_word()

    # If no word is stored or it's a new day, generate a new one
    if not daily_word_data or daily_word_data["last_updated"] != today:
        words = load_word_list()
        new_word = random.choice(words)
        daily_word_data = {"word": new_word, "last_updated": today}
        save_daily_word(new_word, today)  # Persist the word

    return {"word": daily_word_data["word"]}
