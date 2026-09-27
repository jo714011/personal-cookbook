# Personal Cookbook Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a statically exported Next.js cookbook site on GitHub Pages, fed by validated Markdown recipe files that Claude Code writes, commits, and pushes.

**Architecture:** Recipes live in `content/recipes/<slug>/index.md` (YAML frontmatter plus fixed Markdown sections) and are validated with zod at build time. Pure modules in `lib/` handle loading, formatting, search, related-recipe scoring, and URL import. Next.js App Router pages are prerendered with `output: "export"`; search, scaling, and Surprise Me run client-side over recipe summaries passed as props. GitHub Actions validates, tests, builds, and deploys `out/` to Pages. Claude's authoring workflow is encoded in `CLAUDE.md` plus two project skills.

**Tech Stack:** Next.js 16.3 (App Router, static export), React 19, TypeScript, Tailwind 4, shadcn (base-ui "base-vega" style), zod 4, gray-matter, marked, Fuse.js 7, sharp, Vitest, tsx, GitHub Actions + Pages, `gh` CLI.

**Spec:** `docs/superpowers/specs/2026-09-27-cookbook-phase1-design.md`

## Global Constraints

- Repo root is `personal-cookbook/` (all paths below are relative to it). Branch `main`. Commits use the repo-local identity already configured (`jo714011`, noreply email).
- Every commit message ends with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Next.js 16 has breaking changes vs. training data.** Before writing a page/layout/config, read the relevant file in `node_modules/next/dist/docs/01-app/` (static exports guide: `02-guides/static-exports.md`; `generateStaticParams`: `03-api-reference/04-functions/generate-static-params.md`; `useSearchParams`: `03-api-reference/04-functions/use-search-params.md`).
- `next.config.ts`: `output: "export"`, `basePath: "/personal-cookbook"`, `trailingSlash: true`, `images: { unoptimized: true }`.
- Site URL: `https://jo714011.github.io/personal-cookbook/`.
- Every page must carry `<meta name="robots" content="noindex, nofollow">`.
- Dynamic routes export `dynamicParams = false` and `generateStaticParams`. `params` is a `Promise` and must be awaited.
- Any client component calling `useSearchParams` must be rendered inside `<Suspense>`.
- `next/image` does not add `basePath` to `src`. Always build image URLs with `assetUrl`/`recipeImageUrl` from `lib/site.ts`.
- Code style follows `.prettierrc`: no semicolons, double quotes. Run `npm run format` before each commit that touches `.ts`/`.tsx`.
- Categories (fixed enum): `breakfast, lunch, dinner, dessert, snack, side, drink, baking`. Tags are kebab-case. Slugs are kebab-case folder names and are permanent.
- Allowed body H2 headings: `Instructions` (required, a numbered list), `Notes`, `Variations`. Anything else is a validation error.
- Images: ≤1600px wide, WebP q80, all metadata (EXIF/GPS) stripped. Raw photos in `inbox/` are never committed.
- URL imports: ingredients copied exactly; instructions and description rewritten; the source site's photo is never downloaded or committed; `source.url` is set.
- Library code under `lib/` is pure (except `lib/recipes/load.ts` and `lib/images/process.ts`, which touch the filesystem). Client components must never import `load.ts`, `index.ts`, or `process.ts`.

## Review Focus

1. **YAML dates:** gray-matter parses unquoted `date: 2026-09-27` into a JS `Date`, while a quoted value stays a string. Both must validate and normalize to `"2026-09-27"`. A non-date string must fail. (Tested in Task 2.)
2. **Windows line endings:** recipe files saved with CRLF (this repo lives on Windows/OneDrive) must parse their `## Instructions`/`## Notes` sections exactly like LF files. (Tested in Task 3; `.gitattributes` added in Task 1.)
3. **Hand-written quantities:** `qty: 1/2` (a YAML string) must fail validation with a message naming the field, and `qty: 0.333` must display as ⅓ rather than `0.3`. (Tested in Tasks 2 and 5.)
4. **Messy search input:** extra spaces, a trailing `+`, uppercase letters, commas, and a term that matches nothing must behave sensibly: normalized terms, and no results rather than partial results when any term misses. An empty query returns everything. (Tested in Task 6.)
5. **Messy JSON-LD from real sites:** invalid JSON blocks next to valid ones, HTML tags and entities inside strings, `@type` given as an array, and recipes nested in `@graph` must still extract clean text. (Tested in Task 9.)

## Deviations from spec (implementation detail only)

- Recipe images are served from `/recipe-images/<slug>/<file>` (copied to `public/recipe-images/`) rather than `/recipes/<slug>/…`, so asset paths never collide with the `/recipes/[slug]/` page route.
- There is no separate `search-index.json` file. Recipe summaries are passed as props to client components, which is equivalent for a personal-sized collection and removes a fetch plus a basePath edge case.
- Scripts are TypeScript run with `tsx` (`scripts/*.ts`) rather than `.mjs`, so they share types with `lib/`.

## File Structure

```
personal-cookbook/
  .gitattributes                       # force LF
  .gitignore                           # + inbox/*, public/recipe-images/
  CLAUDE.md                            # authoring rules (Task 15)
  .claude/skills/add-recipe/SKILL.md   # (Task 15)
  .claude/skills/update-recipe/SKILL.md
  .github/workflows/deploy.yml         # (Task 16)
  next.config.ts                       # static export config
  vitest.config.ts
  inbox/.gitkeep
  content/recipes/<slug>/index.md      # seed recipes (Task 10)
  lib/site.ts                          # BASE_PATH, SITE_NAME, assetUrl, recipeImageUrl
  lib/recipes/categories.ts            # CATEGORIES, labels, isCategory (client-safe)
  lib/recipes/schema.ts                # zod frontmatter schema + types + formatIssues
  lib/recipes/body.ts                  # parseBody (sections), renderMarkdown
  lib/recipes/load.ts                  # loadRecipes(dir) — fs, server/build only
  lib/recipes/index.ts                 # getAllRecipes/getRecipe (memoized) — server only
  lib/recipes/summary.ts               # RecipeSummary + toSummary (client-safe types)
  lib/recipes/format.ts                # formatQty, scaleQty, formatIngredientAmount, formatMinutes, sourceLabel
  lib/recipes/search.ts                # parseQuery, searchRecipes, filterRecipes
  lib/recipes/related.ts               # relatedRecipes
  lib/recipes/collections.ts           # featuredRecipes, recentRecipes, categoryCounts, tagCounts
  lib/images/process.ts                # processImage (sharp)
  lib/import/extract-recipe.ts         # extractRecipe(html), parseIsoDuration
  scripts/validate.ts                  # npm run validate
  scripts/copy-images.ts               # prebuild/predev: content → public/recipe-images
  scripts/process-image.ts             # npm run image -- <in> <out>
  scripts/fetch-recipe.ts              # npm run fetch-recipe -- <url>
  components/site-header.tsx, components/theme-toggle.tsx
  components/recipe/{recipe-image,recipe-card,recipe-grid,rating-stars,recipe-meta,
                     ingredient-list,servings-scaler,search-box,surprise-button,recipe-browser}.tsx
  app/layout.tsx, app/page.tsx, app/not-found.tsx, app/globals.css
  app/recipes/page.tsx, app/recipes/[slug]/page.tsx
  app/category/[category]/page.tsx, app/tags/[tag]/page.tsx
  public/robots.txt, public/.nojekyll
  tests/**                             # vitest tests + fixtures
```

---

### Task 1: Tooling, static export config, and site helpers

**Files:**
- Modify: `package.json`, `next.config.ts`, `.gitignore`
- Create: `.gitattributes`, `vitest.config.ts`, `inbox/.gitkeep`, `lib/site.ts`, `tests/site.test.ts`

**Interfaces:**
- Produces: `BASE_PATH: "/personal-cookbook"`, `SITE_NAME: string`, `SITE_DESCRIPTION: string`, `assetUrl(path: string): string`, `recipeImageUrl(slug: string, file: string): string` from `lib/site.ts`; npm scripts `test`, `validate`, `images:copy`, `image`, `fetch-recipe`.

- [ ] **Step 1: Install dependencies**

```bash
npm install zod gray-matter marked fuse.js
npm install -D vitest tsx sharp
```

Expected: installs succeed. Check that `package.json` now lists `zod` 4.x, `marked` 18.x, `fuse.js` 7.x, `vitest` 5.x, and `sharp` 0.35.x.

- [ ] **Step 2: Add npm scripts**

In `package.json` `"scripts"`, keep the existing entries and add:

```json
    "test": "vitest run",
    "validate": "tsx scripts/validate.ts",
    "images:copy": "tsx scripts/copy-images.ts",
    "predev": "npm run images:copy",
    "prebuild": "npm run images:copy",
    "image": "tsx scripts/process-image.ts",
    "fetch-recipe": "tsx scripts/fetch-recipe.ts"
```

(The scripts they point to are created in later tasks. `predev`/`prebuild` will fail until Task 8. That's expected, and nothing runs `dev`/`build` before then.)

- [ ] **Step 3: Line endings and ignores**

Create `.gitattributes`:

```
* text=auto eol=lf
*.webp binary
*.jpg binary
*.png binary
*.ico binary
```

Append to `.gitignore`:

```
# cookbook
/inbox/*
!/inbox/.gitkeep
/public/recipe-images/
```

Create an empty `inbox/.gitkeep`.

- [ ] **Step 4: Vitest config**

Create `vitest.config.ts`:

```ts
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: { alias: { "@": root } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
})
```

- [ ] **Step 5: Write the failing test**

Create `tests/site.test.ts`:

```ts
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
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `npm test`
Expected: FAIL. `@/lib/site` cannot be resolved.

- [ ] **Step 7: Implement**

Create `lib/site.ts`:

```ts
export const BASE_PATH = "/personal-cookbook"
export const SITE_NAME = "Personal Cookbook"
export const SITE_DESCRIPTION =
  "A living collection of recipes, cooking experiments, and meal ideas."

export function assetUrl(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`
}

export function recipeImageUrl(slug: string, file: string): string {
  return assetUrl(`/recipe-images/${slug}/${file}`)
}
```

Replace `next.config.ts`:

```ts
import type { NextConfig } from "next"

// Keep in sync with BASE_PATH in lib/site.ts (enforced by tests/site.test.ts)
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/personal-cookbook",
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
```

- [ ] **Step 8: Run tests and confirm they pass**

Run: `npm test`
Expected: PASS, 3 tests.

- [ ] **Step 9: Commit**

```bash
npm run format
git add -A
git commit -m "chore: tooling, static export config, site helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Recipe frontmatter schema

**Files:**
- Create: `lib/recipes/categories.ts`, `lib/recipes/schema.ts`, `tests/recipes/schema.test.ts`

**Interfaces:**
- Produces:
  - `categories.ts`: `CATEGORIES` (readonly tuple), `type Category`, `CATEGORY_LABELS: Record<Category, string>`, `isCategory(v: string): v is Category`
  - `schema.ts`: `recipeFrontmatterSchema` (zod), `type RecipeFrontmatter`, `type Ingredient`, `type IngredientGroup`, `type RecipeSource`, `type Difficulty`, `formatIssues(error: z.ZodError): string[]`

- [ ] **Step 1: Write the failing test**

Create `tests/recipes/schema.test.ts`:

```ts
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
    expect(errorsFor({ ...valid, categories: ["brunch"] })[0]).toMatch(/^categories\.0:/)
  })

  it("requires at least one category", () => {
    expect(errorsFor({ ...valid, categories: [] })[0]).toMatch(/^categories:/)
  })

  it("rejects non-kebab-case tags", () => {
    expect(errorsFor({ ...valid, tags: ["Quick Meals"] })[0]).toMatch(/^tags\.0: must be kebab-case/)
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
      ingredients: [{ group: "Seasoning", items: [{ item: "salt", note: "to taste" }] }],
    })
    expect(r.ingredients[0].items[0].qty).toBeUndefined()
  })

  it("rejects unknown fields to catch typos", () => {
    expect(errorsFor({ ...valid, servigns: 4 }).length).toBeGreaterThan(0)
  })

  it("validates rating range, difficulty, source type and url", () => {
    expect(errorsFor({ ...valid, rating: 6 })[0]).toMatch(/^rating:/)
    expect(errorsFor({ ...valid, difficulty: "trivial" })[0]).toMatch(/^difficulty:/)
    expect(errorsFor({ ...valid, source: { type: "tv" } })[0]).toMatch(/^source\.type:/)
    expect(errorsFor({ ...valid, source: { type: "web", url: "not a url" } })[0]).toMatch(
      /^source\.url:/
    )
  })

  it("restricts image to a bare filename with an image extension", () => {
    expect(recipeFrontmatterSchema.safeParse({ ...valid, image: "hero.webp" }).success).toBe(true)
    expect(errorsFor({ ...valid, image: "../hero.webp" })[0]).toMatch(/^image:/)
    expect(errorsFor({ ...valid, image: "hero.heic" })[0]).toMatch(/^image:/)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- tests/recipes/schema.test.ts`
Expected: FAIL. The module cannot be resolved.

- [ ] **Step 3: Implement**

Create `lib/recipes/categories.ts`:

```ts
export const CATEGORIES = [
  "breakfast",
  "lunch",
  "dinner",
  "dessert",
  "snack",
  "side",
  "drink",
  "baking",
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  dessert: "Dessert",
  snack: "Snacks",
  side: "Sides",
  drink: "Drinks",
  baking: "Baking",
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}
```

Create `lib/recipes/schema.ts`:

```ts
import { z } from "zod"
import { CATEGORIES } from "./categories"

const isoDate = z.union([z.string(), z.date()]).transform((value, ctx) => {
  const s = value instanceof Date ? value.toISOString().slice(0, 10) : value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) {
    ctx.addIssue({ code: "custom", message: "must be a date in YYYY-MM-DD format" })
    return z.NEVER
  }
  return s
})

const kebab = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case")
const minutes = z.number().int().nonnegative()

const ingredientSchema = z
  .object({
    qty: z.number().positive().optional(),
    unit: z.string().min(1).optional(),
    item: z.string().min(1),
    note: z.string().min(1).optional(),
  })
  .strict()

const ingredientGroupSchema = z
  .object({
    group: z.string().min(1).optional(),
    items: z.array(ingredientSchema).min(1),
  })
  .strict()

const sourceSchema = z
  .object({
    type: z.enum(["original", "family", "cookbook", "web", "adapted"]),
    name: z.string().min(1).optional(),
    url: z.url().optional(),
  })
  .strict()

export const recipeFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: isoDate,
    updated: isoDate.optional(),
    image: z
      .string()
      .regex(/^[\w-]+\.(webp|jpe?g|png)$/i, "must be a filename in the recipe folder")
      .optional(),
    servings: z.number().int().positive(),
    time: z
      .object({ prep: minutes.optional(), cook: minutes.optional(), total: minutes.optional() })
      .strict()
      .optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    categories: z.array(z.enum(CATEGORIES)).min(1),
    tags: z.array(kebab).default([]),
    equipment: z.array(z.string().min(1)).default([]),
    ingredients: z.array(ingredientGroupSchema).min(1),
    rating: z.number().int().min(1).max(5).optional(),
    source: sourceSchema,
    featured: z.boolean().default(false),
  })
  .strict()

