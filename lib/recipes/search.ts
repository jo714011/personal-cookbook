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

export function searchRecipes(
  items: RecipeSummary[],
  query: string
): RecipeSummary[] {
  const terms = parseQuery(query)
  if (terms.length === 0) return items

  // Short terms fuzzy-match too eagerly ("rice" ≈ "dice"), so fuzziness grows with length
  const fuses = new Map<number, Fuse<RecipeSummary>>()
  const fuseFor = (threshold: number) => {
    if (!fuses.has(threshold)) {
      fuses.set(
        threshold,
        new Fuse(items, {
          keys: KEYS,
          includeScore: true,
          threshold,
          ignoreLocation: true,
          minMatchCharLength: 2,
        })
      )
    }
    return fuses.get(threshold)!
  }

  let totals: Map<string, number> | undefined
  for (const term of terms) {
    // Fuse scores ≈ errors / term length: 0.25 allows one typo in 4+ letters, not two in 7
    const threshold = term.length <= 4 ? 0 : 0.25
    const scores = new Map(
      fuseFor(threshold)
        .search(term)
        .map((r) => [r.item.slug, 1 - (r.score ?? 1)])
    )
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
  return [...totals!]
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => bySlug.get(slug)!)
}

export function filterRecipes(
  items: RecipeSummary[],
  filters: { category?: string; tag?: string }
): RecipeSummary[] {
  return items.filter(
    (r) =>
      (!filters.category ||
        (r.categories as string[]).includes(filters.category)) &&
      (!filters.tag || r.tags.includes(filters.tag))
  )
}
