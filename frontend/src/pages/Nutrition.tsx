import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, ChevronLeft, ChevronRight, Trash2, X, PencilLine, Star } from 'lucide-react'
import { nutritionApi } from '../services/nutrition'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../stores/uiStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { MacroRing } from '../components/ui/MacroRing'
import { PageHeader } from '../components/ui/PageHeader'
import type { DailySummary, NutritionLog, FoodSearchResult, MealType } from '../types'

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: '🌅 Breakfast', LUNCH: '☀️ Lunch', DINNER: '🌙 Dinner',
  SNACK: '🍎 Snack', PRE_WORKOUT: '⚡ Pre-Workout', POST_WORKOUT: '💪 Post-Workout',
}
const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT']

type FoodCategory = 'All' | 'Protein' | 'Carbs' | 'Vegetables' | 'Dairy' | 'Fruits' | 'Fats' | 'Legumes' | 'Supplements'

interface CommonFood extends FoodSearchResult { category: FoodCategory }

// Built-in common foods (calories & macros per 100g)
const COMMON_FOODS: CommonFood[] = [
  // ── Protein ──
  { id: 'p1',  category: 'Protein', name: 'Chicken Breast (cooked)',   calories_per_100g: 165, protein_per_100g: 31,   carbs_per_100g: 0,    fat_per_100g: 3.6 },
  { id: 'p2',  category: 'Protein', name: 'Chicken Thigh (cooked)',    calories_per_100g: 209, protein_per_100g: 26,   carbs_per_100g: 0,    fat_per_100g: 11  },
  { id: 'p3',  category: 'Protein', name: 'Turkey Breast (cooked)',    calories_per_100g: 135, protein_per_100g: 30,   carbs_per_100g: 0,    fat_per_100g: 1   },
  { id: 'p4',  category: 'Protein', name: 'Beef Mince (lean, cooked)', calories_per_100g: 215, protein_per_100g: 26,   carbs_per_100g: 0,    fat_per_100g: 12  },
  { id: 'p5',  category: 'Protein', name: 'Beef Mince 80/20 (cooked)',calories_per_100g: 254, protein_per_100g: 26,   carbs_per_100g: 0,    fat_per_100g: 17  },
  { id: 'p6',  category: 'Protein', name: 'Beef Steak (lean, cooked)', calories_per_100g: 271, protein_per_100g: 29,   carbs_per_100g: 0,    fat_per_100g: 17  },
  { id: 'p7',  category: 'Protein', name: 'Beef Ribeye (cooked)',      calories_per_100g: 291, protein_per_100g: 24,   carbs_per_100g: 0,    fat_per_100g: 21  },
  { id: 'p8',  category: 'Protein', name: 'Pork Chop (cooked)',        calories_per_100g: 231, protein_per_100g: 25,   carbs_per_100g: 0,    fat_per_100g: 14  },
  { id: 'p9',  category: 'Protein', name: 'Pork Tenderloin (cooked)',  calories_per_100g: 166, protein_per_100g: 26,   carbs_per_100g: 0,    fat_per_100g: 6   },
  { id: 'p10', category: 'Protein', name: 'Salmon (cooked)',           calories_per_100g: 208, protein_per_100g: 20,   carbs_per_100g: 0,    fat_per_100g: 13  },
  { id: 'p11', category: 'Protein', name: 'Tuna (canned, in water)',   calories_per_100g: 116, protein_per_100g: 26,   carbs_per_100g: 0,    fat_per_100g: 1   },
  { id: 'p12', category: 'Protein', name: 'Tuna (fresh, cooked)',      calories_per_100g: 184, protein_per_100g: 30,   carbs_per_100g: 0,    fat_per_100g: 6   },
  { id: 'p13', category: 'Protein', name: 'Tilapia (cooked)',          calories_per_100g: 128, protein_per_100g: 26,   carbs_per_100g: 0,    fat_per_100g: 3   },
  { id: 'p14', category: 'Protein', name: 'Cod (cooked)',              calories_per_100g: 105, protein_per_100g: 23,   carbs_per_100g: 0,    fat_per_100g: 0.9 },
  { id: 'p15', category: 'Protein', name: 'Shrimp (cooked)',           calories_per_100g: 99,  protein_per_100g: 24,   carbs_per_100g: 0,    fat_per_100g: 0.3 },
  { id: 'p16', category: 'Protein', name: 'Sardines (canned)',         calories_per_100g: 208, protein_per_100g: 25,   carbs_per_100g: 0,    fat_per_100g: 11  },
  { id: 'p17', category: 'Protein', name: 'Eggs (whole)',              calories_per_100g: 155, protein_per_100g: 13,   carbs_per_100g: 1.1,  fat_per_100g: 11  },
  { id: 'p18', category: 'Protein', name: 'Egg Whites',               calories_per_100g: 52,  protein_per_100g: 11,   carbs_per_100g: 0.7,  fat_per_100g: 0.2 },
  { id: 'p19', category: 'Protein', name: 'Tofu (firm)',              calories_per_100g: 144, protein_per_100g: 17,   carbs_per_100g: 3,    fat_per_100g: 8   },
  { id: 'p20', category: 'Protein', name: 'Tempeh',                   calories_per_100g: 193, protein_per_100g: 19,   carbs_per_100g: 9,    fat_per_100g: 11  },
  { id: 'p21', category: 'Protein', name: 'Edamame (shelled)',         calories_per_100g: 122, protein_per_100g: 11,   carbs_per_100g: 9.9,  fat_per_100g: 5.2 },
  { id: 'p22', category: 'Protein', name: 'Lamb (cooked)',             calories_per_100g: 258, protein_per_100g: 26,   carbs_per_100g: 0,    fat_per_100g: 17  },
  { id: 'p23', category: 'Protein', name: 'Chicken Wings (cooked)',    calories_per_100g: 203, protein_per_100g: 30,   carbs_per_100g: 0,    fat_per_100g: 9   },
  { id: 'p24', category: 'Protein', name: 'Duck Breast (cooked)',      calories_per_100g: 201, protein_per_100g: 28,   carbs_per_100g: 0,    fat_per_100g: 10  },
  { id: 'p25', category: 'Protein', name: 'Ham (deli, sliced)',        calories_per_100g: 107, protein_per_100g: 14,   carbs_per_100g: 1.5,  fat_per_100g: 5   },
  { id: 'p26', category: 'Protein', name: 'Bacon (cooked)',            calories_per_100g: 541, protein_per_100g: 37,   carbs_per_100g: 1.4,  fat_per_100g: 42  },
  // ── Carbs ──
  { id: 'c1',  category: 'Carbs', name: 'White Rice (cooked)',         calories_per_100g: 130, protein_per_100g: 2.7,  carbs_per_100g: 28,   fat_per_100g: 0.3 },
  { id: 'c2',  category: 'Carbs', name: 'Brown Rice (cooked)',         calories_per_100g: 123, protein_per_100g: 2.7,  carbs_per_100g: 26,   fat_per_100g: 1   },
  { id: 'c3',  category: 'Carbs', name: 'Basmati Rice (cooked)',       calories_per_100g: 120, protein_per_100g: 2.5,  carbs_per_100g: 25,   fat_per_100g: 0.3 },
  { id: 'c4',  category: 'Carbs', name: 'Oats (dry)',                  calories_per_100g: 389, protein_per_100g: 17,   carbs_per_100g: 66,   fat_per_100g: 7   },
  { id: 'c5',  category: 'Carbs', name: 'Oatmeal (cooked)',            calories_per_100g: 68,  protein_per_100g: 2.4,  carbs_per_100g: 12,   fat_per_100g: 1.4 },
  { id: 'c6',  category: 'Carbs', name: 'Pasta (cooked)',              calories_per_100g: 131, protein_per_100g: 5,    carbs_per_100g: 25,   fat_per_100g: 1.1 },
  { id: 'c7',  category: 'Carbs', name: 'Whole Wheat Pasta (cooked)', calories_per_100g: 124, protein_per_100g: 5.3,  carbs_per_100g: 24,   fat_per_100g: 1.1 },
  { id: 'c8',  category: 'Carbs', name: 'Bread (white)',               calories_per_100g: 265, protein_per_100g: 9,    carbs_per_100g: 49,   fat_per_100g: 3.2 },
  { id: 'c9',  category: 'Carbs', name: 'Bread (whole wheat)',         calories_per_100g: 247, protein_per_100g: 13,   carbs_per_100g: 41,   fat_per_100g: 4.2 },
  { id: 'c10', category: 'Carbs', name: 'Sourdough Bread',             calories_per_100g: 274, protein_per_100g: 9,    carbs_per_100g: 52,   fat_per_100g: 1.8 },
  { id: 'c11', category: 'Carbs', name: 'Bagel',                       calories_per_100g: 245, protein_per_100g: 9.8,  carbs_per_100g: 47,   fat_per_100g: 1.6 },
  { id: 'c12', category: 'Carbs', name: 'Tortilla (flour)',            calories_per_100g: 218, protein_per_100g: 5.7,  carbs_per_100g: 36,   fat_per_100g: 5.3 },
  { id: 'c13', category: 'Carbs', name: 'Chapati / Roti',             calories_per_100g: 297, protein_per_100g: 8.8,  carbs_per_100g: 52,   fat_per_100g: 6   },
  { id: 'c14', category: 'Carbs', name: 'Naan Bread',                  calories_per_100g: 317, protein_per_100g: 9.1,  carbs_per_100g: 55,   fat_per_100g: 7.5 },
  { id: 'c15', category: 'Carbs', name: 'Quinoa (cooked)',             calories_per_100g: 120, protein_per_100g: 4.4,  carbs_per_100g: 21,   fat_per_100g: 1.9 },
  { id: 'c16', category: 'Carbs', name: 'Couscous (cooked)',           calories_per_100g: 112, protein_per_100g: 3.8,  carbs_per_100g: 23,   fat_per_100g: 0.2 },
  { id: 'c17', category: 'Carbs', name: 'Potato (boiled)',             calories_per_100g: 87,  protein_per_100g: 1.9,  carbs_per_100g: 20,   fat_per_100g: 0.1 },
  { id: 'c18', category: 'Carbs', name: 'Sweet Potato (cooked)',       calories_per_100g: 86,  protein_per_100g: 1.6,  carbs_per_100g: 20,   fat_per_100g: 0.1 },
  { id: 'c19', category: 'Carbs', name: 'Mashed Potato',               calories_per_100g: 80,  protein_per_100g: 2,    carbs_per_100g: 17,   fat_per_100g: 0.1 },
  { id: 'c20', category: 'Carbs', name: 'Corn (sweet, cooked)',        calories_per_100g: 86,  protein_per_100g: 3.3,  carbs_per_100g: 19,   fat_per_100g: 1.4 },
  { id: 'c21', category: 'Carbs', name: 'Pita Bread',                  calories_per_100g: 275, protein_per_100g: 9.1,  carbs_per_100g: 56,   fat_per_100g: 1.2 },
  { id: 'c22', category: 'Carbs', name: 'Rice Cakes',                  calories_per_100g: 387, protein_per_100g: 8,    carbs_per_100g: 81,   fat_per_100g: 3.1 },
  { id: 'c23', category: 'Carbs', name: 'Cornflakes',                  calories_per_100g: 378, protein_per_100g: 7.3,  carbs_per_100g: 84,   fat_per_100g: 0.9 },
  { id: 'c24', category: 'Carbs', name: 'Granola',                     calories_per_100g: 471, protein_per_100g: 10,   carbs_per_100g: 64,   fat_per_100g: 20  },
  { id: 'c25', category: 'Carbs', name: 'Buckwheat (cooked)',          calories_per_100g: 92,  protein_per_100g: 3.4,  carbs_per_100g: 20,   fat_per_100g: 0.6 },
  // ── Dairy ──
  { id: 'd1',  category: 'Dairy', name: 'Whole Milk',                  calories_per_100g: 61,  protein_per_100g: 3.2,  carbs_per_100g: 4.8,  fat_per_100g: 3.3 },
  { id: 'd2',  category: 'Dairy', name: 'Skim Milk (0%)',              calories_per_100g: 34,  protein_per_100g: 3.4,  carbs_per_100g: 5,    fat_per_100g: 0.1 },
  { id: 'd3',  category: 'Dairy', name: '2% Milk',                     calories_per_100g: 50,  protein_per_100g: 3.3,  carbs_per_100g: 4.9,  fat_per_100g: 2   },
  { id: 'd4',  category: 'Dairy', name: 'Greek Yogurt (0% fat)',       calories_per_100g: 59,  protein_per_100g: 10,   carbs_per_100g: 3.6,  fat_per_100g: 0.4 },
  { id: 'd5',  category: 'Dairy', name: 'Greek Yogurt (2% fat)',       calories_per_100g: 73,  protein_per_100g: 9.7,  carbs_per_100g: 4,    fat_per_100g: 1.9 },
  { id: 'd6',  category: 'Dairy', name: 'Greek Yogurt (full fat)',     calories_per_100g: 97,  protein_per_100g: 9,    carbs_per_100g: 3.7,  fat_per_100g: 5   },
  { id: 'd7',  category: 'Dairy', name: 'Cottage Cheese (low fat)',    calories_per_100g: 72,  protein_per_100g: 12.4, carbs_per_100g: 2.7,  fat_per_100g: 1   },
  { id: 'd8',  category: 'Dairy', name: 'Cottage Cheese (full fat)',   calories_per_100g: 98,  protein_per_100g: 11,   carbs_per_100g: 3.4,  fat_per_100g: 4.3 },
  { id: 'd9',  category: 'Dairy', name: 'Cheddar Cheese',              calories_per_100g: 402, protein_per_100g: 25,   carbs_per_100g: 1.3,  fat_per_100g: 33  },
  { id: 'd10', category: 'Dairy', name: 'Mozzarella Cheese',           calories_per_100g: 280, protein_per_100g: 19,   carbs_per_100g: 2.2,  fat_per_100g: 17  },
  { id: 'd11', category: 'Dairy', name: 'Parmesan Cheese',             calories_per_100g: 431, protein_per_100g: 38,   carbs_per_100g: 4,    fat_per_100g: 29  },
  { id: 'd12', category: 'Dairy', name: 'Cream Cheese',                calories_per_100g: 342, protein_per_100g: 6,    carbs_per_100g: 4.1,  fat_per_100g: 34  },
  { id: 'd13', category: 'Dairy', name: 'Butter',                      calories_per_100g: 717, protein_per_100g: 0.9,  carbs_per_100g: 0.1,  fat_per_100g: 81  },
  { id: 'd14', category: 'Dairy', name: 'Heavy Cream',                 calories_per_100g: 340, protein_per_100g: 2.8,  carbs_per_100g: 2.8,  fat_per_100g: 36  },
  { id: 'd15', category: 'Dairy', name: 'Sour Cream',                  calories_per_100g: 198, protein_per_100g: 2.4,  carbs_per_100g: 4.6,  fat_per_100g: 20  },
  { id: 'd16', category: 'Dairy', name: 'Kefir',                       calories_per_100g: 61,  protein_per_100g: 3.3,  carbs_per_100g: 4.7,  fat_per_100g: 3.3 },
  // ── Vegetables ──
  { id: 'v1',  category: 'Vegetables', name: 'Broccoli (cooked)',      calories_per_100g: 35,  protein_per_100g: 2.4,  carbs_per_100g: 7.2,  fat_per_100g: 0.4 },
  { id: 'v2',  category: 'Vegetables', name: 'Spinach (raw)',           calories_per_100g: 23,  protein_per_100g: 2.9,  carbs_per_100g: 3.6,  fat_per_100g: 0.4 },
  { id: 'v3',  category: 'Vegetables', name: 'Spinach (cooked)',        calories_per_100g: 23,  protein_per_100g: 3,    carbs_per_100g: 3.7,  fat_per_100g: 0.4 },
  { id: 'v4',  category: 'Vegetables', name: 'Kale (cooked)',           calories_per_100g: 28,  protein_per_100g: 1.9,  carbs_per_100g: 5.6,  fat_per_100g: 0.4 },
  { id: 'v5',  category: 'Vegetables', name: 'Carrot (raw)',            calories_per_100g: 41,  protein_per_100g: 0.9,  carbs_per_100g: 10,   fat_per_100g: 0.2 },
  { id: 'v6',  category: 'Vegetables', name: 'Cucumber',               calories_per_100g: 16,  protein_per_100g: 0.7,  carbs_per_100g: 3.6,  fat_per_100g: 0.1 },
  { id: 'v7',  category: 'Vegetables', name: 'Tomato',                 calories_per_100g: 18,  protein_per_100g: 0.9,  carbs_per_100g: 3.9,  fat_per_100g: 0.2 },
  { id: 'v8',  category: 'Vegetables', name: 'Bell Pepper (red)',      calories_per_100g: 31,  protein_per_100g: 1,    carbs_per_100g: 6,    fat_per_100g: 0.3 },
  { id: 'v9',  category: 'Vegetables', name: 'Bell Pepper (green)',    calories_per_100g: 20,  protein_per_100g: 0.9,  carbs_per_100g: 4.6,  fat_per_100g: 0.2 },
  { id: 'v10', category: 'Vegetables', name: 'Asparagus (cooked)',     calories_per_100g: 20,  protein_per_100g: 2.2,  carbs_per_100g: 3.7,  fat_per_100g: 0.2 },
  { id: 'v11', category: 'Vegetables', name: 'Cauliflower (cooked)',   calories_per_100g: 23,  protein_per_100g: 1.9,  carbs_per_100g: 4.1,  fat_per_100g: 0.3 },
  { id: 'v12', category: 'Vegetables', name: 'Mushrooms (raw)',        calories_per_100g: 22,  protein_per_100g: 3.1,  carbs_per_100g: 3.3,  fat_per_100g: 0.3 },
  { id: 'v13', category: 'Vegetables', name: 'Green Beans (cooked)',   calories_per_100g: 35,  protein_per_100g: 1.9,  carbs_per_100g: 8,    fat_per_100g: 0.1 },
  { id: 'v14', category: 'Vegetables', name: 'Zucchini (cooked)',      calories_per_100g: 17,  protein_per_100g: 1.2,  carbs_per_100g: 3.5,  fat_per_100g: 0.3 },
  { id: 'v15', category: 'Vegetables', name: 'Onion (raw)',            calories_per_100g: 40,  protein_per_100g: 1.1,  carbs_per_100g: 9.3,  fat_per_100g: 0.1 },
  { id: 'v16', category: 'Vegetables', name: 'Garlic',                 calories_per_100g: 149, protein_per_100g: 6.4,  carbs_per_100g: 33,   fat_per_100g: 0.5 },
  { id: 'v17', category: 'Vegetables', name: 'Peas (cooked)',          calories_per_100g: 84,  protein_per_100g: 5.4,  carbs_per_100g: 15,   fat_per_100g: 0.2 },
  { id: 'v18', category: 'Vegetables', name: 'Brussels Sprouts',       calories_per_100g: 43,  protein_per_100g: 3.4,  carbs_per_100g: 9,    fat_per_100g: 0.3 },
  { id: 'v19', category: 'Vegetables', name: 'Celery',                 calories_per_100g: 16,  protein_per_100g: 0.7,  carbs_per_100g: 3,    fat_per_100g: 0.2 },
  { id: 'v20', category: 'Vegetables', name: 'Lettuce (romaine)',      calories_per_100g: 17,  protein_per_100g: 1.2,  carbs_per_100g: 3.3,  fat_per_100g: 0.3 },
  // ── Fruits ──
  { id: 'fr1', category: 'Fruits', name: 'Banana',                     calories_per_100g: 89,  protein_per_100g: 1.1,  carbs_per_100g: 23,   fat_per_100g: 0.3 },
  { id: 'fr2', category: 'Fruits', name: 'Apple',                      calories_per_100g: 52,  protein_per_100g: 0.3,  carbs_per_100g: 14,   fat_per_100g: 0.2 },
  { id: 'fr3', category: 'Fruits', name: 'Orange',                     calories_per_100g: 47,  protein_per_100g: 0.9,  carbs_per_100g: 12,   fat_per_100g: 0.1 },
  { id: 'fr4', category: 'Fruits', name: 'Grapes',                     calories_per_100g: 69,  protein_per_100g: 0.7,  carbs_per_100g: 18,   fat_per_100g: 0.2 },
  { id: 'fr5', category: 'Fruits', name: 'Strawberry',                 calories_per_100g: 32,  protein_per_100g: 0.7,  carbs_per_100g: 7.7,  fat_per_100g: 0.3 },
  { id: 'fr6', category: 'Fruits', name: 'Blueberry',                  calories_per_100g: 57,  protein_per_100g: 0.7,  carbs_per_100g: 14,   fat_per_100g: 0.3 },
  { id: 'fr7', category: 'Fruits', name: 'Watermelon',                 calories_per_100g: 30,  protein_per_100g: 0.6,  carbs_per_100g: 7.6,  fat_per_100g: 0.2 },
  { id: 'fr8', category: 'Fruits', name: 'Mango',                      calories_per_100g: 60,  protein_per_100g: 0.8,  carbs_per_100g: 15,   fat_per_100g: 0.4 },
  { id: 'fr9', category: 'Fruits', name: 'Avocado',                    calories_per_100g: 160, protein_per_100g: 2,    carbs_per_100g: 9,    fat_per_100g: 15  },
  { id: 'fr10',category: 'Fruits', name: 'Pineapple',                  calories_per_100g: 50,  protein_per_100g: 0.5,  carbs_per_100g: 13,   fat_per_100g: 0.1 },
  { id: 'fr11',category: 'Fruits', name: 'Pear',                       calories_per_100g: 57,  protein_per_100g: 0.4,  carbs_per_100g: 15,   fat_per_100g: 0.1 },
  { id: 'fr12',category: 'Fruits', name: 'Peach',                      calories_per_100g: 39,  protein_per_100g: 0.9,  carbs_per_100g: 9.5,  fat_per_100g: 0.3 },
  { id: 'fr13',category: 'Fruits', name: 'Kiwi',                       calories_per_100g: 61,  protein_per_100g: 1.1,  carbs_per_100g: 15,   fat_per_100g: 0.5 },
  { id: 'fr14',category: 'Fruits', name: 'Dates',                      calories_per_100g: 282, protein_per_100g: 2.5,  carbs_per_100g: 75,   fat_per_100g: 0.4 },
  { id: 'fr15',category: 'Fruits', name: 'Orange Juice',               calories_per_100g: 45,  protein_per_100g: 0.7,  carbs_per_100g: 10,   fat_per_100g: 0.2 },
  // ── Fats & Oils ──
  { id: 'f1',  category: 'Fats', name: 'Olive Oil',                    calories_per_100g: 884, protein_per_100g: 0,    carbs_per_100g: 0,    fat_per_100g: 100 },
  { id: 'f2',  category: 'Fats', name: 'Coconut Oil',                  calories_per_100g: 862, protein_per_100g: 0,    carbs_per_100g: 0,    fat_per_100g: 100 },
  { id: 'f3',  category: 'Fats', name: 'Avocado Oil',                  calories_per_100g: 884, protein_per_100g: 0,    carbs_per_100g: 0,    fat_per_100g: 100 },
  { id: 'f4',  category: 'Fats', name: 'Peanut Butter',                calories_per_100g: 588, protein_per_100g: 25,   carbs_per_100g: 20,   fat_per_100g: 50  },
  { id: 'f5',  category: 'Fats', name: 'Almond Butter',                calories_per_100g: 614, protein_per_100g: 21,   carbs_per_100g: 19,   fat_per_100g: 56  },
  { id: 'f6',  category: 'Fats', name: 'Almonds',                      calories_per_100g: 579, protein_per_100g: 21,   carbs_per_100g: 22,   fat_per_100g: 50  },
  { id: 'f7',  category: 'Fats', name: 'Walnuts',                      calories_per_100g: 654, protein_per_100g: 15,   carbs_per_100g: 14,   fat_per_100g: 65  },
  { id: 'f8',  category: 'Fats', name: 'Cashews',                      calories_per_100g: 553, protein_per_100g: 18,   carbs_per_100g: 30,   fat_per_100g: 44  },
  { id: 'f9',  category: 'Fats', name: 'Peanuts (roasted)',             calories_per_100g: 585, protein_per_100g: 24,   carbs_per_100g: 16,   fat_per_100g: 50  },
  { id: 'f10', category: 'Fats', name: 'Chia Seeds',                   calories_per_100g: 486, protein_per_100g: 17,   carbs_per_100g: 42,   fat_per_100g: 31  },
  { id: 'f11', category: 'Fats', name: 'Flaxseeds',                    calories_per_100g: 534, protein_per_100g: 18,   carbs_per_100g: 29,   fat_per_100g: 42  },
  { id: 'f12', category: 'Fats', name: 'Sunflower Seeds',              calories_per_100g: 584, protein_per_100g: 21,   carbs_per_100g: 20,   fat_per_100g: 51  },
  { id: 'f13', category: 'Fats', name: 'Tahini (sesame paste)',        calories_per_100g: 595, protein_per_100g: 17,   carbs_per_100g: 21,   fat_per_100g: 54  },
  // ── Legumes ──
  { id: 'l1',  category: 'Legumes', name: 'Black Beans (cooked)',      calories_per_100g: 132, protein_per_100g: 8.9,  carbs_per_100g: 24,   fat_per_100g: 0.5 },
  { id: 'l2',  category: 'Legumes', name: 'Chickpeas (cooked)',        calories_per_100g: 164, protein_per_100g: 8.9,  carbs_per_100g: 27,   fat_per_100g: 2.6 },
  { id: 'l3',  category: 'Legumes', name: 'Lentils (cooked)',          calories_per_100g: 116, protein_per_100g: 9,    carbs_per_100g: 20,   fat_per_100g: 0.4 },
  { id: 'l4',  category: 'Legumes', name: 'Kidney Beans (cooked)',     calories_per_100g: 127, protein_per_100g: 8.7,  carbs_per_100g: 23,   fat_per_100g: 0.5 },
  { id: 'l5',  category: 'Legumes', name: 'White Beans (cooked)',      calories_per_100g: 139, protein_per_100g: 9.7,  carbs_per_100g: 25,   fat_per_100g: 0.4 },
  { id: 'l6',  category: 'Legumes', name: 'Pinto Beans (cooked)',      calories_per_100g: 143, protein_per_100g: 9,    carbs_per_100g: 27,   fat_per_100g: 0.7 },
  { id: 'l7',  category: 'Legumes', name: 'Hummus',                    calories_per_100g: 166, protein_per_100g: 7.9,  carbs_per_100g: 14,   fat_per_100g: 10  },
  // ── Supplements ──
  { id: 's1',  category: 'Supplements', name: 'Whey Protein Powder',  calories_per_100g: 380, protein_per_100g: 80,   carbs_per_100g: 8,    fat_per_100g: 5   },
  { id: 's2',  category: 'Supplements', name: 'Casein Protein Powder',calories_per_100g: 360, protein_per_100g: 75,   carbs_per_100g: 8,    fat_per_100g: 4   },
  { id: 's3',  category: 'Supplements', name: 'Mass Gainer (per 100g)',calories_per_100g: 385, protein_per_100g: 30,   carbs_per_100g: 70,   fat_per_100g: 3   },
  { id: 's4',  category: 'Supplements', name: 'Plant Protein Powder',  calories_per_100g: 370, protein_per_100g: 72,   carbs_per_100g: 10,   fat_per_100g: 6   },
  { id: 's5',  category: 'Supplements', name: 'Protein Bar (avg)',     calories_per_100g: 375, protein_per_100g: 30,   carbs_per_100g: 42,   fat_per_100g: 12  },
]