export type RecipeFrontmatter = z.output<typeof recipeFrontmatterSchema>
export type Ingredient = z.output<typeof ingredientSchema>
export type IngredientGroup = z.output<typeof ingredientGroupSchema>
export type RecipeSource = z.output<typeof sourceSchema>
export type Difficulty = RecipeFrontmatter["difficulty"]

export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".")
    return path ? `${path}: ${issue.message}` : issue.message
  })
}
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `npm test -- tests/recipes/schema.test.ts`
Expected: PASS. If a zod 4 message format differs from a regex (for example, the unknown-key test), adjust only the **assertion regex** to match the field path, keeping the path prefix check. Don't loosen the schema.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "feat: recipe frontmatter schema" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Body sections and Markdown rendering

**Files:**
- Create: `lib/recipes/body.ts`, `tests/recipes/body.test.ts`

**Interfaces:**
- Produces: `type RecipeSections = { instructions: string; notes?: string; variations?: string }`, `type ParseBodyResult = { ok: true; sections: RecipeSections } | { ok: false; errors: string[] }`, `parseBody(body: string): ParseBodyResult`, `renderMarkdown(markdown: string, slug: string): string`

- [ ] **Step 1: Write the failing test**

Create `tests/recipes/body.test.ts`:

```ts
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
    const r = parseBody("## Instructions\n### Sauce\n1. Mix.\n### Chicken\n1. Roast.")
    expect(r.ok).toBe(true)
  })

  it("reports missing instructions, unknown and duplicate headings, and preamble", () => {
    const r = parseBody("Intro text\n\n## Tips\n- x\n\n## Notes\n- a\n\n## Notes\n- b")
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
    expect(html).toContain('src="/personal-cookbook/recipe-images/tacos/step-3.webp"')
  })

  it("leaves absolute image URLs alone", () => {
    const html = renderMarkdown("![x](https://example.com/a.webp)", "tacos")
    expect(html).toContain('src="https://example.com/a.webp"')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- tests/recipes/body.test.ts`
Expected: FAIL. The module cannot be resolved.

- [ ] **Step 3: Implement**

Create `lib/recipes/body.ts`:

```ts
import { marked } from "marked"
import { recipeImageUrl } from "../site"

export type RecipeSections = { instructions: string; notes?: string; variations?: string }
export type ParseBodyResult = { ok: true; sections: RecipeSections } | { ok: false; errors: string[] }

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

  if (parts[0].trim()) errors.push("content before the first ## heading is not allowed")

  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].trim()
    const content = (parts[i + 1] ?? "").trim()
    const key = HEADINGS[heading.toLowerCase()]
    if (!key) {
      errors.push(`unknown section "## ${heading}" (allowed: Instructions, Notes, Variations)`)
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
    (_match, alt: string, file: string) => `![${alt}](${recipeImageUrl(slug, file)})`
  )
  return marked.parse(rewritten, { async: false }) as string
}
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `npm test -- tests/recipes/body.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "feat: recipe body section parsing and markdown rendering" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Recipe loader, summaries, and `npm run validate`

**Files:**
- Create: `lib/recipes/load.ts`, `lib/recipes/index.ts`, `lib/recipes/summary.ts`, `scripts/validate.ts`
- Create fixtures: `tests/fixtures/valid/{full-recipe,minimal-recipe}/index.md`, `tests/fixtures/valid/full-recipe/hero.webp`, `tests/fixtures/invalid/{bad-frontmatter,bad-body,missing-image}/index.md`, `tests/fixtures/invalid/Bad_Slug/index.md`
- Test: `tests/recipes/load.test.ts`, `tests/recipes/summary.test.ts`

**Interfaces:**
- Consumes: `recipeFrontmatterSchema`, `formatIssues`, `RecipeFrontmatter` (Task 2); `parseBody`, `RecipeSections` (Task 3); `recipeImageUrl` (Task 1).
- Produces:
  - `load.ts`: `type Recipe = RecipeFrontmatter & { slug: string; sections: RecipeSections }`, `class RecipeLoadError extends Error { problems: string[] }`, `RECIPES_DIR: string`, `loadRecipes(dir?: string): Recipe[]` (sorted newest first, then title)
  - `index.ts`: `getAllRecipes(): Recipe[]`, `getRecipe(slug: string): Recipe | undefined`
  - `summary.ts`: `type RecipeSummary = { slug; title; description; date; imageUrl?; categories: Category[]; tags: string[]; ingredients: string[]; rating?: number; totalMinutes?: number; difficulty: Difficulty; featured: boolean }`, `toSummary(recipe: Recipe): RecipeSummary`

- [ ] **Step 1: Create fixtures**

`tests/fixtures/valid/full-recipe/index.md`:

```markdown
---
title: Full Recipe
description: Every field filled in.
date: 2026-09-20
updated: 2026-09-27
image: hero.webp
servings: 4
time: { prep: 10, cook: 20, total: 30 }
difficulty: medium
categories: [dinner]
tags: [chicken, spicy]
equipment: [skillet]
ingredients:
  - group: Main
    items:
      - { qty: 1.5, unit: lb, item: chicken thighs }
      - { item: salt, note: to taste }
rating: 4
source: { type: web, name: Example, url: "https://example.com/r" }
featured: true
---

## Instructions
1. Cook.

## Notes
- A note.
```

`tests/fixtures/valid/minimal-recipe/index.md`:

```markdown
---
title: Minimal Recipe
description: Only required fields.
date: 2026-09-25
servings: 2
difficulty: easy
categories: [breakfast]
ingredients:
  - items:
      - { qty: 1, unit: cup, item: rolled oats }
source: { type: original }
---

## Instructions
1. Stir.
```

Create a real small WebP for `tests/fixtures/valid/full-recipe/hero.webp`:

```bash
node -e "require('sharp')({create:{width:8,height:8,channels:3,background:'#c96'}}).webp().toFile('tests/fixtures/valid/full-recipe/hero.webp').then(()=>console.log('ok'))"
```

`tests/fixtures/invalid/bad-frontmatter/index.md` (bad category and a fraction string):

```markdown
---
title: Bad Frontmatter
description: Broken.
date: 2026-09-25
servings: 2
difficulty: easy
categories: [brunch]
ingredients:
  - items:
      - { qty: 1/2, unit: cup, item: flour }
source: { type: original }
---

## Instructions
1. Stir.
```

`tests/fixtures/invalid/bad-body/index.md`:

```markdown
---
title: Bad Body
description: Missing instructions.
date: 2026-09-25
servings: 2
difficulty: easy
categories: [snack]
ingredients:
  - items:
      - { item: popcorn }
source: { type: original }
---

## Tips
- Unknown heading.
```

`tests/fixtures/invalid/missing-image/index.md`: the same content as `minimal-recipe` but with `title: Missing Image` and `image: nope.webp` added below `date`.

`tests/fixtures/invalid/Bad_Slug/index.md`: the same content as `minimal-recipe`.

- [ ] **Step 2: Write the failing tests**

Create `tests/recipes/load.test.ts`:

```ts
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
    expect(recipes.map((r) => r.slug)).toEqual(["minimal-recipe", "full-recipe"])
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
        expect.stringMatching(/^bad-frontmatter\/index\.md: ingredients\.0\.items\.0\.qty:/),
        'bad-body/index.md: unknown section "## Tips" (allowed: Instructions, Notes, Variations)',
        'bad-body/index.md: missing required "## Instructions" section',
        'missing-image/index.md: image "nope.webp" not found in recipe folder',
      ])
    )
  })

  it("puts all problems in the error message", () => {
    expect(() => loadRecipes(path.join(fixtures, "invalid"))).toThrow(/bad-body\/index\.md/)
  })
})
```

Create `tests/recipes/summary.test.ts`:

```ts
import path from "node:path"
import { describe, expect, it } from "vitest"
import { loadRecipes } from "@/lib/recipes/load"
import { toSummary } from "@/lib/recipes/summary"

const recipes = loadRecipes(path.join(__dirname, "..", "fixtures", "valid"))
const bySlug = (slug: string) => recipes.find((r) => r.slug === slug)!

describe("toSummary", () => {
  it("builds image URL, flat ingredient names, and total time", () => {
    const s = toSummary(bySlug("full-recipe"))
    expect(s.imageUrl).toBe("/personal-cookbook/recipe-images/full-recipe/hero.webp")
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
```

- [ ] **Step 3: Run them and confirm they fail**

Run: `npm test -- tests/recipes/load.test.ts tests/recipes/summary.test.ts`
Expected: FAIL. The modules cannot be resolved.

- [ ] **Step 4: Implement**

Create `lib/recipes/load.ts`:

```ts
import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { parseBody, type RecipeSections } from "./body"
import { formatIssues, recipeFrontmatterSchema, type RecipeFrontmatter } from "./schema"

export type Recipe = RecipeFrontmatter & { slug: string; sections: RecipeSections }

export class RecipeLoadError extends Error {
  constructor(public problems: string[]) {
    super(`Invalid recipes:\n${problems.map((p) => `  - ${p}`).join("\n")}`)
    this.name = "RecipeLoadError"
  }
}

export const RECIPES_DIR = path.join(process.cwd(), "content", "recipes")

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function loadRecipes(dir: string = RECIPES_DIR): Recipe[] {
  if (!fs.existsSync(dir)) return []

  const problems: string[] = []
  const recipes: Recipe[] = []

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const slug = entry.name
    const where = `${slug}/index.md`

    if (!SLUG.test(slug)) {
      problems.push(`${slug}: folder name must be kebab-case`)
      continue
    }

    const file = path.join(dir, slug, "index.md")
    if (!fs.existsSync(file)) {
      problems.push(`${where}: file is missing`)
      continue
    }

    let parsed: matter.GrayMatterFile<string>
    try {
      parsed = matter(fs.readFileSync(file, "utf8"))
    } catch (e) {
      problems.push(`${where}: YAML error: ${(e as Error).message}`)
      continue
    }

    const frontmatter = recipeFrontmatterSchema.safeParse(parsed.data)
    const body = parseBody(parsed.content)

    if (!frontmatter.success) {
      problems.push(...formatIssues(frontmatter.error).map((m) => `${where}: ${m}`))
    }
    if (!body.ok) {
      problems.push(...body.errors.map((m) => `${where}: ${m}`))
    }
    if (frontmatter.success && frontmatter.data.image) {
      if (!fs.existsSync(path.join(dir, slug, frontmatter.data.image))) {
        problems.push(`${where}: image "${frontmatter.data.image}" not found in recipe folder`)
      }
    }
    if (frontmatter.success && body.ok) {
      recipes.push({ ...frontmatter.data, slug, sections: body.sections })
    }
  }

  if (problems.length) throw new RecipeLoadError(problems)

  return recipes.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
}
```

Create `lib/recipes/index.ts`:

```ts
import { loadRecipes, type Recipe } from "./load"

let cache: Recipe[] | undefined

// Server/build-time only. Re-reads files in dev so edits show up without a restart.
export function getAllRecipes(): Recipe[] {
  if (process.env.NODE_ENV === "development") return loadRecipes()
  return (cache ??= loadRecipes())
}

export function getRecipe(slug: string): Recipe | undefined {
  return getAllRecipes().find((r) => r.slug === slug)
}
```

Create `lib/recipes/summary.ts`:

```ts
import { recipeImageUrl } from "../site"
import type { Category } from "./categories"
import type { Recipe } from "./load"
import type { Difficulty } from "./schema"

// Client-safe: only type imports from load.ts
export type RecipeSummary = {
  slug: string
  title: string
  description: string
  date: string
  imageUrl?: string
  categories: Category[]
  tags: string[]
  ingredients: string[]
  rating?: number
  totalMinutes?: number
  difficulty: Difficulty
  featured: boolean
}

export function toSummary(recipe: Recipe): RecipeSummary {
  const { time } = recipe
  const derived =
    time && (time.prep !== undefined || time.cook !== undefined)
      ? (time.prep ?? 0) + (time.cook ?? 0)
      : undefined

  const summary: RecipeSummary = {
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description,
    date: recipe.date,
    categories: recipe.categories,
    tags: recipe.tags,
    ingredients: recipe.ingredients.flatMap((g) => g.items.map((i) => i.item)),
    difficulty: recipe.difficulty,
    featured: recipe.featured,
  }
  if (recipe.image) summary.imageUrl = recipeImageUrl(recipe.slug, recipe.image)
  if (recipe.rating !== undefined) summary.rating = recipe.rating
  const total = time?.total ?? derived
  if (total !== undefined) summary.totalMinutes = total
  return summary
}
```

