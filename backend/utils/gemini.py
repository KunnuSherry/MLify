import os
import textwrap
from typing import List, Dict, Any
# Gemini SDK
import google.generativeai as genai

def _summarize_for_prompt(d: Dict[str, float], top_k: int = 10) -> List[Dict[str, float]]:
    """Top-k by absolute value; keeps payload concise."""
    if not isinstance(d, dict):
        return []
    return [
        {"feature": k, "corr": float(v)}
        for k, v in sorted(d.items(), key=lambda kv: abs(kv[1]), reverse=True)[:top_k]
    ]

def get_gemini_insights(
    target: str,
    numeric_corr: Dict[str, float],
    cat_corr: Dict[str, float],
    dataset_profile: Dict[str, Any],
    max_points: int = 3,
) -> List[str]:
    """
    Calls Gemini and returns up to `max_points` insight bullets.
    Safe: short payload, deterministic structure.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return []

    genai.configure(api_key=api_key)

    # Model can be adjusted; 1.5-pro is strong on reasoning.
    model = genai.GenerativeModel("gemini-1.5-pro")

    numeric_top = _summarize_for_prompt(numeric_corr, 10)
    cat_top = _summarize_for_prompt(cat_corr, 10)

    system_instructions = textwrap.dedent(f"""
    You are a senior data analyst. You receive:
      • target column name
      • top correlations of numeric features with the target (Pearson)
      • top correlations of encoded categorical features with the target
      • a tiny dataset profile (rows, columns)

    TASK:
      • Produce {max_points} concise, decision-ready bullets (max 20 words each).
      • Avoid restating raw numbers; interpret what they mean.
      • If a correlation is small or negative, explain briefly and practically.
      • No hedging like “may”/“might” unless warranted.
      • No code; no tables; just bullets.
    """)

    user_payload = {
        "target": target,
        "dataset_profile": dataset_profile,  # e.g. {"rows": 1234, "cols": 27}
        "numeric_correlations_top": numeric_top,
        "categorical_correlations_top": cat_top,
    }

    prompt = (
        "DATA (JSON):\n"
        f"{user_payload}\n\n"
        "OUTPUT:\n"
        f"Return exactly {max_points} bullets as a JSON list of strings."
    )

    try:
        resp = model.generate_content(system_instructions + "\n\n" + prompt)
        text = (resp.text or "").strip()
        # Attempt to parse a JSON list; if parsing fails, fallback to line split
        import json
        insights = []
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                insights = [str(x) for x in parsed][:max_points]
        except Exception:
            # fallback: split by lines / bullets
            for line in text.splitlines():
                line = line.strip("-• ").strip()
                if line:
                    insights.append(line)
                if len(insights) >= max_points:
                    break
        # Final cleanup/trim
        return [i[:220] for i in insights][:max_points]
    except Exception:
        return []