const FOOD_CATEGORIES: FoodCategory[] = ['All', 'Protein', 'Carbs', 'Dairy', 'Vegetables', 'Fruits', 'Fats', 'Legumes', 'Supplements']

type AddMode = 'common' | 'search' | 'manual'
type ServingUnit = 'g' | 'ml' | 'oz' | 'piece' | 'cup' | 'tbsp' | 'tsp'

const UNIT_LABELS: Record<ServingUnit, string> = {
  g: 'g', ml: 'ml', oz: 'oz', piece: 'piece', cup: 'cup', tbsp: 'tbsp', tsp: 'tsp',
}
const UNIT_TO_GRAMS: Partial<Record<ServingUnit, number>> = {
  g: 1, ml: 1, oz: 28.35, cup: 240, tbsp: 15, tsp: 5,
}

// Manual entry stores per-100g values + amount/unit
interface ManualFood {
  name: string
  cal100: string   // calories per 100g
  pro100: string   // protein per 100g
  carb100: string  // carbs per 100g
  fat100: string   // fat per 100g
  quantity: string // amount in the selected unit
}

const defaultManual: ManualFood = {
  name: '',
  cal100: '',
  pro100: '',
  carb100: '',
  fat100: '',
  quantity: '1',
}

interface ServingInputProps {
  quantity: string
  setQuantity: (v: string) => void
  servingUnit: ServingUnit
  setServingUnit: (u: ServingUnit) => void
  gramsPerPiece: string
  setGramsPerPiece: (v: string) => void
}

