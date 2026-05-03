"""services/program_generator.py — AI-powered training program generator"""
import os, json, logging
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
from app.models.program import Program, ProgramWorkout
from app.models.workout import Workout, WorkoutSet
from app.models.exercise import Exercise

logger = logging.getLogger(__name__)

async def generate_program(
    user_id: str,
    goal: str,
    level: str,
    days_per_week: int,
    available_equipment: list[str],
    duration_weeks: int,
    db: AsyncSession,
) -> Program:
    """Call Claude to generate a complete training program and persist it."""
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    equipment_str = ", ".join(available_equipment) if available_equipment else "bodyweight only"

    prompt = f"""Generate a complete {duration_weeks}-week training program with these parameters:
- Goal: {goal}
- Level: {level}
- Days per week: {days_per_week}
- Available equipment: {equipment_str}

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{{
  "program_name": "string",
  "weeks": [
    {{
      "week_number": 1,
      "is_deload": false,
      "days": [
        {{
          "day_number": 1,
          "label": "Push A",
          "focus": "Chest, Shoulders, Triceps",
          "exercises": [
            {{
              "name": "Barbell Bench Press",
              "sets": 4,
              "reps_min": 8,
              "reps_max": 12,
              "rpe": 7.5,
              "rest_seconds": 120,
              "notes": "Focus on controlled descent"
            }}
          ]
        }}
      ]
    }}
  ]
}}

Rules:
- Include {days_per_week} training days per week + rest days marked with label "Rest" and empty exercises array
- Week 4, 8, 12 are deload weeks: same exercises but sets reduced by 40%, rpe target reduced by 1.5
- For beginner: compound movements only (squat, deadlift, bench, row, overhead press), 3-4 sets, RPE 6-7
- For intermediate: add isolation work, 3-5 sets, RPE 7-8
- For advanced: higher volume, periodization, RPE 8-9
- Progress rep ranges each 4-week block (e.g. 3x12→3x10→3x8 with weight increase)
- Only include exercises achievable with: {equipment_str}
- Generate ALL {duration_weeks} weeks
"""

    start_time = datetime.utcnow()
    try:
        message = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            messages=[{"role": "user", "content": prompt}]
        )
        duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        logger.info(f"Program generation: {duration_ms:.0f}ms, {message.usage.input_tokens + message.usage.output_tokens} tokens")

        raw = message.content[0].text.strip()
        # Strip markdown code blocks if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        plan = json.loads(raw)
    except Exception as e:
        logger.error(f"AI program generation failed: {e}")
        # Fallback: generate a simple PPL program
        plan = _fallback_program(goal, level, days_per_week, duration_weeks)

    # Deactivate any existing active program
    existing = await db.execute(
        select(Program).where(and_(Program.user_id == user_id, Program.is_active == True))
    )
    for prog in existing.scalars().all():
        prog.is_active = False

    # Create program record
    program = Program(
        user_id=user_id,
        name=plan.get("program_name", f"{level.title()} {goal.replace('_', ' ').title()} Program"),
        goal=goal,
        level=level,
        days_per_week=days_per_week,
        duration_weeks=duration_weeks,
        ai_plan_json=json.dumps(plan),
    )
    db.add(program)
    await db.flush()  # get program.id

    # Create ProgramWorkout records for each day
    for week_data in plan.get("weeks", []):
        week_num = week_data["week_number"]
        is_deload = week_data.get("is_deload", False)
        for day_data in week_data.get("days", []):
            exercises = day_data.get("exercises", [])
            first_ex = exercises[0] if exercises else {}
            pw = ProgramWorkout(
                program_id=program.id,
                week=week_num,
                day=day_data["day_number"],
                label=day_data.get("label", f"Day {day_data['day_number']}"),
                focus=day_data.get("focus", ""),
                exercises_json=json.dumps(exercises),
                target_sets=first_ex.get("sets", 3),
                target_reps_min=first_ex.get("reps_min", 8),
                target_reps_max=first_ex.get("reps_max", 12),
                target_rpe=first_ex.get("rpe", 7.0),
                is_deload=is_deload,
                notes=day_data.get("notes"),
            )
            db.add(pw)

    await db.commit()
    await db.refresh(program)
    return program


