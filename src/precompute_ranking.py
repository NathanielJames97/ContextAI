"""Precompute a stable, common-word daily ranking and save it for Cloudflare R2."""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
from datetime import date, datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile

import gensim.downloader as gensim_api
from wordfreq import zipf_frequency

ROOT = Path(__file__).resolve().parents[1]
VOCABULARY = ROOT / "data" / "word_list.json"
OUTPUT_DIR = ROOT / "data" / "daily"
ANCHOR_DATE = date(2026, 10, 12)
MODEL_NAME = "fasttext-wiki-news-subwords-300"
MIN_ZIPF_FREQUENCY = 3.0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--target-date",
        type=date.fromisoformat,
        default=datetime.now(timezone.utc).date(),
        help="UTC puzzle date in YYYY-MM-DD format (defaults to today's UTC date)",
    )
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR)
    return parser.parse_args()


def load_vocabulary() -> list[str]:
    with VOCABULARY.open(encoding="utf-8") as file:
        data = json.load(file)

    source_words = data.keys() if isinstance(data, dict) else data
    return sorted(
        {
            str(word).strip().lower()
            for word in source_words
            if str(word).strip()
        }
    )


def build_answer_bank(words: list[str]) -> list[str]:
    """Keep common, single-token English words that are valid guess entries."""
    return [
        word
        for word in words
        if word.isascii()
        and word.isalpha()
        and 4 <= len(word) <= 12
        and zipf_frequency(word, "en") >= MIN_ZIPF_FREQUENCY
    ]


def select_secret_word(target_date: date, answer_bank: list[str], seed: str) -> str:
    """Use a secret-keyed order so consecutive dates do not repeat an answer."""
    if len(seed) < 32:
        raise ValueError("DAILY_WORD_SEED must contain at least 32 characters")
    if not answer_bank:
        raise ValueError("The eligible daily answer bank is empty")

    key = seed.encode("utf-8")
    ordered_answers = sorted(
        answer_bank,
        key=lambda word: hmac.new(key, word.encode("utf-8"), hashlib.sha256).digest(),
    )
    offset = (target_date - ANCHOR_DATE).days % len(ordered_answers)
    return ordered_answers[offset]


def build_rankings(secret_word: str, words: list[str]) -> dict[str, int]:
    model = gensim_api.load(MODEL_NAME)
    similarities: list[tuple[str, float]] = []

    for word in words:
        try:
            similarities.append((word, float(model.similarity(secret_word, word))))
        except KeyError:
            continue

    if not any(word == secret_word for word, _ in similarities):
        raise ValueError(
            "The selected answer is absent from the guess vocabulary or "
            "unsupported by the FastText model"
        )

    similarities.sort(key=lambda item: (-item[1], item[0]))
    return {word: index for index, (word, _) in enumerate(similarities, start=1)}


def main() -> None:
    args = parse_args()
    seed = os.environ.get("DAILY_WORD_SEED", "")
    words = load_vocabulary()
    answer_bank = build_answer_bank(words)
    secret_word = select_secret_word(args.target_date, answer_bank, seed)
    rankings = build_rankings(secret_word, words)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    output_path = args.output_dir / f"{args.target_date.isoformat()}.json"

    with NamedTemporaryFile(
        "w", encoding="utf-8", dir=args.output_dir, delete=False
    ) as temporary:
        json.dump(rankings, temporary, separators=(",", ":"), ensure_ascii=False)
        temporary.write("\n")
        temporary_path = Path(temporary.name)

    temporary_path.replace(output_path)
    # Never print the answer: execution logs may be visible to other people.
    print(
        f"Created ranking for {args.target_date.isoformat()} "
        f"({len(rankings)} ranked words; {len(answer_bank)} eligible answers)"
    )


if __name__ == "__main__":
    main()
