"""AI Chat router — root-cause analysis and metadata Q&A."""

from fastapi import APIRouter, HTTPException
from typing import Optional

from app.services.ai_service import answer_query
from app.services.time_travel import get_entity_timeline
from app.models.schemas import AIQueryRequest, AIQueryResponse

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/query")
async def ai_query(req: AIQueryRequest) -> dict:
    """
    Ask a natural language question about your metadata.

    The AI assistant is grounded in real OpenMetadata context:
    change history, schema diffs, lineage, and governance events.

    Example questions:
    - "Why did the orders_fact table break last week?"
    - "Who changed the customer_id column and when?"
    - "What is the blast radius if I drop the revenue column?"
    """
    events = []
    if req.entityId and req.entityType:
        try:
            events = await get_entity_timeline(req.entityType, req.entityId)
            if req.timeRange:
                start = req.timeRange.get("start")
                end = req.timeRange.get("end")
                if start:
                    events = [e for e in events if e.timestamp >= start]
                if end:
                    events = [e for e in events if e.timestamp <= end]
        except Exception:
            events = []

    try:
        response = await answer_query(
            question=req.question,
            context_events=events,
            entity_name=req.entityId,
            extra_context=req.context,
        )
        return response.model_dump()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/suggestions")
async def ai_suggestions(entity_type: str, entity_id: str) -> dict:
    """Return proactive AI-generated suggestions for an asset."""
    try:
        events = await get_entity_timeline(entity_type, entity_id)
    except Exception:
        events = []

    recent = sorted(events, key=lambda e: -e.timestamp)[:5]
    suggestions = []

    if len(events) > 10:
        suggestions.append(
            "⚠️ This asset has a high number of versions. Consider adding a change freeze policy."
        )
    if events and not any(e.userName and e.userName != "system" for e in events):
        suggestions.append(
            "🤖 All changes were made by automated processes. Consider adding human review gates."
        )
    if not events:
        suggestions.append(
            "📊 No change history found. Enable metadata ingestion to start tracking."
        )

    return {
        "entityId": entity_id,
        "totalChanges": len(events),
        "suggestions": suggestions,
        "recentActivity": [e.model_dump() for e in recent],
    }