function ServingInput({ quantity, setQuantity, servingUnit, setServingUnit, gramsPerPiece, setGramsPerPiece }: ServingInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium text-text-secondary block mb-1">Amount</label>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            min="0.1"
            step="0.1"
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-700/50"
            placeholder="1"
          />
        </div>
        <div className="w-28">
          <label className="text-xs font-medium text-text-secondary block mb-1">Unit</label>
          <select
            value={servingUnit}
            onChange={e => setServingUnit(e.target.value as ServingUnit)}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-700/50"
          >
            {(Object.keys(UNIT_LABELS) as ServingUnit[]).map(u => (
              <option key={u} value={u}>{UNIT_LABELS[u]}</option>
            ))}
          </select>
        </div>
      </div>
      {servingUnit === 'piece' && (
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1">Grams per piece</label>
          <input
            type="number"
            value={gramsPerPiece}
            onChange={e => setGramsPerPiece(e.target.value)}
            min="1"
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-700/50"
            placeholder="e.g. 120"
          />
        </div>
      )}
    </div>
  )
}

function MacroPreview({ macros }: { macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number } }) {
  return (
    <div className="grid grid-cols-4 gap-2 p-3 bg-bg-tertiary rounded-xl text-center">
      {[
        { label: 'Calories', val: macros.calories },
        { label: 'Protein', val: `${macros.protein_g}g` },
        { label: 'Carbs', val: `${macros.carbs_g}g` },
        { label: 'Fat', val: `${macros.fat_g}g` },
      ].map(({ label, val }) => (
        <div key={label}>
          <div className="text-sm font-bold text-text-primary">{val}</div>
          <div className="text-xs text-text-muted">{label}</div>
        </div>
      ))}
    </div>
  )
}