def _fallback_program(goal: str, level: str, days_per_week: int, duration_weeks: int) -> dict:
    """Minimal fallback if AI fails."""
    days = []
    if days_per_week >= 3:
        days = [
            {"day_number": 1, "label": "Push", "focus": "Chest, Shoulders, Triceps",
             "exercises": [
               {"name": "Barbell Bench Press", "sets": 4, "reps_min": 8, "reps_max": 12, "rpe": 7},
               {"name": "Overhead Press", "sets": 3, "reps_min": 8, "reps_max": 12, "rpe": 7},
             ]},
            {"day_number": 2, "label": "Pull", "focus": "Back, Biceps",
             "exercises": [
               {"name": "Barbell Row", "sets": 4, "reps_min": 8, "reps_max": 12, "rpe": 7},
               {"name": "Pull-Up", "sets": 3, "reps_min": 6, "reps_max": 10, "rpe": 7},
             ]},
            {"day_number": 3, "label": "Legs", "focus": "Quads, Hamstrings, Glutes",
             "exercises": [
               {"name": "Back Squat", "sets": 4, "reps_min": 8, "reps_max": 12, "rpe": 7},
               {"name": "Romanian Deadlift", "sets": 3, "reps_min": 10, "reps_max": 15, "rpe": 7},
             ]},
        ][:days_per_week]

    weeks = []
    for w in range(1, duration_weeks + 1):
        is_deload = w % 4 == 0
        weeks.append({"week_number": w, "is_deload": is_deload, "days": days})

    return {"program_name": f"{level.title()} {goal} Program", "weeks": weeks}


async def get_today_workout(user_id: str, db: AsyncSession) -> dict | None:
    """Get today's prescribed workout with recommended weights based on recent performance."""
    program_result = await db.execute(
        select(Program).where(and_(Program.user_id == user_id, Program.is_active == True))
    )
    program = program_result.scalar_one_or_none()
    if not program:
        return None

    pw_result = await db.execute(
        select(ProgramWorkout).where(and_(
            ProgramWorkout.program_id == program.id,
            ProgramWorkout.week == program.current_week,
            ProgramWorkout.day == program.current_day,
        ))
    )
    pw = pw_result.scalar_one_or_none()
    if not pw:
        return None

    exercises = json.loads(pw.exercises_json or "[]")

    # Add recommended weights based on recent history
    for ex in exercises:
        ex_name = ex.get("name", "")
        # Find exercise in DB by name (fuzzy match)
        ex_result = await db.execute(
            select(Exercise).where(Exercise.name.ilike(f"%{ex_name[:10]}%")).limit(1)
        )
        db_ex = ex_result.scalar_one_or_none()
        if db_ex:
            rec = await calculate_next_session_weights(user_id, db_ex.id, db)
            ex["recommended_weight"] = rec.get("recommended_weight", 0)
            ex["exercise_id"] = db_ex.id
        else:
            ex["recommended_weight"] = 0

    return {
        "program_id": program.id,
        "week": program.current_week,
        "day": program.current_day,
        "label": pw.label,
        "focus": pw.focus,
        "is_deload": pw.is_deload,
        "notes": pw.notes,
        "exercises": exercises,
    }


