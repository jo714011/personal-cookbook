import Link from "next/link"
import { RecipeGrid } from "@/components/recipe/recipe-grid"
import { SearchBox } from "@/components/recipe/search-box"
import { SurpriseButton } from "@/components/recipe/surprise-button"
import { getAllRecipes } from "@/lib/recipes"
import { CATEGORY_LABELS } from "@/lib/recipes/categories"
import {
  categoryCounts,
  featuredRecipes,
  recentRecipes,
} from "@/lib/recipes/collections"
import { toSummary } from "@/lib/recipes/summary"

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mt-14">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 className="font-heading text-3xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function HomePage() {
  const summaries = getAllRecipes().map(toSummary)
  const featured = featuredRecipes(summaries)
  const recent = recentRecipes(summaries, 6)
  const categories = categoryCounts(summaries)

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <section className="py-12 text-center md:py-20">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          {summaries.length} {summaries.length === 1 ? "recipe" : "recipes"} and
          counting
        </p>
        <h1 className="mt-4 font-heading text-5xl leading-tight font-semibold md:text-7xl">
          What are we cooking?
        </h1>
        <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
          <SearchBox className="flex-1" />
          <SurpriseButton
            slugs={summaries.map((s) => s.slug)}
            size="lg"
            className="h-11"
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Try “chicken + rice + spicy”
        </p>
      </section>

      {featured.length > 0 && (
        <Section title="Featured">
          <RecipeGrid recipes={featured} />
        </Section>
      )}

      <Section
        title="Recently added"
        action={
          <Link
            href="/recipes/"
            className="text-sm font-medium text-primary hover:underline"
          >
            See all →
          </Link>
        }
      >
        <RecipeGrid recipes={recent} />
      </Section>

      {categories.length > 0 && (
        <Section title="Browse by category">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map(({ category, count }) => (
              <li key={category}>
                <Link
                  href={`/category/${category}/`}
                  className="flex items-baseline justify-between rounded-2xl border bg-card px-5 py-4 transition-colors hover:border-primary hover:text-primary"
                >
                  <span className="font-heading text-lg font-semibold">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="text-sm text-muted-foreground">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
