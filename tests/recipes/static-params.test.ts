import { describe, expect, it } from "vitest"
import { orPlaceholder, PLACEHOLDER_PARAM } from "@/lib/recipes/static-params"

describe("orPlaceholder", () => {
  it("passes non-empty params through", () => {
    expect(orPlaceholder([{ tag: "spicy" }], "tag")).toEqual([{ tag: "spicy" }])
  })

  it("returns one placeholder param when empty (Next rejects an empty list)", () => {
    expect(orPlaceholder([], "tag")).toEqual([{ tag: PLACEHOLDER_PARAM }])
  })

  it("uses a placeholder that can never be a real slug, tag, or category", () => {
    expect(PLACEHOLDER_PARAM).not.toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })
})
