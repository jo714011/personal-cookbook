import { describe, expect, it } from "vitest"
import { extractRecipe, parseIsoDuration } from "@/lib/import/extract-recipe"

const page = (...blocks: string[]) =>
  `<html><head>${blocks
    .map((b) => `<script type="application/ld+json">${b}</script>`)
    .join("")}</head><body></body></html>`

const plain = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Recipe",
  name: "Classic Pancakes",
  description: "Fluffy &amp; golden.",
  recipeIngredient: ["1 1/2 cups flour", "2 eggs"],
  recipeInstructions: [
    { "@type": "HowToStep", text: "Whisk the <b>dry</b> ingredients." },
    { "@type": "HowToStep", text: "Cook on a griddle." },
  ],
  recipeYield: ["4", "4 servings"],
  prepTime: "PT10M",
  cookTime: "PT15M",
  totalTime: "PT25M",
  recipeCategory: "Breakfast",
  recipeCuisine: ["American"],
  keywords: "pancakes, brunch",
  image: [{ "@type": "ImageObject", url: "https://example.com/p.jpg" }],
  author: { "@type": "Person", name: "Jane Cook" },
})

describe("parseIsoDuration", () => {
  it.each([
    ["PT10M", 10],
    ["PT1H30M", 90],
    ["PT2H", 120],
    ["P0DT0H45M", 45],
    ["PT90S", 2],
    ["", undefined],
    [undefined, undefined],
    ["soon", undefined],
  ])("parses %s", (input, expected) => {
    expect(parseIsoDuration(input)).toBe(expected)
  })
})

describe("extractRecipe", () => {
  it("extracts a plain Recipe object with clean text", () => {
    const r = extractRecipe(page(plain), "https://example.com/pancakes")!
    expect(r.name).toBe("Classic Pancakes")
    expect(r.description).toBe("Fluffy & golden.")
    expect(r.ingredients).toEqual(["1 1/2 cups flour", "2 eggs"])
    expect(r.instructions).toEqual([
      { steps: ["Whisk the dry ingredients.", "Cook on a griddle."] },
    ])
    expect(r.yield).toBe("4")
    expect([r.prepMinutes, r.cookMinutes, r.totalMinutes]).toEqual([10, 15, 25])
    expect(r.categories).toEqual(["Breakfast"])
    expect(r.cuisines).toEqual(["American"])
    expect(r.keywords).toEqual(["pancakes", "brunch"])
    expect(r.image).toBe("https://example.com/p.jpg")
    expect(r.author).toBe("Jane Cook")
    expect(r.url).toBe("https://example.com/pancakes")
  })

  it("finds a Recipe nested in @graph with @type as an array, skipping invalid JSON blocks", () => {
    const graph = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", name: "Page" },
        {
          "@type": ["Recipe", "NewsArticle"],
          name: "Graph Soup",
          recipeIngredient: ["1 onion"],
          recipeInstructions: "Chop the onion.\nSimmer it.",
          url: "https://example.com/canonical-soup",
        },
      ],
    })
    const r = extractRecipe(page("{ not valid json", graph))!
    expect(r.name).toBe("Graph Soup")
    expect(r.instructions).toEqual([
      { steps: ["Chop the onion.", "Simmer it."] },
    ])
    expect(r.url).toBe("https://example.com/canonical-soup")
  })

  it("keeps HowToSection groupings", () => {
    const sectioned = JSON.stringify({
      "@type": "Recipe",
      name: "Layered",
      recipeIngredient: [],
      recipeInstructions: [
        {
          "@type": "HowToSection",
          name: "Sauce",
          itemListElement: [{ "@type": "HowToStep", text: "Simmer tomatoes." }],
        },
        {
          "@type": "HowToSection",
          name: "Assembly",
          itemListElement: [
            { "@type": "HowToStep", name: "Layer", text: "Layer it all." },
          ],
        },
      ],
    })
    expect(extractRecipe(page(sectioned))!.instructions).toEqual([
      { section: "Sauce", steps: ["Simmer tomatoes."] },
      { section: "Assembly", steps: ["Layer it all."] },
    ])
  })

  it("returns null when there is no Recipe", () => {
    expect(
      extractRecipe(page(JSON.stringify({ "@type": "Article", name: "x" })))
    ).toBeNull()
    expect(extractRecipe("<html><body>No JSON-LD</body></html>")).toBeNull()
  })
})
