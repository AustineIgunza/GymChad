"""
Nutrition calculations and utilities.
"""


def calculate_bmr(weight_kg: float, height_cm: float, age: int, sex: str) -> float:
    """
    Calculate Basal Metabolic Rate using Mifflin-St Jeor formula.
    
    Args:
        weight_kg: Body weight in kg
        height_cm: Height in cm
        age: Age in years
        sex: "M" or "F"
    
    Returns:
        BMR in calories per day
    """
    if sex.upper() == "M":
        return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:  # Female
        return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161


def calculate_tdee(bmr: float, activity_level: float = 1.55) -> float:
    """
    Calculate Total Daily Energy Expenditure.
    
    Activity levels:
        1.2: Sedentary
        1.375: Lightly active
        1.55: Moderately active (3-5 days/week)
        1.725: Very active
        1.9: Extremely active
    """
    return bmr * activity_level


def get_calorie_target(tdee: float, goal: str) -> float:
    """
    Calculate daily calorie target based on goal.
    
    Args:
        tdee: Total daily energy expenditure
        goal: "CUTTING", "BULKING", or "MAINTENANCE"
    
    Returns:
        Daily calorie target
    """
    multipliers = {
        "CUTTING": 0.80,      # 20% deficit
        "BULKING": 1.10,      # 10% surplus
        "MAINTENANCE": 1.0
    }
    return tdee * multipliers.get(goal, 1.0)


def get_macro_targets(calories: float, weight_kg: float) -> dict:
    """
    Calculate macro targets (protein, carbs, fat).
    
    Strategy:
        - Protein: 2.2g per kg (muscle preservation)
        - Fat: 25% of calories
        - Carbs: Remaining calories
    """
    protein_g = weight_kg * 2.2
    fat_calories = calories * 0.25
    fat_g = fat_calories / 9  # 9 cal per gram
    carb_calories = calories - (protein_g * 4) - fat_calories
    carb_g = carb_calories / 4  # 4 cal per gram
    
    return {
        "proteinG": round(protein_g, 1),
        "fatG": round(fat_g, 1),
        "carbsG": round(carb_g, 1)
    }
