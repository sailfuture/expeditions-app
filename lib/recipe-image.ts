// Resized recipe photos.
//
// Recipe photos live in Xano's file vault as ~1 MB, 1024 px PNGs, and Xano has no resize
// option on its file URLs. Cloudinary's "fetch" delivery pulls the original once, then serves a
// resized, auto-format (WebP/AVIF), auto-quality copy from its CDN: a 48 px thumbnail comes
// out around 1-2 KB instead of 1 MB.
//
// Fetch delivery has to be enabled on the Cloudinary account (Settings → Security →
// "Restricted media types": leave "Fetched URL" unchecked). While it is restricted the fetch
// URL 404s, and <RecipeThumb> falls back to the original file, so nothing breaks either way.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dbhwzxw0k"

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/

/**
 * A Cloudinary URL for `src` cropped to fill `width` × `height` CSS pixels at 2× density.
 * Pass the size you will display; the helper requests double for retina screens.
 */
export function optimizedImageUrl(src: string, width: number, height: number = width): string {
  const transform = ["c_fill", `w_${Math.round(width * 2)}`, `h_${Math.round(height * 2)}`, "f_auto", "q_auto"].join(",")
  const uploaded = src.match(CLOUDINARY_UPLOAD)
  if (uploaded) return `${uploaded[1]}${transform}/${uploaded[2]}`
  if (!CLOUD_NAME) return src
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transform}/${encodeURIComponent(src)}`
}

// Asks the server to generate a stock-style plate photo (app/api/generate-recipe-image) and
// returns it as a File, so it flows through the same upload path as a chosen photo.
export async function generateRecipeImage(recipeName: string, summary: string, cookbookId?: number): Promise<File> {
  const response = await fetch("/api/generate-recipe-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // The id lets the server read the recipe's saved ingredients, so the plate shows real components.
    body: JSON.stringify({ recipe_name: recipeName, summary, expedition_cookbook_id: cookbookId ?? null }),
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(detail?.error || "Failed to generate image")
  }
  const blob = await response.blob()
  const ext = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png"
  const base = recipeName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "recipe"
  return new File([blob], `${base}.${ext}`, { type: blob.type || "image/png" })
}
