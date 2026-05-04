"""services/one_rm.py — 1RM estimation using Epley, Brzycki, and Lombardi formulas"""


def epley(weight: float, reps: int) -> float:
    """Epley formula: w * (1 + r/30)"""
    if reps == 1:
        return weight
    return weight * (1 + reps / 30)


def brzycki(weight: float, reps: int) -> float:
    """Brzycki formula: w * (36 / (37 - r))"""
    if reps >= 37:
        return weight * 2  # formula breaks down at 37+ reps
    if reps == 1:
        return weight
    return weight * 36 / (37 - reps)


def lombardi(weight: float, reps: int) -> float:
    """Lombardi formula: w * r^0.10"""
    if reps == 1:
        return weight
    return weight * (reps ** 0.10)


def calculate_one_rm(weight: float, reps: int) -> dict:
    """
    Return estimated 1RM from three formulas + average,
    plus a percentage table from 50% to 100%.
    """
    e = round(epley(weight, reps), 1)
    b = round(brzycki(weight, reps), 1)
    l = round(lombardi(weight, reps), 1)
    avg = round((e + b + l) / 3, 1)

    # Percentage table: 50%–100% in 5% steps with estimated reps
    # Based on Prilepin's table / % → reps lookup
    pct_reps = {
        100: 1, 95: 2, 90: 3, 85: 4, 80: 6,
        75: 8, 70: 10, 65: 12, 60: 15, 55: 18, 50: 20,
    }

    # FIX: renamed percentage_table → percentage_chart and estimated_reps → reps
    # to match the frontend interface expectation
    percentage_chart = []
    for pct in range(100, 45, -5):
        w = round(avg * pct / 100, 1)
        percentage_chart.append({
            "pct": pct,
            "weight": w,
            "reps": pct_reps.get(pct, max(1, round(30 * (1 - pct / 100)))),
        })

    return {
        "weight": weight,
        "reps": reps,
        "epley": e,
        "brzycki": b,
        "lombardi": l,
        "average": avg,
        "percentage_chart": percentage_chart,
    }
