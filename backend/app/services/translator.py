"""Translation service — translates dynamic AI-generated content via Google Gemini.

Used to translate analysis summaries, recommendations, and other dynamic text
that cannot be pre-translated in static dictionaries.
"""

from __future__ import annotations

import logging

from google import genai

from app.config import settings

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """\
You are a professional financial document translator. Translate the provided text
from English to {target_language}.

RULES:
- Preserve ALL numbers, percentages, and currency values exactly as they appear.
- Keep financial terms like "Profit Margin", "Burn Rate", "Cash Runway",
  "Debt Ratio", "Liquidity Ratio", "Revenue Trend", "Expense Trend",
  "Altman Z-Score" in English — do NOT translate them.
- Preserve any Markdown formatting (bold, bullets, headers).
- Translate naturally — do not produce a word-for-word literal translation.
- If the input is already in the target language, return it unchanged.
- Return ONLY the translated text, with no explanations or preambles.
"""

LANGUAGE_NAMES = {
    "bg": "Bulgarian",
    "en": "English",
}


class TranslationService:
    """Translates dynamic content using Gemini."""

    def __init__(self) -> None:
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = "gemini-2.0-flash"

    async def translate(self, text: str, target_language: str) -> str:
        """Translate *text* into *target_language* (ISO 639-1 code).

        Returns the original text unchanged when:
        - the target language is English (source language)
        - the text is empty
        """
        if not text or not text.strip():
            return text

        if target_language == "en":
            return text

        lang_name = LANGUAGE_NAMES.get(target_language, target_language)
        system_prompt = SYSTEM_PROMPT.format(target_language=lang_name)

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=text,
                config={
                    "system_instruction": system_prompt,
                    "max_output_tokens": 4096,
                    "temperature": 0.2,
                },
            )
            translated = response.text
            if translated:
                return translated.strip()
            return text
        except Exception:
            logger.exception("Translation failed for target=%s", target_language)
            return text

    async def translate_batch(
        self, texts: list[str], target_language: str
    ) -> list[str]:
        """Translate multiple texts, preserving order."""
        if target_language == "en" or not texts:
            return list(texts)

        combined = "\n---SPLIT---\n".join(texts)
        lang_name = LANGUAGE_NAMES.get(target_language, target_language)
        system_prompt = SYSTEM_PROMPT.format(target_language=lang_name) + (
            "\n\nThe input contains multiple text blocks separated by '---SPLIT---'. "
            "Translate each block independently and keep the same separator between them."
        )

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=combined,
                config={
                    "system_instruction": system_prompt,
                    "max_output_tokens": 8192,
                    "temperature": 0.2,
                },
            )
            translated = response.text
            if translated:
                parts = translated.strip().split("---SPLIT---")
                parts = [p.strip() for p in parts]
                if len(parts) == len(texts):
                    return parts
            return list(texts)
        except Exception:
            logger.exception("Batch translation failed for target=%s", target_language)
            return list(texts)
