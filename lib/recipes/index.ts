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
