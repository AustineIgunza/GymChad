"""
AI Coach routes - Claude AI powered coaching.

Endpoints:
- POST /api/v1/ai/coach - Stream AI coaching response
"""

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import CoachRequest
import json
import asyncio

router = APIRouter(prefix="/ai")


@router.post("/coach")
async def coach_stream(
    payload: CoachRequest,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Stream AI coach response using SSE (Server-Sent Events).
    
    This endpoint streams tokens from Claude API in real-time,
    creating a chat-like experience.
    
    Example request:
    {
        "message": "I'm starting my bulk and need advice",
        "conversationHistory": [
            {"role": "user", "content": "Hi coach"},
            {"role": "assistant", "content": "Hello! Ready to crush your goals?"}
        ]
    }
    
    Response format (text/event-stream):
    data: {"token": "Here"}
    data: {"token": " is"}
    data: {"token": " my"}
    data: {"token": " response"}
    event: done
    data: {}
    
    Key Concepts:
    - SSE (Server-Sent Events) allows server → client streaming
    - This is more efficient than polling
    - Browser can consume with EventSource API
    """
    
    async def generate():
        """
        Generator function that yields tokens from Claude.
        
        FastAPI automatically converts this to an HTTP stream.
        """
        try:
            # TODO: Import Anthropic client and stream response
            # For now, send dummy response
            tokens = ["Here", " is", " some", " coaching", " advice"]
            
            for token in tokens:
                # Format as Server-Sent Event
                yield f'data: {json.dumps({"token": token})}\n\n'
                # Simulate streaming delay
                await asyncio.sleep(0.1)
            
            # Send completion signal
            yield "event: done\ndata: {}\n\n"
            
        except Exception as e:
            yield f'data: {json.dumps({"error": str(e)})}\n\n'
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable buffering in nginx
        }
    )
