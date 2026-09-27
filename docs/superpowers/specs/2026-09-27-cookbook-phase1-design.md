# Personal Cookbook — Phase 1 Design

**Date:** 2026-09-27
**Status:** Draft for review
**Source concept:** `../Personal Cookbook Website.md` (outside the repo)

## 1. Goal

A personal, publicly hosted (but not indexed) cookbook website backed by a GitHub repo. Recipes are added and edited **conversationally through Claude Code** — the user provides photos, pasted recipes, descriptions, or ideas; Claude produces a standardized recipe file, commits, and pushes; GitHub Actions rebuilds and deploys the site. The site itself has no editing UI.

### In scope (Phase 1)

- Static site: homepage, recipe pages, all-recipes page, category and tag pages, 404
- Client-side search by name, ingredient, tag, and category (e.g. `chicken + rice + spicy`)
- Servings scaler on recipe pages
- Related recipes, "Surprise Me", featured and recently-added lists
- Mobile-first layout, light/dark mode
- Recipe schema with build-time validation
- Claude workflow: `add-recipe` and `update-recipe` project skills, CLAUDE.md rules, image processing script, inbox folder
- GitHub repo + GitHub Pages deploy via Actions
- `noindex` meta tag + `robots.txt` disallow

### Out of scope (deferred)

Grocery lists, meal planning, printable cards/PDF, nutrition, cooked-this tracking, favorites, URL import, voice input, private recipes, pantry tracking, recommendations, shared/family cookbook.

## 2. Decisions

| Decision | Choice | Reason |
|---|---|---|
| Hosting | GitHub Pages, public repo, free plan | User is fine with public; no GitHub Pro |
| Discoverability | `noindex, nofollow` meta + `robots.txt` | Keep out of search engines |
| Framework | Existing Next.js 16 + shadcn (base-ui, Tailwind 4) | Already scaffolded |
| Rendering | `output: "export"` static site, `basePath: "/personal-cookbook"` | Pages serves static files only |
| Content format | Markdown with structured YAML frontmatter, one folder per recipe | Readable on GitHub, easy for Claude to write consistently, portable |
| Validation | zod schema, enforced at validate + build time | Malformed recipes fail loudly instead of shipping |
| Search | Fuse.js over a build-time JSON index, in the browser | No server needed |
| Photo intake | Git-ignored `inbox/` folder | Pasted images aren't reliably available as files |
| Image processing | `sharp` script: rotate, ≤1600px wide, WebP ~q80, strip EXIF/GPS | Small repo, fast pages, no location leak in public repo |
| Authoring interface | Claude Code with project skills | User's stated preference |

**Site URL:** `https://jo714011.github.io/personal-cookbook/`

## 3. Content schema

### Layout

```
content/recipes/<slug>/
  index.md        # required
  hero.webp       # optional hero image
  *.webp          # optional extra images referenced from the body
inbox/            # git-ignored drop zone for raw photos
```

- `<slug>` is kebab-case, derived from the title, and **permanent once published** (it is the URL).

### Frontmatter

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | |
| `description` | string | yes | One or two sentences |
| `date` | ISO date | yes | Date added |
| `updated` | ISO date | no | Last meaningful edit |
| `image` | string | no | Filename within the recipe folder; placeholder shown if absent |
| `servings` | positive integer | yes | Base for scaling |
| `time` | `{ prep?, cook?, total? }` minutes | no | Any subset |
| `difficulty` | `easy \| medium \| hard` | yes | |
| `categories` | array of fixed enum, min 1 | yes | `breakfast, lunch, dinner, dessert, snack, side, drink, baking` |
| `tags` | array of kebab-case strings | no | Free-form: cuisines, proteins, methods (`air-fryer`, `slow-cooker`, `grilling`), `quick-meals`, `meal-prep`, `spicy`, … |
| `equipment` | array of strings | no | |
| `ingredients` | array of groups, min 1 | yes | See below |
| `rating` | integer 1–5 | no | |
| `source` | `{ type, name?, url? }` | yes | `type`: `original \| family \| cookbook \| web \| adapted` |
| `featured` | boolean | no | Default `false` |

**Ingredient groups:** `{ group?: string, items: Ingredient[] }` (min 1 item).
**Ingredient:** `{ qty?: number, unit?: string, item: string, note?: string }`.

- `qty` is a decimal in the file (`0.5`), displayed as a fraction (½). Only ingredients with `qty` are scaled.
- Ranges (e.g. "2–3 cloves") are written as `qty: 2` with `note: "2–3"`. Keep it simple.

