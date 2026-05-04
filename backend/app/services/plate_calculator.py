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
        # FIX: return frontend-expected field names (weight_per_side, plates_per_side, achievable, actual_weight)
        return {
            "target_weight": target_weight,
            "bar_weight": bar,
            "weight_per_side": 0.0,
            "plates_per_side": [],
            "achievable": False,
            "actual_weight": bar,
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

    actual = bar + sum(p.plate * p.count for p in result) * 2
    is_achievable = round(remaining * 2, 4) < 0.01  # negligible remainder

    # FIX: use frontend-expected field names throughout
    return {
        "target_weight": target_weight,
        "bar_weight": bar,
        "weight_per_side": round(per_side, 2),
        "plates_per_side": [{"weight": p.plate, "count": p.count, "color": p.color} for p in result],
        "achievable": is_achievable,
        "actual_weight": round(actual, 2),
        "unit": unit,
    }
