"""routers/buddy.py — Real-time gym buddy session with WebSockets"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.dependencies import get_db, get_current_user
from app.models.buddy_session import BuddySession, BuddySet
from app.models.user import User
from app.schemas.buddy import BuddySessionResponse

router = APIRouter()

# In-memory connection registry: {session_id: {user_id: websocket}}
_connections: dict[str, dict[str, WebSocket]] = {}


@router.post("/create", response_model=BuddySessionResponse, status_code=201)
async def create_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Host creates a new buddy session. Returns 6-char code."""
    session = BuddySession(host_user_id=current_user.id)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/join/{code}", response_model=BuddySessionResponse)
async def join_session(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Guest joins with 6-char code."""
    result = await db.execute(
        select(BuddySession).where(and_(
            BuddySession.session_code == code.upper(),
            BuddySession.status.in_(["waiting", "active"]),
        ))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or already ended")
    if session.host_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot join your own session")
    session.guest_user_id = current_user.id
    session.status = "active"
    await db.commit()
    await db.refresh(session)

    # Notify host via WebSocket if connected
    if session.id in _connections:
        await _broadcast(session.id, current_user.id, {
            "type": "partner_joined",
            "user_id": current_user.id,
            "user_name": current_user.name or "Your buddy",
        }, exclude_sender=False)

    return session


@router.get("/session/{session_id}", response_model=BuddySessionResponse)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(BuddySession).where(BuddySession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/session/{session_id}/end")
async def end_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(BuddySession).where(BuddySession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.status = "ended"
    session.ended_at = datetime.utcnow()
    await db.commit()

    # Notify partner
    await _broadcast(session_id, current_user.id, {"type": "workout_ended", "user_id": current_user.id})
    return {"status": "ended"}


async def _broadcast(session_id: str, sender_user_id: str, message: dict, exclude_sender: bool = True):
    """Send message to all connected users in a session (optionally excluding sender)."""
    if session_id not in _connections:
        return
    data = json.dumps(message)
    for uid, ws in list(_connections[session_id].items()):
        if exclude_sender and uid == sender_user_id:
            continue
        try:
            await ws.send_text(data)
        except Exception:
            pass


@router.websocket("/ws/{session_id}/{user_id}")
async def buddy_websocket(
    websocket: WebSocket,
    session_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket connection for real-time buddy sync.

    Message types sent by client:
    - set_logged: {type, exercise_name, set_number, weight_kg, reps, rpe}
    - rest_started: {type, duration_seconds}
    - exercise_changed: {type, exercise_name}
    - reaction: {type, emoji}
    - workout_ended: {type}
    """
    await websocket.accept()

    # Register connection
    if session_id not in _connections:
        _connections[session_id] = {}
    _connections[session_id][user_id] = websocket

    # Notify partner that user connected
    await _broadcast(session_id, user_id, {
        "type": "partner_connected",
        "user_id": user_id,
    })

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")
            msg["user_id"] = user_id  # always stamp with sender

            # Persist sets to DB
            if msg_type == "set_logged":
                try:
                    buddy_set = BuddySet(
                        buddy_session_id=session_id,
                        user_id=user_id,
                        exercise_name=msg.get("exercise_name", "Unknown"),
                        set_number=msg.get("set_number", 1),
                        weight_kg=float(msg.get("weight_kg", 0)),
                        reps=int(msg.get("reps", 0)),
                        rpe=msg.get("rpe"),
                    )
                    db.add(buddy_set)
                    await db.commit()
                except Exception:
                    pass

            # Broadcast to partner
            await _broadcast(session_id, user_id, msg)

    except WebSocketDisconnect:
        pass
    finally:
        # Clean up connection
        if session_id in _connections:
            _connections[session_id].pop(user_id, None)
            if not _connections[session_id]:
                del _connections[session_id]

        # Notify partner of disconnect
        await _broadcast(session_id, user_id, {
            "type": "partner_disconnected",
            "user_id": user_id,
        }, exclude_sender=False)