export function NutritionPage() {
  const { user } = useAuthStore()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('common')
  const [foodCategory, setFoodCategory] = useState<FoodCategory>('All')
  const [commonSearch, setCommonSearch] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [mealType, setMealType] = useState<MealType>('BREAKFAST')
  const [saving, setSaving] = useState(false)
  const [manualFood, setManualFood] = useState<ManualFood>(defaultManual)
  const [servingUnit, setServingUnit] = useState<ServingUnit>('g')
  const [gramsPerPiece, setGramsPerPiece] = useState('100')
  const toast = useToast()

  const fetchNutrition = async (d: string) => {
    setLoading(true)
    try {
      const data = await nutritionApi.getDay(d)
      setSummary(data)
    } catch {
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  // Silent background refresh — no loading spinner, used after logging food
  const refreshNutrition = async (d: string) => {
    try {
      const data = await nutritionApi.getDay(d)
      setSummary(data)
    } catch { /* ignore — stale data is fine */ }
  }

  // Convert amount + unit to grams
  const toGrams = (amount: number, unit: ServingUnit, gpp: number): number => {
    if (unit === 'piece') return amount * gpp
    return amount * (UNIT_TO_GRAMS[unit] ?? 1)
  }

  useEffect(() => { fetchNutrition(date) }, [date])

  const changeDate = (delta: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().split('T')[0])
  }

  const handleSearch = async () => {
    if (!searchQ.trim()) return
    setSearching(true)
    try {
      const results = await nutritionApi.searchFoods(searchQ)
      setSearchResults(results)
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const calcMacros = (food: FoodSearchResult, grams: number) => {
    const ratio = grams / 100
    return {
      calories: Math.round(food.calories_per_100g * ratio * 10) / 10,
      protein_g: Math.round(food.protein_per_100g * ratio * 10) / 10,
      carbs_g: Math.round(food.carbs_per_100g * ratio * 10) / 10,
      fat_g: Math.round(food.fat_per_100g * ratio * 10) / 10,
    }
  }

  const handleLog = async () => {
    if (!selectedFood) return
    setSaving(true)
    const g = toGrams(parseFloat(quantity) || 1, servingUnit, parseFloat(gramsPerPiece) || 100)
    const macros = calcMacros(selectedFood, g)
    try {
      await nutritionApi.create({ date, meal_type: mealType, food_name: selectedFood.name, quantity_g: g, ...macros })
      closeModal()
      toast.success('Food logged!')
      refreshNutrition(date)
    } catch {
      toast.error('Failed to save — please try again')
    } finally {
      setSaving(false)
    }
  }

  const handleLogManual = async () => {
    const cal100 = parseFloat(manualFood.cal100)
    if (!manualFood.name.trim() || !cal100) {
      toast.error('Name and calories per 100g are required')
      return
    }
    const foodAsCommon: FoodSearchResult = {
      id: 'manual',
      name: manualFood.name,
      calories_per_100g: cal100,
      protein_per_100g: parseFloat(manualFood.pro100) || 0,
      carbs_per_100g: parseFloat(manualFood.carb100) || 0,
      fat_per_100g: parseFloat(manualFood.fat100) || 0,
    }
    const g = toGrams(parseFloat(manualFood.quantity) || 1, servingUnit, parseFloat(gramsPerPiece) || 100)
    const macros = calcMacros(foodAsCommon, g)
    setSaving(true)
    try {
      await nutritionApi.create({ date, meal_type: mealType, food_name: manualFood.name, quantity_g: g, ...macros })
      closeModal()
      toast.success('Food logged!')
      refreshNutrition(date)
    } catch {
      toast.error('Failed to save — please try again')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await nutritionApi.delete(id)
      await fetchNutrition(date)
      toast.success('Removed')
    } catch {
      toast.error('Failed to remove')
    }
  }

  const closeModal = () => {
    setAddModal(false)
    setSelectedFood(null)
    setSearchQ('')
    setSearchResults([])
    setManualFood(defaultManual)
    setAddMode('common')
    setCommonSearch('')
    setFoodCategory('All')
    setServingUnit('g')
    setGramsPerPiece('100')
    setQuantity('100')
  }

  const groupedLogs = MEAL_TYPES.reduce((acc, m) => {
    acc[m] = summary?.logs?.filter(l => l.meal_type === m) || []
    return acc
  }, {} as Record<MealType, NutritionLog[]>)

  const macros = calcMacros(
    selectedFood || { calories_per_100g: 0, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 0 } as any,
    toGrams(parseFloat(quantity) || 0, servingUnit, parseFloat(gramsPerPiece) || 100)
  )

  return (
    <div className="page px-4">
      <PageHeader
        title="Nutrition"
        action={
          <Button size="sm" onClick={() => setAddModal(true)}>
            <Plus className="w-4 h-4" /> Log Food
          </Button>
        }
      />

      {/* Date picker */}
      <div className="flex items-center justify-between bg-bg-card border border-border rounded-2xl px-4 py-3 mb-4">
        <button onClick={() => changeDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-hover text-text-muted">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-text-primary text-sm">
          {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        <button
          onClick={() => changeDate(1)}
          disabled={date >= new Date().toISOString().split('T')[0]}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-hover text-text-muted disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Macro ring summary */}
      {summary && (
        <Card padding="md" className="mb-4">
          <div className="flex justify-center">
            <MacroRing
              calories={summary.total_calories}
              target={user?.calorie_target || 2000}
              protein={summary.total_protein_g}
              carbs={summary.total_carbs_g}
              fat={summary.total_fat_g}
              size={160}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border">
            {[
              { label: 'Calories', val: Math.round(summary.total_calories), target: user?.calorie_target, unit: 'kcal', color: 'text-primary-400' },
              { label: 'Protein', val: Math.round(summary.total_protein_g), target: user?.protein_target, unit: 'g', color: 'text-accent-blue' },
              { label: 'Carbs', val: Math.round(summary.total_carbs_g), target: user?.carbs_target, unit: 'g', color: 'text-accent-yellow' },
              { label: 'Fat', val: Math.round(summary.total_fat_g), target: user?.fat_target, unit: 'g', color: 'text-accent-orange' },
            ].map(({ label, val, target, unit, color }) => (
              <div key={label} className="text-center">
                <div className={`text-base font-bold ${color}`}>{val}</div>
                <div className="text-xs text-text-muted">{label}</div>
                {target && <div className="text-xs text-text-disabled">/{target}{unit}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Meals */}
      <div className="space-y-3">
        {MEAL_TYPES.map(mealType => {
          const logs = groupedLogs[mealType]
          if (!logs.length && !loading) return null
          return (
            <Card key={mealType} padding="none">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-text-primary text-sm">{MEAL_LABELS[mealType]}</h3>
                <span className="text-xs text-text-muted">
                  {Math.round(logs.reduce((a, l) => a + l.calories, 0))} kcal
                </span>
              </div>
              <div className="divide-y divide-border">
                {logs.map(log => (
                  <motion.div
                    key={log.id}
                    layout
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{log.food_name}</p>
                      <p className="text-xs text-text-muted">{log.quantity_g % 1 === 0 ? log.quantity_g : log.quantity_g.toFixed(1)}g · {Math.round(log.protein_g)}g P · {Math.round(log.carbs_g)}g C · {Math.round(log.fat_g)}g F</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-semibold text-text-secondary">{Math.round(log.calories)}</span>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
                {!logs.length && loading && (
                  <div className="px-4 py-3">
                    <div className="skeleton h-10 rounded-lg" />
                  </div>
                )}
              </div>
            </Card>
          )
        })}

        {!loading && !summary?.logs?.length && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-4xl mb-3"
            >
              🥗
            </motion.div>
            <p className="text-text-primary font-semibold mb-1">Nothing logged yet</p>
            <p className="text-text-muted text-sm mb-4">Track your meals to hit your targets</p>
            <Button onClick={() => setAddModal(true)}>
              <Plus className="w-4 h-4" /> Log your first meal
            </Button>
          </motion.div>
        )}
      </div>

      {/* Add food modal */}
      <Modal open={addModal} onClose={closeModal} title="Log Food">

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl mb-4">
          <button
            onClick={() => { setAddMode('common'); setSelectedFood(null) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${addMode === 'common' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-muted'}`}
          >
            <Star className="w-3.5 h-3.5" /> Common
          </button>
          <button
            onClick={() => { setAddMode('search'); setSelectedFood(null) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${addMode === 'search' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-muted'}`}
          >
            <Search className="w-3.5 h-3.5" /> Search
          </button>
          <button
            onClick={() => { setAddMode('manual'); setSelectedFood(null) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${addMode === 'manual' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-muted'}`}
          >
            <PencilLine className="w-3.5 h-3.5" /> Manual
          </button>
        </div>

        {/* Meal type selector (shared) */}
        <div className="mb-4">
          <p className="text-xs font-medium text-text-secondary mb-2">Meal</p>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map(m => (
              <button
                key={m}
                onClick={() => setMealType(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${mealType === m ? 'bg-primary-700 text-white' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'}`}
              >
                {MEAL_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* ── COMMON FOODS MODE ── */}
        {addMode === 'common' && (
          !selectedFood ? (
            <div>
              {/* Search within common foods */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <input
                  placeholder="Filter foods..."
                  value={commonSearch}
                  onChange={e => setCommonSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-700/50"
                />
              </div>
              {/* Category tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                {FOOD_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFoodCategory(cat)}
                    className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${foodCategory === cat ? 'bg-primary-700 text-white' : 'bg-bg-tertiary text-text-muted hover:bg-bg-hover'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {/* Food list */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {COMMON_FOODS
                  .filter(f => foodCategory === 'All' || f.category === foodCategory)
                  .filter(f => !commonSearch || f.name.toLowerCase().includes(commonSearch.toLowerCase()))
                  .map((food) => (
                    <button
                      key={food.id}
                      onClick={() => setSelectedFood(food)}
                      className="w-full text-left p-3 rounded-xl bg-bg-tertiary hover:bg-bg-hover transition-colors border border-border"
                    >
                      <p className="text-sm font-medium text-text-primary leading-tight">{food.name}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {food.calories_per_100g} kcal · {food.protein_per_100g}g P · {food.carbs_per_100g}g C · {food.fat_per_100g}g F per 100g
                      </p>
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-text-primary text-sm leading-snug flex-1">{selectedFood.name}</p>
                <button onClick={() => setSelectedFood(null)} className="text-text-muted hover:text-text-primary flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ServingInput quantity={quantity} setQuantity={setQuantity} servingUnit={servingUnit} setServingUnit={setServingUnit} gramsPerPiece={gramsPerPiece} setGramsPerPiece={setGramsPerPiece} />
              <MacroPreview macros={macros} />
              <Button fullWidth loading={saving} onClick={handleLog}>Log Food</Button>
            </div>
          )
        )}

        {/* ── SEARCH MODE ── */}
        {addMode === 'search' && (
          !selectedFood ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search food..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  leftIcon={<Search className="w-4 h-4" />}
                  className="flex-1"
                />
                <Button onClick={handleSearch} loading={searching}>Go</Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((food, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedFood(food)}
                    className="w-full text-left p-3 rounded-xl bg-bg-tertiary hover:bg-bg-hover transition-colors border border-border"
                  >
                    <p className="text-sm font-medium text-text-primary leading-tight truncate">{food.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {food.calories_per_100g} kcal · {food.protein_per_100g}g P · {food.carbs_per_100g}g C · {food.fat_per_100g}g F per 100g
                    </p>
                  </button>
                ))}
                {!searching && !searchResults.length && searchQ && (
                  <p className="text-center text-text-muted text-sm py-4">No results. Try manual entry instead.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-text-primary text-sm leading-snug flex-1">{selectedFood.name}</p>
                <button onClick={() => setSelectedFood(null)} className="text-text-muted hover:text-text-primary flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ServingInput quantity={quantity} setQuantity={setQuantity} servingUnit={servingUnit} setServingUnit={setServingUnit} gramsPerPiece={gramsPerPiece} setGramsPerPiece={setGramsPerPiece} />
              <MacroPreview macros={macros} />

              <Button fullWidth loading={saving} onClick={handleLog}>Log Food</Button>
            </div>
          )
        )}

        {/* ── MANUAL MODE ── */}
        {addMode === 'manual' && (() => {
          const manualCal100 = parseFloat(manualFood.cal100) || 0
          const manualPro100 = parseFloat(manualFood.pro100) || 0
          const manualCarb100 = parseFloat(manualFood.carb100) || 0
          const manualFat100 = parseFloat(manualFood.fat100) || 0
          const manualGrams = toGrams(parseFloat(manualFood.quantity) || 0, servingUnit, parseFloat(gramsPerPiece) || 100)
          const ratio = manualGrams / 100
          const preview = {
            cal: Math.round(manualCal100 * ratio * 10) / 10,
            pro: Math.round(manualPro100 * ratio * 10) / 10,
            carb: Math.round(manualCarb100 * ratio * 10) / 10,
            fat: Math.round(manualFat100 * ratio * 10) / 10,
          }
          return (
            <div className="space-y-3">
              <Input
                label="Food Name *"
                placeholder="e.g. Homemade Omelette"
                value={manualFood.name}
                onChange={e => setManualFood(f => ({ ...f, name: e.target.value }))}
              />
              <p className="text-xs font-medium text-text-secondary">Macros per 100g *</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Calories (kcal)" type="number" placeholder="155"
                  value={manualFood.cal100} onChange={e => setManualFood(f => ({ ...f, cal100: e.target.value }))} />
                <Input label="Protein (g)" type="number" placeholder="13"
                  value={manualFood.pro100} onChange={e => setManualFood(f => ({ ...f, pro100: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Carbs (g)" type="number" placeholder="1.1"
                  value={manualFood.carb100} onChange={e => setManualFood(f => ({ ...f, carb100: e.target.value }))} />
                <Input label="Fat (g)" type="number" placeholder="11"
                  value={manualFood.fat100} onChange={e => setManualFood(f => ({ ...f, fat100: e.target.value }))} />
              </div>
              <p className="text-xs font-medium text-text-secondary">How much are you eating?</p>
              <ServingInput
                quantity={manualFood.quantity}
                setQuantity={v => setManualFood(f => ({ ...f, quantity: v }))}
                servingUnit={servingUnit}
                setServingUnit={setServingUnit}
                gramsPerPiece={gramsPerPiece}
                setGramsPerPiece={setGramsPerPiece}
              />
              {manualGrams > 0 && manualCal100 > 0 && (
                <MacroPreview macros={{ calories: preview.cal, protein_g: preview.pro, carbs_g: preview.carb, fat_g: preview.fat }} />
              )}
              <Button fullWidth loading={saving} onClick={handleLogManual}
                disabled={!manualFood.name.trim() || !manualFood.cal100 || !manualFood.quantity}>
                Log Food
              </Button>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
