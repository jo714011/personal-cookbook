import Link from "next/link"
import { ChefHat } from "lucide-react"
import { SurpriseButton } from "@/components/recipe/surprise-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { getAllRecipes } from "@/lib/recipes"
import { SITE_NAME } from "@/lib/site"

export function SiteHeader() {
  const slugs = getAllRecipes().map((r) => r.slug)
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link
          href="/"
          className="mr-auto flex items-center gap-2 font-heading text-lg font-semibold"
        >
          <ChefHat className="size-5 text-primary" aria-hidden />
          {SITE_NAME}
        </Link>
        <Link
          href="/recipes/"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Recipes
        </Link>
        <SurpriseButton
          slugs={slugs}
          variant="ghost"
          size="sm"
          label="Surprise"
        />
        <ThemeToggle />
      </div>
    </header>
  )
}
