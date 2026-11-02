"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { UtensilsCrossed } from "lucide-react"
import { cn, getPhotoUrl } from "@/lib/utils"

interface RecipeThumbProps {
  /** The cookbook `recipe_photo` value (Xano image object or URL). */
  photo: any
  name?: string
  /** Displayed size in CSS px (square). Also the size requested from the image optimizer. */
  size?: number
  /** Let `className` size the element instead of `size` (which then only sets the request size). */
  fill?: boolean
  className?: string
  /** Load eagerly (above the fold, e.g. a recipe page's hero photo). */
  priority?: boolean
}

/**
 * A recipe photo at thumbnail size. Recipe photos are ~1 MB PNGs in Xano's file vault; this
 * renders them through Vercel's image optimizer (see `images` in next.config.mjs), which
 * resizes to `size` and serves WebP/AVIF. If the optimizer can't fetch the file it falls
 * back to the original, and to a placeholder when there is no photo at all.
 */
export function RecipeThumb({ photo, name, size = 48, fill = false, className, priority }: RecipeThumbProps) {
  const original = getPhotoUrl(photo)
  // 0 = optimized, 1 = original file, 2 = placeholder
  const [stage, setStage] = useState<0 | 1 | 2>(0)
  useEffect(() => {
    setStage(0)
  }, [original])

  const style = fill ? undefined : { width: size, height: size }

  if (!original || stage === 2) {
    return (
      <div
        aria-hidden
        className={cn("flex shrink-0 items-center justify-center bg-gray-100 text-gray-300", className)}
        style={style}
      >
        <UtensilsCrossed style={{ width: Math.max(12, size * 0.4), height: Math.max(12, size * 0.4) }} />
      </div>
    )
  }

  return (
    <Image
      src={original}
      alt={name || ""}
      width={size}
      height={size}
      sizes={`${size}px`}
      quality={70}
      priority={priority}
      unoptimized={stage === 1}
      onError={() => setStage((s) => (s === 0 ? 1 : 2))}
      className={cn("shrink-0 object-cover bg-gray-100", className)}
      style={style}
    />
  )
}
