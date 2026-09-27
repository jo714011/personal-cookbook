"use client"

import { useState } from "react"
import { formatIngredientAmount } from "@/lib/recipes/format"
import type { IngredientGroup } from "@/lib/recipes/schema"
import { ServingsScaler } from "./servings-scaler"

export function IngredientList({
  groups,
  baseServings,
}: {
  groups: IngredientGroup[]
  baseServings: number
}) {
  const [servings, setServings] = useState(baseServings)

  return (
    <section
      aria-labelledby="ingredients-heading"
      className="rounded-2xl border bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="ingredients-heading"
          className="font-heading text-2xl font-semibold"
        >
          Ingredients
        </h2>
        <ServingsScaler
          value={servings}
          base={baseServings}
          onChange={setServings}
        />
      </div>
      {groups.map((group, i) => (
        <div key={i} className="mt-5">
          {group.group && (
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {group.group}
            </h3>
          )}
          <ul className="divide-y">
            {group.items.map((ing, j) => {
              const amount = formatIngredientAmount(ing, servings, baseServings)
              return (
                <li key={j} className="flex gap-3 py-2 text-sm">
                  <span className="w-20 shrink-0 font-semibold text-primary tabular-nums">
                    {amount}
                  </span>
                  <span>
                    {ing.item}
                    {ing.note && (
                      <span className="text-muted-foreground">
                        , {ing.note}
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </section>
  )
}
