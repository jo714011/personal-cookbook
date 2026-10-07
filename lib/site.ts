export const BASE_PATH = "/personal-cookbook"
export const SITE_NAME = "Personal Cookbook"
export const SITE_DESCRIPTION =
  "A living collection of recipes, cooking experiments, and meal ideas."

export function assetUrl(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`
}

export function isRemoteImage(image: string): boolean {
  return /^https:\/\//i.test(image)
}

export function recipeImageUrl(slug: string, file: string): string {
  if (isRemoteImage(file)) return file
  return assetUrl(`/recipe-images/${slug}/${file}`)
}
