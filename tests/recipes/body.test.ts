import { describe, expect, it } from "vitest"
import { parseBody, renderMarkdown } from "@/lib/recipes/body"

const full = `
## Instructions
1. Season the chicken.
2. Roast it.

## Notes
- Next time: more chipotle.

## Variations
- Use pork shoulder.
`

describe("parseBody", () => {
  it("splits the three sections", () => {
    const r = parseBody(full)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.sections.instructions).toBe("1. Season the chicken.\n2. Roast it.")
    expect(r.sections.notes).toBe("- Next time: more chipotle.")
    expect(r.sections.variations).toBe("- Use pork shoulder.")
  })

  it("handles CRLF line endings", () => {
    const r = parseBody(full.replace(/\n/g, "\r\n"))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.sections.instructions).toBe("1. Season the chicken.\n2. Roast it.")
    expect(r.sections.notes).toBe("- Next time: more chipotle.")
  })

  it("treats Notes and Variations as optional", () => {
    const r = parseBody("## Instructions\n1. Mix.")
    expect(r).toEqual({ ok: true, sections: { instructions: "1. Mix." } })
  })

  it("allows ### subheadings inside a section", () => {
    const r = parseBody(
      "## Instructions\n### Sauce\n1. Mix.\n### Chicken\n1. Roast."
    )
    expect(r.ok).toBe(true)
  })

  it("reports missing instructions, unknown and duplicate headings, and preamble", () => {
    const r = parseBody(
      "Intro text\n\n## Tips\n- x\n\n## Notes\n- a\n\n## Notes\n- b"
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors).toEqual([
      "content before the first ## heading is not allowed",
      'unknown section "## Tips" (allowed: Instructions, Notes, Variations)',
      'duplicate section "## Notes"',
      'missing required "## Instructions" section',
    ])
  })

  it("requires instructions to be a numbered list", () => {
    const r = parseBody("## Instructions\n- Mix things.")
    expect(r).toEqual({
      ok: false,
      errors: ['"## Instructions" must be a numbered list starting with "1."'],
    })
  })
})

describe("renderMarkdown", () => {
  it("renders ordered lists", () => {
    expect(renderMarkdown("1. Mix.\n2. Bake.", "x")).toContain("<ol>")
  })

  it("rewrites relative image paths to the recipe image folder", () => {
    const html = renderMarkdown("![Step 3](step-3.webp)", "tacos")
    expect(html).toContain(
      'src="/personal-cookbook/recipe-images/tacos/step-3.webp"'
    )
  })

  it("leaves absolute image URLs alone", () => {
    const html = renderMarkdown("![x](https://example.com/a.webp)", "tacos")
    expect(html).toContain('src="https://example.com/a.webp"')
  })
})
