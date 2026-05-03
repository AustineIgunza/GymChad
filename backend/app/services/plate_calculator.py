"""services/plate_calculator.py — Calculate plates to load on each side of a barbell"""

from dataclasses import dataclass

KG_PLATES = [25.0, 20.0, 15.0, 10.0, 5.0, 2.5, 1.25]
LB_PLATES = [45.0, 35.0, 25.0, 10.0, 5.0, 2.5, 1.25]

# Color codes for standard Olympic plates (kg)
PLATE_COLORS = {
    25.0: "#DC2626",   # Red
    20.0: "#2563EB",   # Blue
    15.0: "#CA8A04",   # Yellow
    10.0: "#16A34A",   # Green
    5.0:  "#FFFFFF",   # White
    2.5:  "#111827",   # Black
    1.25: "#6B7280",   # Grey
    45.0: "#DC2626",
    35.0: "#CA8A04",
}

@dataclass
class PlateResult:
    plate: float
    count: int          # per side
    color: str


def calculate_plates(
    target_weight: float,
    bar_weight: float = 20.0,
    unit: str = "kg",
) -> dict:
    """
    Calculate the plates needed on each side of the bar.
    Returns total_weight, plates_per_side (list), and remainder (weight that can't be plated).
    """
    plates = KG_PLATES if unit == "kg" else LB_PLATES
    bar = bar_weight
    per_side = (target_weight - bar) / 2

    if per_side < 0:
        return {
            "target_weight": target_weight,
            "bar_weight": bar,
            "achievable_weight": bar,
            "per_side": 0,
            "plates": [],
            "remainder": 0,
            "unit": unit,
        }

    remaining = per_side
    result: list[PlateResult] = []

    for plate in plates:
        if remaining <= 0:
            break
        count = int(remaining // plate)
        if count > 0:
            color = PLATE_COLORS.get(plate, "#6B7280")
            result.append(PlateResult(plate=plate, count=count, color=color))
            remaining -= count * plate
            remaining = round(remaining, 4)

    achievable = bar + sum(p.plate * p.count for p in result) * 2

    return {
        "target_weight": target_weight,
        "bar_weight": bar,
        "achievable_weight": round(achievable, 2),
        "per_side": per_side,
        "plates": [{"plate": p.plate, "count": p.count, "color": p.color} for p in result],
        "remainder": round(remaining * 2, 4),
        "unit": unit,
    }
