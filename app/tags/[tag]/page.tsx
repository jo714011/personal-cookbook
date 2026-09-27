import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { RecipeGrid } from "@/components/recipe/recipe-grid"
import { getAllRecipes } from "@/lib/recipes"
import { tagCounts } from "@/lib/recipes/collections"
import { toSummary } from "@/lib/recipes/summary"

type Props = { params: Promise<{ tag: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return tagCounts(getAllRecipes().map(toSummary)).map(({ tag }) => ({ tag }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `#${(await params).tag}` }
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params
  const recipes = getAllRecipes()
    .map(toSummary)
    .filter((r) => r.tags.includes(tag))
  if (!recipes.length) notFound()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
        Tag
      </p>
      <h1 className="mt-2 mb-8 font-heading text-4xl font-semibold md:text-5xl">
        #{tag}
      </h1>
      <RecipeGrid recipes={recipes} />
    </div>
  )
}
