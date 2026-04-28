// Mifflin-St Jeor BMR calculation
export function calculateBMR(weightKg: number, heightCm: number, ageYears: number, sex: "M" | "F"): number {
  if (sex === "M") {
    return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  }
}

// Calculate TDEE based on activity level
export function calculateTDEE(bmr: number, activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active"): number {
  const multipliers: Record<typeof activityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * multipliers[activityLevel]);
}

// Get calorie target based on goal
export function getCalorieTarget(tdee: number, goal: "CUTTING" | "BULKING" | "MAINTENANCE"): number {
  if (goal === "CUTTING") return Math.round(tdee * 0.8); // 20% deficit
  if (goal === "BULKING") return Math.round(tdee * 1.1); // 10% surplus
  return tdee;
}

// Get macro targets based on calories, weight, and goal
export function getMacroTargets(
  calories: number,
  weightKg: number
): { proteinG: number; carbsG: number; fatG: number } {
  const proteinG = Math.round(weightKg * 2.2); // 2.2g per kg
  const fatG = Math.round((calories * 0.25) / 9); // 25% of calories
  const carbsG = Math.round(((calories - proteinG * 4 - fatG * 9) / 4));

  return { proteinG, carbsG, fatG };
}

// Estimate 1RM using Epley formula
export function estimateOneRM(weightKg: number, reps: number): number {
  return Number((weightKg * (1 + reps / 30)).toFixed(1));
}

// Format date for display
export function formatDate(date: Date | string): string {
  if (typeof date === "string") date = new Date(date);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

// Format time for display
export function formatTime(date: Date | string): string {
  if (typeof date === "string") date = new Date(date);
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(date);
}

// Get day name from date
export function getDayName(date: Date | string): string {
  if (typeof date === "string") date = new Date(date);
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

// Get muscle group color
export function getMuscleGroupColor(muscleGroup: string): string {
  const colors: Record<string, string> = {
    CHEST: "bg-red-500",
    BACK: "bg-blue-500",
    SHOULDERS: "bg-purple-500",
    BICEPS: "bg-yellow-500",
    TRICEPS: "bg-orange-500",
    LEGS: "bg-green-500",
    GLUTES: "bg-pink-500",
    CORE: "bg-indigo-500",
    CARDIO: "bg-cyan-500",
    FULL_BODY: "bg-gray-500",
  };
  return colors[muscleGroup] || "bg-gray-400";
}

// Get meal type emoji
export function getMealTypeEmoji(mealType: string): string {
  const emojis: Record<string, string> = {
    BREAKFAST: "🍳",
    LUNCH: "🥗",
    DINNER: "🍖",
    SNACK: "🍎",
    PRE_WORKOUT: "⚡",
    POST_WORKOUT: "💪",
  };
  return emojis[mealType] || "🍽️";
}