Create `scripts/validate.ts`:

```ts
import { loadRecipes, RecipeLoadError, RECIPES_DIR } from "../lib/recipes/load"

try {
  const recipes = loadRecipes(RECIPES_DIR)
  console.log(`✓ ${recipes.length} recipe(s) valid`)
} catch (e) {
  if (e instanceof RecipeLoadError) {
    console.error(e.message)
    process.exit(1)
  }
  throw e
}
```

- [ ] **Step 5: Run tests and confirm they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Check validate by hand**

Run: `npm run validate`
Expected: `✓ 0 recipe(s) valid` (no `content/` yet).

- [ ] **Step 7: Commit**

```bash
npm run format
git add -A
git commit -m "feat: recipe loader, summaries, validate script" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Formatting helpers (fractions, scaling, times, source)

**Files:**
- Create: `lib/recipes/format.ts`, `tests/recipes/format.test.ts`

**Interfaces:**
- Consumes: `Ingredient`, `RecipeSource` types (Task 2).
- Produces: `formatQty(n: number): string`, `scaleQty(qty: number, baseServings: number, servings: number): number`, `formatIngredientAmount(ing: Ingredient, servings: number, baseServings: number): string`, `formatMinutes(min: number): string`, `sourceLabel(source: RecipeSource): string`

- [ ] **Step 1: Write the failing test**

Create `tests/recipes/format.test.ts`:

```ts
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
    expect(formatIngredientAmount({ qty: 1.5, unit: "lb", item: "chicken" }, 2, 4)).toBe("¾ lb")
  })
  it("formats qty without unit", () => {
    expect(formatIngredientAmount({ qty: 8, item: "tortillas" }, 6, 4)).toBe("12")
  })
  it("returns empty string when there is no qty (never scaled)", () => {
    expect(formatIngredientAmount({ item: "salt", note: "to taste" }, 8, 4)).toBe("")
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
    [{ type: "family" as const, name: "Grandma's card" }, "Family recipe · Grandma's card"],
    [{ type: "family" as const }, "Family recipe"],
    [{ type: "cookbook" as const, name: "Salt Fat Acid Heat" }, "From Salt Fat Acid Heat"],
    [{ type: "web" as const, name: "Serious Eats" }, "From Serious Eats"],
    [{ type: "web" as const }, "From the web"],
    [{ type: "adapted" as const, name: "NYT Cooking" }, "Adapted from NYT Cooking"],
  ])("labels %o", (source, expected) => {
    expect(sourceLabel(source)).toBe(expected)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- tests/recipes/format.test.ts`
Expected: FAIL. The module cannot be resolved.

- [ ] **Step 3: Implement**

Create `lib/recipes/format.ts`:

```ts
import type { Ingredient, RecipeSource } from "./schema"

const FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
]
const TOLERANCE = 0.02

export function formatQty(n: number): string {
  const whole = Math.floor(n)
  const frac = n - whole
  if (whole === 0 && frac < 1 / 8 - TOLERANCE) return String(Math.round(n * 100) / 100)
  if (frac < TOLERANCE) return String(whole)
  if (frac > 1 - TOLERANCE) return String(whole + 1)
  const match = FRACTIONS.find(([value]) => Math.abs(frac - value) < TOLERANCE)
  if (match) return whole ? `${whole}${match[1]}` : match[1]
  return String(Math.round(n * 10) / 10)
}

export function scaleQty(qty: number, baseServings: number, servings: number): number {
  return (qty * servings) / baseServings
}

export function formatIngredientAmount(
  ing: Ingredient,
  servings: number,
  baseServings: number
): string {
  if (ing.qty === undefined) return ""
  const amount = formatQty(scaleQty(ing.qty, baseServings, servings))
  return ing.unit ? `${amount} ${ing.unit}` : amount
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`
  const hours = Math.floor(min / 60)
  const rest = min % 60
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`
}

export function sourceLabel(source: RecipeSource): string {
  switch (source.type) {
    case "original":
      return "Original recipe"
    case "family":
      return source.name ? `Family recipe · ${source.name}` : "Family recipe"
    case "cookbook":
      return `From ${source.name ?? "a cookbook"}`
    case "web":
      return `From ${source.name ?? "the web"}`
    case "adapted":
      return `Adapted from ${source.name ?? "another recipe"}`
  }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `npm test -- tests/recipes/format.test.ts`
Expected: PASS. (Check the tricky cases: `0.3` is 0.033 from ⅓ and 0.075 from ⅜, so it falls through to `"0.3"`; `1.46` falls through to `"1.5"`.)

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "feat: quantity, time and source formatting helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Search and filtering

**Files:**
- Create: `lib/recipes/search.ts`, `tests/recipes/search.test.ts`

**Interfaces:**
- Consumes: `RecipeSummary` (Task 4).
- Produces: `parseQuery(query: string): string[]`, `searchRecipes(items: RecipeSummary[], query: string): RecipeSummary[]`, `filterRecipes(items: RecipeSummary[], filters: { category?: string; tag?: string }): RecipeSummary[]`

- [ ] **Step 1: Write the failing test**

Create `tests/recipes/search.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { filterRecipes, parseQuery, searchRecipes } from "@/lib/recipes/search"
import type { RecipeSummary } from "@/lib/recipes/summary"

function recipe(slug: string, over: Partial<RecipeSummary>): RecipeSummary {
  return {
    slug,
    title: slug,
    description: "",
    date: "2026-01-01",
    categories: ["dinner"],
    tags: [],
    ingredients: [],
    difficulty: "easy",
    featured: false,
    ...over,
  }
}

const items = [
  recipe("fried-rice", {
    title: "Spicy Chicken Fried Rice",
    tags: ["spicy", "chicken", "rice"],
    ingredients: ["cooked jasmine rice", "boneless chicken thighs", "chili crisp"],
  }),
  recipe("tacos", {
    title: "Green Chile Tacos",
    tags: ["mexican", "spicy"],
    ingredients: ["boneless chicken thighs", "corn tortillas", "tomatoes"],
  }),
  recipe("oats", {
    title: "Overnight Oats",
    categories: ["breakfast"],
    tags: ["meal-prep"],
    ingredients: ["rolled oats", "milk"],
  }),
]

const slugs = (r: RecipeSummary[]) => r.map((x) => x.slug)

describe("parseQuery", () => {
  it("splits on +, commas and whitespace, lowercases, drops empties", () => {
    expect(parseQuery("  Chicken + RICE,spicy  +")).toEqual(["chicken", "rice", "spicy"])
    expect(parseQuery("   ")).toEqual([])
  })
})

describe("searchRecipes", () => {
  it("returns everything for an empty query", () => {
    expect(slugs(searchRecipes(items, ""))).toEqual(["fried-rice", "tacos", "oats"])
  })

  it("requires every term to match (AND)", () => {
    expect(slugs(searchRecipes(items, "chicken + rice + spicy"))).toEqual(["fried-rice"])
  })

  it("returns nothing when any term matches nothing", () => {
    expect(searchRecipes(items, "chicken + zzzqqq")).toEqual([])
  })

  it("matches fuzzy typos", () => {
    expect(slugs(searchRecipes(items, "tomatos"))).toEqual(["tacos"])
  })

  it("matches on tags and categories", () => {
    expect(slugs(searchRecipes(items, "breakfast"))).toEqual(["oats"])
    expect(slugs(searchRecipes(items, "mexican"))).toEqual(["tacos"])
  })

  it("ranks title matches above ingredient-only matches", () => {
    const result = slugs(searchRecipes(items, "chicken"))
    expect(result[0]).toBe("fried-rice")
    expect(result).toContain("tacos")
  })
})

describe("filterRecipes", () => {
  it("filters by category and tag, ignoring missing filters", () => {
    expect(slugs(filterRecipes(items, { category: "breakfast" }))).toEqual(["oats"])
    expect(slugs(filterRecipes(items, { tag: "spicy" }))).toEqual(["fried-rice", "tacos"])
    expect(slugs(filterRecipes(items, {}))).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- tests/recipes/search.test.ts`
Expected: FAIL. The module cannot be resolved.

- [ ] **Step 3: Implement**

Create `lib/recipes/search.ts`:

```ts
import Fuse from "fuse.js"
import type { RecipeSummary } from "./summary"

const KEYS = [
  { name: "title", weight: 4 },
  { name: "tags", weight: 2 },
  { name: "categories", weight: 2 },
  { name: "ingredients", weight: 1.5 },
  { name: "description", weight: 1 },
]

export function parseQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[+,\s]+/)
    .filter(Boolean)
}

export function searchRecipes(items: RecipeSummary[], query: string): RecipeSummary[] {
  const terms = parseQuery(query)
  if (terms.length === 0) return items

  const fuse = new Fuse(items, {
    keys: KEYS,
    includeScore: true,
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 2,
  })

  let totals: Map<string, number> | undefined
  for (const term of terms) {
    const scores = new Map(fuse.search(term).map((r) => [r.item.slug, 1 - (r.score ?? 1)]))
    totals = totals
      ? new Map(
          [...totals]
            .filter(([slug]) => scores.has(slug))
            .map(([slug, total]) => [slug, total + scores.get(slug)!])
        )
      : scores
    if (totals.size === 0) return []
  }

  const bySlug = new Map(items.map((i) => [i.slug, i]))
  return [...totals!].sort((a, b) => b[1] - a[1]).map(([slug]) => bySlug.get(slug)!)
}

export function filterRecipes(
  items: RecipeSummary[],
  filters: { category?: string; tag?: string }
): RecipeSummary[] {
  return items.filter(
    (r) =>
      (!filters.category || (r.categories as string[]).includes(filters.category)) &&
      (!filters.tag || r.tags.includes(filters.tag))
  )
}
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `npm test -- tests/recipes/search.test.ts`
Expected: PASS. If the fuzzy or ranking assertions fail, tune only `threshold` (0.25–0.4) or the key weights. Don't change the AND logic, and don't weaken the assertions.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "feat: multi-term AND fuzzy search and filters" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Related recipes and homepage collections

**Files:**
- Create: `lib/recipes/related.ts`, `lib/recipes/collections.ts`, `tests/recipes/related.test.ts`, `tests/recipes/collections.test.ts`

**Interfaces:**
- Consumes: `RecipeSummary` (Task 4), `CATEGORIES`, `Category` (Task 2).
- Produces:
  - `relatedRecipes<T extends { slug: string; tags: string[]; categories: string[]; date: string }>(target: T, all: T[], limit?: number): T[]`
  - `featuredRecipes(items: RecipeSummary[], limit?: number): RecipeSummary[]`, `recentRecipes(items: RecipeSummary[], limit?: number): RecipeSummary[]`, `categoryCounts(items: RecipeSummary[]): { category: Category; count: number }[]`, `tagCounts(items: RecipeSummary[]): { tag: string; count: number }[]`

- [ ] **Step 1: Write the failing tests**

Create `tests/recipes/related.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { relatedRecipes } from "@/lib/recipes/related"

const r = (slug: string, tags: string[], categories: string[], date = "2026-01-01") => ({
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
    expect(relatedRecipes(target, all, 10).map((x) => x.slug)).not.toContain("cookies")
  })

  it("returns [] when nothing is related", () => {
    expect(relatedRecipes(r("x", ["zzz"], ["drink"]), all)).toEqual([])
  })
})
```

Create `tests/recipes/collections.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  categoryCounts,
  featuredRecipes,
  recentRecipes,
  tagCounts,
} from "@/lib/recipes/collections"
import type { RecipeSummary } from "@/lib/recipes/summary"

function s(slug: string, over: Partial<RecipeSummary> = {}): RecipeSummary {
  return {
    slug,
    title: slug,
    description: "",
    date: "2026-01-01",
    categories: ["dinner"],
    tags: [],
    ingredients: [],
    difficulty: "easy",
    featured: false,
    ...over,
  }
}

describe("featuredRecipes", () => {
  it("prefers featured recipes", () => {
    const items = [s("a", { rating: 5 }), s("b", { featured: true }), s("c", { featured: true })]
    expect(featuredRecipes(items).map((x) => x.slug)).toEqual(["b", "c"])
  })

  it("falls back to top-rated, newest first on ties, max 3", () => {
    const items = [
      s("a", { rating: 3 }),
      s("b", { rating: 5, date: "2026-01-01" }),
      s("c", { rating: 5, date: "2026-03-01" }),
      s("d", { rating: 4 }),
      s("e"),
    ]
    expect(featuredRecipes(items).map((x) => x.slug)).toEqual(["c", "b", "d"])
  })

  it("returns [] when nothing is featured or rated", () => {
    expect(featuredRecipes([s("a")])).toEqual([])
  })
})

describe("recentRecipes", () => {
  it("returns newest first, limited", () => {
    const items = [s("old", { date: "2025-01-01" }), s("new", { date: "2026-05-01" })]
    expect(recentRecipes(items, 1).map((x) => x.slug)).toEqual(["new"])
  })
})

