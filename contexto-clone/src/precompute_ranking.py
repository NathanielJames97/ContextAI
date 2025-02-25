import json
from similarity_engine import get_word_similarity

# Load words from JSON file
def load_word_list(filepath="data/word_list.json"):
    with open(filepath, "r") as file:
        data = json.load(file)
    return set(data.keys())  # Extract words as a set

# Compute similarity rankings for a given word
def rank_words(secret_word, word_list):
    similarities = {}

    for word in word_list:
        try:
            similarities[word] = get_word_similarity(secret_word, word)
        except KeyError:
            continue  # Skip words not in model

    # Sort words by similarity (higher similarity first)
    sorted_words = sorted(similarities.items(), key=lambda x: x[1], reverse=True)

    return {word: rank+1 for rank, (word, _) in enumerate(sorted_words)}

if __name__ == "__main__":
    secret_word = "Server"  # Replace with dynamic daily selection logic
    word_list = load_word_list()

    ranked_dict = rank_words(secret_word, word_list)

    # Save rankings as JSON
    with open("data/rankings.json", "w") as f:
        json.dump(ranked_dict, f, indent=4)

    print("Ranking saved to data/rankings.json")
