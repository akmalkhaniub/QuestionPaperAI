"""
Question Extractor & Bloom's Taxonomy Classifier Engine for QuestionPaperAI
Extracts questions from OCR scan text, classifies cognitive level, and formats to LaTeX.
"""
import re
from typing import List, Dict, Any

BLOOM_TAXONOMY_KEYWORDS = {
    "Remember": ["define", "list", "name", "recall", "state", "what is"],
    "Understand": ["explain", "describe", "summarize", "discuss", "interpret"],
    "Apply": ["calculate", "compute", "solve", "demonstrate", "implement", "apply"],
    "Analyze": ["compare", "contrast", "differentiate", "analyze", "derive"],
    "Evaluate": ["evaluate", "assess", "justify", "critique", "validate"]
}

class QuestionExtractorEngine:
    """Parses raw question paper text into structured JSON and LaTeX format."""

    @staticmethod
    def classify_blooms_taxonomy(question_text: str) -> str:
        """Classify question cognitive depth according to Bloom's Taxonomy."""
        lower_q = question_text.lower()
        for level, keywords in BLOOM_TAXONOMY_KEYWORDS.items():
            if any(kw in lower_q for kw in keywords):
                return level
        return "Understand"

    @staticmethod
    def parse_scanned_paper(raw_text: str) -> List[Dict[str, Any]]:
        """Parse unformatted question paper text into structured question blocks."""
        lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
        parsed_questions = []

        q_pattern = re.compile(r'^(?:Q\d+|Q|\d+)[\.\)]\s*(.*)', re.IGNORECASE)

        current_q = None
        for line in lines:
            match = q_pattern.match(line)
            if match:
                if current_q:
                    parsed_questions.append(current_q)
                text = match.group(1)
                current_q = {
                    "question": text,
                    "blooms_level": QuestionExtractorEngine.classify_blooms_taxonomy(text),
                    "options": []
                }
            elif current_q and line.startswith(('-', '*', 'A)', 'B)', 'C)', 'D)')):
                current_q["options"].append(line)
            elif current_q:
                current_q["question"] += " " + line

        if current_q:
            parsed_questions.append(current_q)

        return parsed_questions

    @staticmethod
    def export_to_latex(questions: List[Dict[str, Any]]) -> str:
        """Export question blocks into standard LaTeX exam document format."""
        latex = [
            "\\documentclass{article}",
            "\\usepackage{amsmath}",
            "\\begin{document}",
            "\\title{Generated Question Paper}",
            "\\maketitle\n",
            "\\begin{enumerate}"
        ]

        for q in questions:
            latex.append(f"  \\item {q['question']} \\hfill [{q['blooms_level']}]")
            if q.get("options"):
                latex.append("  \\begin{itemize}")
                for opt in q["options"]:
                    latex.append(f"    \\item {opt}")
                latex.append("  \\end{itemize}")

        latex.append("\\end{enumerate}")
        latex.append("\\end{document}")
        return "\n".join(latex)
