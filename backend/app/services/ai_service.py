"""
AI Assistant Service
====================
Dual-provider AI: tries Gemini first (free tier), falls back to OpenAI,
then to built-in rule-based responses — so it always works.

  Priority: Gemini (free) → OpenAI (paid) → rule-based (no key needed)

Get a free Gemini key at: https://aistudio.google.com/app/apikey
"""

from typing import Optional
from datetime import datetime

from app.config import settings
from app.models.schemas import AIQueryResponse, ChangeEvent

_gemini_model = None
_openai_client = None


def _get_gemini():
    global _gemini_model
    if _gemini_model is None and settings.GEMINI_API_KEY:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            generation_config={"temperature": 0.2, "max_output_tokens": 1024},
            system_instruction=SYSTEM_PROMPT,
        )
    return _gemini_model


def _get_openai():
    global _openai_client
    if _openai_client is None and settings.OPENAI_API_KEY:
        from openai import AsyncOpenAI
        _openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


SYSTEM_PROMPT = (
    "You are MetaChronos AI — a data intelligence assistant built on top of OpenMetadata. "
    "Help data engineers, analysts, and stewards understand:\n"
    "1. Why data quality issues occurred and when they started\n"
    "2. What downstream assets are at risk when a schema changes\n"
    "3. Who made a change and what was the intent\n"
    "4. How to remediate broken pipelines or governance gaps\n\n"
    "Always cite specific events, timestamps, and actor names. "
    "Suggest concrete next steps. Be concise but thorough. Use Markdown."
)


async def answer_query(
    question: str,
    context_events: list[ChangeEvent],
    entity_name: Optional[str] = None,
    extra_context: Optional[str] = None,
) -> AIQueryResponse:
    """Try Gemini → OpenAI → rule-based, in that order."""
    context_text = _build_context_text(context_events, entity_name, extra_context)
    prompt = (
        f"## Question\n{question}\n\n"
        f"## OpenMetadata Context\n{context_text}\n\n"
        "Provide root-cause analysis and actionable recommendations."
    )

    # 1. Try Gemini (free tier)
    gemini = _get_gemini()
    if gemini:
        try:
            resp = await gemini.generate_content_async(prompt)
            answer = resp.text or ""
            return AIQueryResponse(
                answer=answer,
                reasoning="Powered by Google Gemini (free tier)",
                relatedEvents=context_events[:5],
                suggestions=_extract_suggestions(answer),
            )
        except Exception:
            pass  # fall through to OpenAI

    # 2. Try OpenAI (paid fallback)
    openai_client = _get_openai()
    if openai_client:
        try:
            resp = await openai_client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=1024,
            )
            answer = resp.choices[0].message.content or ""
            return AIQueryResponse(
                answer=answer,
                reasoning="Powered by OpenAI",
                relatedEvents=context_events[:5],
                suggestions=_extract_suggestions(answer),
            )
        except Exception:
            pass  # fall through to rule-based

    # 3. Rule-based fallback (no key needed)
    return _rule_based_response(question, context_events, entity_name)


def _build_context_text(
    events: list[ChangeEvent],
    entity_name: Optional[str],
    extra: Optional[str],
) -> str:
    lines = []
    if entity_name:
        lines.append(f"**Entity:** {entity_name}")
    if events:
        lines.append(f"\n### Change Timeline ({len(events)} events)\n")
        for evt in events[:20]:
            from datetime import datetime
            dt = datetime.utcfromtimestamp(evt.timestamp / 1000).strftime("%Y-%m-%d %H:%M UTC")
            desc = ""
            if evt.changeDescription:
                added = [f.name for f in evt.changeDescription.fieldsAdded]
                updated = [f.name for f in evt.changeDescription.fieldsUpdated]
                deleted = [f.name for f in evt.changeDescription.fieldsDeleted]
                parts = []
                if added:
                    parts.append(f"added: {', '.join(added)}")
                if updated:
                    parts.append(f"updated: {', '.join(updated)}")
                if deleted:
                    parts.append(f"deleted: {', '.join(deleted)}")
                desc = " | ".join(parts)
            lines.append(
                f"- `{dt}` [{evt.eventType}] v{evt.currentVersion} by **{evt.userName}** — {desc}"
            )
    if extra:
        lines.append(f"\n### Additional Context\n{extra}")
    return "\n".join(lines)


def _extract_suggestions(answer: str) -> list[str]:
    suggestions = []
    for line in answer.splitlines():
        stripped = line.strip()
        if stripped.startswith(("- ", "* ", "1.", "2.", "3.", "4.", "5.")):
            clean = stripped.lstrip("-* 0123456789.")
            if clean and len(clean) > 10:
                suggestions.append(clean.strip())
    return suggestions[:5]


def _rule_based_response(
    question: str,
    events: list[ChangeEvent],
    entity_name: Optional[str],
) -> AIQueryResponse:
    """Fallback when no OpenAI key is configured."""
    q_lower = question.lower()
    recent = sorted(events, key=lambda e: -e.timestamp)[:3]

    if any(kw in q_lower for kw in ["why", "cause", "break", "fail", "broken"]):
        if recent:
            evt = recent[0]
            from datetime import datetime
            dt = datetime.utcfromtimestamp(evt.timestamp / 1000).strftime("%Y-%m-%d %H:%M UTC")
            answer = (
                f"**Most likely cause:** The last change to `{entity_name or 'this entity'}` "
                f"was a `{evt.eventType}` event on **{dt}** by **{evt.userName}** "
                f"(version {evt.currentVersion}).\n\n"
                "Review the schema diff for that version to identify breaking changes."
            )
        else:
            answer = "No change history found for this entity. Check the data source directly."
    elif any(kw in q_lower for kw in ["who", "changed", "modified"]):
        actors = list({e.userName for e in recent if e.userName})
        answer = f"Recent actors: **{', '.join(actors) or 'unknown'}**."
    elif any(kw in q_lower for kw in ["when", "last", "latest"]):
        if recent:
            from datetime import datetime
            dt = datetime.utcfromtimestamp(recent[0].timestamp / 1000).strftime("%Y-%m-%d %H:%M UTC")
            answer = f"Last change: **{dt}** — {recent[0].eventType} by {recent[0].userName}."
        else:
            answer = "No changes recorded yet."
    else:
        answer = (
            f"I found **{len(events)}** change events for this entity. "
            "Set `OPENAI_API_KEY` in your `.env` to enable deep AI-powered root-cause analysis."
        )

    return AIQueryResponse(
        answer=answer,
        relatedEvents=recent,
        suggestions=[
            "Review the schema diff for the latest version",
            "Check downstream impact using the Impact Analysis tab",
            "Verify data quality test results around the time of change",
        ],
    )
