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
