"""
AI Assistant Service
====================
Provides root-cause analysis and metadata intelligence using an LLM
(OpenAI GPT-4o by default, gracefully degrades when no key is set).

The assistant is grounded in real OpenMetadata context:
  - Entity timeline events
  - Schema diffs
  - Lineage information
  - Data quality results
"""

import json
from typing import Optional

from app.config import settings
from app.models.schemas import AIQueryResponse, ChangeEvent

_openai_client = None


def _get_client():
    global _openai_client
    if _openai_client is None and settings.OPENAI_API_KEY:
        from openai import AsyncOpenAI
        _openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


SYSTEM_PROMPT = """You are MetaChronos AI — a data intelligence assistant embedded in a temporal \
metadata analytics platform built on top of OpenMetadata.

Your job is to help data engineers, data analysts, and data stewards understand:
1. Why data quality issues occurred and when they started
2. What downstream assets are at risk when a schema changes
3. Who made a change and what was the intent
4. How to remediate a broken data pipeline or governance gap

You are given structured context from OpenMetadata (entity versions, lineage graphs, change events, \
data quality test results, governance tags) and you must produce a clear, actionable answer.

Always:
- Cite specific events, timestamps, and actor names when available
- Suggest concrete next steps
- Be concise but thorough
- Use Markdown formatting for readability
"""


async def answer_query(
    question: str,
    context_events: list[ChangeEvent],
    entity_name: Optional[str] = None,
    extra_context: Optional[str] = None,
) -> AIQueryResponse:
    """
    Use the LLM to answer a free-form question about the metadata context.
    Falls back to a rule-based response when OpenAI is not configured.
    """
    client = _get_client()

    if not client:
        return _rule_based_response(question, context_events, entity_name)

    context_text = _build_context_text(context_events, entity_name, extra_context)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"## Question\n{question}\n\n"
                f"## OpenMetadata Context\n{context_text}\n\n"
                "Please provide a root-cause analysis and actionable recommendations."
            ),
        },
    ]

    try:
        resp = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.2,
            max_tokens=1024,
        )
        answer = resp.choices[0].message.content or ""
        suggestions = _extract_suggestions(answer)

        return AIQueryResponse(
            answer=answer,
            reasoning=None,
            relatedEvents=context_events[:5],
            suggestions=suggestions,
        )
    except Exception as exc:
        return AIQueryResponse(
            answer=f"⚠️ AI service temporarily unavailable: {exc}\n\nHere is the raw context:\n\n{context_text}",
            relatedEvents=context_events[:5],
            suggestions=[],
        )


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
