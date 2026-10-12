"""Precompute deterministic daily Contexto rankings and save them for Cloudflare R2."""
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile

import gensim.downloader as gensim_api

ROOT = Path(__file__).resolve().parents[1]
CANDIDATES = ROOT / "data" / "word_list.txt"
VOCABULARY = ROOT / "data" / "word_list.json"
OUTPUT_DIR = ROOT / "data" / "daily"
ANCHOR_DATE = date(2026, 10, 12)
MODEL_NAME = "fasttext-wiki-news-subwords-300"


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


def select_secret_word(target_date: date) -> str:
    candidates = [
        line.strip().lower()
        for line in CANDIDATES.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    if not candidates:
        raise ValueError(f"No secret-word candidates found in {CANDIDATES}")

    offset = (target_date - ANCHOR_DATE).days % len(candidates)
    return candidates[offset]


def load_vocabulary() -> list[str]:
    with VOCABULARY.open(encoding="utf-8") as file:
        data = json.load(file)

    words = data.keys() if isinstance(data, dict) else data
    return sorted({str(word).strip().lower() for word in words if str(word).strip()})


def build_rankings(secret_word: str, words: list[str]) -> dict[str, int]:
    model = gensim_api.load(MODEL_NAME)
    similarities: list[tuple[str, float]] = []

    for word in words:
        try:
            similarities.append((word, float(model.similarity(secret_word, word))))
        except KeyError:
            # FastText can still return vectors for many unseen forms, but skip
            # anything the model cannot represent.
            continue

    if not any(word == secret_word for word, _ in similarities):
        raise ValueError(
            f"Secret word {secret_word!r} is absent from the guess vocabulary "
            "or unsupported by the FastText model"
        )

    similarities.sort(key=lambda item: (-item[1], item[0]))
    return {word: index for index, (word, _) in enumerate(similarities, start=1)}


def main() -> None:
    args = parse_args()
    secret_word = select_secret_word(args.target_date)
    rankings = build_rankings(secret_word, load_vocabulary())

    args.output_dir.mkdir(parents=True, exist_ok=True)
    output_path = args.output_dir / f"{args.target_date.isoformat()}.json"

    # Atomic replacement avoids leaving a truncated ranking if the runner stops.
    with NamedTemporaryFile(
        "w", encoding="utf-8", dir=args.output_dir, delete=False
    ) as temporary:
        json.dump(rankings, temporary, separators=(",", ":"), ensure_ascii=False)
        temporary.write("\n")
        temporary_path = Path(temporary.name)

    temporary_path.replace(output_path)
    print(
        f"Created {output_path} for {args.target_date.isoformat()} "
        f"(secret word: {secret_word}; {len(rankings)} ranked words)"
    )


if __name__ == "__main__":
    main()
