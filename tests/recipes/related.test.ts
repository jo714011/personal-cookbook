import { describe, expect, it } from "vitest"
import { relatedRecipes } from "@/lib/recipes/related"

const r = (
  slug: string,
  tags: string[],
  categories: string[],
  date = "2026-01-01"
) => ({
  slug,
  tags,
  categories,
  date,
})

describe("relatedRecipes", () => {
  const target = r("tacos", ["spicy", "chicken", "mexican"], ["dinner"])
  const all = [
    target,
    r("fried-rice", ["spicy", "chicken"], ["dinner"]),
    r("salsa", ["mexican", "spicy"], ["side"]),
    r("enchiladas", ["mexican"], ["dinner"], "2026-02-01"),
    r("stew", [], ["dinner"], "2026-01-15"),
    r("cookies", ["baking"], ["dessert"]),
  ]

  it("scores shared tags + 2x shared categories, newest breaks ties, excludes self", () => {
    // fried-rice 2+2=4, enchiladas 1+2=3, stew 0+2=2 (newer than salsa), salsa 2+0=2
    expect(relatedRecipes(target, all).map((x) => x.slug)).toEqual([
      "fried-rice",
      "enchiladas",
      "stew",
    ])
  })

  it("drops zero-score recipes", () => {
    expect(relatedRecipes(target, all, 10).map((x) => x.slug)).not.toContain(
      "cookies"
    )
  })

  it("returns [] when nothing is related", () => {
    expect(relatedRecipes(r("x", ["zzz"], ["drink"]), all)).toEqual([])
  })
})
