import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { parseBody, type RecipeSections } from "./body"
import {
  formatIssues,
  recipeFrontmatterSchema,
  type RecipeFrontmatter,
} from "./schema"

export type Recipe = RecipeFrontmatter & {
  slug: string
  sections: RecipeSections
}

export class RecipeLoadError extends Error {
  constructor(public problems: string[]) {
    super(`Invalid recipes:\n${problems.map((p) => `  - ${p}`).join("\n")}`)
    this.name = "RecipeLoadError"
  }
}

export const RECIPES_DIR = path.join(process.cwd(), "content", "recipes")

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function loadRecipes(dir: string = RECIPES_DIR): Recipe[] {
  if (!fs.existsSync(dir)) return []

  const problems: string[] = []
  const recipes: Recipe[] = []

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const slug = entry.name
    const where = `${slug}/index.md`

    if (!SLUG.test(slug)) {
      problems.push(`${slug}: folder name must be kebab-case`)
      continue
    }

    const file = path.join(dir, slug, "index.md")
    if (!fs.existsSync(file)) {
      problems.push(`${where}: file is missing`)
      continue
    }

    let parsed: matter.GrayMatterFile<string>
    try {
      parsed = matter(fs.readFileSync(file, "utf8"))
    } catch (e) {
      problems.push(`${where}: YAML error: ${(e as Error).message}`)
      continue
    }

    const frontmatter = recipeFrontmatterSchema.safeParse(parsed.data)
    const body = parseBody(parsed.content)

    if (!frontmatter.success) {
      problems.push(
        ...formatIssues(frontmatter.error).map((m) => `${where}: ${m}`)
      )
    }
    if (!body.ok) {
      problems.push(...body.errors.map((m) => `${where}: ${m}`))
    }
    if (frontmatter.success && frontmatter.data.image) {
      if (!fs.existsSync(path.join(dir, slug, frontmatter.data.image))) {
        problems.push(
          `${where}: image "${frontmatter.data.image}" not found in recipe folder`
        )
      }
    }
    if (frontmatter.success && body.ok) {
      recipes.push({ ...frontmatter.data, slug, sections: body.sections })
    }
  }

  if (problems.length) throw new RecipeLoadError(problems)

  return recipes.sort(
    (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title)
  )
}