describe("counts", () => {
  const items = [
    s("a", { categories: ["dinner", "baking"], tags: ["spicy"] }),
    s("b", { categories: ["dinner"], tags: ["spicy", "quick-meals"] }),
  ]

  it("counts categories in canonical order, skipping empty ones", () => {
    expect(categoryCounts(items)).toEqual([
      { category: "dinner", count: 2 },
      { category: "baking", count: 1 },
    ])
  })

  it("counts tags by frequency then name", () => {
    expect(tagCounts(items)).toEqual([
      { tag: "spicy", count: 2 },
      { tag: "quick-meals", count: 1 },
    ])
  })
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npm test -- tests/recipes/related.test.ts tests/recipes/collections.test.ts`
Expected: FAIL. The modules cannot be resolved.

- [ ] **Step 3: Implement**

Create `lib/recipes/related.ts`:

```ts
type Relatable = { slug: string; tags: string[]; categories: string[]; date: string }

export function relatedRecipes<T extends Relatable>(target: T, all: T[], limit = 3): T[] {
  return all
    .filter((r) => r.slug !== target.slug)
    .map((r) => ({
      r,
      score:
        r.tags.filter((t) => target.tags.includes(t)).length +
        2 * r.categories.filter((c) => target.categories.includes(c)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.r.date.localeCompare(a.r.date))
    .slice(0, limit)
    .map((x) => x.r)
}
```

Create `lib/recipes/collections.ts`:

```ts
import { CATEGORIES, type Category } from "./categories"
import type { RecipeSummary } from "./summary"

const newestFirst = (a: RecipeSummary, b: RecipeSummary) => b.date.localeCompare(a.date)

export function featuredRecipes(items: RecipeSummary[], limit = 3): RecipeSummary[] {
  const featured = items.filter((r) => r.featured)
  if (featured.length) return featured.slice(0, limit)
  return items
    .filter((r) => r.rating !== undefined)
    .sort((a, b) => b.rating! - a.rating! || newestFirst(a, b))
    .slice(0, limit)
}

export function recentRecipes(items: RecipeSummary[], limit = 6): RecipeSummary[] {
  return [...items].sort(newestFirst).slice(0, limit)
}

export function categoryCounts(items: RecipeSummary[]): { category: Category; count: number }[] {
  return CATEGORIES.map((category) => ({
    category,
    count: items.filter((r) => r.categories.includes(category)).length,
  })).filter((c) => c.count > 0)
}

export function tagCounts(items: RecipeSummary[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const r of items) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "feat: related recipes and homepage collections" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Image processing and image copy step

**Files:**
- Create: `lib/images/process.ts`, `scripts/process-image.ts`, `scripts/copy-images.ts`, `tests/images/process.test.ts`

**Interfaces:**
- Produces: `MAX_WIDTH = 1600`, `processImage(input: string, output: string): Promise<{ width: number; height: number; bytes: number }>`; CLI `npm run image -- <input> <output.webp>`; `npm run images:copy` (copies `content/recipes/<slug>/*.{webp,jpg,jpeg,png}` → `public/recipe-images/<slug>/`).

- [ ] **Step 1: Write the failing test**

Create `tests/images/process.test.ts`:

```ts
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import sharp from "sharp"
import { afterAll, describe, expect, it } from "vitest"
import { MAX_WIDTH, processImage } from "@/lib/images/process"

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cookbook-img-"))
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

async function makeJpeg(name: string, width: number, height: number) {
  const file = path.join(tmp, name)
  await sharp({ create: { width, height, channels: 3, background: "#a0522d" } })
    .withExif({ IFD0: { Copyright: "secret-location-data" } })
    .jpeg()
    .toFile(file)
  return file
}

describe("processImage", () => {
  it("resizes large images to MAX_WIDTH, outputs webp, and strips metadata", async () => {
    const input = await makeJpeg("big.jpg", 2400, 1600)
    expect((await sharp(input).metadata()).exif).toBeDefined()

    const out = path.join(tmp, "big.webp")
    const info = await processImage(input, out)

    const meta = await sharp(out).metadata()
    expect(meta.format).toBe("webp")
    expect(meta.width).toBe(MAX_WIDTH)
    expect(meta.height).toBe(1067)
    expect(meta.exif).toBeUndefined()
    expect(info.width).toBe(MAX_WIDTH)
    expect(info.bytes).toBeGreaterThan(0)
  })

  it("does not upscale small images", async () => {
    const input = await makeJpeg("small.jpg", 800, 600)
    const out = path.join(tmp, "small.webp")
    await processImage(input, out)
    expect((await sharp(out).metadata()).width).toBe(800)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- tests/images/process.test.ts`
Expected: FAIL. The module cannot be resolved.

- [ ] **Step 3: Implement**

Create `lib/images/process.ts`:

```ts
import sharp from "sharp"

export const MAX_WIDTH = 1600

// sharp drops all metadata (EXIF, GPS, ICC) unless asked to keep it.
export async function processImage(
  input: string,
  output: string
): Promise<{ width: number; height: number; bytes: number }> {
  const info = await sharp(input)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(output)
  return { width: info.width, height: info.height, bytes: info.size }
}
```

Create `scripts/process-image.ts`:

```ts
import fs from "node:fs"
import path from "node:path"
import { processImage } from "../lib/images/process"

const [input, output] = process.argv.slice(2)
if (!input || !output || !output.endsWith(".webp")) {
  console.error("Usage: npm run image -- <input-image> <output.webp>")
  process.exit(2)
}

fs.mkdirSync(path.dirname(output), { recursive: true })
try {
  const { width, height, bytes } = await processImage(input, output)
  console.log(`✓ ${output} (${width}×${height}, ${Math.round(bytes / 1024)} KB)`)
} catch (e) {
  console.error(`✗ Could not process ${input}: ${(e as Error).message}`)
  if (/heif|heic/i.test(input)) {
    console.error("  HEIC may be unsupported. Re-export the photo as JPEG and retry.")
  }
  process.exit(1)
}
```

Create `scripts/copy-images.ts`:

```ts
import fs from "node:fs"
import path from "node:path"

const SRC = path.join(process.cwd(), "content", "recipes")
const DEST = path.join(process.cwd(), "public", "recipe-images")
const IMAGE = /\.(webp|jpe?g|png)$/i

fs.rmSync(DEST, { recursive: true, force: true })
let count = 0

if (fs.existsSync(SRC)) {
  for (const entry of fs.readdirSync(SRC, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    for (const file of fs.readdirSync(path.join(SRC, entry.name))) {
      if (!IMAGE.test(file)) continue
      fs.mkdirSync(path.join(DEST, entry.name), { recursive: true })
      fs.copyFileSync(path.join(SRC, entry.name, file), path.join(DEST, entry.name, file))
      count++
    }
  }
}

console.log(`✓ copied ${count} recipe image(s) to public/recipe-images`)
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `npm test -- tests/images/process.test.ts`
Expected: PASS. (If `withExif` is not available in the installed sharp version, use `.withMetadata({ exif: { IFD0: { Copyright: "secret-location-data" } } })` in the test helper only.)

- [ ] **Step 5: Run the scripts by hand**

Run: `npm run images:copy`
Expected: `✓ copied 0 recipe image(s) to public/recipe-images`

Run: `npm run image -- tests/fixtures/valid/full-recipe/hero.webp tmp-check.webp && rm tmp-check.webp`
Expected: a line starting with `✓` and reporting `8×8`.

- [ ] **Step 6: Commit**

```bash
npm run format
git add -A
git commit -m "feat: image processing and recipe image copy step" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: URL import extractor (`npm run fetch-recipe`)

**Files:**
- Create: `lib/import/extract-recipe.ts`, `scripts/fetch-recipe.ts`, `tests/import/extract-recipe.test.ts`

**Interfaces:**
- Produces: `type ExtractedRecipe = { name: string; description?: string; ingredients: string[]; instructions: { section?: string; steps: string[] }[]; yield?: string; prepMinutes?: number; cookMinutes?: number; totalMinutes?: number; categories: string[]; cuisines: string[]; keywords: string[]; image?: string; author?: string; url?: string }`, `extractRecipe(html: string, pageUrl?: string): ExtractedRecipe | null`, `parseIsoDuration(value: unknown): number | undefined`; CLI `npm run fetch-recipe -- <url>` prints the JSON or exits 1 with a message.

- [ ] **Step 1: Write the failing test**

Create `tests/import/extract-recipe.test.ts`:

```ts
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
    expect(r.instructions).toEqual([{ steps: ["Chop the onion.", "Simmer it."] }])
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
          itemListElement: [{ "@type": "HowToStep", name: "Layer", text: "Layer it all." }],
        },
      ],
    })
    expect(extractRecipe(page(sectioned))!.instructions).toEqual([
      { section: "Sauce", steps: ["Simmer tomatoes."] },
      { section: "Assembly", steps: ["Layer it all."] },
    ])
  })

  it("returns null when there is no Recipe", () => {
    expect(extractRecipe(page(JSON.stringify({ "@type": "Article", name: "x" })))).toBeNull()
    expect(extractRecipe("<html><body>No JSON-LD</body></html>")).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- tests/import/extract-recipe.test.ts`
Expected: FAIL. The module cannot be resolved.

- [ ] **Step 3: Implement**

Create `lib/import/extract-recipe.ts`:

```ts
export type ExtractedRecipe = {
  name: string
  description?: string
  ingredients: string[]
  instructions: { section?: string; steps: string[] }[]
  yield?: string
  prepMinutes?: number
  cookMinutes?: number
  totalMinutes?: number
  categories: string[]
  cuisines: string[]
  keywords: string[]
  image?: string
  author?: string
  url?: string
}

type Json = Record<string, unknown>

const LD_JSON = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
}

function clean(value: unknown): string {
  if (typeof value !== "string") return ""
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (match, code: string) => {
      if (ENTITIES[code]) return ENTITIES[code]
      if (code.startsWith("#x")) return String.fromCodePoint(parseInt(code.slice(2), 16))
      if (code.startsWith("#")) return String.fromCodePoint(parseInt(code.slice(1), 10))
      return match
    })
    .replace(/\s+/g, " ")
    .trim()
}

function list(value: unknown): unknown[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function strings(value: unknown, splitCommas = false): string[] {
  return list(value)
    .flatMap((v) => (splitCommas && typeof v === "string" ? v.split(",") : [v]))
    .map(clean)
    .filter(Boolean)
}

function isRecipe(node: Json): boolean {
  return list(node["@type"]).includes("Recipe")
}

function findRecipe(node: unknown): Json | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item)
      if (found) return found
    }
    return null
  }
  if (!node || typeof node !== "object") return null
  const obj = node as Json
  if (isRecipe(obj)) return obj
  return findRecipe(obj["@graph"]) ?? findRecipe(obj["mainEntity"])
}

function stepText(step: unknown): string {
  if (typeof step === "string") return clean(step)
  const s = step as Json
  return clean(s.text) || clean(s.name)
}

function instructions(value: unknown): ExtractedRecipe["instructions"] {
  if (typeof value === "string") {
    const steps = value.split(/\r?\n/).map(clean).filter(Boolean)
    return steps.length ? [{ steps }] : []
  }
  const result: ExtractedRecipe["instructions"] = []
  let loose: string[] = []
  for (const item of list(value)) {
    const obj = item as Json
    if (obj && typeof obj === "object" && list(obj["@type"]).includes("HowToSection")) {
      if (loose.length) result.push({ steps: loose })
      loose = []
      result.push({
        section: clean(obj.name) || undefined,
        steps: list(obj.itemListElement).map(stepText).filter(Boolean),
      })
    } else {
      const text = stepText(item)
      if (text) loose.push(text)
    }
  }
  if (loose.length) result.push({ steps: loose })
  return result
}

function firstUrl(value: unknown): string | undefined {
  for (const v of list(value)) {
    if (typeof v === "string") return v
    if (v && typeof v === "object" && typeof (v as Json).url === "string") return (v as Json).url as string
  }
  return undefined
}

function firstName(value: unknown): string | undefined {
  for (const v of list(value)) {
    const name = typeof v === "string" ? clean(v) : clean((v as Json)?.name)
    if (name) return name
  }
  return undefined
}

export function parseIsoDuration(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined
  const m = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i)
  if (!m || value.length < 3) return undefined
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0))
  const total = d * 1440 + h * 60 + min + s / 60
  return Math.round(total)
}

export function extractRecipe(html: string, pageUrl?: string): ExtractedRecipe | null {
  for (const match of html.matchAll(LD_JSON)) {
    let data: unknown
    try {
      data = JSON.parse(match[1].trim())
    } catch {
      continue
    }
    const recipe = findRecipe(data)
    if (!recipe) continue

    const yieldValue = list(recipe.recipeYield)[0]
    return {
      name: clean(recipe.name),
      description: clean(recipe.description) || undefined,
      ingredients: strings(recipe.recipeIngredient),
      instructions: instructions(recipe.recipeInstructions),
      yield: yieldValue !== undefined ? clean(String(yieldValue)) || undefined : undefined,
      prepMinutes: parseIsoDuration(recipe.prepTime),
      cookMinutes: parseIsoDuration(recipe.cookTime),
      totalMinutes: parseIsoDuration(recipe.totalTime),
      categories: strings(recipe.recipeCategory, true),
      cuisines: strings(recipe.recipeCuisine, true),
      keywords: strings(recipe.keywords, true),
      image: firstUrl(recipe.image),
      author: firstName(recipe.author),
      url: (typeof recipe.url === "string" && recipe.url) || pageUrl,
    }
  }
  return null
}
```

Create `scripts/fetch-recipe.ts`:

```ts
import { extractRecipe } from "../lib/import/extract-recipe"

const url = process.argv[2]
if (!url || !/^https?:\/\//.test(url)) {
  console.error("Usage: npm run fetch-recipe -- <https://recipe-url>")
  process.exit(2)
}

let res: Response
try {
  res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  })
} catch (e) {
  console.error(`✗ Fetch failed: ${(e as Error).message}`)
  process.exit(1)
}

if (!res.ok) {
  console.error(`✗ Fetch failed: HTTP ${res.status} ${res.statusText}`)
  process.exit(1)
}

const recipe = extractRecipe(await res.text(), res.url)
if (!recipe) {
  console.error("✗ No schema.org Recipe data found on this page")
  process.exit(1)
}

console.log(JSON.stringify(recipe, null, 2))
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `npm test -- tests/import/extract-recipe.test.ts`
Expected: PASS. (`PT90S` = 1.5 minutes, rounded to 2.)

- [ ] **Step 5: Smoke-test against a real site (network required)**

Run: `npm run fetch-recipe -- https://www.allrecipes.com/recipe/21014/good-old-fashioned-pancakes/`
Expected: JSON with a non-empty `ingredients` array and at least one `instructions` group. If this particular site blocks the request (HTTP 403), try `https://www.simplyrecipes.com/recipes/perfect_guacamole/`. If both are blocked, record that in the task report. It isn't a failure of the task, because the fallback path is WebFetch.

- [ ] **Step 6: Commit**

```bash
npm run format
git add -A
git commit -m "feat: schema.org recipe extractor and fetch-recipe CLI" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Seed recipes

**Files:**
- Create: `content/recipes/green-chile-chicken-tacos/{index.md,hero.webp}`, `content/recipes/spicy-chicken-fried-rice/index.md`, `content/recipes/overnight-oats/index.md`, `content/recipes/brown-butter-chocolate-chip-cookies/{index.md,hero.webp}`

**Interfaces:**
- Consumes: the schema (Task 2), body rules (Task 3), `npm run validate` (Task 4).
- Produces: 4 valid recipes, all tagged `sample` so they're easy to find and delete later. Two have hero images, two don't. Tacos and fried rice share `spicy`, `chicken`, and `dinner`, so related recipes and the `chicken + rice + spicy` search both have something to show.

- [ ] **Step 1: Generate the two sample hero images**

These are clearly labeled placeholder art, not food photos:

```bash
mkdir -p content/recipes/green-chile-chicken-tacos content/recipes/brown-butter-chocolate-chip-cookies content/recipes/spicy-chicken-fried-rice content/recipes/overnight-oats
node -e "const s=require('sharp');const mk=(a,b,f)=>s(Buffer.from('<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1600\" height=\"1000\"><defs><linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"'+a+'\"/><stop offset=\"1\" stop-color=\"'+b+'\"/></linearGradient></defs><rect width=\"1600\" height=\"1000\" fill=\"url(#g)\"/><text x=\"800\" y=\"520\" font-family=\"Georgia,serif\" font-size=\"64\" fill=\"#fff\" fill-opacity=\"0.8\" text-anchor=\"middle\">Sample photo</text></svg>')).webp({quality:80}).toFile(f);Promise.all([mk('#6b8e23','#c0582b','content/recipes/green-chile-chicken-tacos/hero.webp'),mk('#8b5a2b','#e0b872','content/recipes/brown-butter-chocolate-chip-cookies/hero.webp')]).then(()=>console.log('ok'))"
```

Expected: `ok`, and both `hero.webp` files exist.

- [ ] **Step 2: Write the recipes**

`content/recipes/green-chile-chicken-tacos/index.md`:

```markdown
---
title: Green Chile Chicken Tacos
description: Smoky braised chicken thighs with roasted green chiles, ready on a weeknight.
date: 2026-09-20
image: hero.webp
servings: 4
time: { prep: 15, cook: 30, total: 45 }
difficulty: easy
categories: [dinner]
tags: [mexican, spicy, chicken, quick-meals, sample]
equipment: [dutch oven, sheet pan]
ingredients:
  - group: Chicken
    items:
      - { qty: 1.5, unit: lb, item: boneless chicken thighs }
      - { qty: 2, unit: tsp, item: ground cumin }
      - { qty: 1, unit: tsp, item: smoked paprika }
      - { qty: 1, unit: can, item: diced green chiles, note: 4 oz }
      - { qty: 0.5, unit: cup, item: chicken stock }
      - { item: salt, note: to taste }
  - group: To serve
    items:
      - { qty: 8, item: corn tortillas }
      - { qty: 0.25, unit: cup, item: chopped cilantro }
      - { qty: 1, item: lime, note: cut into wedges }
rating: 4
source: { type: original, name: Sample recipe }
featured: true
---

## Instructions
1. Season the chicken all over with the cumin, smoked paprika, and a big pinch of salt.
2. Brown the chicken in the dutch oven over medium-high heat, about 4 minutes per side.
3. Add the green chiles and stock, cover, and simmer on low for 20 minutes.
4. Shred the chicken in the pot and toss it with the sauce.
5. Char the tortillas on the sheet pan under the broiler, about 1 minute per side.
6. Fill the tortillas with chicken, then top with cilantro and a squeeze of lime.

## Notes
- *Sample recipe*: delete once real recipes are added.
- Next time: add a chipotle in adobo for more heat.

## Variations
- Swap the thighs for 2 lb pork shoulder and simmer 90 minutes.
```

`content/recipes/spicy-chicken-fried-rice/index.md`:

```markdown
---
title: Spicy Chicken Fried Rice
description: Day-old rice, crispy chicken, and chili crisp in one hot pan.
date: 2026-09-22
servings: 2
time: { prep: 10, cook: 12 }
difficulty: easy
categories: [dinner, lunch]
tags: [chicken, rice, spicy, quick-meals, sample]
equipment: [wok]
ingredients:
  - items:
      - { qty: 3, unit: cup, item: cooked jasmine rice, note: day-old and cold }
      - { qty: 0.5, unit: lb, item: boneless chicken thighs, note: diced }
      - { qty: 2, item: eggs }
      - { qty: 2, unit: tbsp, item: soy sauce }
      - { qty: 1, unit: tbsp, item: chili crisp }
      - { qty: 3, item: scallions, note: sliced }
      - { qty: 1, unit: tbsp, item: neutral oil }
source: { type: original, name: Sample recipe }
---

## Instructions
1. Heat the oil in the wok over high heat until shimmering.
2. Stir-fry the chicken until browned and cooked through, 5–6 minutes, then push it to the side.
3. Scramble the eggs in the empty space and break them up.
4. Add the rice and toss until it's hot and starting to crisp, about 3 minutes.
5. Stir in the soy sauce and chili crisp, then top with the scallions.

## Notes
- *Sample recipe*: delete once real recipes are added.
```

`content/recipes/overnight-oats/index.md`:

```markdown
---
title: Overnight Oats
description: Five-minute make-ahead breakfast you can build on all week.
date: 2026-09-18
servings: 1
time: { prep: 5, total: 5 }
difficulty: easy
categories: [breakfast]
tags: [meal-prep, no-cook, sample]
ingredients:
  - items:
      - { qty: 0.5, unit: cup, item: rolled oats }
      - { qty: 0.5, unit: cup, item: milk }
      - { qty: 0.25, unit: cup, item: Greek yogurt }
      - { qty: 1, unit: tsp, item: maple syrup }
      - { item: berries, note: for topping }
source: { type: original, name: Sample recipe }
---

## Instructions
1. Stir the oats, milk, yogurt, and maple syrup together in a jar.
2. Cover and refrigerate overnight, or at least 4 hours.
3. Top with berries and eat cold.
```

`content/recipes/brown-butter-chocolate-chip-cookies/index.md`:

```markdown
---
title: Brown Butter Chocolate Chip Cookies
description: Nutty brown butter, chewy centers, and puddles of dark chocolate.
date: 2026-09-15
image: hero.webp
servings: 24
time: { prep: 20, cook: 12, total: 90 }
difficulty: medium
categories: [dessert, baking]
tags: [cookies, chocolate, sample]
equipment: [stand mixer, sheet pan, parchment paper]
ingredients:
  - group: Dough
    items:
      - { qty: 1, unit: cup, item: unsalted butter, note: 2 sticks }
      - { qty: 1, unit: cup, item: brown sugar }
      - { qty: 0.5, unit: cup, item: granulated sugar }
      - { qty: 2, item: eggs }
      - { qty: 2, unit: tsp, item: vanilla extract }
      - { qty: 2.25, unit: cup, item: all-purpose flour }
      - { qty: 1, unit: tsp, item: baking soda }
      - { qty: 1, unit: tsp, item: kosher salt }
  - group: Mix-ins
    items:
      - { qty: 8, unit: oz, item: dark chocolate, note: chopped }
      - { item: flaky salt, note: for topping }
rating: 5
source: { type: original, name: Sample recipe }
---

## Instructions
1. Brown the butter in a saucepan over medium heat, swirling until it smells nutty and the solids turn golden, 5–7 minutes. Cool 15 minutes.
2. Beat the browned butter with both sugars, then beat in the eggs and vanilla.
3. Mix in the flour, baking soda, and salt until just combined, then fold in the chocolate.
4. Chill the dough for at least 30 minutes.
5. Scoop 2-tablespoon balls onto a parchment-lined sheet pan and bake at 350°F for 11–12 minutes.
6. Sprinkle with flaky salt while warm.

## Notes
- *Sample recipe*: delete once real recipes are added.

## Variations
- Swap half the chocolate for toasted pecans.
```

- [ ] **Step 3: Validate**

Run: `npm run validate`
Expected: `✓ 4 recipe(s) valid`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "content: seed sample recipes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Visual foundation (theme, fonts, layout, header, noindex)

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`
- Create: `components/site-header.tsx`, `components/theme-toggle.tsx`, `components/recipe/surprise-button.tsx`, `public/robots.txt`, `public/.nojekyll`
- Add via shadcn CLI: `components/ui/badge.tsx`, `components/ui/input.tsx`, `components/ui/separator.tsx`

**Interfaces:**
- Consumes: `getAllRecipes` (Task 4), `SITE_NAME`, `SITE_DESCRIPTION` (Task 1).
- Produces: `SurpriseButton({ slugs: string[]; variant?: "default" | "outline" | "ghost"; size?: "default" | "sm" | "lg"; className?: string; label?: string })`, `ThemeToggle()`, `SiteHeader()`, CSS utility class `prose-recipe`, Tailwind font utility `font-heading` (Fraunces).

- [ ] **Step 1: Add shadcn components**

Run: `npx shadcn@latest add badge input separator --yes`
Expected: `components/ui/badge.tsx`, `input.tsx`, `separator.tsx` are created. Open each and note the exported names (`Badge` with `variant` values `default | secondary | outline | …`, `Input`, `Separator`). Later tasks use only these props.

- [ ] **Step 2: Theme tokens and prose styles**

In `app/globals.css`:

1. In `@theme inline`, change `--font-heading: var(--font-sans);` to `--font-heading: var(--font-display);`.
2. In `:root`, replace the values of these tokens (leave chart/sidebar/radius as they are):

```css
    --background: oklch(0.985 0.012 85);
    --foreground: oklch(0.24 0.02 50);
    --card: oklch(0.995 0.008 85);
    --card-foreground: oklch(0.24 0.02 50);
    --popover: oklch(0.995 0.008 85);
    --popover-foreground: oklch(0.24 0.02 50);
    --primary: oklch(0.56 0.14 40);
    --primary-foreground: oklch(0.985 0.01 85);
    --secondary: oklch(0.95 0.02 80);
    --secondary-foreground: oklch(0.3 0.03 50);
    --muted: oklch(0.955 0.015 80);
    --muted-foreground: oklch(0.5 0.03 55);
    --accent: oklch(0.93 0.04 75);
    --accent-foreground: oklch(0.3 0.03 50);
    --border: oklch(0.9 0.02 75);
    --input: oklch(0.88 0.02 75);
    --ring: oklch(0.56 0.14 40);
```

3. In `.dark`, replace the same tokens:

```css
    --background: oklch(0.19 0.012 55);
    --foreground: oklch(0.94 0.015 80);
    --card: oklch(0.23 0.014 55);
    --card-foreground: oklch(0.94 0.015 80);
    --popover: oklch(0.23 0.014 55);
    --popover-foreground: oklch(0.94 0.015 80);
    --primary: oklch(0.72 0.13 50);
    --primary-foreground: oklch(0.19 0.012 55);
    --secondary: oklch(0.29 0.015 55);
    --secondary-foreground: oklch(0.94 0.015 80);
    --muted: oklch(0.27 0.014 55);
    --muted-foreground: oklch(0.72 0.02 70);
    --accent: oklch(0.31 0.03 60);
    --accent-foreground: oklch(0.94 0.015 80);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.72 0.13 50);
```

4. Append:

```css
@layer components {
  .prose-recipe {
    @apply text-base leading-relaxed;
  }
  .prose-recipe > * + * {
    @apply mt-4;
  }
  .prose-recipe ol {
    counter-reset: step;
    @apply list-none space-y-5 p-0;
  }
  .prose-recipe ol > li {
    counter-increment: step;
    @apply relative min-h-8 pl-12;
  }
  .prose-recipe ol > li::before {
    content: counter(step);
    @apply absolute top-0 left-0 flex size-8 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-semibold text-primary;
  }
  .prose-recipe ul {
    @apply list-disc space-y-2 pl-5;
  }
  .prose-recipe h3 {
    @apply mt-6 font-heading text-lg font-semibold;
  }
  .prose-recipe img {
    @apply my-4 rounded-xl;
  }
  .prose-recipe a {
    @apply text-primary underline underline-offset-4;
  }
  .prose-recipe strong {
    @apply font-semibold;
  }
}
```

- [ ] **Step 3: Client components**

Create `components/theme-toggle.tsx`:

```tsx
"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  )
}
```

Create `components/recipe/surprise-button.tsx`:

```tsx
"use client"

import { Shuffle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type Props = {
  slugs: string[]
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
  label?: string
}

export function SurpriseButton({
  slugs,
  variant = "outline",
  size = "default",
  className,
  label = "Surprise me",
}: Props) {
  const router = useRouter()
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={slugs.length === 0}
      onClick={() => {
        const slug = slugs[Math.floor(Math.random() * slugs.length)]
        router.push(`/recipes/${slug}/`)
      }}
    >
      <Shuffle aria-hidden />
      {label}
    </Button>
  )
}
```

- [ ] **Step 4: Header and layout**

Create `components/site-header.tsx`:

```tsx
import Link from "next/link"
import { ChefHat } from "lucide-react"
import { SurpriseButton } from "@/components/recipe/surprise-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { getAllRecipes } from "@/lib/recipes"
import { SITE_NAME } from "@/lib/site"

export function SiteHeader() {
  const slugs = getAllRecipes().map((r) => r.slug)
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-auto flex items-center gap-2 font-heading text-lg font-semibold">
          <ChefHat className="size-5 text-primary" aria-hidden />
          {SITE_NAME}
        </Link>
        <Link
          href="/recipes/"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Recipes
        </Link>
        <SurpriseButton slugs={slugs} variant="ghost" size="sm" label="Surprise" />
        <ThemeToggle />
      </div>
    </header>
  )
}
```

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from "next"
import { Fraunces, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased font-sans", inter.variable, fraunces.variable, fontMono.variable)}
    >
      <body className="flex min-h-svh flex-col">
        <ThemeProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t py-6 text-center text-xs text-muted-foreground">
            {SITE_NAME} · curated with Claude
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

Create `public/robots.txt`:

```
User-agent: *
Disallow: /
```

Create an empty `public/.nojekyll`. Delete `public/.gitkeep`.

- [ ] **Step 5: Temporary homepage so the build has content**

Replace `app/page.tsx` with a stub. Task 13 replaces it.

```tsx
export default function HomePage() {
  return <div className="mx-auto max-w-6xl px-4 py-16 font-heading text-4xl">Cookbook</div>
}
```

- [ ] **Step 6: Build and verify noindex**

Run: `npm run build`
Expected: the build succeeds and `out/index.html` exists.

Run: `grep -o '<meta name="robots"[^>]*>' out/index.html`
Expected: `<meta name="robots" content="noindex, nofollow"/>`

Run: `ls out/recipe-images/green-chile-chicken-tacos/`
Expected: `hero.webp`

- [ ] **Step 7: Lint, typecheck, commit**

```bash
npm run lint && npm run typecheck && npm test
npm run format
git add -A
git commit -m "feat: warm cookbook theme, layout, header, noindex" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Recipe page and shared recipe components

**Files:**
- Create: `components/recipe/recipe-image.tsx`, `components/recipe/rating-stars.tsx`, `components/recipe/recipe-meta.tsx`, `components/recipe/recipe-card.tsx`, `components/recipe/recipe-grid.tsx`, `components/recipe/servings-scaler.tsx`, `components/recipe/ingredient-list.tsx`, `app/recipes/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getAllRecipes`, `getRecipe` (Task 4), `toSummary`, `RecipeSummary` (Task 4), `renderMarkdown` (Task 3), `formatIngredientAmount`, `formatMinutes`, `sourceLabel` (Task 5), `relatedRecipes` (Task 7), `CATEGORY_LABELS` (Task 2), `recipeImageUrl` (Task 1), `IngredientGroup` (Task 2).
- Produces: `RecipeImage({ src?: string; alt: string; priority?: boolean; className?: string })`, `RatingStars({ rating: number })`, `RecipeMeta({ time?: { prep?: number; cook?: number; total?: number }; servings?: number; difficulty?: string })`, `RecipeCard({ recipe: RecipeSummary })`, `RecipeGrid({ recipes: RecipeSummary[]; empty?: string })`, `IngredientList({ groups: IngredientGroup[]; baseServings: number })`, `ServingsScaler({ value: number; base: number; onChange: (n: number) => void })`

- [ ] **Step 1: Presentational components**

Create `components/recipe/recipe-image.tsx`:

```tsx
import Image from "next/image"
import { UtensilsCrossed } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = { src?: string; alt: string; priority?: boolean; className?: string; sizes?: string }

export function RecipeImage({ src, alt, priority, className, sizes = "100vw" }: Props) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src ? (
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,var(--accent),var(--muted))]">
          <UtensilsCrossed className="size-10 text-muted-foreground/50" aria-hidden />
        </div>
      )}
    </div>
  )
}
```

Create `components/recipe/rating-stars.tsx`:

```tsx
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function RatingStars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn("size-4", n <= rating ? "fill-primary text-primary" : "text-muted-foreground/40")}
        />
      ))}
    </span>
  )
}
```

Create `components/recipe/recipe-meta.tsx`:

```tsx
import { Clock, Gauge, Users } from "lucide-react"
import { formatMinutes } from "@/lib/recipes/format"

