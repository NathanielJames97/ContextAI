import json

# Load precomputed rankings from JSON
def load_rankings(filepath="data/rankings.json"):
    with open(filepath, "r") as file:
        return json.load(file)  # Load rankings as dictionary

def check_guess(guess):
    rankings = load_rankings()
    return rankings.get(guess, -1)  # -1 if word not found

if __name__ == "__main__":
    guess = input("Enter your guess: ").strip().lower()
    rank = check_guess(guess)
    
    if rank == 1:
        print(f"Correct! '{guess}' is the secret word!")
    elif rank > 0:
        print(f"'{guess}' is ranked at {rank}. Try again!")
    else:
        print("Word not found. Try again!")
