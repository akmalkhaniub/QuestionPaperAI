import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scan_service"))

from question_extractor import QuestionExtractorEngine


class QuestionExtractorTests(unittest.TestCase):
    def test_word_boundary_prevents_substring_false_positives(self):
        # "statement" must not match "state" ("Remember"); "design" should match "Create"
        level = QuestionExtractorEngine.classify_blooms_taxonomy(
            "Given the problem statement, design a fault-tolerant queue."
        )
        self.assertEqual(level, "Create")

    def test_multiline_question_reclassifies_blooms_after_full_parse(self):
        raw = (
            "Q1. Consider the following distributed consensus protocol.\n"
            "Evaluate its trade-offs under network partitions.\n"
            "A) Strong consistency\n"
            "B) Eventual consistency\n"
            "2) Define CAP theorem."
        )
        parsed = QuestionExtractorEngine.parse_scanned_paper(raw)
        self.assertEqual(len(parsed), 2)
        self.assertEqual(parsed[0]["blooms_level"], "Evaluate")
        self.assertEqual(len(parsed[0]["options"]), 2)
        self.assertEqual(parsed[1]["blooms_level"], "Remember")

    def test_export_to_latex_escapes_special_characters(self):
        questions = [
            {
                "question": "Calculate 50% of $100 for C++ & Python_3.",
                "blooms_level": "Apply",
                "options": ["A) 50% #1"],
            }
        ]
        latex = QuestionExtractorEngine.export_to_latex(questions)
        self.assertIn(r"50\%", latex)
        self.assertIn(r"\$100", latex)
        self.assertIn(r"\&", latex)
        self.assertIn(r"Python\_3", latex)
        self.assertIn(r"\#1", latex)


if __name__ == "__main__":
    unittest.main()
