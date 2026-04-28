"""schemas/nutrition.py — Nutrition Pydantic schemas"""

from pydantic import BaseModel, field_validator
from datetime import date, datetime
from app.models.nutrition import MealType


class NutritionLogCreate(BaseModel):
    date: date
    meal_type: MealType
    food_name: str
    food_id: str | None = None
    quantity_g: float
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float

    @field_validator("quantity_g", "calories", "protein_g", "carbs_g", "fat_g")
    @classmethod
    def must_be_positive(cls, v):
        if v < 0:
            raise ValueError("Nutritional values cannot be negative")
        return round(v, 2)


class NutritionLogUpdate(BaseModel):
    meal_type: MealType | None = None
    food_name: str | None = None
    quantity_g: float | None = None
    calories: float | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None


class NutritionLogResponse(BaseModel):
    id: str
    user_id: str
    date: date
    meal_type: MealType
    food_name: str
    food_id: str | None
    quantity_g: float
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    created_at: datetime

    model_config = {"from_attributes": True}


class DailySummary(BaseModel):
    date: date
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    logs: list[NutritionLogResponse]


class CustomFoodCreate(BaseModel):
    name: str
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float


class CustomFoodResponse(BaseModel):
    id: str
    user_id: str
    name: str
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    created_at: datetime

    model_config = {"from_attributes": True}
