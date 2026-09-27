import type { Metadata } from "next"
import { Suspense } from "react"
import { RecipeBrowser } from "@/components/recipe/recipe-browser"
import { RecipeGrid } from "@/components/recipe/recipe-grid"
import { getAllRecipes } from "@/lib/recipes"
import { categoryCounts, tagCounts } from "@/lib/recipes/collections"
import { toSummary } from "@/lib/recipes/summary"

export const metadata: Metadata = { title: "All recipes" }

export default function RecipesPage() {
  const summaries = getAllRecipes().map(toSummary)
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 font-heading text-4xl font-semibold md:text-5xl">
        All recipes
      </h1>
      {/* useSearchParams in RecipeBrowser requires a Suspense boundary in static export */}
      <Suspense fallback={<RecipeGrid recipes={summaries} />}>
        <RecipeBrowser
          recipes={summaries}
          categories={categoryCounts(summaries)}
          tags={tagCounts(summaries)}
        />
      </Suspense>
    </div>
  )
}
