import { describe, expect, it } from "vitest"
import { formatIssues, recipeFrontmatterSchema } from "@/lib/recipes/schema"

const valid = {
  title: "Green Chile Chicken Tacos",
  description: "Smoky braised chicken.",
  date: "2026-09-27",
  servings: 4,
  difficulty: "easy",
  categories: ["dinner"],
  ingredients: [{ items: [{ qty: 1.5, unit: "lb", item: "chicken thighs" }] }],
  source: { type: "original" },
}

function errorsFor(input: unknown): string[] {
  const result = recipeFrontmatterSchema.safeParse(input)
  return result.success ? [] : formatIssues(result.error)
}

describe("recipeFrontmatterSchema", () => {
  it("accepts a minimal recipe and applies defaults", () => {
    const r = recipeFrontmatterSchema.parse(valid)
    expect(r.tags).toEqual([])
    expect(r.equipment).toEqual([])
    expect(r.featured).toBe(false)
  })

  it("normalizes YAML Date objects and strings to YYYY-MM-DD", () => {
    const r = recipeFrontmatterSchema.parse({
      ...valid,
      date: new Date("2026-09-27T00:00:00Z"),
      updated: "2026-10-01",
    })
    expect(r.date).toBe("2026-09-27")
    expect(r.updated).toBe("2026-10-01")
  })

  it("rejects a non-date string", () => {
    expect(errorsFor({ ...valid, date: "last tuesday" })).toEqual([
      expect.stringContaining("date:"),
    ])
  })

  it("rejects an unknown category", () => {
    expect(errorsFor({ ...valid, categories: ["brunch"] })[0]).toMatch(
      /^categories\.0:/
    )
  })

  it("requires at least one category", () => {
    expect(errorsFor({ ...valid, categories: [] })[0]).toMatch(/^categories:/)
  })

  it("rejects non-kebab-case tags", () => {
    expect(errorsFor({ ...valid, tags: ["Quick Meals"] })[0]).toMatch(
      /^tags\.0: must be kebab-case/
    )
  })

  it("rejects fraction strings for qty with the field path", () => {
    const errors = errorsFor({
      ...valid,
      ingredients: [{ items: [{ qty: "1/2", unit: "cup", item: "flour" }] }],
    })
    expect(errors[0]).toMatch(/^ingredients\.0\.items\.0\.qty:/)
  })

  it("allows ingredients without qty (salt to taste)", () => {
    const r = recipeFrontmatterSchema.parse({
      ...valid,
      ingredients: [
        { group: "Seasoning", items: [{ item: "salt", note: "to taste" }] },
      ],
    })
    expect(r.ingredients[0].items[0].qty).toBeUndefined()
  })

  it("rejects unknown fields to catch typos", () => {
    expect(errorsFor({ ...valid, servigns: 4 }).length).toBeGreaterThan(0)
  })

  it("validates rating range, difficulty, source type and url", () => {
    expect(errorsFor({ ...valid, rating: 6 })[0]).toMatch(/^rating:/)
    expect(errorsFor({ ...valid, difficulty: "trivial" })[0]).toMatch(
      /^difficulty:/
    )
    expect(errorsFor({ ...valid, source: { type: "tv" } })[0]).toMatch(
      /^source\.type:/
    )
    expect(
      errorsFor({ ...valid, source: { type: "web", url: "not a url" } })[0]
    ).toMatch(/^source\.url:/)
  })

  it("restricts image to a bare filename with an image extension", () => {
    expect(
      recipeFrontmatterSchema.safeParse({ ...valid, image: "hero.webp" })
        .success
    ).toBe(true)
    expect(errorsFor({ ...valid, image: "../hero.webp" })[0]).toMatch(/^image:/)
    expect(errorsFor({ ...valid, image: "hero.heic" })[0]).toMatch(/^image:/)
  })
})
