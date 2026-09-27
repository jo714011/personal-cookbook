import Link from "next/link"
import { Clock } from "lucide-react"
import { formatMinutes } from "@/lib/recipes/format"
import type { RecipeSummary } from "@/lib/recipes/summary"
import { RatingStars } from "./rating-stars"
import { RecipeImage } from "./recipe-image"

export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  return (
    <Link
      href={`/recipes/${recipe.slug}/`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <RecipeImage
        src={recipe.imageUrl}
        alt=""
        className="aspect-[4/3]"
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-xl leading-tight font-semibold group-hover:text-primary">
          {recipe.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {recipe.description}
        </p>
        <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-muted-foreground">
          {recipe.totalMinutes !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {formatMinutes(recipe.totalMinutes)}
            </span>
          )}
          {recipe.rating !== undefined && (
            <RatingStars rating={recipe.rating} />
          )}
        </div>
      </div>
    </Link>
  )
}
