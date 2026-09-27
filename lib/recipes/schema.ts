import { z } from "zod"
import { CATEGORIES } from "./categories"

const isoDate = z.union([z.string(), z.date()]).transform((value, ctx) => {
  const s =
    value instanceof Date ? value.toISOString().slice(0, 10) : value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) {
    ctx.addIssue({
      code: "custom",
      message: "must be a date in YYYY-MM-DD format",
    })
    return z.NEVER
  }
  return s
})

const kebab = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case")
const minutes = z.number().int().nonnegative()

const ingredientSchema = z
  .object({
    qty: z.number().positive().optional(),
    unit: z.string().min(1).optional(),
    item: z.string().min(1),
    note: z.string().min(1).optional(),
  })
  .strict()

const ingredientGroupSchema = z
  .object({
    group: z.string().min(1).optional(),
    items: z.array(ingredientSchema).min(1),
  })
  .strict()

const sourceSchema = z
  .object({
    type: z.enum(["original", "family", "cookbook", "web", "adapted"]),
    name: z.string().min(1).optional(),
    url: z.url().optional(),
  })
  .strict()

export const recipeFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: isoDate,
    updated: isoDate.optional(),
    image: z
      .string()
      .regex(
        /^[\w-]+\.(webp|jpe?g|png)$/i,
        "must be a filename in the recipe folder"
      )
      .optional(),
    servings: z.number().int().positive(),
    time: z
      .object({
        prep: minutes.optional(),
        cook: minutes.optional(),
        total: minutes.optional(),
      })
      .strict()
      .optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    categories: z.array(z.enum(CATEGORIES)).min(1),
    tags: z.array(kebab).default([]),
    equipment: z.array(z.string().min(1)).default([]),
    ingredients: z.array(ingredientGroupSchema).min(1),
    rating: z.number().int().min(1).max(5).optional(),
    source: sourceSchema,
    featured: z.boolean().default(false),
  })
  .strict()

export type RecipeFrontmatter = z.output<typeof recipeFrontmatterSchema>
export type Ingredient = z.output<typeof ingredientSchema>
export type IngredientGroup = z.output<typeof ingredientGroupSchema>
export type RecipeSource = z.output<typeof sourceSchema>
export type Difficulty = RecipeFrontmatter["difficulty"]

export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".")
    return path ? `${path}: ${issue.message}` : issue.message
  })
}
