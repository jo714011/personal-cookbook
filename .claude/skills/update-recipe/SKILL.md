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