### Body

Markdown with fixed H2 headings:

- `## Instructions` — **required**, an ordered list
- `## Notes` — optional
- `## Variations` — optional

Any other H2 fails validation. This keeps rendering predictable.

### Example

```markdown
---
title: Green Chile Chicken Tacos
description: Smoky braised chicken with roasted green chiles, weeknight-fast.
date: 2026-09-27
image: hero.webp
servings: 4
time: { prep: 15, cook: 30, total: 45 }
difficulty: easy
categories: [dinner]
tags: [mexican, spicy, quick-meals, chicken]
equipment: [dutch oven, sheet pan]
ingredients:
  - group: Chicken
    items:
      - { qty: 1.5, unit: lb, item: boneless chicken thighs }
      - { qty: 2, unit: tsp, item: cumin }
      - { item: salt, note: to taste }
  - group: To serve
    items:
      - { qty: 8, item: corn tortillas }
rating: 4
source: { type: original }
featured: false
---

## Instructions
1. Season the chicken...

## Notes
- Next time: add a chipotle for more heat.

## Variations
- Swap thighs for pulled pork shoulder.
```

## 4. Site

### Static export constraints

- `next.config.ts`: `output: "export"`, `basePath: "/personal-cookbook"`, `images: { unoptimized: true }`, `trailingSlash: true`.
- All routes are prerendered via `generateStaticParams`. Search, scaling, and Surprise Me are client components.
- Root layout sets `<meta name="robots" content="noindex, nofollow">`. `public/robots.txt` has `Disallow: /`. `public/.nojekyll` is present.
- Recipe images are copied from `content/recipes/<slug>/` into the export at build time (a prebuild step copies them to `public/recipes/<slug>/`, and that output path is git-ignored).
- Asset URLs must include the base path. Use a single helper for this. Relative image references in the markdown body (`![](step-3.webp)`) are rewritten to `/personal-cookbook/recipes/<slug>/step-3.webp` when rendering.

### Routes

| Route | Content |
|---|---|
| `/` | Search box, Surprise Me, Featured (`featured: true`; if none, top-rated, max 3), Recently Added (newest 6 by `date`), category tiles with counts |
| `/recipes/` | All recipes grid; search box, category chips, tag filter; state in URL query (`?q=`, `?category=`, `?tag=`) |
| `/recipes/[slug]/` | Recipe page |
| `/category/[category]/` | Recipes in that category (only categories with ≥1 recipe are generated) |
| `/tags/[tag]/` | Recipes with that tag |
| 404 | Friendly not-found with search box |

### Recipe page

Mobile-first order: hero image (or styled placeholder) → title, description, rating, source → time/servings/difficulty badges → ingredients with servings scaler → numbered instructions → notes → variations → equipment → related recipes.
On wide screens, ingredients sit in a sticky left column next to the instructions.

- **Servings scaler:** −/+ buttons, minimum 1. Scaled qty = `qty × current / base`, formatted as a mixed fraction snapped to common denominators (2, 3, 4, 8); fall back to one decimal place otherwise. Resets on page load.
- **Related recipes:** top 3 by score = shared tags + 2 × shared categories; ties broken by newest; excludes the recipe itself; section hidden if all scores are 0.

### Search

- Build-time index (`search-index.json`): `slug, title, description, ingredients (item names), tags, categories, image`.
- Query parsing: split on `+`, `,`, or whitespace; lowercase; drop empty terms.
- Matching: each term is searched with Fuse.js (fuzzy, threshold ~0.3) across the fields. A recipe matches only if **every** term matches (AND).
- Ranking: sum of per-term scores, with field weights title > tags/categories > ingredients > description.
- Empty query shows all recipes, newest first.

### Surprise Me

A client button that picks a random slug from the search index and navigates to it.

### Code structure

```
lib/recipes/
  schema.ts        # zod schema + types
  load.ts          # read content/, parse (gray-matter), validate, return Recipe[]
  body.ts          # split/validate H2 sections, render markdown to HTML
  format.ts        # fractions, scaling, time formatting
  related.ts       # related-recipe scoring
  search.ts        # query parsing + AND-matching over Fuse
  paths.ts         # basePath-aware asset URLs
components/recipe/
  recipe-card.tsx, recipe-grid.tsx, time-badges.tsx, rating-stars.tsx,
  ingredient-list.tsx (client), servings-scaler.tsx (client),
  search-box.tsx (client), surprise-button.tsx (client)
components/site-header.tsx, components/theme-toggle.tsx
scripts/
  validate.ts      # npm run validate
  process-image.mjs
  prebuild.ts      # copy images + write search index
```

