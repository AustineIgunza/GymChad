/**
 * Format a weight value based on user's unit preference.
 * Always stores in kg internally; converts for display only.
 */
export function formatWeight(kg: number, useKg: boolean, decimals = 1): string {
  if (useKg) return `${kg}kg`
  return `${(kg * 2.20462).toFixed(decimals)}lb`
}

export function toKg(value: number, useKg: boolean): number {
  return useKg ? value : value / 2.20462
}

export function fromKg(kg: number, useKg: boolean): number {
  return useKg ? kg : kg * 2.20462
}

/** Step increment for weight +/- buttons */
export function weightStep(useKg: boolean): number {
  return useKg ? 2.5 : 5
}
