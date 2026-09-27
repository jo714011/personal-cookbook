import Image from "next/image"
import { UtensilsCrossed } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  src?: string
  alt: string
  priority?: boolean
  className?: string
  sizes?: string
}

export function RecipeImage({
  src,
  alt,
  priority,
  className,
  sizes = "100vw",
}: Props) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,var(--accent),var(--muted))]">
          <UtensilsCrossed
            className="size-10 text-muted-foreground/50"
            aria-hidden
          />
        </div>
      )}
    </div>
  )
}
