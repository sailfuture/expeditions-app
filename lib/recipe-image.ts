// Recipe photos: generation (here) and display (components/recipe-thumb.tsx, which renders
// them through Vercel's image optimizer so the ~1 MB vault PNGs arrive as small WebP/AVIF).

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
