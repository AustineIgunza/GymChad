"""services/warmup_calculator.py — Calculate warmup sets for a given working weight"""

from dataclasses import dataclass


@dataclass
class WarmupSet:
    set_number: int
    weight_kg: float
    weight_lb: float
    reps: int
    pct: int


# Standard warmup percentages and rep schemes
WARMUP_PROTOCOL = [
    (40, 10),   # 40% × 10 reps
    (60, 5),    # 60% × 5 reps
    (75, 3),    # 75% × 3 reps
    (90, 1),    # 90% × 1 rep
]


def calculate_warmup(working_weight_kg: float, round_to: float = 2.5) -> list[WarmupSet]:
    """
    Given a working weight in kg, return warmup sets.
    Weights are rounded to the nearest plate increment (default 2.5 kg).
    """
    if working_weight_kg <= 0:
        return []

    sets = []
    for i, (pct, reps) in enumerate(WARMUP_PROTOCOL, start=1):
        raw = working_weight_kg * pct / 100
        rounded_kg = round(raw / round_to) * round_to
        rounded_kg = max(rounded_kg, 0)
        sets.append(WarmupSet(
            set_number=i,
            weight_kg=rounded_kg,
            weight_lb=round(rounded_kg * 2.20462, 1),
            reps=reps,
            pct=pct,
        ))

    return sets
