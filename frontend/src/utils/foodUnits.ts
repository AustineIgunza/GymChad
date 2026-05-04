// Maps food name keywords to their natural unit and grams per unit
// Used to auto-detect unit-based foods (eggs, bananas, etc.)
export interface FoodUnit {
  unit: string
  grams_per_unit: number
  plural?: string
}

export const UNIT_FOODS: Record<string, FoodUnit> = {
  'egg': { unit: 'egg', grams_per_unit: 60, plural: 'eggs' },
  'large egg': { unit: 'egg', grams_per_unit: 60, plural: 'eggs' },
  'whole egg': { unit: 'egg', grams_per_unit: 60, plural: 'eggs' },
  'banana': { unit: 'banana', grams_per_unit: 118, plural: 'bananas' },
  'apple': { unit: 'apple', grams_per_unit: 182, plural: 'apples' },
  'orange': { unit: 'orange', grams_per_unit: 131, plural: 'oranges' },
  'pear': { unit: 'pear', grams_per_unit: 178, plural: 'pears' },
  'peach': { unit: 'peach', grams_per_unit: 150, plural: 'peaches' },
  'kiwi': { unit: 'kiwi', grams_per_unit: 75, plural: 'kiwis' },
  'avocado': { unit: 'avocado', grams_per_unit: 150, plural: 'avocados' },
  'potato': { unit: 'potato', grams_per_unit: 150, plural: 'potatoes' },
  'sweet potato': { unit: 'sweet potato', grams_per_unit: 130, plural: 'sweet potatoes' },
  'bread': { unit: 'slice', grams_per_unit: 30, plural: 'slices' },
  'toast': { unit: 'slice', grams_per_unit: 30, plural: 'slices' },
  'slice': { unit: 'slice', grams_per_unit: 30, plural: 'slices' },
  'bagel': { unit: 'bagel', grams_per_unit: 105, plural: 'bagels' },
  'tortilla': { unit: 'tortilla', grams_per_unit: 45, plural: 'tortillas' },
  'chapati': { unit: 'chapati', grams_per_unit: 55, plural: 'chapatis' },
  'roti': { unit: 'roti', grams_per_unit: 55, plural: 'rotis' },
  'naan': { unit: 'naan', grams_per_unit: 90, plural: 'naans' },
  'pita': { unit: 'pita', grams_per_unit: 60, plural: 'pitas' },
  'rice cake': { unit: 'rice cake', grams_per_unit: 9, plural: 'rice cakes' },
  'protein bar': { unit: 'bar', grams_per_unit: 65, plural: 'bars' },
  'sardine': { unit: 'can', grams_per_unit: 100, plural: 'cans' },
  'tuna': { unit: 'can', grams_per_unit: 140, plural: 'cans' },
  'chicken breast': { unit: 'breast', grams_per_unit: 174, plural: 'breasts' },
  'chicken wing': { unit: 'wing', grams_per_unit: 40, plural: 'wings' },
  'strawberry': { unit: 'strawberry', grams_per_unit: 12, plural: 'strawberries' },
  'date': { unit: 'date', grams_per_unit: 24, plural: 'dates' },
  'walnut': { unit: 'walnut', grams_per_unit: 7, plural: 'walnuts' },
  'almond': { unit: 'almond', grams_per_unit: 1.2, plural: 'almonds' },
  'cashew': { unit: 'cashew', grams_per_unit: 1.5, plural: 'cashews' },
  'scoop': { unit: 'scoop', grams_per_unit: 30, plural: 'scoops' },
  'protein powder': { unit: 'scoop', grams_per_unit: 30, plural: 'scoops' },
  'whey': { unit: 'scoop', grams_per_unit: 30, plural: 'scoops' },
  'casein': { unit: 'scoop', grams_per_unit: 30, plural: 'scoops' },
}

/**
 * Detect if a food name matches a unit-based food.
 * Returns the FoodUnit if matched, null otherwise.
 * Does partial case-insensitive matching.
 */
export function detectFoodUnit(foodName: string): FoodUnit | null {
  const lower = foodName.toLowerCase()
  // Longest match first (so "large egg" matches before "egg")
  const sortedKeys = Object.keys(UNIT_FOODS).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      return UNIT_FOODS[key]
    }
  }
  return null
}
