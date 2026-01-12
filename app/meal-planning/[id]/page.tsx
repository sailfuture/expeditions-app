"use client"

import { useMemo } from "react"
import useSWR from "swr"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Clock, Wrench } from "lucide-react"

const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y"

const getIngredientTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    "Protein": "bg-red-500",
    "Starch": "bg-yellow-500",
    "Veg": "bg-green-500",
    "Dry Goods": "bg-amber-700",
    "Seasoning": "bg-gray-500",
    "Frozen": "bg-blue-500",
    "Dairy": "bg-purple-500",
  }
  return colorMap[type] || "bg-gray-400"
}

interface Instruction {
  id: number
  created_at: number
  expedition_cookbook_id: number
  step: number
  instructions: string
  duration: string
  equipment: string
}

interface Ingredient {
  id: number
  created_at: number
  expedition_cookbook_id: number
  ingredient: string
  oz_per_meal: number
  type: string
  prep_notes: string
}

interface Recipe {
  id: number
  created_at: number
  recipe_name: string
  recipe_photo: string
  type: string
  summary?: string
  duration_minutes?: string
  equipment_required?: string
  instructions?: Instruction[]
  ingredients?: Ingredient[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function RecipeDetailPage() {
  const params = useParams()
  const recipeId = params.id as string

  const { data: recipe, isLoading } = useSWR<Recipe>(
    recipeId ? `${XANO_BASE_URL}/expedition_cookbook/${recipeId}` : null,
    fetcher
  )

  // Group ingredients by type
  const groupedIngredients = useMemo(() => {
    if (!recipe?.ingredients) return {}
    
    const groups: Record<string, Ingredient[]> = {}
    
    recipe.ingredients.forEach((ingredient) => {
      const type = ingredient.type || "Other"
      if (!groups[type]) {
        groups[type] = []
      }
      groups[type].push(ingredient)
    })
    
    // Sort each group alphabetically
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.ingredient.localeCompare(b.ingredient))
    })
    
    return groups
  }, [recipe?.ingredients])

  // Define a consistent order for ingredient types
  const typeOrder = ["Protein", "Starch", "Veg", "Dairy", "Frozen", "Dry Goods", "Seasoning", "Other"]
  
  const sortedTypes = useMemo(() => {
    const types = Object.keys(groupedIngredients)
    return types.sort((a, b) => {
      const aIndex = typeOrder.indexOf(a)
      const bIndex = typeOrder.indexOf(b)
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }, [groupedIngredients])

  // Sort instructions by step
  const sortedInstructions = useMemo(() => {
    if (!recipe?.instructions) return []
    return [...recipe.instructions].sort((a, b) => a.step - b.step)
  }, [recipe?.instructions])

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-4 sm:mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/meal-planning">Meal Planning</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{recipe?.recipe_name || "Recipe"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {isLoading ? (
        <div className="space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <Skeleton className="w-full sm:w-48 h-48 rounded-xl shrink-0" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-16 w-full max-w-xl" />
              <div className="flex gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
          </div>
          
          {/* Instructions Skeleton */}
          <div>
            <Skeleton className="h-7 w-32 mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-3 w-16 mb-2" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex gap-4 mt-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ingredients Skeleton */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="h-10 px-4 sm:px-6"><Skeleton className="h-4 w-24" /></TableHead>
                  <TableHead className="h-10 px-4 sm:px-6"><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 hidden sm:table-cell"><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead className="h-10 px-4 sm:px-6"><Skeleton className="h-4 w-20" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6 hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : recipe ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Recipe Header */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {recipe.recipe_photo ? (
              <div className="w-full sm:w-48 h-48 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                <Image
                  src={recipe.recipe_photo}
                  alt={recipe.recipe_name}
                  width={192}
                  height={192}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div className="w-full sm:w-48 h-48 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                No image
              </div>
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{recipe.recipe_name}</h1>
                <span className="text-xs sm:text-sm text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">{recipe.type}</span>
              </div>
              
              {recipe.summary && (
                <p className="text-sm sm:text-base text-gray-600 mt-3 max-w-2xl">{recipe.summary}</p>
              )}
              
              <div className="flex flex-wrap gap-3 sm:gap-4 mt-4">
                {recipe.duration_minutes && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{recipe.duration_minutes}</span>
                  </div>
                )}
                {recipe.equipment_required && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Wrench className="h-4 w-4 text-gray-400" />
                    <span className="line-clamp-2 sm:line-clamp-none">{recipe.equipment_required}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          {sortedInstructions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h2>
              <div className="space-y-4">
                {sortedInstructions.map((instruction) => (
                  <div
                    key={instruction.id}
                    className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
                  >
                    {/* Step Label */}
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Step {instruction.step}
                    </div>
                    
                    {/* Content */}
                    <div>
                      <p className="text-gray-900 leading-relaxed mb-3">
                        {instruction.instructions}
                      </p>
                      
                      {/* Meta information */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        {instruction.duration && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{instruction.duration} min</span>
                          </div>
                        )}
                        {instruction.equipment && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Wrench className="h-4 w-4 text-gray-400" />
                            <span className="break-words">{instruction.equipment}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients Table */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ingredients</h2>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600">Ingredient</TableHead>
                      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[100px] sm:w-[120px]">Oz/Meal</TableHead>
                      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden sm:table-cell w-[120px]">Type</TableHead>
                      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600">Prep Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTypes.map((type) => (
                      <>
                        {/* Type header row */}
                        <TableRow key={`header-${type}`} className="bg-gray-50/50">
                          <TableCell colSpan={4} className="py-2 px-4 sm:px-6">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              {type}
                            </span>
                          </TableCell>
                        </TableRow>
                        {/* Ingredient rows for this type */}
                        {groupedIngredients[type].map((ingredient) => (
                          <TableRow key={ingredient.id}>
                            <TableCell className="h-12 px-4 sm:px-6">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${getIngredientTypeColor(ingredient.type)} shrink-0`} />
                                <span className="font-medium text-gray-900 text-sm">{ingredient.ingredient}</span>
                              </div>
                            </TableCell>
                            <TableCell className="h-12 px-4 sm:px-6">
                              <span className="text-sm text-gray-600">{ingredient.oz_per_meal}</span>
                            </TableCell>
                            <TableCell className="h-12 px-4 sm:px-6 hidden sm:table-cell">
                              <span className="text-sm text-gray-600">{ingredient.type}</span>
                            </TableCell>
                            <TableCell className="h-12 px-4 sm:px-6">
                              <span className="text-sm text-gray-500">
                                {ingredient.prep_notes || "—"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            </div>
          )}

          {/* Empty state for ingredients */}
          {(!recipe.ingredients || recipe.ingredients.length === 0) && (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
              No ingredients found for this recipe.
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Recipe not found.</p>
          <Link href="/meal-planning" className="text-sm text-blue-600 hover:underline mt-4 inline-block">
            Return to Meal Planning
          </Link>
        </div>
      )}
    </main>
  )
}
