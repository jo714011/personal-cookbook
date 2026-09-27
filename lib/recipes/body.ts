import { marked } from "marked"
import { recipeImageUrl } from "../site"

export type RecipeSections = {
  instructions: string
  notes?: string
  variations?: string
}
export type ParseBodyResult =
  { ok: true; sections: RecipeSections } | { ok: false; errors: string[] }

type SectionKey = keyof RecipeSections

const HEADINGS: Record<string, SectionKey> = {
  instructions: "instructions",
  notes: "notes",
  variations: "variations",
}

export function parseBody(body: string): ParseBodyResult {
  const text = body.replace(/\r\n?/g, "\n")
  const parts = text.split(/^## +(.+?) *$/m)
  const errors: string[] = []
  const found: Partial<Record<SectionKey, string>> = {}

  if (parts[0].trim())
    errors.push("content before the first ## heading is not allowed")

  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].trim()
    const content = (parts[i + 1] ?? "").trim()
    const key = HEADINGS[heading.toLowerCase()]
    if (!key) {
      errors.push(
        `unknown section "## ${heading}" (allowed: Instructions, Notes, Variations)`
      )
    } else if (found[key] !== undefined) {
      errors.push(`duplicate section "## ${heading}"`)
    } else {
      found[key] = content
    }
  }

  if (!found.instructions) {
    errors.push('missing required "## Instructions" section')
  } else if (!/^1\.\s/m.test(found.instructions)) {
    errors.push('"## Instructions" must be a numbered list starting with "1."')
  }

  if (errors.length) return { ok: false, errors }

  const sections: RecipeSections = { instructions: found.instructions! }
  if (found.notes) sections.notes = found.notes
  if (found.variations) sections.variations = found.variations
  return { ok: true, sections }
}

const RELATIVE_IMAGE = /!\[([^\]]*)\]\((?![a-z]+:|\/)([^)\s]+)\)/gi

export function renderMarkdown(markdown: string, slug: string): string {
  const rewritten = markdown.replace(
    RELATIVE_IMAGE,
    (_match, alt: string, file: string) =>
      `![${alt}](${recipeImageUrl(slug, file)})`
  )
  return marked.parse(rewritten, { async: false }) as string
}
