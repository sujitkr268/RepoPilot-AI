import re
from typing import Dict, Any, List, Tuple


class IssueDiscoveryService:
    """
    Analyzes real GitHub issues, classifies them into engineering categories,
    computes difficulty estimates, infers required technical skills,
    and generates approach guidance.
    """

    LABEL_CLASSIFICATIONS = {
        "good first issue": ("Good First Issue", "beginner", 0.15),
        "good-first-issue": ("Good First Issue", "beginner", 0.15),
        "beginner": ("Good First Issue", "beginner", 0.15),
        "easy": ("Good First Issue", "easy", 0.25),
        "starter": ("Good First Issue", "beginner", 0.15),
        "first-timers-only": ("Good First Issue", "beginner", 0.10),
        "bug": ("Bug", "medium", 0.50),
        "defect": ("Bug", "medium", 0.50),
        "fix": ("Bug", "medium", 0.45),
        "feature": ("Feature Request", "medium", 0.60),
        "feature request": ("Feature Request", "hard", 0.70),
        "enhancement": ("Enhancement", "medium", 0.50),
        "documentation": ("Documentation", "beginner", 0.20),
        "docs": ("Documentation", "beginner", 0.20),
        "security": ("Security", "hard", 0.85),
        "vulnerability": ("Security", "expert", 0.95),
        "help wanted": ("Enhancement", "medium", 0.55),
    }

    SKILL_PATTERNS = {
        "Python": [r"\bpython\b", r"\bpy\b", r"\bpytest\b", r"\bpoetry\b", r"\bpip\b"],
        "TypeScript": [r"\btypescript\b", r"\bts\b", r"\bts-node\b"],
        "JavaScript": [r"\bjavascript\b", r"\bjs\b", r"\bnode\b", r"\bnpm\b"],
        "React": [r"\breact\b", r"\bhooks\b", r"\bjsx\b", r"\btsx\b"],
        "Next.js": [r"\bnextjs\b", r"\bnext\.js\b", r"\bapp router\b"],
        "Rust": [r"\brust\b", r"\bcargo\b"],
        "Go": [r"\bgolang\b", r"\bgo\b"],
        "Docker": [r"\bdocker\b", r"\bcontainer\b", r"\bdockerfile\b"],
        "SQL/Database": [r"\bsql\b", r"\bpostgres\b", r"\bmigration\b", r"\balembic\b", r"\bprisma\b"],
        "CSS/Tailwind": [r"\bcss\b", r"\btailwind\b", r"\bstyling\b", r"\bui\b"],
        "API/REST": [r"\bapi\b", r"\brest\b", r"\bendpoint\b", r"\bhttp\b", r"\bgraphql\b"],
    }

    @classmethod
    def classify_issue(
        cls,
        title: str,
        body: str,
        labels: List[str],
        primary_language: str = "General",
    ) -> Dict[str, Any]:
        title_lower = title.lower()
        body_lower = (body or "").lower()
        text_full = f"{title_lower} {body_lower}"

        classification = "Enhancement"
        difficulty = "medium"
        difficulty_score = 0.50

        # Check official GitHub labels first
        matched_label = False
        for lbl in labels:
            lbl_clean = lbl.lower().strip()
            if lbl_clean in cls.LABEL_CLASSIFICATIONS:
                classification, difficulty, difficulty_score = cls.LABEL_CLASSIFICATIONS[lbl_clean]
                matched_label = True
                break

        # If not determined by label, infer from title and body
        if not matched_label:
            if any(w in title_lower for w in ["bug", "fix", "error", "crash", "fails", "broken", "issue", "exception"]):
                classification = "Bug"
                difficulty = "medium"
                difficulty_score = 0.50
            elif any(w in title_lower for w in ["doc", "readme", "typo", "guide", "tutorial", "comment"]):
                classification = "Documentation"
                difficulty = "beginner"
                difficulty_score = 0.20
            elif any(w in title_lower for w in ["security", "cve", "vulnerability", "auth bypass", "leak"]):
                classification = "Security"
                difficulty = "hard"
                difficulty_score = 0.85
            elif any(w in title_lower for w in ["add", "feature", "support", "new", "implement", "proposal"]):
                classification = "Feature Request"
                difficulty = "medium"
                difficulty_score = 0.65

        # Infer required skills
        skills: List[str] = []
        if primary_language and primary_language != "General":
            skills.append(primary_language)

        for skill, patterns in cls.SKILL_PATTERNS.items():
            if any(re.search(pat, text_full) for pat in patterns):
                if skill not in skills:
                    skills.append(skill)

        if not skills:
            skills = [primary_language or "General Engineering"]

        # Formulate suggested approach and suitability
        suggested_approach = cls._generate_suggested_approach(classification, title)
        suitability_reason = cls._generate_suitability(classification, difficulty, skills)

        return {
            "classification": classification,
            "estimated_difficulty": difficulty,
            "difficulty_score": difficulty_score,
            "required_skills": skills[:4],
            "suggested_approach": suggested_approach,
            "suitability_reason": suitability_reason,
        }

    @classmethod
    def _generate_suggested_approach(cls, classification: str, title: str) -> str:
        if classification == "Good First Issue":
            return f"1. Reproduce or locate the context in the codebase.\n2. Review related tests.\n3. Make minimal targeted edits.\n4. Run the local test suite."
        elif classification == "Bug":
            return f"1. Write a failing regression test replicating '{title[:60]}'.\n2. Trace logic to locate the defect.\n3. Apply fix preserving backwards compatibility.\n4. Confirm tests pass."
        elif classification == "Documentation":
            return f"1. Inspect existing docs formatting.\n2. Update relevant Markdown or docstrings.\n3. Verify markdown links and rendering."
        elif classification == "Security":
            return f"1. Perform threat modeling on affected inputs.\n2. Implement strict validation and sanitization.\n3. Add security boundary unit tests."
        else:
            return f"1. Draft an implementation plan covering affected files.\n2. Build the feature incrementally.\n3. Add unit and integration tests."

    @classmethod
    def _generate_suitability(cls, classification: str, difficulty: str, skills: List[str]) -> str:
        skills_str = ", ".join(skills)
        if difficulty in ("beginner", "easy"):
            return f"Great onboarding issue! Well-isolated scope involving {skills_str} with clear reproduction steps."
        elif difficulty == "medium":
            return f"Standard open-source contribution for developers comfortable with {skills_str} and unit tests."
        else:
            return f"Complex architectural task requiring deeper familiarity with {skills_str} and system edge cases."
