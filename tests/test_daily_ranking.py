import unittest
from datetime import date, timedelta

from src.precompute_ranking import (
    ANCHOR_DATE,
    build_answer_bank,
    select_secret_word,
)


class DailyAnswerTests(unittest.TestCase):
    def test_same_date_selects_same_answer(self):
        answer_bank = ["apple", "banana", "computer", "friendship"]
        seed = "a-private-seed-with-at-least-32-characters"

        first = select_secret_word(ANCHOR_DATE, answer_bank, seed)
        second = select_secret_word(ANCHOR_DATE, answer_bank, seed)

        self.assertEqual(first, second)

    def test_consecutive_days_do_not_repeat_until_bank_cycles(self):
        answer_bank = ["apple", "banana", "computer", "friendship"]
        seed = "a-private-seed-with-at-least-32-characters"
        answers = [
            select_secret_word(ANCHOR_DATE + timedelta(days=offset), answer_bank, seed)
            for offset in range(len(answer_bank))
        ]

        self.assertEqual(len(set(answers)), len(answer_bank))
        self.assertEqual(
            select_secret_word(
                ANCHOR_DATE + timedelta(days=len(answer_bank)),
                answer_bank,
                seed,
            ),
            answers[0],
        )

    def test_answer_bank_excludes_short_rare_and_long_tokens(self):
        words = ["cat", "apple", "hello", "xqzxq", "supercalifragilistic"]
        self.assertEqual(build_answer_bank(words), ["apple", "hello"])


if __name__ == "__main__":
    unittest.main()