type Props = {
  time?: { prep?: number; cook?: number; total?: number }
  servings?: number
  difficulty?: string
}

export function RecipeMeta({ time, servings, difficulty }: Props) {
  const items: { icon: typeof Clock; label: string; value: string }[] = []
  if (time?.prep !== undefined) items.push({ icon: Clock, label: "Prep", value: formatMinutes(time.prep) })
  if (time?.cook !== undefined) items.push({ icon: Clock, label: "Cook", value: formatMinutes(time.cook) })
  if (time?.total !== undefined) items.push({ icon: Clock, label: "Total", value: formatMinutes(time.total) })
  if (servings !== undefined) items.push({ icon: Users, label: "Serves", value: String(servings) })
  if (difficulty) items.push({ icon: Gauge, label: "Difficulty", value: difficulty })
  if (!items.length) return null

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-3">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className="size-4 text-primary" aria-hidden />
          <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
          <dd className="text-sm font-medium capitalize">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
```

Create `components/recipe/recipe-card.tsx`:

```tsx
import Link from "next/link"
import { Clock } from "lucide-react"
import { formatMinutes } from "@/lib/recipes/format"
import type { RecipeSummary } from "@/lib/recipes/summary"
import { RatingStars } from "./rating-stars"
import { RecipeImage } from "./recipe-image"

export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  return (
    <Link
      href={`/recipes/${recipe.slug}/`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <RecipeImage
        src={recipe.imageUrl}
        alt=""
        className="aspect-[4/3]"
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-xl leading-tight font-semibold group-hover:text-primary">
          {recipe.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
        <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-muted-foreground">
          {recipe.totalMinutes !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {formatMinutes(recipe.totalMinutes)}
            </span>
          )}
          {recipe.rating !== undefined && <RatingStars rating={recipe.rating} />}
        </div>
      </div>
    </Link>
  )
}
```

Create `components/recipe/recipe-grid.tsx`:

```tsx
import type { RecipeSummary } from "@/lib/recipes/summary"
import { RecipeCard } from "./recipe-card"

export function RecipeGrid({
  recipes,
  empty = "No recipes yet.",
}: {
  recipes: RecipeSummary[]
  empty?: string
}) {
  if (!recipes.length) return <p className="py-8 text-muted-foreground">{empty}</p>
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((r) => (
        <RecipeCard key={r.slug} recipe={r} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Scaler and ingredient list (client)**

Create `components/recipe/servings-scaler.tsx`:

```tsx
"use client"

import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = { value: number; base: number; onChange: (n: number) => void }

export function ServingsScaler({ value, base, onChange }: Props) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Adjust servings">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Fewer servings"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus />
      </Button>
      <span className="min-w-20 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {value} {value === 1 ? "serving" : "servings"}
      </span>
      <Button variant="outline" size="icon-sm" aria-label="More servings" onClick={() => onChange(value + 1)}>
        <Plus />
      </Button>
      {value !== base && (
        <Button variant="link" size="sm" onClick={() => onChange(base)}>
          Reset
        </Button>
      )}
    </div>
  )
}
```

Create `components/recipe/ingredient-list.tsx`:

```tsx
"use client"

import { useState } from "react"
import { formatIngredientAmount } from "@/lib/recipes/format"
import type { IngredientGroup } from "@/lib/recipes/schema"
import { ServingsScaler } from "./servings-scaler"

export function IngredientList({
  groups,
  baseServings,
}: {
  groups: IngredientGroup[]
  baseServings: number
}) {
  const [servings, setServings] = useState(baseServings)

  return (
    <section aria-labelledby="ingredients-heading" className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ingredients-heading" className="font-heading text-2xl font-semibold">
          Ingredients
        </h2>
        <ServingsScaler value={servings} base={baseServings} onChange={setServings} />
      </div>
      {groups.map((group, i) => (
        <div key={i} className="mt-5">
          {group.group && (
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {group.group}
            </h3>
          )}
          <ul className="divide-y">
            {group.items.map((ing, j) => {
              const amount = formatIngredientAmount(ing, servings, baseServings)
              return (
                <li key={j} className="flex gap-3 py-2 text-sm">
                  <span className="w-20 shrink-0 font-semibold text-primary tabular-nums">{amount}</span>
                  <span>
                    {ing.item}
                    {ing.note && <span className="text-muted-foreground">, {ing.note}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </section>
  )
}
```

`IngredientList` imports only a **type** from `schema.ts`, so zod is not pulled into the client bundle.

- [ ] **Step 3: Recipe page**

Create `app/recipes/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { IngredientList } from "@/components/recipe/ingredient-list"
import { RatingStars } from "@/components/recipe/rating-stars"
import { RecipeGrid } from "@/components/recipe/recipe-grid"
import { RecipeImage } from "@/components/recipe/recipe-image"
import { RecipeMeta } from "@/components/recipe/recipe-meta"
import { getAllRecipes, getRecipe } from "@/lib/recipes"
import { renderMarkdown } from "@/lib/recipes/body"
import { CATEGORY_LABELS } from "@/lib/recipes/categories"
import { sourceLabel } from "@/lib/recipes/format"
import { relatedRecipes } from "@/lib/recipes/related"
import { toSummary } from "@/lib/recipes/summary"
import { recipeImageUrl } from "@/lib/site"

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return getAllRecipes().map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = getRecipe((await params).slug)
  return recipe ? { title: recipe.title, description: recipe.description } : {}
}

function Prose({ markdown, slug }: { markdown: string; slug: string }) {
  return (
    <div className="prose-recipe" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown, slug) }} />
  )
}

export default async function RecipePage({ params }: Props) {
  const recipe = getRecipe((await params).slug)
  if (!recipe) notFound()

  const related = relatedRecipes(recipe, getAllRecipes()).map(toSummary)
  const { sections } = recipe

  return (
    <article className="mx-auto max-w-6xl px-4 pb-16 sm:pt-6">
      <RecipeImage
        src={recipe.image ? recipeImageUrl(recipe.slug, recipe.image) : undefined}
        alt={recipe.title}
        priority
        className="-mx-4 aspect-[4/3] sm:mx-0 sm:aspect-[21/9] sm:rounded-3xl"
      />

      <header className="mt-6 max-w-3xl space-y-4">
        <div className="flex flex-wrap gap-2 text-xs font-semibold tracking-[0.15em] text-primary uppercase">
          {recipe.categories.map((c) => (
            <Link key={c} href={`/category/${c}/`} className="hover:underline">
              {CATEGORY_LABELS[c]}
            </Link>
          ))}
        </div>
        <h1 className="font-heading text-4xl leading-tight font-semibold md:text-5xl">{recipe.title}</h1>
        <p className="text-lg text-muted-foreground">{recipe.description}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {recipe.rating !== undefined && <RatingStars rating={recipe.rating} />}
          <span>
            {recipe.source.url ? (
              <a href={recipe.source.url} className="underline underline-offset-4 hover:text-foreground" rel="noopener">
                {sourceLabel(recipe.source)}
              </a>
            ) : (
              sourceLabel(recipe.source)
            )}
          </span>
        </div>
        <RecipeMeta time={recipe.time} servings={recipe.servings} difficulty={recipe.difficulty} />
      </header>

      <Separator className="my-8" />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,24rem)_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <IngredientList groups={recipe.ingredients} baseServings={recipe.servings} />
        </aside>

        <div className="space-y-10">
          <section aria-labelledby="instructions-heading">
            <h2 id="instructions-heading" className="mb-5 font-heading text-2xl font-semibold">
              Instructions
            </h2>
            <Prose markdown={sections.instructions} slug={recipe.slug} />
          </section>

          {sections.notes && (
            <section aria-labelledby="notes-heading" className="rounded-2xl bg-accent/50 p-5">
              <h2 id="notes-heading" className="mb-3 font-heading text-xl font-semibold">
                Notes
              </h2>
              <Prose markdown={sections.notes} slug={recipe.slug} />
            </section>
          )}

          {sections.variations && (
            <section aria-labelledby="variations-heading">
              <h2 id="variations-heading" className="mb-3 font-heading text-xl font-semibold">
                Variations
              </h2>
              <Prose markdown={sections.variations} slug={recipe.slug} />
            </section>
          )}

          {recipe.equipment.length > 0 && (
            <section aria-labelledby="equipment-heading">
              <h2 id="equipment-heading" className="mb-3 font-heading text-xl font-semibold">
                Equipment
              </h2>
              <ul className="flex flex-wrap gap-2">
                {recipe.equipment.map((e) => (
                  <li key={e}>
                    <Badge variant="outline">{e}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recipe.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Tags">
              {recipe.tags.map((t) => (
                <li key={t}>
                  <Link href={`/tags/${t}/`}>
                    <Badge variant="secondary">#{t}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16">
          <h2 id="related-heading" className="mb-6 font-heading text-2xl font-semibold">
            You might also like
          </h2>
          <RecipeGrid recipes={related} />
        </section>
      )}
    </article>
  )
}
```

- [ ] **Step 4: Build and check output**

Run: `npm run build`
Expected: success. `out/recipes/green-chile-chicken-tacos/index.html` exists, plus one folder per seed recipe.

Run: `grep -c "Green Chile Chicken Tacos" out/recipes/green-chile-chicken-tacos/index.html`
Expected: ≥ 1.

- [ ] **Step 5: Check it in the browser**

Run `npm run dev` in the background and open `http://localhost:3000/personal-cookbook/recipes/green-chile-chicken-tacos/` (use the `run` skill or Claude in Chrome). Check:
- the hero image loads
- the tacos page has two ingredient groups, and the "salt, to taste" line has no amount
- pressing + to 8 servings shows `3 lb` chicken and `½ cup` cilantro, and Reset returns to 4
- "You might also like" shows Spicy Chicken Fried Rice
- `/personal-cookbook/recipes/overnight-oats/` shows the placeholder, no rating, no Notes section, and no empty Equipment section
- at a 390px-wide viewport the ingredients sit above the instructions with no horizontal scroll, and on desktop the ingredient column is sticky

Stop the dev server afterwards.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
npm run lint && npm run typecheck && npm test
npm run format
git add -A
git commit -m "feat: recipe page with servings scaler and related recipes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Homepage

**Files:**
- Create: `components/recipe/search-box.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getAllRecipes` (Task 4), `toSummary` (Task 4), `featuredRecipes`, `recentRecipes`, `categoryCounts` (Task 7), `CATEGORY_LABELS` (Task 2), `RecipeGrid` (Task 12), `SurpriseButton` (Task 11).
- Produces: `SearchBox({ className?: string; defaultValue?: string; autoFocus?: boolean })`, which navigates to `/recipes/?q=<query>` on submit.

- [ ] **Step 1: SearchBox**

Create `components/recipe/search-box.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Props = { className?: string; defaultValue?: string; autoFocus?: boolean }

export function SearchBox({ className, defaultValue = "", autoFocus }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault()
        const q = value.trim()
        router.push(q ? `/recipes/?q=${encodeURIComponent(q)}` : "/recipes/")
      }}
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search recipes or ingredients…"
        aria-label="Search recipes"
        autoFocus={autoFocus}
        className="h-11 bg-card pl-9"
      />
    </form>
  )
}
```

- [ ] **Step 2: Homepage**

Replace `app/page.tsx`:

```tsx
import Link from "next/link"
import { RecipeGrid } from "@/components/recipe/recipe-grid"
import { SearchBox } from "@/components/recipe/search-box"
import { SurpriseButton } from "@/components/recipe/surprise-button"
import { getAllRecipes } from "@/lib/recipes"
import { CATEGORY_LABELS } from "@/lib/recipes/categories"
import { categoryCounts, featuredRecipes, recentRecipes } from "@/lib/recipes/collections"
import { toSummary } from "@/lib/recipes/summary"

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mt-14">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 className="font-heading text-3xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function HomePage() {
  const summaries = getAllRecipes().map(toSummary)
  const featured = featuredRecipes(summaries)
  const recent = recentRecipes(summaries, 6)
  const categories = categoryCounts(summaries)

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <section className="py-12 text-center md:py-20">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          {summaries.length} {summaries.length === 1 ? "recipe" : "recipes"} and counting
        </p>
        <h1 className="mt-4 font-heading text-5xl leading-tight font-semibold md:text-7xl">
          What are we cooking?
        </h1>
        <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
          <SearchBox className="flex-1" />
          <SurpriseButton slugs={summaries.map((s) => s.slug)} size="lg" className="h-11" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Try “chicken + rice + spicy”</p>
      </section>

      {featured.length > 0 && (
        <Section title="Featured">
          <RecipeGrid recipes={featured} />
        </Section>
      )}

      <Section
        title="Recently added"
        action={
          <Link href="/recipes/" className="text-sm font-medium text-primary hover:underline">
            See all →
          </Link>
        }
      >
        <RecipeGrid recipes={recent} />
      </Section>

      {categories.length > 0 && (
        <Section title="Browse by category">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map(({ category, count }) => (
              <li key={category}>
                <Link
                  href={`/category/${category}/`}
                  className="flex items-baseline justify-between rounded-2xl border bg-card px-5 py-4 transition-colors hover:border-primary hover:text-primary"
                >
                  <span className="font-heading text-lg font-semibold">{CATEGORY_LABELS[category]}</span>
                  <span className="text-sm text-muted-foreground">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build and check in the browser**

Run: `npm run build`. Expected: success.
Run `npm run dev` and open `http://localhost:3000/personal-cookbook/`. Check:
- Featured shows the tacos
- Recently added shows all 4, newest (fried rice) first
- the category tiles show Dinner 2, Lunch 1, Breakfast 1, Dessert 1, Baking 1
- Surprise me opens a random recipe
- submitting "chicken rice" navigates to `/personal-cookbook/recipes/?q=chicken%20rice` (the page is built in Task 14, so a 404 is fine for now)

Stop the dev server.

- [ ] **Step 4: Lint, typecheck, commit**

```bash
npm run lint && npm run typecheck && npm test
npm run format
git add -A
git commit -m "feat: homepage with search, surprise me, featured and categories" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: All-recipes browser, category and tag pages, 404

**Files:**
- Create: `components/recipe/recipe-browser.tsx`, `app/recipes/page.tsx`, `app/category/[category]/page.tsx`, `app/tags/[tag]/page.tsx`, `app/not-found.tsx`

**Interfaces:**
- Consumes: `searchRecipes`, `filterRecipes` (Task 6), `categoryCounts`, `tagCounts` (Task 7), `RecipeGrid` (Task 12), `SearchBox` (Task 13), `isCategory`, `CATEGORY_LABELS` (Task 2), `getAllRecipes`, `toSummary` (Task 4).
- Produces: `RecipeBrowser({ recipes: RecipeSummary[]; categories: { category: Category; count: number }[]; tags: { tag: string; count: number }[] })`, which reads and writes the `q`, `category`, and `tag` URL params.

- [ ] **Step 1: RecipeBrowser (client)**

Create `components/recipe/recipe-browser.tsx`:

```tsx
"use client"

import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CATEGORY_LABELS, type Category } from "@/lib/recipes/categories"
import { filterRecipes, searchRecipes } from "@/lib/recipes/search"
import type { RecipeSummary } from "@/lib/recipes/summary"
import { RecipeGrid } from "./recipe-grid"

type Props = {
  recipes: RecipeSummary[]
  categories: { category: Category; count: number }[]
  tags: { tag: string; count: number }[]
}

export function RecipeBrowser({ recipes, categories, tags }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const category = searchParams.get("category") ?? undefined
  const tag = searchParams.get("tag") ?? undefined
  const [query, setQuery] = useState(searchParams.get("q") ?? "")

  function update(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const results = useMemo(
    () => searchRecipes(filterRecipes(recipes, { category, tag }), query),
    [recipes, category, tag, query]
  )

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            update({ q: e.target.value.trim() || undefined })
          }}
          placeholder="Search recipes or ingredients… (e.g. chicken + rice + spicy)"
          aria-label="Search recipes"
          className="h-11 bg-card pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <Button
          size="sm"
          className="rounded-full"
          variant={!category ? "default" : "outline"}
          aria-pressed={!category}
          onClick={() => update({ category: undefined })}
        >
          All
        </Button>
        {categories.map(({ category: c, count }) => (
          <Button
            key={c}
            size="sm"
            className="rounded-full"
            variant={category === c ? "default" : "outline"}
            aria-pressed={category === c}
            onClick={() => update({ category: category === c ? undefined : c })}
          >
            {CATEGORY_LABELS[c]} <span className="opacity-60">{count}</span>
          </Button>
        ))}
      </div>

      {tags.length > 0 && (
        <details className="group" open={Boolean(tag)}>
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground select-none">
            Tags
          </summary>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
            {tags.map(({ tag: t, count }) => (
              <Button
                key={t}
                size="xs"
                className="rounded-full"
                variant={tag === t ? "default" : "secondary"}
                aria-pressed={tag === t}
                onClick={() => update({ tag: tag === t ? undefined : t })}
              >
                #{t} <span className="opacity-60">{count}</span>
              </Button>
            ))}
          </div>
        </details>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span aria-live="polite">
          {results.length} {results.length === 1 ? "recipe" : "recipes"}
        </span>
        {(query || category || tag) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("")
              router.replace(pathname, { scroll: false })
            }}
          >
            <X aria-hidden /> Clear
          </Button>
        )}
      </div>

      <RecipeGrid recipes={results} empty="No recipes match. Try fewer or different terms." />
    </div>
  )
}
```

- [ ] **Step 2: /recipes page with Suspense**

Create `app/recipes/page.tsx`:

```tsx
import type { Metadata } from "next"
import { Suspense } from "react"
import { RecipeBrowser } from "@/components/recipe/recipe-browser"
import { RecipeGrid } from "@/components/recipe/recipe-grid"
import { getAllRecipes } from "@/lib/recipes"
import { categoryCounts, tagCounts } from "@/lib/recipes/collections"
import { toSummary } from "@/lib/recipes/summary"

