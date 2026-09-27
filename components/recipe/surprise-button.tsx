"use client"

import { Shuffle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type Props = {
  slugs: string[]
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
  label?: string
}

export function SurpriseButton({
  slugs,
  variant = "outline",
  size = "default",
  className,
  label = "Surprise me",
}: Props) {
  const router = useRouter()
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={slugs.length === 0}
      onClick={() => {
        const slug = slugs[Math.floor(Math.random() * slugs.length)]
        router.push(`/recipes/${slug}/`)
      }}
    >
      <Shuffle aria-hidden />
      {label}
    </Button>
  )
}
