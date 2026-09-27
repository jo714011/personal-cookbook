"use client"

import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CATEGORY_LABELS, type Category } from "@/lib/recipes/categories"
import { filterRecipes, searchRecipes } from "@/lib/recipes/search"
import type { RecipeSummary } from "@/lib/recipes/summary"
import { RecipeGrid } from "./recipe-grid"

type Props = {
  recipes: RecipeSummary[]
  categories: { category: Category; count: number }[]
  tags: { tag: string; count: number }[]
}

export function RecipeBrowser({ recipes, categories, tags }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const category = searchParams.get("category") ?? undefined
  const tag = searchParams.get("tag") ?? undefined
  const urlQuery = searchParams.get("q") ?? ""
  const [query, setQuery] = useState(urlQuery)
  const [syncedUrlQuery, setSyncedUrlQuery] = useState(urlQuery)

  // Follow the URL when it changes from outside the input (header link, back/forward),
  // without clobbering in-progress typing (the URL holds the trimmed query).
  if (urlQuery !== syncedUrlQuery) {
    setSyncedUrlQuery(urlQuery)
    if (urlQuery !== query.trim()) setQuery(urlQuery)
  }

  function update(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const results = useMemo(
    () => searchRecipes(filterRecipes(recipes, { category, tag }), query),
    [recipes, category, tag, query]
  )

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            update({ q: e.target.value.trim() || undefined })
          }}
          placeholder="Search recipes or ingredients… (e.g. chicken + rice + spicy)"
          aria-label="Search recipes"
          className="h-11 bg-card pl-9"
        />
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by category"
      >
        <Button
          size="sm"
          className="rounded-full"
          variant={!category ? "default" : "outline"}
          aria-pressed={!category}
          onClick={() => update({ category: undefined })}
        >
          All
        </Button>
        {categories.map(({ category: c, count }) => (
          <Button
            key={c}
            size="sm"
            className="rounded-full"
            variant={category === c ? "default" : "outline"}
            aria-pressed={category === c}
            onClick={() => update({ category: category === c ? undefined : c })}
          >
            {CATEGORY_LABELS[c]} <span className="opacity-60">{count}</span>
          </Button>
        ))}
      </div>

      {tags.length > 0 && (
        <details className="group" open={Boolean(tag)}>
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground select-none">
            Tags
          </summary>
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by tag"
          >
            {tags.map(({ tag: t, count }) => (
              <Button
                key={t}
                size="xs"
                className="rounded-full"
                variant={tag === t ? "default" : "secondary"}
                aria-pressed={tag === t}
                onClick={() => update({ tag: tag === t ? undefined : t })}
              >
                #{t} <span className="opacity-60">{count}</span>
              </Button>
            ))}
          </div>
        </details>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span aria-live="polite">
          {results.length} {results.length === 1 ? "recipe" : "recipes"}
        </span>
        {(query || category || tag) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("")
              router.replace(pathname, { scroll: false })
            }}
          >
            <X aria-hidden /> Clear
          </Button>
        )}
      </div>

      <RecipeGrid
        recipes={results}
        empty="No recipes match. Try fewer or different terms."
      />
    </div>
  )
}
