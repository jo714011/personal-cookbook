import { describe, expect, it } from "vitest"
import {
  formatIngredientAmount,
  formatMinutes,
  formatQty,
  scaleQty,
  sourceLabel,
} from "@/lib/recipes/format"

describe("formatQty", () => {
  it.each([
    [1, "1"],
    [0.5, "½"],
    [1.5, "1½"],
    [0.25, "¼"],
    [0.75, "¾"],
    [0.333, "⅓"],
    [0.6667, "⅔"],
    [0.125, "⅛"],
    [2.375, "2⅜"],
    [1.99, "2"],
    [3.01, "3"],
    [0.3, "0.3"],
    [1.46, "1.5"],
    [0.01, "0.01"],
  ])("formats %s as %s", (n, expected) => {
    expect(formatQty(n)).toBe(expected)
  })
})

describe("scaleQty", () => {
  it("scales proportionally", () => {
    expect(scaleQty(1.5, 4, 8)).toBe(3)
    expect(scaleQty(1, 4, 2)).toBe(0.5)
  })
})

describe("formatIngredientAmount", () => {
  it("scales and formats qty with unit", () => {
    expect(
      formatIngredientAmount({ qty: 1.5, unit: "lb", item: "chicken" }, 2, 4)
    ).toBe("¾ lb")
  })
  it("formats qty without unit", () => {
    expect(formatIngredientAmount({ qty: 8, item: "tortillas" }, 6, 4)).toBe(
      "12"
    )
  })
  it("returns empty string when there is no qty (never scaled)", () => {
    expect(
      formatIngredientAmount({ item: "salt", note: "to taste" }, 8, 4)
    ).toBe("")
  })
})

describe("formatMinutes", () => {
  it.each([
    [5, "5 min"],
    [60, "1 hr"],
    [75, "1 hr 15 min"],
    [150, "2 hr 30 min"],
  ])("formats %s", (n, expected) => {
    expect(formatMinutes(n)).toBe(expected)
  })
})

describe("sourceLabel", () => {
  it.each([
    [{ type: "original" as const }, "Original recipe"],
    [
      { type: "family" as const, name: "Grandma's card" },
      "Family recipe · Grandma's card",
    ],
    [{ type: "family" as const }, "Family recipe"],
    [
      { type: "cookbook" as const, name: "Salt Fat Acid Heat" },
      "From Salt Fat Acid Heat",
    ],
    [{ type: "web" as const, name: "Serious Eats" }, "From Serious Eats"],
    [{ type: "web" as const }, "From the web"],
    [
      { type: "adapted" as const, name: "NYT Cooking" },
      "Adapted from NYT Cooking",
    ],
  ])("labels %o", (source, expected) => {
    expect(sourceLabel(source)).toBe(expected)
  })
})
