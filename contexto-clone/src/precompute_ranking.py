import json
import os
from datetime import datetime
from similarity_engine import get_word_similarity

# Load words from JSON file
def load_word_list(filepath="data/word_list.json"):
    print("Loading word list...")  # ✅ Debugging print
    with open(filepath, "r") as file:
        data = json.load(file)
    print(f"Loaded {len(data.keys())} words.")  # ✅ Debugging print
    return set(data.keys())  # Extract words as a set

# Compute similarity rankings for a given word
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
    secret_word = "ostrich"  # Replace with dynamic daily selection logic
    word_list = load_word_list()

    ranked_dict = rank_words(secret_word, word_list)

    # Save rankings with timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_file = "data/rankings.json"
    
    print(f"Saving rankings to {output_file}...")  # ✅ Debugging print
    with open(output_file, "w") as f:
        json.dump(ranked_dict, f, indent=4)

    print("✅ Ranking process complete!")  # ✅ Final success message