export const metadata: Metadata = { title: "All recipes" }

export default function RecipesPage() {
  const summaries = getAllRecipes().map(toSummary)
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 font-heading text-4xl font-semibold md:text-5xl">All recipes</h1>
      {/* useSearchParams in RecipeBrowser requires a Suspense boundary in static export */}
      <Suspense fallback={<RecipeGrid recipes={summaries} />}>
        <RecipeBrowser
          recipes={summaries}
          categories={categoryCounts(summaries)}
          tags={tagCounts(summaries)}
        />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 3: Category and tag pages**

Create `app/category/[category]/page.tsx`:

```tsx
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { RecipeGrid } from "@/components/recipe/recipe-grid"
import { getAllRecipes } from "@/lib/recipes"
import { CATEGORY_LABELS, isCategory } from "@/lib/recipes/categories"
import { categoryCounts } from "@/lib/recipes/collections"
import { toSummary } from "@/lib/recipes/summary"

type Props = { params: Promise<{ category: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return categoryCounts(getAllRecipes().map(toSummary)).map(({ category }) => ({ category }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  return isCategory(category) ? { title: CATEGORY_LABELS[category] } : {}
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  if (!isCategory(category)) notFound()
  const recipes = getAllRecipes()
    .map(toSummary)
    .filter((r) => r.categories.includes(category))

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Category</p>
      <h1 className="mt-2 mb-8 font-heading text-4xl font-semibold md:text-5xl">
        {CATEGORY_LABELS[category]}
      </h1>
      <RecipeGrid recipes={recipes} />
    </div>
  )
}
```

Create `app/tags/[tag]/page.tsx`:

```tsx
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { RecipeGrid } from "@/components/recipe/recipe-grid"
import { getAllRecipes } from "@/lib/recipes"
import { tagCounts } from "@/lib/recipes/collections"
import { toSummary } from "@/lib/recipes/summary"

type Props = { params: Promise<{ tag: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return tagCounts(getAllRecipes().map(toSummary)).map(({ tag }) => ({ tag }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `#${(await params).tag}` }
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params
  const recipes = getAllRecipes()
    .map(toSummary)
    .filter((r) => r.tags.includes(tag))
  if (!recipes.length) notFound()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Tag</p>
      <h1 className="mt-2 mb-8 font-heading text-4xl font-semibold md:text-5xl">#{tag}</h1>
      <RecipeGrid recipes={recipes} />
    </div>
  )
}
```

- [ ] **Step 4: 404 page**

Create `app/not-found.tsx`:

```tsx
import Link from "next/link"
import { SearchBox } from "@/components/recipe/search-box"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">404</p>
      <h1 className="mt-3 font-heading text-4xl font-semibold">This page isn’t on the menu</h1>
      <p className="mt-3 text-muted-foreground">Try searching for what you were after.</p>
      <SearchBox className="mt-8" />
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
        ← Back home
      </Link>
    </div>
  )
}
```

- [ ] **Step 5: Build and verify the routes**

Run: `npm run build`
Expected: success, with no "Missing Suspense boundary with useSearchParams" error.

Run: `ls out/recipes/index.html out/category/dinner/index.html out/tags/spicy/index.html out/404.html`
Expected: all four files exist.

- [ ] **Step 6: Check in the browser**

Serve the **production export** at its real base path to test it exactly as it will run on Pages:

```bash
mkdir -p "$TMPDIR/pages-preview" && rm -rf "$TMPDIR/pages-preview/personal-cookbook" && cp -r out "$TMPDIR/pages-preview/personal-cookbook"
npx serve "$TMPDIR/pages-preview" -l 4173
```

Open `http://localhost:4173/personal-cookbook/` and check:
- `recipes/?q=chicken+%2B+rice+%2B+spicy` shows only Spicy Chicken Fried Rice
- typing `tomatos` finds the tacos
- the Dinner chip filters to 2 recipes, and clicking it again clears the filter
- the `#spicy` tag chip filters, and the URL updates
- Clear resets everything
- the `/personal-cookbook/category/dinner/` and `/personal-cookbook/tags/sample/` pages list recipes
- `/personal-cookbook/nope/` shows the 404 page with search
- the homepage search "chicken rice" lands on filtered results
- dark mode works through the toggle, and pressing `d` also toggles it
- at 390px wide nothing scrolls sideways

