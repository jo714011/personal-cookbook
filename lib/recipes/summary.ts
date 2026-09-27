import { recipeImageUrl } from "../site"
import type { Category } from "./categories"
import type { Recipe } from "./load"
import type { Difficulty } from "./schema"

// Client-safe: only type imports from load.ts
export type RecipeSummary = {
  slug: string
  title: string
  description: string
  date: string
  imageUrl?: string
  categories: Category[]
  tags: string[]
  ingredients: string[]
  rating?: number
  totalMinutes?: number
  difficulty: Difficulty
  featured: boolean
}

export function toSummary(recipe: Recipe): RecipeSummary {
  const { time } = recipe
  const derived =
    time && (time.prep !== undefined || time.cook !== undefined)
      ? (time.prep ?? 0) + (time.cook ?? 0)
      : undefined

  const summary: RecipeSummary = {
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description,
    date: recipe.date,
    categories: recipe.categories,
    tags: recipe.tags,
    ingredients: recipe.ingredients.flatMap((g) => g.items.map((i) => i.item)),
    difficulty: recipe.difficulty,
    featured: recipe.featured,
  }
  if (recipe.image) summary.imageUrl = recipeImageUrl(recipe.slug, recipe.image)
  if (recipe.rating !== undefined) summary.rating = recipe.rating
  const total = time?.total ?? derived
  if (total !== undefined) summary.totalMinutes = total
  return summary
}
