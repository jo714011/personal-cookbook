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
