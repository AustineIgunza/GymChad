"""services/pr_detection.py — Personal Record detection after each set"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.records import PersonalRecord


async def check_and_save_pr(
    db: AsyncSession,
    user_id: str,
    exercise_id: str,
    weight_kg: float,
    reps: int,
) -> list[str]:
    """
    After logging a set, check if it breaks any personal records.
    Returns a list of PR types achieved: ['weight', 'volume']
    """
    if weight_kg <= 0 or reps <= 0:
        return []

    volume = weight_kg * reps
    new_prs: list[str] = []

    # Fetch current PRs for this exercise
    result = await db.execute(
        select(PersonalRecord).where(
            and_(
                PersonalRecord.user_id == user_id,
                PersonalRecord.exercise_id == exercise_id,
            )
        )
    )
    existing_prs = result.scalars().all()

    # Best weight PR
    best_weight = max((pr.weight_kg for pr in existing_prs if pr.pr_type == "weight"), default=0.0)
    if weight_kg > best_weight:
        # Delete old weight PR and save new one
        for pr in existing_prs:
            if pr.pr_type == "weight":
                await db.delete(pr)
        db.add(PersonalRecord(
            user_id=user_id,
            exercise_id=exercise_id,
            weight_kg=weight_kg,
            reps=reps,
            volume=volume,
            pr_type="weight",
        ))
        new_prs.append("weight")

    # Best volume PR (weight × reps)
    best_volume = max((pr.volume for pr in existing_prs if pr.pr_type == "volume"), default=0.0)
    if volume > best_volume:
        for pr in existing_prs:
            if pr.pr_type == "volume":
                await db.delete(pr)
        db.add(PersonalRecord(
            user_id=user_id,
            exercise_id=exercise_id,
            weight_kg=weight_kg,
            reps=reps,
            volume=volume,
            pr_type="volume",
        ))
        new_prs.append("volume")

    if new_prs:
        await db.commit()

    return new_prs


async def get_prs_for_exercise(
    db: AsyncSession,
    user_id: str,
    exercise_id: str,
) -> dict:
    """Return the current PRs for an exercise."""
    result = await db.execute(
        select(PersonalRecord).where(
            and_(
                PersonalRecord.user_id == user_id,
                PersonalRecord.exercise_id == exercise_id,
            )
        )
    )
    prs = result.scalars().all()
    out: dict = {}
    for pr in prs:
        out[pr.pr_type] = {
            "weight_kg": pr.weight_kg,
            "reps": pr.reps,
            "volume": pr.volume,
            "achieved_at": pr.achieved_at.isoformat(),
        }
    return out
