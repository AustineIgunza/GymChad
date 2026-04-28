"""
services/ai_coach.py — AI coach streaming logic

anthropic.AsyncAnthropic() uses Python's asyncio event loop — it doesn't block
while waiting for the model to respond. FastAPI and Anthropic both use asyncio,
so they integrate seamlessly.

The `async with client.messages.stream(...)` context manager yields text chunks
as the model generates them. We format each chunk as SSE (Server-Sent Events).
"""

import os
import anthropic
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload


async def build_system_prompt(user, db: AsyncSession) -> str:
    """
    Builds a personalised system prompt with real user data.
    Fetches last 4 weeks of workouts and 2 weeks of nutrition.
    """
    from app.models.workout import Workout, WorkoutSet
    from app.models.nutrition import NutritionLog
    from app.services.progressive_overload import calculate_epley_1rm

    four_weeks_ago = datetime.utcnow() - timedelta(weeks=4)
    two_weeks_ago = datetime.utcnow() - timedelta(weeks=2)

    # ── Fetch recent workouts ──────────────────────────────────────────────
    workout_result = await db.execute(
        select(Workout)
        .where(and_(Workout.user_id == user.id, Workout.date >= four_weeks_ago))
        .options(selectinload(Workout.sets).selectinload(WorkoutSet.exercise))
        .order_by(Workout.date.desc())
        .limit(40)
    )
    workouts = workout_result.scalars().all()

    workout_lines = []
    for w in workouts[:10]:  # Last 10 workouts summary
        date_str = w.date.strftime("%b %d")
        working_sets = [s for s in w.sets if not s.is_warmup]
        if working_sets:
            set_summaries = []
            # Group by exercise
            from collections import defaultdict
            by_exercise: dict[str, list] = defaultdict(list)
            for s in working_sets:
                ex_name = s.exercise.name if s.exercise else "Unknown"
                by_exercise[ex_name].append(s)
            for ex_name, sets in list(by_exercise.items())[:4]:  # Top 4 exercises
                best = max(sets, key=lambda s: calculate_epley_1rm(s.weight_kg, s.reps))
                set_summaries.append(f"{ex_name}: {best.weight_kg}kg×{best.reps} (e1RM ~{calculate_epley_1rm(best.weight_kg, best.reps):.0f}kg)")
            workout_lines.append(f"  {date_str} — {w.label}: {', '.join(set_summaries)}")
        else:
            workout_lines.append(f"  {date_str} — {w.label} (no working sets logged)")

    workout_summary = "\n".join(workout_lines) if workout_lines else "  No workouts in last 4 weeks"

    # ── Fetch recent nutrition ─────────────────────────────────────────────
    from sqlalchemy import func
    nutrition_result = await db.execute(
        select(
            NutritionLog.date,
            func.sum(NutritionLog.calories).label("calories"),
            func.sum(NutritionLog.protein_g).label("protein"),
        )
        .where(and_(NutritionLog.user_id == user.id, NutritionLog.date >= two_weeks_ago.date()))
        .group_by(NutritionLog.date)
        .order_by(NutritionLog.date.desc())
    )
    nutrition_rows = nutrition_result.all()

    if nutrition_rows:
        avg_cal = sum(r.calories for r in nutrition_rows) / len(nutrition_rows)
        avg_prot = sum(r.protein for r in nutrition_rows) / len(nutrition_rows)
        nutrition_summary = (
            f"  {len(nutrition_rows)} days logged in last 2 weeks\n"
            f"  Avg calories: {avg_cal:.0f} kcal (target: {user.calorie_target or 'not set'})\n"
            f"  Avg protein: {avg_prot:.0f}g (target: {user.protein_target or 'not set'}g)"
        )
    else:
        nutrition_summary = "  No nutrition data in last 2 weeks"

    return f"""You are GymAI — an expert personal trainer and sports nutritionist coaching a specific user.
Always reference their actual numbers. Never give generic advice.

USER PROFILE:
- Name: {user.name or "User"}
- Goal: {user.goal.value}
- Daily Calorie Target: {user.calorie_target or "not set"} kcal
- Macro Targets: {user.protein_target or "?"}g protein / {user.carbs_target or "?"}g carbs / {user.fat_target or "?"}g fat
- Weight: {user.weight_kg or "not set"}kg

LAST 4 WEEKS — WORKOUTS:
{workout_summary}

LAST 2 WEEKS — NUTRITION:
{nutrition_summary}

RULES:
1. Suggest +2.5–5kg when the user hit the top of their rep range 2+ sessions in a row.
2. Suggest a deload week if they have stalled for 3+ sessions on a lift.
3. Cutting: protein minimum 2g/kg bodyweight. If average calories are above target, name specific meal swaps.
4. Give exactly 3 specific, numbered, actionable recommendations per response.
5. Always cite exercise names and actual weights from their log.
6. Be conversational, encouraging, and data-driven.
7. Never recommend anything that risks injury."""


async def stream_ai_response(user, message: str, history: list[dict], db: AsyncSession):
    """
    Async generator that yields SSE-formatted chunks as the AI generates them.

    `async for text in stream.text_stream` reads one token at a time.
    Each token is formatted as: data: <text>\n\n
    """
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    system = await build_system_prompt(user, db)

    # Build messages array: existing history + new user message
    messages = [m for m in history if m.get("role") in ("user", "assistant")]
    messages.append({"role": "user", "content": message})

    try:
        async with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                # SSE format: each event is "data: <content>\n\n"
                # Replace newlines inside text so they don't break SSE parsing
                safe_text = text.replace("\n", "\\n")
                yield f"data: {safe_text}\n\n"

        yield "data: [DONE]\n\n"

    except anthropic.APIError as e:
        yield f"data: [ERROR] {str(e)}\n\n"
    except Exception as e:
        yield f"data: [ERROR] Unexpected error: {str(e)}\n\n"
