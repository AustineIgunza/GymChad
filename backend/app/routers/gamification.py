"""routers/gamification.py — Streaks, achievements, challenges, leaderboard"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.gamification import UserStreak, Achievement, UserAchievement, Challenge, ChallengeParticipant
from app.schemas.gamification import StreakResponse, AchievementResponse, ChallengeCreate, ChallengeResponse
from app.services.gamification_service import seed_achievements, calculate_level

router = APIRouter()


@router.get("/streak", response_model=StreakResponse)
async def get_streak(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(UserStreak).where(UserStreak.user_id == current_user.id))
    streak = result.scalar_one_or_none()
    if not streak:
        return {"current_streak": 0, "longest_streak": 0, "last_workout_date": None, "total_xp": 0, "level": 1, "xp_to_next_level": 500}
    level, xp_to_next = calculate_level(streak.total_xp)
    return {**{c.name: getattr(streak, c.name) for c in streak.__table__.columns}, "level": level, "xp_to_next_level": xp_to_next}


@router.get("/achievements", response_model=list[AchievementResponse])
async def get_achievements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await seed_achievements(db)

    all_ach = await db.execute(select(Achievement))
    achievements = all_ach.scalars().all()

    earned = await db.execute(
        select(UserAchievement).where(UserAchievement.user_id == current_user.id)
        .options(__import__("sqlalchemy.orm", fromlist=["selectinload"]).selectinload(UserAchievement.achievement))
    )
    earned_map = {ua.achievement_id: ua for ua in earned.scalars().all()}

    result = []
    for ach in achievements:
        ua = earned_map.get(ach.id)
        result.append({
            "id": ach.id, "key": ach.key, "name": ach.name,
            "description": ach.description, "icon_name": ach.icon_name,
            "xp_value": ach.xp_value, "condition_type": ach.condition_type,
            "earned": ua is not None,
            "earned_at": ua.earned_at if ua else None,
        })
    return result


@router.get("/xp")
async def get_xp(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(UserStreak).where(UserStreak.user_id == current_user.id))
    streak = result.scalar_one_or_none()
    total_xp = streak.total_xp if streak else 0
    level, xp_to_next = calculate_level(total_xp)
    return {"total_xp": total_xp, "level": level, "xp_to_next_level": xp_to_next}


@router.post("/challenges", response_model=ChallengeResponse, status_code=201)
async def create_challenge(
    payload: ChallengeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenge = Challenge(**payload.model_dump(), creator_user_id=current_user.id)
    db.add(challenge)
    await db.flush()
    participant = ChallengeParticipant(challenge_id=challenge.id, user_id=current_user.id)
    db.add(participant)
    await db.commit()
    await db.refresh(challenge)
    return {**{c.name: getattr(challenge, c.name) for c in challenge.__table__.columns}, "participant_count": 1, "my_progress": 0}


@router.get("/challenges/my", response_model=list[ChallengeResponse])
async def my_challenges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Challenge).join(ChallengeParticipant, and_(
            ChallengeParticipant.challenge_id == Challenge.id,
            ChallengeParticipant.user_id == current_user.id,
        ))
    )
    challenges = result.scalars().all()
    out = []
    for c in challenges:
        count = await db.execute(select(func.count(ChallengeParticipant.id)).where(ChallengeParticipant.challenge_id == c.id))
        my_p = await db.execute(select(ChallengeParticipant).where(and_(ChallengeParticipant.challenge_id == c.id, ChallengeParticipant.user_id == current_user.id)))
        my_part = my_p.scalar_one_or_none()
        out.append({**{col.name: getattr(c, col.name) for col in c.__table__.columns}, "participant_count": count.scalar() or 0, "my_progress": my_part.current_value if my_part else 0, "my_rank": my_part.rank if my_part else None})
    return out


@router.get("/challenges", response_model=list[ChallengeResponse])
async def list_challenges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Challenge).where(and_(Challenge.is_public == True, Challenge.end_date >= date.today())).limit(20)
    )
    challenges = result.scalars().all()
    out = []
    for c in challenges:
        count = await db.execute(select(func.count(ChallengeParticipant.id)).where(ChallengeParticipant.challenge_id == c.id))
        my_p = await db.execute(select(ChallengeParticipant).where(and_(ChallengeParticipant.challenge_id == c.id, ChallengeParticipant.user_id == current_user.id)))
        my_part = my_p.scalar_one_or_none()
        out.append({**{col.name: getattr(c, col.name) for col in c.__table__.columns}, "participant_count": count.scalar() or 0, "my_progress": my_part.current_value if my_part else 0, "my_rank": my_part.rank if my_part else None})
    return out


@router.post("/challenges/{challenge_id}/join")
async def join_challenge(
    challenge_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(ChallengeParticipant).where(and_(ChallengeParticipant.challenge_id == challenge_id, ChallengeParticipant.user_id == current_user.id))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already joined")
    participant = ChallengeParticipant(challenge_id=challenge_id, user_id=current_user.id)
    db.add(participant)
    await db.commit()
    return {"joined": True}


@router.get("/challenges/{challenge_id}/leaderboard")
async def get_leaderboard(
    challenge_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChallengeParticipant, User.name)
        .join(User, ChallengeParticipant.user_id == User.id)
        .where(ChallengeParticipant.challenge_id == challenge_id)
        .order_by(desc(ChallengeParticipant.current_value))
    )
    rows = result.all()
    return [{"rank": i + 1, "user_id": r[0].user_id, "user_name": r[1] or "Athlete", "value": r[0].current_value} for i, r in enumerate(rows)]
