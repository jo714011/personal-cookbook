import { describe, expect, it } from "vitest"
import { filterRecipes, parseQuery, searchRecipes } from "@/lib/recipes/search"
import type { RecipeSummary } from "@/lib/recipes/summary"

function recipe(slug: string, over: Partial<RecipeSummary>): RecipeSummary {
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

const items = [
  recipe("fried-rice", {
    title: "Spicy Chicken Fried Rice",
    tags: ["spicy", "chicken", "rice"],
    ingredients: [
      "cooked jasmine rice",
      "boneless chicken thighs",
      "chili crisp",
    ],
  }),
  recipe("tacos", {
    title: "Green Chile Tacos",
    tags: ["mexican", "spicy"],
    ingredients: ["boneless chicken thighs", "corn tortillas", "tomatoes"],
  }),
  recipe("oats", {
    title: "Overnight Oats",
    categories: ["breakfast"],
    tags: ["meal-prep"],
    ingredients: ["rolled oats", "milk"],
  }),
]

const slugs = (r: RecipeSummary[]) => r.map((x) => x.slug)

describe("parseQuery", () => {
  it("splits on +, commas and whitespace, lowercases, drops empties", () => {
    expect(parseQuery("  Chicken + RICE,spicy  +")).toEqual([
      "chicken",
      "rice",
      "spicy",
    ])
    expect(parseQuery("   ")).toEqual([])
  })
})

describe("searchRecipes", () => {
  it("returns everything for an empty query", () => {
    expect(slugs(searchRecipes(items, ""))).toEqual([
      "fried-rice",
      "tacos",
      "oats",
    ])
  })

  it("requires every term to match (AND)", () => {
    expect(slugs(searchRecipes(items, "chicken + rice + spicy"))).toEqual([
      "fried-rice",
    ])
  })

  it("does not fuzzy-match short terms to near-miss words (rice ≠ diced)", () => {
    const withDiced = [
      ...items,
      recipe("chile-tacos", {
        title: "Chile Tacos",
        tags: ["spicy", "chicken"],
        ingredients: ["diced green chiles", "corn tortillas"],
      }),
    ]
    expect(slugs(searchRecipes(withDiced, "chicken + rice + spicy"))).toEqual([
      "fried-rice",
    ])
  })

  it("returns nothing when any term matches nothing", () => {
    expect(searchRecipes(items, "chicken + zzzqqq")).toEqual([])
  })

  it("matches fuzzy typos", () => {
    expect(slugs(searchRecipes(items, "tomatos"))).toEqual(["tacos"])
  })

  it("matches on tags and categories", () => {
    expect(slugs(searchRecipes(items, "breakfast"))).toEqual(["oats"])
    expect(slugs(searchRecipes(items, "mexican"))).toEqual(["tacos"])
  })

  it("ranks title matches above ingredient-only matches", () => {
    const result = slugs(searchRecipes(items, "chicken"))
    expect(result[0]).toBe("fried-rice")
    expect(result).toContain("tacos")
  })
})

describe("filterRecipes", () => {
  it("filters by category and tag, ignoring missing filters", () => {
    expect(slugs(filterRecipes(items, { category: "breakfast" }))).toEqual([
      "oats",
    ])
    expect(slugs(filterRecipes(items, { tag: "spicy" }))).toEqual([
      "fried-rice",
      "tacos",
    ])
    expect(slugs(filterRecipes(items, {}))).toHaveLength(3)
  })
})
