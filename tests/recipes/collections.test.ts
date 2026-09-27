import { describe, expect, it } from "vitest"
import {
  categoryCounts,
  featuredRecipes,
  recentRecipes,
  tagCounts,
} from "@/lib/recipes/collections"
import type { RecipeSummary } from "@/lib/recipes/summary"

function s(slug: string, over: Partial<RecipeSummary> = {}): RecipeSummary {
  return {
    slug,
    title: slug,
    description: "",
    date: "2026-01-01",
    categories: ["dinner"],
    tags: [],
    ingredients: [],
    difficulty: "easy",
    featured: false,
    ...over,
  }
}

describe("featuredRecipes", () => {
  it("prefers featured recipes", () => {
    const items = [
      s("a", { rating: 5 }),
      s("b", { featured: true }),
      s("c", { featured: true }),
    ]
    expect(featuredRecipes(items).map((x) => x.slug)).toEqual(["b", "c"])
  })

  it("falls back to top-rated, newest first on ties, max 3", () => {
    const items = [
      s("a", { rating: 3 }),
      s("b", { rating: 5, date: "2026-01-01" }),
      s("c", { rating: 5, date: "2026-03-01" }),
      s("d", { rating: 4 }),
      s("e"),
    ]
    expect(featuredRecipes(items).map((x) => x.slug)).toEqual(["c", "b", "d"])
  })

  it("returns [] when nothing is featured or rated", () => {
    expect(featuredRecipes([s("a")])).toEqual([])
  })
})

describe("recentRecipes", () => {
  it("returns newest first, limited", () => {
    const items = [
      s("old", { date: "2025-01-01" }),
      s("new", { date: "2026-05-01" }),
    ]
    expect(recentRecipes(items, 1).map((x) => x.slug)).toEqual(["new"])
  })
})

describe("counts", () => {
  const items = [
    s("a", { categories: ["dinner", "baking"], tags: ["spicy"] }),
    s("b", { categories: ["dinner"], tags: ["spicy", "quick-meals"] }),
  ]

  it("counts categories in canonical order, skipping empty ones", () => {
    expect(categoryCounts(items)).toEqual([
      { category: "dinner", count: 2 },
      { category: "baking", count: 1 },
    ])
  })

  it("counts tags by frequency then name", () => {
    expect(tagCounts(items)).toEqual([
      { tag: "spicy", count: 2 },
      { tag: "quick-meals", count: 1 },
    ])
  })
})
