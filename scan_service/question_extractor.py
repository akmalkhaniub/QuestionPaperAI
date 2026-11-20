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
    "Evaluate": ["evaluate", "assess", "justify", "critique", "validate"],
    "Create": ["create", "design", "formulate", "construct", "propose", "synthesize"],
}

_BLOOM_PATTERNS = {
    level: re.compile(
        r"\b(?:" + "|".join(re.escape(kw) for kw in keywords) + r")\b",
        re.IGNORECASE,
    )
    for level, keywords in BLOOM_TAXONOMY_KEYWORDS.items()
}

_LATEX_SPECIAL_CHARS = {
    "\\": r"\textbackslash{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
}
_LATEX_ESCAPE_RE = re.compile(r"([\\&%$#_{}])")


def escape_latex_text(text: str) -> str:
    """Escape special LaTeX characters so arbitrary exam text compiles safely."""
    return _LATEX_ESCAPE_RE.sub(lambda m: _LATEX_SPECIAL_CHARS[m.group(1)], text)


class QuestionExtractorEngine:
    """Parses raw question paper text into structured JSON and LaTeX format."""

    @staticmethod
    def classify_blooms_taxonomy(question_text: str) -> str:
        """Classify question cognitive depth according to Bloom's Taxonomy."""
        for level, pattern in _BLOOM_PATTERNS.items():
            if pattern.search(question_text):
                return level
        return "Understand"

    @staticmethod
    def parse_scanned_paper(raw_text: str) -> List[Dict[str, Any]]:
        """Parse unformatted question paper text into structured question blocks."""
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        parsed_questions: List[Dict[str, Any]] = []

        q_pattern = re.compile(r"^(?:Q\d+|Q|\d+)[\.\)]\s*(.*)", re.IGNORECASE)

        def finalize(q: Dict[str, Any]) -> Dict[str, Any]:
            q["blooms_level"] = QuestionExtractorEngine.classify_blooms_taxonomy(q["question"])
            return q

        current_q = None
        for line in lines:
            match = q_pattern.match(line)
            if match:
                if current_q:
                    parsed_questions.append(finalize(current_q))
                text = match.group(1)
                current_q = {
                    "question": text,
                    "blooms_level": "Understand",
                    "options": [],
                }
            elif current_q and line.startswith(("-", "*", "A)", "B)", "C)", "D)")):
                current_q["options"].append(line)
            elif current_q:
                current_q["question"] = f"{current_q['question']} {line}".strip()

        if current_q:
            parsed_questions.append(finalize(current_q))

        return parsed_questions

    @staticmethod
    def export_to_latex(questions: List[Dict[str, Any]], escape_latex: bool = True) -> str:
        """Export question blocks into standard LaTeX exam document format."""
        fmt = escape_latex_text if escape_latex else (lambda s: s)
        latex = [
            "\\documentclass{article}",
            "\\usepackage{amsmath}",
            "\\begin{document}",
            "\\title{Generated Question Paper}",
            "\\maketitle\n",
            "\\begin{enumerate}",
        ]

        for q in questions:
            latex.append(f"  \\item {fmt(q['question'])} \\hfill [{fmt(q['blooms_level'])}]")
            if q.get("options"):
                latex.append("  \\begin{itemize}")
                for opt in q["options"]:
                    latex.append(f"    \\item {fmt(opt)}")
                latex.append("  \\end{itemize}")

        latex.append("\\end{enumerate}")
        latex.append("\\end{document}")
        return "\n".join(latex)
