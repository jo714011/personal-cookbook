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
