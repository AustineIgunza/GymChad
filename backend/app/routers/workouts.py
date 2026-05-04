"""routers/workouts.py — Workout CRUD + set management"""

from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.dependencies import get_db, get_current_user
from app.models.workout import Workout, WorkoutSet
from app.models.exercise import Exercise
from app.models.user import User
from app.schemas.workout import (
    WorkoutCreate, WorkoutUpdate, WorkoutResponse,
    WorkoutSetCreate, WorkoutSetUpdate, WorkoutSetResponse,
    TodayPlanResponse, TodayPlanExercise, PreviousBest,
)
from app.services.progressive_overload import get_recommendation
from app.services.pr_detection import check_and_save_pr

router = APIRouter()


def _set_to_dict(ws: WorkoutSet) -> dict:
    d = {c.name: getattr(ws, c.name) for c in ws.__table__.columns}
    if ws.exercise:
        d["exercise"] = {
            "id": ws.exercise.id,
            "name": ws.exercise.name,
            "muscle_group": ws.exercise.muscle_group.value,
        }
    d.setdefault("set_type", "normal")
    d.setdefault("superset_group", None)
    d.setdefault("is_pr", False)
    return d


def _set_to_dict_with_exercise(ws: WorkoutSet, exercise: Exercise | None) -> dict:
    d = {c.name: getattr(ws, c.name) for c in ws.__table__.columns}
    if exercise:
        d["exercise"] = {
            "id": exercise.id,
            "name": exercise.name,
            "muscle_group": exercise.muscle_group.value,
        }
    d.setdefault("set_type", "normal")
    d.setdefault("superset_group", None)
    d.setdefault("is_pr", False)
    return d


@router.get("", response_model=list[WorkoutResponse])
async def get_workouts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    days: int | None = Query(None),
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Workout)
        .where(Workout.user_id == current_user.id)
        .options(selectinload(Workout.sets).selectinload(WorkoutSet.exercise))
        .order_by(Workout.date.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    if days is not None:
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=days)
        query = query.where(Workout.date >= cutoff)
    if date_from:
        query = query.where(Workout.date >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.where(Workout.date <= datetime.combine(date_to, datetime.max.time()))

    result = await db.execute(query)
    workouts = result.scalars().all()
    return [
        {**{c.name: getattr(w, c.name) for c in w.__table__.columns},
         "sets": [_set_to_dict(s) for s in w.sets]}
        for w in workouts
    ]


@router.get("/today", response_model=list[WorkoutResponse])
async def get_today_workouts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = datetime.utcnow().date()
    result = await db.execute(
        select(Workout)
        .where(
            and_(
                Workout.user_id == current_user.id,
                Workout.date >= datetime.combine(today, datetime.min.time()),
                Workout.date <= datetime.combine(today, datetime.max.time()),
            )
        )
        .options(selectinload(Workout.sets).selectinload(WorkoutSet.exercise))
    )
    workouts = result.scalars().all()
    return [
        {**{c.name: getattr(w, c.name) for c in w.__table__.columns},
         "sets": [_set_to_dict(s) for s in w.sets]}
        for w in workouts
    ]


@router.get("/history/{exercise_id}")
async def get_exercise_history(
    exercise_id: str,
    sessions: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutSet)
        .join(Workout)
        .where(
            and_(
                Workout.user_id == current_user.id,
                WorkoutSet.exercise_id == exercise_id,
            )
        )
        .options(selectinload(WorkoutSet.workout))
        .order_by(Workout.date.desc())
        .limit(sessions * 10)
    )
    sets = result.scalars().all()

    from collections import defaultdict
    sessions_map: dict[str, list] = defaultdict(list)
    workout_dates: dict[str, datetime] = {}
    for s in sets:
        sessions_map[s.workout_id].append({
            "id": s.id,
            "set_number": s.set_number,
            "reps": s.reps,
            "weight_kg": s.weight_kg,
            "rpe": s.rpe,
            "is_warmup": s.is_warmup,
            "set_type": getattr(s, "set_type", "normal"),
        })
        workout_dates[s.workout_id] = s.workout.date

    sorted_sessions = sorted(sessions_map.items(), key=lambda x: workout_dates[x[0]], reverse=True)[:sessions]
    return [
        {"workout_id": wid, "date": workout_dates[wid].isoformat(), "sets": s}
        for wid, s in sorted_sessions
    ]


