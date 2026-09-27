export type ExtractedRecipe = {
  name: string
  description?: string
  ingredients: string[]
  instructions: { section?: string; steps: string[] }[]
  yield?: string
  prepMinutes?: number
  cookMinutes?: number
  totalMinutes?: number
  categories: string[]
  cuisines: string[]
  keywords: string[]
  image?: string
  author?: string
  url?: string
}

type Json = Record<string, unknown>

const LD_JSON =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
}

function clean(value: unknown): string {
  if (typeof value !== "string") return ""
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (match, code: string) => {
      if (ENTITIES[code]) return ENTITIES[code]
      if (code.startsWith("#x"))
        return String.fromCodePoint(parseInt(code.slice(2), 16))
      if (code.startsWith("#"))
        return String.fromCodePoint(parseInt(code.slice(1), 10))
      return match
    })
    .replace(/\s+/g, " ")
    .trim()
}

function list(value: unknown): unknown[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function strings(value: unknown, splitCommas = false): string[] {
  return list(value)
    .flatMap((v) => (splitCommas && typeof v === "string" ? v.split(",") : [v]))
    .map(clean)
    .filter(Boolean)
}

function isRecipe(node: Json): boolean {
  return list(node["@type"]).includes("Recipe")
}

function findRecipe(node: unknown): Json | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item)
      if (found) return found
    }
    return null
  }
  if (!node || typeof node !== "object") return null
  const obj = node as Json
  if (isRecipe(obj)) return obj
  return findRecipe(obj["@graph"]) ?? findRecipe(obj["mainEntity"])
}

function stepText(step: unknown): string {
  if (typeof step === "string") return clean(step)
  const s = step as Json
  return clean(s.text) || clean(s.name)
}

function instructions(value: unknown): ExtractedRecipe["instructions"] {
  if (typeof value === "string") {
    const steps = value.split(/\r?\n/).map(clean).filter(Boolean)
    return steps.length ? [{ steps }] : []
  }
  const result: ExtractedRecipe["instructions"] = []
  let loose: string[] = []
  for (const item of list(value)) {
    const obj = item as Json
    if (
      obj &&
      typeof obj === "object" &&
      list(obj["@type"]).includes("HowToSection")
    ) {
      if (loose.length) result.push({ steps: loose })
      loose = []
      result.push({
        section: clean(obj.name) || undefined,
        steps: list(obj.itemListElement).map(stepText).filter(Boolean),
      })
    } else {
      const text = stepText(item)
      if (text) loose.push(text)
    }
  }
  if (loose.length) result.push({ steps: loose })
  return result
}

function firstUrl(value: unknown): string | undefined {
  for (const v of list(value)) {
    if (typeof v === "string") return v
    if (v && typeof v === "object" && typeof (v as Json).url === "string")
      return (v as Json).url as string
  }
  return undefined
}

function firstName(value: unknown): string | undefined {
  for (const v of list(value)) {
    const name = typeof v === "string" ? clean(v) : clean((v as Json)?.name)
    if (name) return name
  }
  return undefined
}

export function parseIsoDuration(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined
  const m = value.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i
  )
  if (!m || value.length < 3) return undefined
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0))
  const total = d * 1440 + h * 60 + min + s / 60
  return Math.round(total)
}

export function extractRecipe(
  html: string,
  pageUrl?: string
): ExtractedRecipe | null {
  for (const match of html.matchAll(LD_JSON)) {
    let data: unknown
    try {
      data = JSON.parse(match[1].trim())
    } catch {
      continue
    }
    const recipe = findRecipe(data)
    if (!recipe) continue

    const yieldValue = list(recipe.recipeYield)[0]
    return {
      name: clean(recipe.name),
      description: clean(recipe.description) || undefined,
      ingredients: strings(recipe.recipeIngredient),
      instructions: instructions(recipe.recipeInstructions),
      yield:
        yieldValue !== undefined
          ? clean(String(yieldValue)) || undefined
          : undefined,
      prepMinutes: parseIsoDuration(recipe.prepTime),
      cookMinutes: parseIsoDuration(recipe.cookTime),
      totalMinutes: parseIsoDuration(recipe.totalTime),
      categories: strings(recipe.recipeCategory, true),
      cuisines: strings(recipe.recipeCuisine, true),
      keywords: strings(recipe.keywords, true),
      image: firstUrl(recipe.image),
      author: firstName(recipe.author),
      url: (typeof recipe.url === "string" && recipe.url) || pageUrl,
    }
  }
  return null
}
