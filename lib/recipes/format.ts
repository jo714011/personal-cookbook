import type { Ingredient, RecipeSource } from "./schema"

const FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
]
const TOLERANCE = 0.02

export function formatQty(n: number): string {
  const whole = Math.floor(n)
  const frac = n - whole
  if (whole === 0 && frac < 1 / 8 - TOLERANCE)
    return String(Math.round(n * 100) / 100)
  if (frac < TOLERANCE) return String(whole)
  if (frac > 1 - TOLERANCE) return String(whole + 1)
  const match = FRACTIONS.find(([value]) => Math.abs(frac - value) < TOLERANCE)
  if (match) return whole ? `${whole}${match[1]}` : match[1]
  return String(Math.round(n * 10) / 10)
}

export function scaleQty(
  qty: number,
  baseServings: number,
  servings: number
): number {
  return (qty * servings) / baseServings
}

export function formatIngredientAmount(
  ing: Ingredient,
  servings: number,
  baseServings: number
): string {
  if (ing.qty === undefined) return ""
  const amount = formatQty(scaleQty(ing.qty, baseServings, servings))
  return ing.unit ? `${amount} ${ing.unit}` : amount
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`
  const hours = Math.floor(min / 60)
  const rest = min % 60
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`
}

export function sourceLabel(source: RecipeSource): string {
  switch (source.type) {
    case "original":
      return "Original recipe"
    case "family":
      return source.name ? `Family recipe · ${source.name}` : "Family recipe"
    case "cookbook":
      return `From ${source.name ?? "a cookbook"}`
    case "web":
      return `From ${source.name ?? "the web"}`
    case "adapted":
      return `Adapted from ${source.name ?? "another recipe"}`
  }
}
