import { Clock, Gauge, Users } from "lucide-react"
import { formatMinutes } from "@/lib/recipes/format"

type Props = {
  time?: { prep?: number; cook?: number; total?: number }
  servings?: number
  difficulty?: string
}

export function RecipeMeta({ time, servings, difficulty }: Props) {
  const items: { icon: typeof Clock; label: string; value: string }[] = []
  if (time?.prep !== undefined)
    items.push({ icon: Clock, label: "Prep", value: formatMinutes(time.prep) })
  if (time?.cook !== undefined)
    items.push({ icon: Clock, label: "Cook", value: formatMinutes(time.cook) })
  if (time?.total !== undefined)
    items.push({
      icon: Clock,
      label: "Total",
      value: formatMinutes(time.total),
    })
  if (servings !== undefined)
    items.push({ icon: Users, label: "Serves", value: String(servings) })
  if (difficulty)
    items.push({ icon: Gauge, label: "Difficulty", value: difficulty })
  if (!items.length) return null

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-3">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className="size-4 text-primary" aria-hidden />
          <dt className="text-xs tracking-wide text-muted-foreground uppercase">
            {label}
          </dt>
          <dd className="text-sm font-medium capitalize">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
