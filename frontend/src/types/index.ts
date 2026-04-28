export type Goal = "CUTTING" | "BULKING" | "MAINTENANCE";
export type Plan = "FREE" | "PRO";
export type MuscleGroup = "CHEST" | "BACK" | "SHOULDERS" | "BICEPS" | "TRICEPS" | "LEGS" | "GLUTES" | "CORE" | "CARDIO" | "FULL_BODY";
export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "PRE_WORKOUT" | "POST_WORKOUT";

export interface User {
  id: string;
  email: string;
  name?: string;
  supabaseId: string;
  plan: Plan;
  goal: Goal;
  currentSplitId?: string;
  tdee?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string;
  isCustom: boolean;
  userId?: string;
}

export interface Split {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  days: SplitDay[];
}

export interface SplitDay {
  id: string;
  splitId: string;
  dayNumber: number;
  label: string;
  exercises: SplitDayExercise[];
}

export interface SplitDayExercise {
  id: string;
  splitDayId: string;
  exerciseId: string;
  orderIndex: number;
  exercise?: Exercise;
}

export interface Workout {
  id: string;
  userId: string;
  splitDayId?: string;
  label: string;
  date: string;
  notes?: string;
  durationMin?: number;
  deletedAt?: string;
  sets?: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe?: number;
  isWarmup: boolean;
  exercise?: Exercise;
  workout?: Workout;
}

export interface NutritionLog {
  id: string;
  userId: string;
  date: string;
  mealType: MealType;
  foodName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  quantityG: number;
  openFoodFactsId?: string;
}

export interface CustomFood {
  id: string;
  userId: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  createdAt: string;
}

export interface FoodSearchResult {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface AISession {
  id: string;
  userId: string;
  createdAt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}
