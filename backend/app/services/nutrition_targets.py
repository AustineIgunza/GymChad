"""
services/nutrition_targets.py — TDEE and macro calculations

Mifflin-St Jeor equation (most accurate BMR formula):
  Male:   10W + 6.25H - 5A + 5
  Female: 10W + 6.25H - 5A - 161
  (W = kg, H = cm, A = age)

TDEE = BMR × activity multiplier
"""

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,       # Desk job, no exercise
    "light": 1.375,         # Exercise 1-3 days/week
    "moderate": 1.55,       # Exercise 3-5 days/week
    "active": 1.725,        # Hard exercise 6-7 days/week
    "very_active": 1.9,     # Physical job + hard exercise
}


def calculate_bmr(weight_kg: float, height_cm: float, age: int, sex: str) -> float:
    """Mifflin-St Jeor BMR formula."""
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    return base + 5 if sex == "male" else base - 161


def calculate_tdee(bmr: float, activity_level: str) -> int:
    """Total Daily Energy Expenditure = BMR × activity multiplier."""
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, 1.55)
    return round(bmr * multiplier)


def get_calorie_target(tdee: int, goal: str) -> int:
    """
    Adjust TDEE based on goal:
      CUTTING:     -20% deficit (aggressive but sustainable)
      BULKING:     +10% surplus (lean bulk — minimises fat gain)
      MAINTENANCE: no adjustment
    """
    if goal == "CUTTING":
        return round(tdee * 0.80)
    if goal == "BULKING":
        return round(tdee * 1.10)
    return tdee


def get_macro_targets(calories: int, weight_kg: float) -> dict:
    """
    Calculate macro targets from calorie goal and bodyweight.

    Protein: 2.2g/kg bodyweight (high protein for muscle retention/growth)
    Fat: 25% of calories
    Carbs: remaining calories

    1g protein = 4 kcal
    1g fat = 9 kcal
    1g carbs = 4 kcal
    """
    protein_g = round(weight_kg * 2.2)
    fat_g = round((calories * 0.25) / 9)
    # Carbs get the remaining calories
    remaining_kcal = calories - (protein_g * 4) - (fat_g * 9)
    carbs_g = round(remaining_kcal / 4)

    return {
        "protein_g": max(protein_g, 50),   # Never below 50g
        "fat_g": max(fat_g, 30),            # Never below 30g (hormonal health)
        "carbs_g": max(carbs_g, 0),
    }
