import { describe, expect, it } from "vitest"
import nextConfig from "../next.config"
import { assetUrl, BASE_PATH, recipeImageUrl } from "@/lib/site"

describe("site helpers", () => {
  it("prefixes asset paths with the base path", () => {
    expect(assetUrl("/robots.txt")).toBe("/personal-cookbook/robots.txt")
    expect(assetUrl("robots.txt")).toBe("/personal-cookbook/robots.txt")
  })

  it("builds recipe image URLs", () => {
    expect(recipeImageUrl("green-chile-tacos", "hero.webp")).toBe(
      "/personal-cookbook/recipe-images/green-chile-tacos/hero.webp"
    )
  })

  it("keeps next.config in sync with BASE_PATH and static export", () => {
    expect(nextConfig.basePath).toBe(BASE_PATH)
    expect(nextConfig.output).toBe("export")
    expect(nextConfig.trailingSlash).toBe(true)
    expect(nextConfig.images?.unoptimized).toBe(true)
  })
})