Stop the server.

- [ ] **Step 7: Lint, typecheck, commit**

```bash
npm run lint && npm run typecheck && npm test
npm run format
git add -A
git commit -m "feat: recipe browser with search and filters, category/tag pages, 404" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Claude authoring workflow (CLAUDE.md + skills)

**Files:**
- Create: `CLAUDE.md`, `.claude/skills/add-recipe/SKILL.md`, `.claude/skills/update-recipe/SKILL.md`
- Modify: `README.md` (replace the shadcn boilerplate)

**Interfaces:**
- Consumes: `npm run validate`, `npm run image`, `npm run fetch-recipe` (Tasks 4, 8, 9); the schema rules (Task 2); the body rules (Task 3).
- Produces: `/add-recipe` and `/update-recipe` project skills.

- [ ] **Step 1: CLAUDE.md**

Create `CLAUDE.md`:

````markdown
@AGENTS.md

# Personal Cookbook

A static Next.js site (GitHub Pages) whose content is Markdown recipes in `content/recipes/<slug>/index.md`.
**Claude is the editor:** the user adds and edits recipes by talking to Claude; there is no editing UI.

- Adding a recipe (photos, pasted text, a description, an idea, or a URL): use the `add-recipe` skill.
- Changing an existing recipe (notes, ratings, ingredient or step changes): use the `update-recipe` skill.
- Follow the rules below even when a skill isn't invoked.

## Recipe format (enforced by `npm run validate`)

```markdown
---
title: Green Chile Chicken Tacos
description: One or two original sentences.
date: 2026-09-27               # date added, YYYY-MM-DD
updated: 2026-10-02            # optional; set on meaningful edits
image: hero.webp               # optional; file in the same folder
servings: 4                    # integer; base for the scaler
time: { prep: 15, cook: 30, total: 45 }   # minutes; any subset
difficulty: easy               # easy | medium | hard
categories: [dinner]           # breakfast | lunch | dinner | dessert | snack | side | drink | baking
tags: [mexican, spicy, quick-meals]       # kebab-case; methods (air-fryer, slow-cooker, grilling), cuisines, proteins, meal-prep…
equipment: [dutch oven]
ingredients:
  - group: Chicken             # optional
    items:
      - { qty: 1.5, unit: lb, item: boneless chicken thighs }
      - { qty: 2, item: garlic cloves, note: "2–3" }    # ranges: low qty + note
      - { item: salt, note: to taste }                   # no qty → never scaled
