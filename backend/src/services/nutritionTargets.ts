import { Goal } from "@prisma/client";

export function calculateBMR(weightKg: number, heightCm: number, ageYears: number, sex: "male" | "female") {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

export function calculateTDEE(bmr: number, activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active") {
  const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  return Math.round(bmr * factors[activityLevel]);
}

export function getCalorieTarget(tdee: number, goal: Goal) {
  if (goal === "CUTTING") return Math.round(tdee * 0.8);
  if (goal === "BULKING") return Math.round(tdee * 1.1);
  return Math.round(tdee);
}

export function getMacroTargets(calories: number, weightKg: number, _goal: Goal) {
  const proteinG = Math.round(weightKg * 2.2);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4);
  return { proteinG, carbsG, fatG };
}
