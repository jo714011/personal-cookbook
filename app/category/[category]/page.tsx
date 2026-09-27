import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { RecipeGrid } from "@/components/recipe/recipe-grid"
import { getAllRecipes } from "@/lib/recipes"
import { CATEGORY_LABELS, isCategory } from "@/lib/recipes/categories"
import { categoryCounts } from "@/lib/recipes/collections"
import { toSummary } from "@/lib/recipes/summary"

type Props = { params: Promise<{ category: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return categoryCounts(getAllRecipes().map(toSummary)).map(({ category }) => ({
    category,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  return isCategory(category) ? { title: CATEGORY_LABELS[category] } : {}
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  if (!isCategory(category)) notFound()
  const recipes = getAllRecipes()
    .map(toSummary)
    .filter((r) => r.categories.includes(category))

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
        Category
      </p>
      <h1 className="mt-2 mb-8 font-heading text-4xl font-semibold md:text-5xl">
        {CATEGORY_LABELS[category]}
      </h1>
      <RecipeGrid recipes={recipes} />
    </div>
  )
}