rating: 4                      # optional 1–5
source: { type: web, name: Serious Eats, url: "https://…" }   # original | family | cookbook | web | adapted
featured: false
---

## Instructions
1. Numbered steps. `### Subheading` is allowed for multi-part recipes.

## Notes
- Optional. Tips, personal notes, and anything estimated (marked "(estimated)").

## Variations
- Optional. Substitutions and suggested changes.
```

Rules:
- `qty` is a **decimal number** (`0.5`, `0.333`), never `"1/2"`. Use common units: tsp, tbsp, cup, oz, lb, g, kg, ml, l, clove, can, pinch.
- Only the three H2 headings above are allowed. No text before `## Instructions`.
- The slug (folder name) is kebab-case from the title and **never changes** after publishing, because it's the URL.
- Before assuming a tag, check the tags already in use (`grep -rh "^tags:" content/recipes`) and reuse them rather than inventing near-duplicates.
- Images: always go through `npm run image -- <input> content/recipes/<slug>/<name>.webp` (resizes and strips GPS/EXIF). Never commit raw photos. `inbox/` is git-ignored.
- Content from other sites (URL imports, cookbooks): copy ingredients and quantities exactly, but **rewrite instructions and the description in your own words** (same steps, temperatures, and times). Never download or commit the site's photos.
- Family and handwritten recipes: transcribe faithfully. Don't "improve" them silently; put suggestions under `## Variations`. Put guesses for illegible or missing values in `## Notes`, marked "(estimated)", after asking the user about anything important.
- Recipes tagged `sample` are seed content and can be deleted once real recipes exist.

## Commands

- `npm run validate`: validate all recipes (run before every commit)
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`
- `npm run dev`: http://localhost:3000/personal-cookbook/
- `npm run image -- <in> <out.webp>`: process a photo
- `npm run fetch-recipe -- <url>`: extract schema.org recipe data from a web page as JSON

## Publishing

Commit to `main` and push. GitHub Actions validates, tests, builds, and deploys to https://jo714011.github.io/personal-cookbook/ in about 2 minutes. Watch it with `gh run watch --exit-status` (use the latest run's ID from `gh run list -L 1`).
Commit messages: `Add recipe: <Title>`, `Update recipe: <Title> — <what changed>`. End with the Co-Authored-By trailer.
````

- [ ] **Step 2: add-recipe skill**

Create `.claude/skills/add-recipe/SKILL.md`:

````markdown
---
name: add-recipe
description: Add a new recipe to the cookbook from photos in inbox/, pasted text, a description of something cooked, a rough idea, or a recipe URL. Use whenever the user wants something added to the cookbook.
---

# Add a recipe

Follow the recipe format and rules in `CLAUDE.md`. Work through these steps in order.

## 1. Gather the inputs
- List `inbox/`. Read every image there (and any text files). Several photos usually mean one recipe (pages of a card, dish + recipe). Ask if it looks like more than one.
- Include anything the user typed or pasted.
- **URL:** run `npm run fetch-recipe -- <url>`.
  - On success, use its JSON: `ingredients` are the source lines, `instructions` are grouped steps, and times are in minutes.
  - On failure (no structured data, 403, or a paywall), use WebFetch on the URL and ask for the full ingredient list with quantities and all steps.
  - If that also fails, ask the user to paste the recipe or drop screenshots in `inbox/`.

## 2. Build the recipe
- Parse each ingredient into `{ qty, unit, item, note }`. Fractions become decimals (`1 1/2` → `1.5`, `1/3` → `0.333`). Prep words go in `note` ("diced", "room temperature"). Ranges become the low qty plus a note ("2–3").
- Group ingredients when the source groups them (dough/filling, sauce/protein).
- Instructions are a numbered list. Use `### Subheading` for sections (HowToSection groups from a URL).
- Map the source's categories and keywords onto the fixed categories plus kebab-case tags. Reuse existing tags: `grep -rh "^tags:" content/recipes`.
- Choose `difficulty` from the technique and time involved.
- `source`:
  - `original` for the user's own creation or idea
  - `family` + `name` (e.g. "Grandma Rose's card")
  - `cookbook` + `name` (book title)
  - `web` + `name` (site or author) + `url`
  - `adapted` + `name`/`url` when the user changes a source recipe
- **URL or cookbook sources:** copy ingredients and quantities exactly, and write the instructions and description **in your own words**. Don't use the site's photo.
- **Recipe from a description or idea:** develop a complete, realistic recipe. Mark any quantities or times you inferred in `## Notes` as "(estimated)".
- **Family or handwritten:** transcribe faithfully. Put suggestions in `## Variations`.
- `date` is today. `rating` only if the user gives one.
- Slug: kebab-case of the title. If `content/recipes/<slug>` already exists, stop and ask whether this is an update (use `update-recipe`) or needs a different name.

## 3. Clarify (one message, only if needed)
If any of these are missing and can't be reasonably inferred, ask them all in **one** message:
- servings
- quantities for key ingredients
- oven temperature
- cook time
- anything illegible that matters

Minor gaps: estimate them and note "(estimated)" in Notes.

## 4. Preview and wait for approval
Show:
- title, slug, categories, tags, servings, times, difficulty
- the full ingredient list
- condensed steps (one line each)
- source
- which inbox photo becomes `hero.webp`, or "placeholder"

Then **stop and wait** for the user's OK or changes.

## 5. Write the files
- `mkdir -p content/recipes/<slug>`
- Hero photo: `npm run image -- "inbox/<photo>" content/recipes/<slug>/hero.webp`, then set `image: hero.webp`. Choose the best-looking photo of the finished dish. Photos of a recipe card are for reading, not for the hero.
  - If a HEIC photo fails to convert, ask the user to re-export it as JPEG, or continue without an image.
- Write `content/recipes/<slug>/index.md`.
- Run `npm run validate` and fix any errors.

## 6. Publish
```bash
git add content/recipes/<slug>
git commit -m "Add recipe: <Title>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
gh run watch --exit-status $(gh run list -L 1 --json databaseId -q '.[0].databaseId')
```
When the deploy succeeds, report `https://jo714011.github.io/personal-cookbook/recipes/<slug>/`. If it fails, show the failing step's log (`gh run view --log-failed`) and fix it.

## 7. Clean up
Delete the inbox files that were used (only those), and tell the user which files were removed.
````

- [ ] **Step 3: update-recipe skill**

Create `.claude/skills/update-recipe/SKILL.md`:

````markdown
---
name: update-recipe
description: Change an existing cookbook recipe — add notes, set a rating, adjust ingredients or steps, swap in a new component, add a photo, mark featured. Use when the user refers to a recipe that is already in the cookbook.
---

# Update a recipe

Follow the format and rules in `CLAUDE.md`.

1. **Find it.** Match the user's words against titles and slugs (`grep -ril "<words>" content/recipes/*/index.md`). If there are several matches or none, list the candidates and ask.
2. **Make the change.**
   - "Next time…" or feedback → add a bullet to `## Notes` (create the section if it's missing).
   - Rating → `rating: N`.
   - Ingredient or step changes → edit them in place, keeping `qty` as decimals.
   - "Add my new sauce" → if the sauce is its own recipe, link to it (`[Sauce](/personal-cookbook/recipes/<slug>/)`) and add its ingredient group or a step. Otherwise add an ingredient group.
   - New photo from `inbox/` → `npm run image -- "inbox/<photo>" content/recipes/<slug>/hero.webp` and set `image: hero.webp`.
   - Set `updated:` to today for any change other than a rating or featured toggle.
   - Never rename the folder (slug).
3. **Show the diff** (`git diff content/recipes/<slug>`) and wait for the OK on anything beyond a one-line note or rating.
4. **Validate** with `npm run validate`.
5. **Publish:**
   ```bash
   git add content/recipes/<slug>
   git commit -m "Update recipe: <Title> — <short summary>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
   git push
   gh run watch --exit-status $(gh run list -L 1 --json databaseId -q '.[0].databaseId')
   ```
   Report the live URL. Delete any inbox files that were used.
````

- [ ] **Step 4: README**

Replace `README.md`:

```markdown
# Personal Cookbook

A living, searchable cookbook at https://jo714011.github.io/personal-cookbook/ (not indexed by search engines).

Recipes are Markdown files in `content/recipes/<slug>/index.md`, written and edited through Claude Code:

- Drop photos into `inbox/` and say "add the recipe from the inbox".
- Paste a recipe, describe something you cooked, share an idea, or give a URL.
- "Add a note to the tacos: more chipotle next time."

See `CLAUDE.md` for the recipe format and workflow. Every push to `main` deploys through GitHub Actions.

## Development

    npm install
    npm run dev        # http://localhost:3000/personal-cookbook/
    npm run validate   # check recipe files
    npm test
```

- [ ] **Step 5: Check the skills are discovered**

Run: `ls .claude/skills/*/SKILL.md`
Expected: both files are listed. Validate the frontmatter YAML: `npx tsx -e "import m from 'gray-matter';import fs from 'node:fs';for (const f of ['add-recipe','update-recipe']) console.log(m(fs.readFileSync('.claude/skills/'+f+'/SKILL.md','utf8')).data.name)"`
Expected: `add-recipe` then `update-recipe`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: CLAUDE.md authoring rules and add/update recipe skills" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: GitHub repo, Actions deploy, and Pages

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `npm run validate`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
- Produces: a public repo `jo714011/personal-cookbook`, Pages source "GitHub Actions", and a live site.

- [ ] **Step 1: Workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run validate
      - run: npm test
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
      - name: Verify noindex
        run: grep -q '<meta name="robots" content="noindex, nofollow"' out/index.html
      - uses: actions/upload-pages-artifact@v4
        with:
          path: out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Commit it:

```bash
git add -A
git commit -m "ci: build and deploy to GitHub Pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Confirm with the user before publishing**

This creates a **public** repository and pushes the full history. Ask the user to confirm before running Step 3.

- [ ] **Step 3: Create the repo, enable Pages, push**

```bash
gh repo create jo714011/personal-cookbook --public --source . --remote origin --description "My personal cookbook"
gh api -X POST repos/jo714011/personal-cookbook/pages -f build_type=workflow
git push -u origin main
```

If the Pages API call fails because the repo is empty, run `git push -u origin main` first, then the `gh api` call, then `gh workflow run deploy.yml`.

- [ ] **Step 4: Watch the deploy**

```bash
gh run watch --exit-status $(gh run list -L 1 --json databaseId -q '.[0].databaseId')
```

Expected: both jobs succeed.
- If `npm ci` or the sharp-based test fails on Linux because of missing optional platform binaries, run `npm install --os=linux --cpu=x64 sharp` locally, commit the updated `package-lock.json`, and push again.
- If `next/font/google` fails to download fonts in CI, rerun the job once. If it keeps failing, report it rather than removing the fonts.

- [ ] **Step 5: Verify the live site**

```bash
curl -s https://jo714011.github.io/personal-cookbook/ | grep -o '<meta name="robots"[^>]*>'
curl -s -o /dev/null -w "%{http_code}\n" https://jo714011.github.io/personal-cookbook/recipe-images/green-chile-chicken-tacos/hero.webp
curl -s -o /dev/null -w "%{http_code}\n" https://jo714011.github.io/personal-cookbook/recipes/overnight-oats/
```

Expected: the noindex meta tag, `200`, and `200`. Then open the site in the browser and click through the home page, a recipe, search, a category, a tag, and a missing URL (the 404 page) to confirm styles and scripts load under the base path.

---

### Task 17: End-to-end acceptance with the user

**Files:** none new (real recipe content only).

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Photo flow (spec acceptance #2)**

Ask the user to drop a real photo (or several) into `inbox/` and say "add the recipe from the inbox". Run the `add-recipe` skill end to end: preview, approval, image processing, validation, commit, push, deploy, live URL, and inbox cleanup. Confirm the processed hero has no EXIF data: `npx tsx -e "import s from 'sharp';s('content/recipes/<slug>/hero.webp').metadata().then(m=>console.log(m.exif===undefined))"` should print `true`.

- [ ] **Step 2: URL flow (spec acceptance #3)**

Ask the user for a recipe URL from a major site and run `add-recipe` with it. Confirm:
- ingredients match the source exactly
- instructions are reworded
- `source.type: web` with `url` is set
- the page shows the placeholder image and a "From <site>" link

- [ ] **Step 3: Update flow**

Ask the user for a quick edit, e.g. "rate it 5 and add a note: more garlic next time". Run `update-recipe` and confirm the live page reflects it.

- [ ] **Step 4: Phone check (spec acceptance #4)**

The user opens the live site on their phone and checks search (`chicken + rice + spicy`), the scaler, category and tag pages, and Surprise Me. Record any issues as follow-ups.

- [ ] **Step 5: Wrap-up**

Ask whether to delete the `sample`-tagged seed recipes now. If yes: `git rm -r content/recipes/{green-chile-chicken-tacos,spicy-chicken-fried-rice,overnight-oats,brown-butter-chocolate-chip-cookies}`, run `npm run validate`, then commit `Remove sample recipes` and push.