`lib/recipes/*` are pure modules with unit tests. The loader runs only at build time.

shadcn components: Card, Badge, Button, Input, Separator (added through the shadcn CLI or MCP as needed).

### Visual direction

A warm, editorial cookbook feel: a serif display face for titles, a clean sans for body text, generous photography, cream/paper tones in light mode and a warm charcoal in dark mode. Not the default shadcn neutral. Details get refined during implementation.

## 5. Claude authoring workflow

### Files

- `.claude/skills/add-recipe/SKILL.md`
- `.claude/skills/update-recipe/SKILL.md`
- `CLAUDE.md`: points to the schema and skills and states the rules below so they apply even without invoking a skill. It keeps the existing `AGENTS.md` Next.js note.
- `scripts/process-image.mjs <input> <output.webp>`: auto-rotate, resize to ≤1600px wide (no upscaling), WebP q80, strip all metadata including GPS.
- `npm run validate`: loads and validates all recipes; non-zero exit and a clear per-file error on failure.

### Add flow

1. **Gather:** read all files in `inbox/` plus the user's text. Multiple inputs combine into one recipe unless the user says otherwise.
2. **Extract/develop:** transcribe, reconstruct, or develop the recipe.
3. **Clarify:** if something important is missing (servings, key quantities, oven temperature/time), ask in **one batch** of questions. Minor gaps are filled with sensible estimates and **flagged as estimates in Notes**. Family and cookbook transcriptions are never silently altered; suggested changes go under Variations.
4. **Preview:** show the title, slug, categories/tags, ingredients, a condensed version of the steps, and the chosen hero photo. Wait for approval.
5. **Write:** process the hero image (and any extras), write `index.md`, run `npm run validate`.
6. **Publish:** commit `Add recipe: <Title>`, push to `main`, watch the deploy with `gh run watch`, report the live URL.
7. **Clean up:** delete the used files from `inbox/`.

### Update flow

Locate the recipe (fuzzy match; ask if ambiguous) → apply the change and set `updated` → show the diff → validate → commit `Update recipe: <Title> — <summary>` → push → report.

### Images

- HEIC may not decode with prebuilt `sharp` on Windows. On failure, try an alternate conversion; otherwise ask the user to re-export as JPEG. Recommend the phone's "Most Compatible" camera setting.
- Raw inbox photos are never committed (`inbox/` is git-ignored except for a `.gitkeep`).

## 6. Repo & deploy

- Create the public repo `jo714011/personal-cookbook` from the existing `personal-cookbook/` folder with `gh repo create`. Rename the branch `master` → `main`.
- Git identity (`user.name` / `user.email`) must be set before the first commit. The email is visible publicly.
- The concept doc stays outside the repo.
- `.github/workflows/deploy.yml`: on push to `main` (and manual dispatch): checkout → setup Node 24 with npm cache → `npm ci` → `npm run validate` → `npm test` → `npm run build` → `actions/upload-pages-artifact` (`out/`) → `actions/deploy-pages`.
- Pages source set to "GitHub Actions" with `gh api`.

## 7. Testing

- **Vitest unit tests:** schema (valid and invalid fixtures, including a bad category, a missing Instructions section, and an unknown H2), fraction formatting and scaling, query parsing and AND-matching (including a fuzzy typo case), related-recipe ranking, and basePath URL helper.
- **Build:** `npm run build` succeeds with the seed recipes; an invalid fixture makes `validate` fail.
- **Manual:** the dev server plus a browser check of the home, recipe, all-recipes/search, category, tag and 404 pages, the scaler, Surprise Me, dark mode, and a mobile viewport. After deploy, confirm the live site loads with correct asset paths and the noindex tag.

## 8. Seed content

3–4 sample recipes that cover: with and without a hero image, multiple ingredient groups, an unscaled ingredient ("salt to taste"), several categories, and overlapping tags (so related recipes show). They can be deleted once real recipes exist.

## 9. Acceptance criteria

1. The site is live at `https://jo714011.github.io/personal-cookbook/` with the noindex meta tag and robots.txt.
2. The user drops a photo into `inbox/`, asks Claude to add it, approves the preview, and the recipe appears on the live site after deploy.
3. Search (including multi-term ingredient queries), the servings scaler, the category/tag pages and Surprise Me all work on a phone.
4. `npm run validate`, `npm test` and `npm run build` all pass, both locally and in CI.
