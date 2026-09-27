export const CATEGORIES = [
  "breakfast",
  "lunch",
  "dinner",
  "dessert",
  "snack",
  "side",
  "drink",
  "baking",
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  dessert: "Dessert",
  snack: "Snacks",
  side: "Sides",
  drink: "Drinks",
  baking: "Baking",
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}