async def advance_program(user_id: str, db: AsyncSession) -> Program | None:
    """Mark today complete and advance to next day/week."""
    prog_result = await db.execute(
        select(Program).where(and_(Program.user_id == user_id, Program.is_active == True))
    )
    program = prog_result.scalar_one_or_none()
    if not program:
        return None

    # Mark current day completed
    pw_result = await db.execute(
        select(ProgramWorkout).where(and_(
            ProgramWorkout.program_id == program.id,
            ProgramWorkout.week == program.current_week,
            ProgramWorkout.day == program.current_day,
        ))
    )
    pw = pw_result.scalar_one_or_none()
    if pw:
        pw.completed = True

    # Advance
    if program.current_day < program.days_per_week + 2:  # +2 for rest days
        # Find next non-rest day in plan
        next_pw = await db.execute(
            select(ProgramWorkout).where(and_(
                ProgramWorkout.program_id == program.id,
                ProgramWorkout.week == program.current_week,
                ProgramWorkout.day > program.current_day,
                ProgramWorkout.label != "Rest",
            )).order_by(ProgramWorkout.day).limit(1)
        )
        next_day = next_pw.scalar_one_or_none()
        if next_day:
            program.current_day = next_day.day
        else:
            # Move to next week
            if program.current_week < program.duration_weeks:
                program.current_week += 1
                program.current_day = 1
            else:
                program.is_active = False  # Program complete!

    program.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(program)
    return program


async def calculate_next_session_weights(user_id: str, exercise_id: str, db: AsyncSession) -> dict:
    """Progressive overload: analyze last 3 sessions and recommend next weight."""
    from datetime import timedelta
    from app.models.workout import Workout, WorkoutSet

    # Fetch last 3 sessions for this exercise
    result = await db.execute(
        select(Workout.date, WorkoutSet.weight_kg, WorkoutSet.reps, WorkoutSet.rpe)
        .join(WorkoutSet)
        .where(and_(
            Workout.user_id == user_id,
            WorkoutSet.exercise_id == exercise_id,
            WorkoutSet.is_warmup == False,
        ))
        .order_by(Workout.date.desc())
        .limit(20)
    )
    rows = result.all()

    if not rows:
        return {"recommended_weight": 0, "recommended_reps": 8, "note": "No history yet — start light", "confidence": 0.3}

    # Group by session (date)
    sessions: dict[str, list] = {}
    for row in rows:
        date_key = str(row.date)[:10]
        if date_key not in sessions:
            sessions[date_key] = []
        sessions[date_key].append(row)

    recent_sessions = list(sessions.values())[:3]

    if not recent_sessions:
        return {"recommended_weight": 0, "recommended_reps": 8, "note": "Start with a comfortable weight", "confidence": 0.4}

    last_session = recent_sessions[0]
    best_set = max(last_session, key=lambda r: r.weight_kg)
    last_weight = best_set.weight_kg
    last_reps = best_set.reps
    last_rpe = best_set.rpe or 7

    # Progressive overload logic
    if len(recent_sessions) >= 2:
        prev_best = max(recent_sessions[1], key=lambda r: r.weight_kg)
        prev_weight = prev_best.weight_kg

        # Consistent high reps → increase weight
        avg_rpe = sum(r.rpe or 7 for s in recent_sessions[:2] for r in s) / max(1, sum(len(s) for s in recent_sessions[:2]))

        if last_reps >= 12 and last_reps == prev_best.reps and avg_rpe < 8:
            return {
                "recommended_weight": round(last_weight + 2.5, 2),
                "recommended_reps": 8,
                "note": f"You hit {last_reps} reps consistently — increase weight by 2.5kg",
                "confidence": 0.85,
            }
        elif avg_rpe >= 9:
            return {
                "recommended_weight": last_weight,
                "recommended_reps": last_reps,
                "note": "RPE very high — maintain weight, focus on form",
                "confidence": 0.75,
            }
        elif last_reps < 6:
            return {
                "recommended_weight": round(last_weight - 2.5, 2),
                "recommended_reps": 10,
                "note": "Reps dropped — reduce weight slightly",
                "confidence": 0.70,
            }

    return {
        "recommended_weight": last_weight,
        "recommended_reps": last_reps,
        "note": "Maintain current weight — solid progress",
        "confidence": 0.70,
    }
