import { CATEGORIES, type Category } from "./categories"
import type { RecipeSummary } from "./summary"

const newestFirst = (a: RecipeSummary, b: RecipeSummary) =>
  b.date.localeCompare(a.date)

export function featuredRecipes(
  items: RecipeSummary[],
  limit = 3
): RecipeSummary[] {
  const featured = items.filter((r) => r.featured)
  if (featured.length) return featured.slice(0, limit)
  return items
    .filter((r) => r.rating !== undefined)
    .sort((a, b) => b.rating! - a.rating! || newestFirst(a, b))
    .slice(0, limit)
}

export function recentRecipes(
  items: RecipeSummary[],
  limit = 6
): RecipeSummary[] {
  return [...items].sort(newestFirst).slice(0, limit)
}

export function categoryCounts(
  items: RecipeSummary[]
): { category: Category; count: number }[] {
  return CATEGORIES.map((category) => ({
    category,
    count: items.filter((r) => r.categories.includes(category)).length,
  })).filter((c) => c.count > 0)
}

export function tagCounts(
  items: RecipeSummary[]
): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const r of items)
    for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}
