import { NextRequest, NextResponse } from "next/server"
import { gateway, generateImage, generateText } from "ai"

import { auth } from "@/lib/auth"
import { XANO_DIRECT_URL, xanoKeyHeaders } from "@/lib/xano-config"

// Generates a stock-style photo of a recipe through Vercel AI Gateway and returns the PNG.
//
// The browser turns the bytes into a File and drops it into the recipe sheet's photo field,
// so the existing save path uploads it to Xano exactly like a hand-picked photo. Nothing is
// written here: staff can regenerate or discard before saving.
//
// When the recipe already exists, its saved ingredient rows are read from Xano and given to
// the model so the plate shows what the galley actually cooks rather than invented extras.
//
// Auth: AI_GATEWAY_API_KEY locally; Vercel deployments authenticate with OIDC automatically.

export const maxDuration = 120

const IMAGE_MODEL = process.env.RECIPE_IMAGE_MODEL || "bfl/flux-3-image"
const TEXT_MODEL = process.env.RECIPE_IMAGE_TEXT_MODEL || "anthropic/claude-haiku-5.5"

// The fixed look shared by every recipe photo, so the cookbook reads as one set.
const STYLE = [
  "single white ceramic plate centered",
  "pure white seamless background",
  "shot at a consistent 45-degree angle",
  "identical plate and framing every time",
  "clean modern food styling",
  "minimalism",
  "no utensils, no hands, no text, no packaging",
  "no garnish or ingredient that is not part of the dish",
  "soft diffused studio lighting, high-key lighting, shadowless look",
  "sharp focus, realistic textures",
  "commercial editorial food photography, Canon R5, 85mm lens, f/8, ISO 100",
].join(", ")

const SUBJECT_SYSTEM =
  "You write the subject line of a food photography prompt. Reply with one sentence, under 40 words, " +
  "describing exactly what sits on a single plate for the given recipe: every component named in the " +
  "recipe name, a realistic portion for one person, and how it is plated. " +
  "Components separated in the name by commas, '&', 'and', 'with' or 'w/' are separate items placed " +
  "side by side on the plate, never mixed or spread onto each other; a spread such as peanut butter " +
  "goes on bread or toast, never on eggs. " +
  "The ingredient list, when given, is what the galley cooks with: use it to decide what each component " +
  "is made of and what sides or toppings exist. Seasonings, oil, butter, batter and other ingredients " +
  "that disappear into cooking are not visible items. " +
  "Never add a food that is absent from the recipe name, notes and ingredient list. If the name is " +
  "generic and nothing else is given, show the plainest standard version with no toppings, sides, " +
  "sauces, herbs or garnish. Name real foods only. No style words, no camera words, no background " +
  "words, no preamble, no quotes."

type IngredientRow = { ingredient?: string; type?: string }

/** Ingredient names saved on the recipe, or an empty list when it has none or the call fails. */
async function fetchIngredients(cookbookId: number): Promise<string[]> {
  try {
    const res = await fetch(`${XANO_DIRECT_URL}/expedition_cookbook/${cookbookId}`, {
      headers: { "Content-Type": "application/json", ...xanoKeyHeaders() },
      cache: "no-store",
    })
    if (!res.ok) return []
    const recipe = (await res.json()) as { ingredients?: IngredientRow[] }
    const names = (recipe.ingredients ?? [])
      .map((row) => (typeof row.ingredient === "string" ? row.ingredient.trim() : ""))
      .filter(Boolean)
    return Array.from(new Set(names))
  } catch (error) {
    console.warn("Could not load recipe ingredients for photo prompt:", error)
    return []
  }
}

async function describePlate(recipeName: string, summary: string, ingredients: string[]): Promise<string> {
  const lines = [`Recipe: ${recipeName}`]
  if (summary) lines.push(`Notes: ${summary}`)
  if (ingredients.length) lines.push(`Ingredients: ${ingredients.join(", ")}`)
  const { text } = await generateText({
    model: TEXT_MODEL,
    system: SUBJECT_SYSTEM,
    prompt: lines.join("\n"),
  })
  return text.trim().replace(/^["']|["']$/g, "")
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { recipe_name?: unknown; summary?: unknown; expedition_cookbook_id?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const recipeName = typeof body.recipe_name === "string" ? body.recipe_name.trim() : ""
  const summary = typeof body.summary === "string" ? body.summary.trim().slice(0, 1500) : ""
  const cookbookId = Number(body.expedition_cookbook_id)
  if (!recipeName) {
    return NextResponse.json({ error: "recipe_name is required" }, { status: 400 })
  }

  try {
    const ingredients = Number.isInteger(cookbookId) && cookbookId > 0 ? await fetchIngredients(cookbookId) : []
    const subject = await describePlate(recipeName, summary, ingredients)
    const prompt = `Professional stock food photography of ${recipeName}: ${subject} ${STYLE}`

    const { image } = await generateImage({
      model: gateway.imageModel(IMAGE_MODEL),
      prompt,
      size: "1024x1024",
    })

    return new NextResponse(Buffer.from(image.uint8Array), {
      headers: {
        "Content-Type": image.mediaType || "image/png",
        "Cache-Control": "no-store",
        "X-Recipe-Image-Model": IMAGE_MODEL,
        // Returned so the UI can show what was asked for when a result looks off.
        "X-Recipe-Image-Subject": encodeURIComponent(subject),
      },
    })
  } catch (error) {
    console.error("Recipe image generation failed:", error)
    const message = error instanceof Error ? error.message : "Image generation failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
