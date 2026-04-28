"""
routers/ai.py — AI coach endpoint with streaming SSE

StreamingResponse sends data chunk-by-chunk as the AI generates it.
The frontend reads the stream with EventSource or fetch + ReadableStream.

SSE format:
  data: chunk of text\n\n
  data: [DONE]\n\n
"""

from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel
from app.dependencies import get_db, get_current_user
from app.models.user import User, Plan
from app.models.ai import AISession
from app.services.ai_coach import stream_ai_response

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class AIMessageRequest(BaseModel):
    message: str
    session_id: str | None = None  # Optional — provide to continue a conversation
    history: list[dict] = []       # [{"role": "user"|"assistant", "content": "..."}]


@router.post("/coach")
@limiter.limit("20/hour")
async def chat_with_coach(
    request: Request,   # Required by slowapi for rate limiting
    payload: AIMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Streams AI coach responses as Server-Sent Events (SSE).

    The frontend reads this with:
        const response = await fetch('/api/v1/ai/coach', { method: 'POST', ... })
        const reader = response.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          // parse SSE chunks
        }
    """
    # StreamingResponse sends data as an async generator yields values
    return StreamingResponse(
        stream_ai_response(current_user, payload.message, payload.history, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering for Railway
        },
    )


@router.get("/sessions")
async def get_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the user's AI conversation history."""
    result = await db.execute(
        select(AISession)
        .where(AISession.user_id == current_user.id)
        .order_by(AISession.updated_at.desc())
        .limit(20)
    )
    sessions = result.scalars().all()
    return [
        {"id": s.id, "messages": s.messages, "updated_at": s.updated_at.isoformat()}
        for s in sessions
    ]


@router.post("/sessions")
async def save_session(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save/update a conversation session."""
    session_id = payload.get("session_id")
    messages = payload.get("messages", [])

    if session_id:
        result = await db.execute(
            select(AISession).where(AISession.id == session_id, AISession.user_id == current_user.id)
        )
        session = result.scalar_one_or_none()
        if session:
            session.messages = messages
            await db.commit()
            return {"id": session.id}

    # Create new session
    session = AISession(user_id=current_user.id, messages=messages)
    db.add(session)
    await db.commit()
    return {"id": session.id}
