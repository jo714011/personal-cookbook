import Link from "next/link"
import { SearchBox } from "@/components/recipe/search-box"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
        404
      </p>
      <h1 className="mt-3 font-heading text-4xl font-semibold">
        This page isn’t on the menu
      </h1>
      <p className="mt-3 text-muted-foreground">
        Try searching for what you were after.
      </p>
      <SearchBox className="mt-8" />
      <Link
        href="/"
        className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
      >
        ← Back home
      </Link>
    </div>
  )
}
