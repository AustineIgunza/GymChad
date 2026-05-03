"""services/gamification_service.py — Streak tracking and achievement checks"""
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.models.gamification import UserStreak, Achievement, UserAchievement
from app.models.workout import Workout, WorkoutSet
from app.models.records import PersonalRecord


ACHIEVEMENTS = [
    {"key": "first_rep", "name": "First Rep", "description": "Complete your first workout", "icon_name": "dumbbell", "xp_value": 50, "condition_type": "consistency"},
    {"key": "week_warrior", "name": "Week Warrior", "description": "Maintain a 7-day workout streak", "icon_name": "flame", "xp_value": 200, "condition_type": "streak"},
    {"key": "iron_will", "name": "Iron Will", "description": "Maintain a 30-day workout streak", "icon_name": "shield", "xp_value": 1000, "condition_type": "streak"},
    {"key": "volume_king", "name": "Volume King", "description": "Lift 10,000kg total in a single week", "icon_name": "trophy", "xp_value": 500, "condition_type": "volume"},
    {"key": "pr_machine", "name": "PR Machine", "description": "Set 5 personal records in one week", "icon_name": "star", "xp_value": 300, "condition_type": "pr"},
    {"key": "consistency", "name": "Consistent", "description": "Complete 12 workouts in a month", "icon_name": "calendar", "xp_value": 400, "condition_type": "consistency"},
    {"key": "century", "name": "Century", "description": "Complete 100 workouts total", "icon_name": "award", "xp_value": 2000, "condition_type": "consistency"},
    {"key": "buddy_up", "name": "Buddy Up", "description": "Complete your first buddy workout", "icon_name": "users", "xp_value": 150, "condition_type": "social"},
]


async def seed_achievements(db: AsyncSession):
    """Ensure all achievements exist in DB."""
    for ach_data in ACHIEVEMENTS:
        existing = await db.execute(select(Achievement).where(Achievement.key == ach_data["key"]))
        if not existing.scalar_one_or_none():
            db.add(Achievement(**ach_data))
    await db.commit()


async def update_streak(user_id: str, db: AsyncSession) -> tuple[UserStreak, list[str]]:
    """Update streak after workout. Returns (streak, list of newly triggered achievement keys)."""
    today = date.today()

    result = await db.execute(select(UserStreak).where(UserStreak.user_id == user_id))
    streak = result.scalar_one_or_none()

    if not streak:
        streak = UserStreak(user_id=user_id)
        db.add(streak)

    newly_triggered = []

    if streak.last_workout_date:
        days_since = (today - streak.last_workout_date).days
        if days_since == 1:
            streak.current_streak += 1
        elif days_since == 0:
            pass  # Same day, no change
        else:
            streak.current_streak = 1  # Reset
    else:
        streak.current_streak = 1

    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak

    streak.last_workout_date = today

    # XP for workout
    streak.total_xp += 100 + (streak.current_streak * 2)

    # Check streak milestones
    for milestone, key in [(3, None), (7, "week_warrior"), (30, "iron_will"), (100, None)]:
        if streak.current_streak >= milestone and key:
            newly_triggered.append(key)

    await db.commit()
    return streak, newly_triggered


async def check_achievements(user_id: str, trigger_event: dict, db: AsyncSession) -> list[dict]:
    """Check and award any newly earned achievements."""
    newly_earned = []
    event_type = trigger_event.get("type", "")

    # Get all achievements and user's earned ones
    all_ach = await db.execute(select(Achievement))
    achievements = all_ach.scalars().all()

    earned = await db.execute(
        select(UserAchievement.achievement_id).where(UserAchievement.user_id == user_id)
    )
    earned_ids = {r[0] for r in earned.all()}

    for ach in achievements:
        if ach.id in earned_ids:
            continue

        should_award = False

        if ach.key == "first_rep" and event_type == "workout_complete":
            should_award = True

        elif ach.key == "century" and event_type == "workout_complete":
            count_result = await db.execute(
                select(func.count(Workout.id)).where(Workout.user_id == user_id)
            )
            total = count_result.scalar() or 0
            should_award = total >= 100

        elif ach.key == "consistency" and event_type == "workout_complete":
            month_start = date.today().replace(day=1)
            count_result = await db.execute(
                select(func.count(Workout.id)).where(and_(
                    Workout.user_id == user_id,
                    func.date(Workout.date) >= month_start,
                ))
            )
            should_award = (count_result.scalar() or 0) >= 12

        elif ach.key == "volume_king" and event_type == "workout_complete":
            week_start = date.today() - timedelta(days=7)
            vol_result = await db.execute(
                select(func.sum(WorkoutSet.weight_kg * WorkoutSet.reps))
                .join(Workout)
                .where(and_(
                    Workout.user_id == user_id,
                    func.date(Workout.date) >= week_start,
                    WorkoutSet.is_warmup == False,
                ))
            )
            should_award = (vol_result.scalar() or 0) >= 10000

        elif ach.key == "pr_machine" and event_type == "workout_complete":
            week_start = date.today() - timedelta(days=7)
            pr_result = await db.execute(
                select(func.count(PersonalRecord.id)).where(and_(
                    PersonalRecord.user_id == user_id,
                    func.date(PersonalRecord.achieved_at) >= week_start,
                ))
            )
            should_award = (pr_result.scalar() or 0) >= 5

        if should_award:
            ua = UserAchievement(user_id=user_id, achievement_id=ach.id, progress=1.0)
            db.add(ua)
            newly_earned.append({"key": ach.key, "name": ach.name, "xp_value": ach.xp_value, "icon_name": ach.icon_name})

    if newly_earned:
        await db.commit()

    return newly_earned


def calculate_level(total_xp: int) -> tuple[int, int]:
    """Returns (level, xp_to_next_level)."""
    level = 1
    xp_needed = 500
    xp_remaining = total_xp
    while xp_remaining >= xp_needed:
        xp_remaining -= xp_needed
        level += 1
        xp_needed = int(xp_needed * 1.5)
    return level, xp_needed - xp_remaining
