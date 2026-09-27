import type { RecipeSummary } from "@/lib/recipes/summary"
import { RecipeCard } from "./recipe-card"

export function RecipeGrid({
  recipes,
  empty = "No recipes yet.",
}: {
  recipes: RecipeSummary[]
  empty?: string
}) {
  if (!recipes.length)
    return <p className="py-8 text-muted-foreground">{empty}</p>
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((r) => (
        <RecipeCard key={r.slug} recipe={r} />
      ))}
    </div>
  )
}
