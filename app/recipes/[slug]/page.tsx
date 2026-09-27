import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { IngredientList } from "@/components/recipe/ingredient-list"
import { RatingStars } from "@/components/recipe/rating-stars"
import { RecipeGrid } from "@/components/recipe/recipe-grid"
import { RecipeImage } from "@/components/recipe/recipe-image"
import { RecipeMeta } from "@/components/recipe/recipe-meta"
import { getAllRecipes, getRecipe } from "@/lib/recipes"
import { renderMarkdown } from "@/lib/recipes/body"
import { CATEGORY_LABELS } from "@/lib/recipes/categories"
import { sourceLabel } from "@/lib/recipes/format"
import { relatedRecipes } from "@/lib/recipes/related"
import { orPlaceholder } from "@/lib/recipes/static-params"
import { toSummary } from "@/lib/recipes/summary"
import { recipeImageUrl } from "@/lib/site"

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return orPlaceholder(
    getAllRecipes().map((r) => ({ slug: r.slug })),
    "slug"
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = getRecipe((await params).slug)
  return recipe ? { title: recipe.title, description: recipe.description } : {}
}

function Prose({ markdown, slug }: { markdown: string; slug: string }) {
  return (
    <div
      className="prose-recipe"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown, slug) }}
    />
  )
}

export default async function RecipePage({ params }: Props) {
  const recipe = getRecipe((await params).slug)
  if (!recipe) notFound()

  const related = relatedRecipes(recipe, getAllRecipes()).map(toSummary)
  const { sections } = recipe

  return (
    <article className="mx-auto max-w-6xl px-4 pb-16 sm:pt-6">
      <RecipeImage
        src={
          recipe.image ? recipeImageUrl(recipe.slug, recipe.image) : undefined
        }
        alt={recipe.title}
        priority
        className="-mx-4 aspect-[4/3] sm:mx-0 sm:aspect-[21/9] sm:rounded-3xl"
      />

      <header className="mt-6 max-w-3xl space-y-4">
        <div className="flex flex-wrap gap-2 text-xs font-semibold tracking-[0.15em] text-primary uppercase">
          {recipe.categories.map((c) => (
            <Link key={c} href={`/category/${c}/`} className="hover:underline">
              {CATEGORY_LABELS[c]}
            </Link>
          ))}
        </div>
        <h1 className="font-heading text-4xl leading-tight font-semibold md:text-5xl">
          {recipe.title}
        </h1>
        <p className="text-lg text-muted-foreground">{recipe.description}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {recipe.rating !== undefined && (
            <RatingStars rating={recipe.rating} />
          )}
          <span>
            {recipe.source.url ? (
              <a
                href={recipe.source.url}
                className="underline underline-offset-4 hover:text-foreground"
                rel="noopener"
              >
                {sourceLabel(recipe.source)}
              </a>
            ) : (
              sourceLabel(recipe.source)
            )}
          </span>
        </div>
        <RecipeMeta
          time={recipe.time}
          servings={recipe.servings}
          difficulty={recipe.difficulty}
        />
      </header>

      <Separator className="my-8" />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,24rem)_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <IngredientList
            groups={recipe.ingredients}
            baseServings={recipe.servings}
          />
        </aside>

        <div className="space-y-10">
          <section aria-labelledby="instructions-heading">
            <h2
              id="instructions-heading"
              className="mb-5 font-heading text-2xl font-semibold"
            >
              Instructions
            </h2>
            <Prose markdown={sections.instructions} slug={recipe.slug} />
          </section>

          {sections.notes && (
            <section
              aria-labelledby="notes-heading"
              className="rounded-2xl bg-accent/50 p-5"
            >
              <h2
                id="notes-heading"
                className="mb-3 font-heading text-xl font-semibold"
              >
                Notes
              </h2>
              <Prose markdown={sections.notes} slug={recipe.slug} />
            </section>
          )}

          {sections.variations && (
            <section aria-labelledby="variations-heading">
              <h2
                id="variations-heading"
                className="mb-3 font-heading text-xl font-semibold"
              >
                Variations
              </h2>
              <Prose markdown={sections.variations} slug={recipe.slug} />
            </section>
          )}

          {recipe.equipment.length > 0 && (
            <section aria-labelledby="equipment-heading">
              <h2
                id="equipment-heading"
                className="mb-3 font-heading text-xl font-semibold"
              >
                Equipment
              </h2>
              <ul className="flex flex-wrap gap-2">
                {recipe.equipment.map((e) => (
                  <li key={e}>
                    <Badge variant="outline">{e}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recipe.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Tags">
              {recipe.tags.map((t) => (
                <li key={t}>
                  <Link href={`/tags/${t}/`}>
                    <Badge variant="secondary">#{t}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16">
          <h2
            id="related-heading"
            className="mb-6 font-heading text-2xl font-semibold"
          >
            You might also like
          </h2>
          <RecipeGrid recipes={related} />
        </section>
      )}
    </article>
  )
}
