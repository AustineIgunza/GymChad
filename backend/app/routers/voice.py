"""routers/voice.py — Voice transcript parsing via Claude"""
import os, json, logging
import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


class VoiceParseRequest(BaseModel):
    transcript: str
    current_exercise_id: str | None = None
    current_workout_context: list[dict] = []  # [{exercise_name, recent_weight}]


class VoiceParseResponse(BaseModel):
    exercise_name: str | None
    weight: float | None
    unit: str  # kg|lb
    reps: int | None
    rpe: float | None
    confidence: float
    raw_intent: str
    needs_clarification: bool
    clarification_question: str | None


@router.post("/parse-set", response_model=VoiceParseResponse)
async def parse_voice_set(
    payload: VoiceParseRequest,
    current_user: User = Depends(get_current_user),
):
    """Parse a voice transcript into a structured set log using Claude."""
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    context_str = ""
    if payload.current_workout_context:
        context_str = "\nCurrent workout context:\n" + "\n".join(
            f"- {c.get('exercise_name')}: last weight {c.get('recent_weight')}kg"
            for c in payload.current_workout_context[:5]
        )

    system_prompt = """You are a gym logging assistant. Parse the voice transcript into a structured set log.
Return ONLY valid JSON with no markdown:
{
  "exercise_name": "string or null if same exercise",
  "weight": number or null,
  "unit": "kg" or "lb",
  "reps": integer or null,
  "rpe": number 1-10 or null,
  "confidence": 0.0-1.0,
  "raw_intent": "brief summary of what you understood",
  "needs_clarification": boolean,
  "clarification_question": "string or null"
}

Common patterns to handle:
- "8 reps at 80 kilos" → weight:80, unit:kg, reps:8
- "five reps hundred" → weight:100, unit:kg, reps:5
- "did 10 bodyweight" → weight:0, unit:kg, reps:10
- "3 reps RPE 9" → reps:3, rpe:9 (no weight change)
- "same exercise, 90kg 5 reps" → exercise_name:null (same), weight:90, reps:5
- "bench press 100kg 8 reps" → exercise_name:Barbell Bench Press, weight:100, reps:8
If unclear, set needs_clarification:true and ask one specific question."""

    user_msg = f"Transcript: \"{payload.transcript}\"{context_str}"

    try:
        message = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            system=system_prompt,
            messages=[{"role": "user", "content": user_msg}]
        )
        raw = message.content[0].text.strip()
        result = json.loads(raw)
        return VoiceParseResponse(**result)
    except Exception as e:
        logger.error(f"Voice parse error: {e}")
        return VoiceParseResponse(
            exercise_name=None, weight=None, unit="kg", reps=None, rpe=None,
            confidence=0.0, raw_intent=payload.transcript,
            needs_clarification=True, clarification_question="Could you repeat that more clearly?"
        )
