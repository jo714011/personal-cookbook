"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Props = { className?: string; defaultValue?: string; autoFocus?: boolean }

export function SearchBox({ className, defaultValue = "", autoFocus }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault()
        const q = value.trim()
        router.push(q ? `/recipes/?q=${encodeURIComponent(q)}` : "/recipes/")
      }}
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search recipes or ingredients…"
        aria-label="Search recipes"
        autoFocus={autoFocus}
        className="h-11 bg-card pl-9"
      />
    </form>
  )
}
