type Relatable = {
  slug: string
  tags: string[]
  categories: string[]
  date: string
}

export function relatedRecipes<T extends Relatable>(
  target: T,
  all: T[],
  limit = 3
): T[] {
  return all
    .filter((r) => r.slug !== target.slug)
    .map((r) => ({
      r,
      score:
        r.tags.filter((t) => target.tags.includes(t)).length +
        2 * r.categories.filter((c) => target.categories.includes(c)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.r.date.localeCompare(a.r.date))
    .slice(0, limit)
    .map((x) => x.r)
}
