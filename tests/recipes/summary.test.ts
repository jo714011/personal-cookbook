import path from "node:path"
import { describe, expect, it } from "vitest"
import { loadRecipes } from "@/lib/recipes/load"
import { toSummary } from "@/lib/recipes/summary"

const recipes = loadRecipes(path.join(__dirname, "..", "fixtures", "valid"))
const bySlug = (slug: string) => recipes.find((r) => r.slug === slug)!

describe("toSummary", () => {
  it("builds image URL, flat ingredient names, and total time", () => {
    const s = toSummary(bySlug("full-recipe"))
    expect(s.imageUrl).toBe(
      "/personal-cookbook/recipe-images/full-recipe/hero.webp"
    )
    expect(s.ingredients).toEqual(["chicken thighs", "salt"])
    expect(s.totalMinutes).toBe(30)
    expect(s.featured).toBe(true)
  })

  it("omits imageUrl and totalMinutes when absent", () => {
    const s = toSummary(bySlug("minimal-recipe"))
    expect(s.imageUrl).toBeUndefined()
    expect(s.totalMinutes).toBeUndefined()
  })

  it("derives total from prep + cook when total is missing", () => {
    const r = { ...bySlug("full-recipe"), time: { prep: 5, cook: 7 } }
    expect(toSummary(r).totalMinutes).toBe(12)
  })
})
