"""
calorie_calculator.py — MET-based cardio calorie estimator

MET (Metabolic Equivalent of Task): 1 MET = energy cost of sitting quietly
Formula: Calories = MET × weight_kg × duration_hours

Uses ACSM metabolic equations for treadmill precision.
"""

from datetime import date, timedelta


def calculate_cardio_calories(
    cardio_type: str,
    duration_min: float,
    weight_kg: float,
    speed_kmh: float | None = None,
    incline_pct: float | None = None,
    level: int | None = None,
    rpm: float | None = None,
) -> float:
    """Return estimated calories burned for a cardio session."""
    duration_hours = duration_min / 60
    grade = (incline_pct or 0) / 100  # decimal grade

    if cardio_type in ("recumbent_bike", "upright_bike", "spinning"):
        if level is not None:
            # Level brackets based on common gym bike resistance scales
            if level <= 3:   met = 3.5
            elif level <= 6: met = 5.5
            elif level <= 10: met = 7.5
            elif level <= 15: met = 9.5
            else:             met = 12.0
        elif rpm is not None:
            if rpm < 60:   met = 3.5
            elif rpm < 80: met = 5.5
            elif rpm < 100: met = 7.5
            else:           met = 10.0
        else:
            met = 5.5  # moderate stationary cycling (ACSM)

    elif cardio_type == "treadmill":
        if speed_kmh:
            speed_m_min = speed_kmh * 1000 / 60
            if speed_kmh < 8.0:  # walking
                # ACSM walking: VO2 = 0.1 × speed + 1.8 × speed × grade + 3.5
                vo2 = 0.1 * speed_m_min + 1.8 * speed_m_min * grade + 3.5
            else:  # running
                # ACSM running: VO2 = 0.2 × speed + 0.9 × speed × grade + 3.5
                vo2 = 0.2 * speed_m_min + 0.9 * speed_m_min * grade + 3.5
            met = vo2 / 3.5  # 1 MET = 3.5 ml/kg/min
        else:
            met = 6.0

    elif cardio_type == "elliptical":
        if level is not None:
            met = 4.5 + level * 0.3
            met = min(met, 10.0)
        else:
            met = 5.0

    elif cardio_type == "rowing":
        if level is not None:
            met = 5.0 + level * 0.5
            met = min(met, 12.0)
        else:
            met = 7.0

    elif cardio_type == "stairmaster":
        if level is not None:
            met = 5.0 + level * 0.6
            met = min(met, 14.0)
        else:
            met = 9.0

    elif cardio_type == "jump_rope":
        met = 11.0

    elif cardio_type == "battle_ropes":
        met = 10.0

    elif cardio_type == "swimming":
        met = 6.0

    elif cardio_type == "walking":
        if speed_kmh:
            speed_m_min = speed_kmh * 1000 / 60
            vo2 = 0.1 * speed_m_min + 1.8 * speed_m_min * grade + 3.5
            met = vo2 / 3.5
        else:
            met = 3.5

    elif cardio_type == "hiking":
        met = 6.0

    elif cardio_type == "hiit":
        met = 9.0

    else:  # other
        met = 5.0

    return round(met * weight_kg * duration_hours, 1)


def calories_from_steps(steps: int, weight_kg: float) -> float:
    """
    Estimate calories burned from daily steps.
    Rule of thumb: ~0.04 kcal per step per 70 kg body weight.
    Scales linearly with body weight.
    """
    return round(steps * 0.04 * (weight_kg / 70), 1)


def calculate_streak(workout_dates: list[str], cardio_dates: list[str]) -> int:
    """
    Count consecutive active days (workout OR cardio logged) going back from today.
    Returns 0 if no activity today or yesterday.
    """
    if not workout_dates and not cardio_dates:
        return 0

    all_dates = sorted(
        {date.fromisoformat(d) for d in workout_dates + cardio_dates},
        reverse=True,
    )

    today = date.today()
    yesterday = today - timedelta(days=1)

    # Streak must be active (most recent day = today or yesterday)
    if all_dates[0] < yesterday:
        return 0

    streak = 0
    expected = today if all_dates[0] == today else yesterday

    for d in all_dates:
        if d == expected:
            streak += 1
            expected -= timedelta(days=1)
        elif d < expected:
            break

    return streak


def projected_fat_loss(
    avg_daily_calories: float,
    calorie_target: int,
    weekly_cardio_kcal: float,
    weeks: int = 12,
) -> list[dict]:
    """
    Project weekly weight (fat) change based on calorie deficit/surplus.
    7700 kcal ≈ 1 kg fat.
    Returns a list of {week, projected_weight_kg} if starting weight known.
    """
    daily_deficit = calorie_target - avg_daily_calories + (weekly_cardio_kcal / 7)
    weekly_deficit = daily_deficit * 7
    weekly_kg_change = weekly_deficit / 7700  # positive = loss, negative = gain

    return [
        {"week": i + 1, "kg_change": round(weekly_kg_change * (i + 1), 2)}
        for i in range(weeks)
    ]
