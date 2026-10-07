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
image: hero.webp               # optional; file in the same folder, or an https:// URL
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
- Local images: always go through `npm run image -- <input> content/recipes/<slug>/<name>.webp` (resizes and strips GPS/EXIF). Never commit raw photos. `inbox/` is git-ignored.
- Remote images: when the user supplies an image link, set `image:` to that `https://` URL instead of downloading it (no file in the folder). Never download or commit a site's photos on your own; only use a remote image when the user gives the link.
- Content from other sites (URL imports, cookbooks): copy ingredients and quantities exactly, but **rewrite instructions and the description in your own words** (same steps, temperatures, and times). Don't download or commit the site's photos (see Remote images above).
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