@router.get("/recommendations")
async def get_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.split import Split, SplitDay, SplitDayExercise

    split_result = await db.execute(
        select(Split)
        .where(and_(Split.user_id == current_user.id, Split.is_active == True))
        .options(selectinload(Split.days).selectinload(SplitDay.exercises).selectinload(SplitDayExercise.exercise))
    )
    active_split = split_result.scalar_one_or_none()
    if not active_split:
        return []

    recommendations = []
    for day in active_split.days:
        for sde in day.exercises:
            hist_result = await db.execute(
                select(WorkoutSet)
                .join(Workout)
                .where(and_(Workout.user_id == current_user.id, WorkoutSet.exercise_id == sde.exercise_id))
                .order_by(Workout.date.desc())
                .limit(30)
            )
            hist_sets = hist_result.scalars().all()

            from collections import defaultdict
            sess_map: dict[str, list] = defaultdict(list)
            for s in hist_sets:
                sess_map[s.workout_id].append({"weight_kg": s.weight_kg, "reps": s.reps, "is_warmup": s.is_warmup})

            sessions_list = list(sess_map.values())[:3]
            rec = get_recommendation(sessions_list)
            recommendations.append({
                "exercise_id": sde.exercise_id,
                "exercise_name": sde.exercise.name if sde.exercise else "Unknown",
                **rec,
            })

    return recommendations


async def get_previous_best(db: AsyncSession, user_id: str, exercise_id: str) -> PreviousBest | None:
    result = await db.execute(
        select(WorkoutSet, Workout.date)
        .join(Workout, WorkoutSet.workout_id == Workout.id)
        .where(and_(
            Workout.user_id == user_id,
            WorkoutSet.exercise_id == exercise_id,
            WorkoutSet.is_warmup == False,
        ))
        .order_by(Workout.date.desc(), WorkoutSet.weight_kg.desc())
        .limit(5)
    )
    rows = result.all()
    if not rows:
        return None
    # Best = highest weight (then reps) across most recent sessions
    best = max(rows, key=lambda r: (r[0].weight_kg, r[0].reps))
    return PreviousBest(
        weight_kg=best[0].weight_kg,
        reps=best[0].reps,
        date=str(best[1]),
    )


@router.get("/today-plan")
async def get_today_plan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TodayPlanResponse | None:
    """
    Returns today's workout plan from the user's active split.
    Determines which split day to do next based on most recent split workout.
    Returns null if no active split is configured.
    """
    from app.models.split import Split, SplitDay, SplitDayExercise

    result = await db.execute(
        select(Split)
        .where(and_(Split.user_id == current_user.id, Split.is_active == True))
        .options(
            selectinload(Split.days)
            .selectinload(SplitDay.exercises)
            .selectinload(SplitDayExercise.exercise)
        )
    )
    split = result.scalar_one_or_none()
    if not split or not split.days:
        return None

    # Sort days by day_number
    sorted_days = sorted(split.days, key=lambda d: d.day_number)

    # Find the most recent workout that belongs to this split
    split_day_ids = {d.id for d in split.days}
    recent = await db.execute(
        select(Workout)
        .where(and_(
            Workout.user_id == current_user.id,
            Workout.split_day_id.in_(split_day_ids),
        ))
        .order_by(Workout.date.desc())
        .limit(1)
    )
    last_workout = recent.scalar_one_or_none()

    # Determine the next split day (round-robin)
    if last_workout and last_workout.split_day_id:
        last_day_ids = [d.id for d in sorted_days]
        try:
            last_idx = last_day_ids.index(last_workout.split_day_id)
            next_idx = (last_idx + 1) % len(sorted_days)
        except ValueError:
            next_idx = 0
    else:
        next_idx = 0
    today_day = sorted_days[next_idx]

    # Sort exercises by order field
    sorted_exercises = sorted(today_day.exercises, key=lambda e: getattr(e, "order", 0))

    exercises = []
    for sde in sorted_exercises:
        prev = await get_previous_best(db, current_user.id, sde.exercise_id)
        exercises.append(TodayPlanExercise(
            exercise_id=sde.exercise_id,
            exercise_name=sde.exercise.name if sde.exercise else "Unknown",
            muscle_group=sde.exercise.muscle_group.value if sde.exercise else "",
            order=getattr(sde, "order", 0),
            target_sets=sde.target_sets or 3,
            target_reps_min=sde.target_reps_min or 8,
            target_reps_max=sde.target_reps_max or 12,
            notes=getattr(sde, "notes", None),
            previous_best=prev,
        ))

    return TodayPlanResponse(
        split_id=split.id,
        split_name=split.name,
        split_day_id=today_day.id,
        split_day_label=today_day.label,
        day_number=today_day.day_number,
        exercises=exercises,
    )


