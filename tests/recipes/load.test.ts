import path from "node:path"
import { describe, expect, it } from "vitest"
import { loadRecipes, RecipeLoadError } from "@/lib/recipes/load"

const fixtures = path.join(__dirname, "..", "fixtures")

function problemsFor(dir: string): string[] {
  try {
    loadRecipes(dir)
  } catch (e) {
    if (e instanceof RecipeLoadError) return e.problems
    throw e
  }
  return []
}

describe("loadRecipes", () => {
  it("loads valid recipes sorted newest first with defaults applied", () => {
    const recipes = loadRecipes(path.join(fixtures, "valid"))
    expect(recipes.map((r) => r.slug)).toEqual([
      "minimal-recipe",
      "full-recipe",
    ])
    const minimal = recipes[0]
    expect(minimal.tags).toEqual([])
    expect(minimal.featured).toBe(false)
    expect(minimal.date).toBe("2026-09-25")
    expect(minimal.sections.instructions).toBe("1. Stir.")
  })

  it("returns [] when the directory does not exist", () => {
    expect(loadRecipes(path.join(fixtures, "nope"))).toEqual([])
  })

  it("collects every problem across files with file-prefixed messages", () => {
    const problems = problemsFor(path.join(fixtures, "invalid"))
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Bad_Slug: folder name must be kebab-case/),
        expect.stringMatching(/^bad-frontmatter\/index\.md: categories\.0:/),
        expect.stringMatching(
          /^bad-frontmatter\/index\.md: ingredients\.0\.items\.0\.qty:/
        ),
        'bad-body/index.md: unknown section "## Tips" (allowed: Instructions, Notes, Variations)',
        'bad-body/index.md: missing required "## Instructions" section',
        'missing-image/index.md: image "nope.webp" not found in recipe folder',
      ])
    )
  })

  it("puts all problems in the error message", () => {
    expect(() => loadRecipes(path.join(fixtures, "invalid"))).toThrow(
      /bad-body\/index\.md/
    )
  })
})
