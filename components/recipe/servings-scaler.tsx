"use client"

import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = { value: number; base: number; onChange: (n: number) => void }

export function ServingsScaler({ value, base, onChange }: Props) {
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Adjust servings"
    >
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Fewer servings"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus />
      </Button>
      <span
        className="min-w-20 text-center text-sm font-medium tabular-nums"
        aria-live="polite"
      >
        {value} {value === 1 ? "serving" : "servings"}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="More servings"
        onClick={() => onChange(value + 1)}
      >
        <Plus />
      </Button>
      {value !== base && (
        <Button variant="link" size="sm" onClick={() => onChange(base)}>
          Reset
        </Button>
      )}
    </div>
  )
}
