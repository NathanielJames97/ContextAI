import json
import os
import random
from datetime import datetime
from similarity_engine import get_word_similarity

# File paths
WORD_LIST_PATH = "data/word_list.json"
RANKINGS_PATH = "data/rankings.json"
DAILY_WORD_PATH = "data/daily_word.json"

# Load word list
def load_word_list(filepath=WORD_LIST_PATH):
    print("Loading word list...")  # ✅ Debugging print
    with open(filepath, "r") as file:
        data = json.load(file)
    print(f"Loaded {len(data.keys())} words.")  # ✅ Debugging print
    return list(data.keys())  # Extract words as a list

# Select a random daily word
def select_daily_word(word_list):
    daily_word = random.choice(word_list)
    print(f"🎯 Selected Daily Word: {daily_word}")
    return daily_word

# Compute similarity rankings for the daily word
def rank_words(secret_word, word_list):
    print(f"Ranking words for: {secret_word}")  # ✅ Debugging print
    similarities = {}

    for idx, word in enumerate(word_list):
        if idx % 100 == 0:  # Print progress every 100 words
            print(f"Processing {idx}/{len(word_list)}: {word}")

        try:
            similarities[word] = get_word_similarity(secret_word, word)
        except KeyError:
            continue  # Skip words not in model

    print("Sorting words by similarity...")  # ✅ Debugging print
    sorted_words = sorted(similarities.items(), key=lambda x: x[1], reverse=True)
    return {word: rank+1 for rank, (word, _) in enumerate(sorted_words)}

if __name__ == "__main__":
    # Select a new daily word
    word_list = load_word_list()
    daily_word = select_daily_word(word_list)

    # Save daily word for frontend access
    with open(DAILY_WORD_PATH, "w") as f:
        json.dump({"daily_word": daily_word}, f)

    # Compute and save rankings
    ranked_dict = rank_words(daily_word, word_list)

    print(f"Saving rankings to {RANKINGS_PATH}...")  # ✅ Debugging print
    with open(RANKINGS_PATH, "w") as f:
        json.dump(ranked_dict, f, indent=4)

    print("✅ Ranking process complete!")  # ✅ Final success message