@router.get("/{workout_id}", response_model=WorkoutResponse)
async def get_workout(
    workout_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workout)
        .where(and_(Workout.id == workout_id, Workout.user_id == current_user.id))
        .options(selectinload(Workout.sets).selectinload(WorkoutSet.exercise))
    )
    workout = result.scalar_one_or_none()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return {**{c.name: getattr(workout, c.name) for c in workout.__table__.columns},
            "sets": [_set_to_dict(s) for s in workout.sets]}


@router.post("", response_model=WorkoutResponse, status_code=status.HTTP_201_CREATED)
async def create_workout(
    payload: WorkoutCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = Workout(
        **payload.model_dump(exclude_none=True),
        user_id=current_user.id,
        date=payload.date or datetime.utcnow(),
    )
    db.add(workout)
    await db.commit()
    await db.refresh(workout)
    return {**{c.name: getattr(workout, c.name) for c in workout.__table__.columns}, "sets": []}


@router.put("/{workout_id}", response_model=WorkoutResponse)
async def update_workout(
    workout_id: str,
    payload: WorkoutUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workout)
        .where(and_(Workout.id == workout_id, Workout.user_id == current_user.id))
        .options(selectinload(Workout.sets).selectinload(WorkoutSet.exercise))
    )
    workout = result.scalar_one_or_none()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(workout, field, value)
    await db.commit()
    await db.refresh(workout)
    return {**{c.name: getattr(workout, c.name) for c in workout.__table__.columns},
            "sets": [_set_to_dict(s) for s in workout.sets]}


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    workout_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workout).where(and_(Workout.id == workout_id, Workout.user_id == current_user.id))
    )
    workout = result.scalar_one_or_none()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    await db.delete(workout)
    await db.commit()


@router.post("/{workout_id}/sets", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_set(
    workout_id: str,
    payload: WorkoutSetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workout).where(and_(Workout.id == workout_id, Workout.user_id == current_user.id))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workout not found")

    ws = WorkoutSet(**payload.model_dump(), workout_id=workout_id)
    db.add(ws)
    await db.commit()
    await db.refresh(ws)

    # PR detection (non-blocking — runs after commit)
    new_prs: list[str] = []
    if not payload.is_warmup and payload.weight_kg > 0:
        try:
            new_prs = await check_and_save_pr(
                db, current_user.id, payload.exercise_id, payload.weight_kg, payload.reps
            )
        except Exception:
            pass  # PR detection failure should never break set logging

    exercise = await db.get(Exercise, ws.exercise_id)
    response = _set_to_dict_with_exercise(ws, exercise)
    response["is_pr"] = len(new_prs) > 0
    response["pr_types"] = new_prs
    return response


@router.put("/{workout_id}/sets/{set_id}", response_model=dict)
async def update_set(
    workout_id: str,
    set_id: str,
    payload: WorkoutSetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutSet)
        .join(Workout)
        .where(and_(WorkoutSet.id == set_id, WorkoutSet.workout_id == workout_id, Workout.user_id == current_user.id))
    )
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Set not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(ws, field, value)
    await db.commit()
    await db.refresh(ws)
    exercise = await db.get(Exercise, ws.exercise_id)
    return _set_to_dict_with_exercise(ws, exercise)


@router.delete("/{workout_id}/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_set(
    workout_id: str,
    set_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutSet)
        .join(Workout)
        .where(and_(WorkoutSet.id == set_id, WorkoutSet.workout_id == workout_id, Workout.user_id == current_user.id))
    )
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Set not found")
    await db.delete(ws)
    await db.commit()
