import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function RatingStars({
  rating,
  className,
}: {
  rating: number
  className?: string
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(
            "size-4",
            n <= rating
              ? "fill-primary text-primary"
              : "text-muted-foreground/40"
          )}
        />
      ))}
    </span>
  )
}
