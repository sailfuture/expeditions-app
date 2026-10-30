"use client"

import { useEffect, useState } from "react"
import { UtensilsCrossed } from "lucide-react"
import { cn, getPhotoUrl } from "@/lib/utils"
import { optimizedImageUrl } from "@/lib/recipe-image"

interface RecipeThumbProps {
  /** The cookbook `recipe_photo` value (Xano image object or URL). */
  photo: any
  name?: string
  /** Displayed size in CSS px (square). Also the size requested from Cloudinary, at 2×. */
  size?: number
  /** Let `className` size the element instead of `size` (which then only sets the request size). */
  fill?: boolean
  className?: string
}

/**
 * A recipe photo at thumbnail size. Loads the Cloudinary-resized copy first, falls back to the
 * original file if that fails, and to a placeholder when there is no photo at all.
 */
export function RecipeThumb({ photo, name, size = 48, fill = false, className }: RecipeThumbProps) {
  const original = getPhotoUrl(photo)
  // 0 = optimized URL, 1 = original file, 2 = placeholder
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
    <img
      src={stage === 0 ? optimizedImageUrl(original, size) : original}
      alt={name || ""}
      loading="lazy"
      decoding="async"
      onError={() => setStage((s) => (s === 0 ? 1 : 2))}
      className={cn("shrink-0 object-cover bg-gray-100", className)}
      style={style}
    />
  )
}
