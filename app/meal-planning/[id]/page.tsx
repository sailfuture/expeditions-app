"use client"

import React, { useMemo, useState } from "react"
import useSWR, { mutate } from "swr"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Clock, Wrench, Plus, Pencil, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { getPhotoUrl } from "@/lib/utils"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"

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
  expeditions_ingredient_types_id?: number
  type: string
  prep_notes: string
}

interface Recipe {
  id: number
  created_at: number
  recipe_name: string
  recipe_photo: any
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
  const { activeExpedition } = useExpeditionContext()
  const numberOfParticipants = (activeExpedition as any)?.number_participants || 0

  const { data: recipe, isLoading } = useSWR<Recipe>(
    recipeId ? `${XANO_BASE_URL}/expedition_cookbook/${recipeId}` : null,
    fetcher
  )

  // Instruction sheet state
  const [instructionSheetOpen, setInstructionSheetOpen] = useState(false)
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null)
  const [instructionForm, setInstructionForm] = useState({
    step: 1,
    instructions: "",
    duration: "",
    equipment: "",
  })
  const [isSavingInstruction, setIsSavingInstruction] = useState(false)
  const [deleteInstructionDialog, setDeleteInstructionDialog] = useState<Instruction | null>(null)
  const [isDeletingInstruction, setIsDeletingInstruction] = useState(false)

  // Ingredient sheet state
  const [ingredientSheetOpen, setIngredientSheetOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  const [ingredientForm, setIngredientForm] = useState({
    ingredient: "",
    oz_per_meal: "",
    expeditions_ingredient_types_id: 0,
    type: "",
    prep_notes: "",
  })
  const [isSavingIngredient, setIsSavingIngredient] = useState(false)
  const [deleteIngredientDialog, setDeleteIngredientDialog] = useState<Ingredient | null>(null)
  const [isDeletingIngredient, setIsDeletingIngredient] = useState(false)

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

  // --- Instruction handlers ---
  const handleAddInstruction = () => {
    const nextStep = sortedInstructions.length > 0
      ? Math.max(...sortedInstructions.map(i => i.step)) + 1
      : 1
    setEditingInstruction(null)
    setInstructionForm({
      step: nextStep,
      instructions: "",
      duration: "",
      equipment: "",
    })
    setInstructionSheetOpen(true)
  }

  const handleEditInstruction = (instruction: Instruction) => {
    setEditingInstruction(instruction)
    setInstructionForm({
      step: instruction.step,
      instructions: instruction.instructions,
      duration: instruction.duration || "",
      equipment: instruction.equipment || "",
    })
    setInstructionSheetOpen(true)
  }

  const handleSaveInstruction = async () => {
    if (!instructionForm.instructions.trim()) {
      toast.error("Instructions text is required")
      return
    }

    setIsSavingInstruction(true)
    try {
      if (editingInstruction) {
        // PATCH existing
        const response = await fetch(`${XANO_BASE_URL}/expedition_recipe_instructions/${editingInstruction.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expedition_cookbook_id: Number(recipeId),
            step: instructionForm.step,
            instructions: instructionForm.instructions,
            duration: instructionForm.duration,
            equipment: instructionForm.equipment,
          }),
        })
        if (!response.ok) throw new Error("Failed to update instruction")
        toast.success("Instruction updated")
      } else {
        // POST new
        const response = await fetch(`${XANO_BASE_URL}/expedition_recipe_instructions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expedition_cookbook_id: Number(recipeId),
            step: instructionForm.step,
            instructions: instructionForm.instructions,
            duration: instructionForm.duration,
            equipment: instructionForm.equipment,
          }),
        })
        if (!response.ok) throw new Error("Failed to add instruction")
        toast.success("Instruction added")
      }

      setInstructionSheetOpen(false)
      setEditingInstruction(null)
      mutate(`${XANO_BASE_URL}/expedition_cookbook/${recipeId}`)
    } catch (error) {
      console.error("Error saving instruction:", error)
      toast.error("Failed to save instruction")
    } finally {
      setIsSavingInstruction(false)
    }
  }

  const handleDeleteInstruction = async () => {
    if (!deleteInstructionDialog) return
    setIsDeletingInstruction(true)
    try {
      const response = await fetch(`${XANO_BASE_URL}/expedition_recipe_instructions/${deleteInstructionDialog.id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete instruction")
      toast.success("Instruction deleted")
      setDeleteInstructionDialog(null)
      mutate(`${XANO_BASE_URL}/expedition_cookbook/${recipeId}`)
    } catch (error) {
      console.error("Error deleting instruction:", error)
      toast.error("Failed to delete instruction")
    } finally {
      setIsDeletingInstruction(false)
    }
  }

  // --- Ingredient handlers ---
  const handleAddIngredient = () => {
    setEditingIngredient(null)
    setIngredientForm({
      ingredient: "",
      oz_per_meal: "",
      expeditions_ingredient_types_id: 0,
      type: "",
      prep_notes: "",
    })
    setIngredientSheetOpen(true)
  }

  const handleEditIngredient = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient)
    setIngredientForm({
      ingredient: ingredient.ingredient,
      oz_per_meal: ingredient.oz_per_meal ? String(ingredient.oz_per_meal) : "",
      expeditions_ingredient_types_id: ingredient.expeditions_ingredient_types_id || 0,
      type: ingredient.type || "",
      prep_notes: ingredient.prep_notes || "",
    })
    setIngredientSheetOpen(true)
  }

  const handleSaveIngredient = async () => {
    if (!ingredientForm.ingredient.trim()) {
      toast.error("Ingredient name is required")
      return
    }

    setIsSavingIngredient(true)
    try {
      if (editingIngredient) {
        // PATCH existing
        const response = await fetch(`${XANO_BASE_URL}/expeditions_recipes/${editingIngredient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expedition_cookbook_id: Number(recipeId),
            ingredient: ingredientForm.ingredient,
            oz_per_meal: parseFloat(ingredientForm.oz_per_meal) || 0,
            expeditions_ingredient_types_id: ingredientForm.expeditions_ingredient_types_id,
            type: ingredientForm.type,
            prep_notes: ingredientForm.prep_notes,
          }),
        })
        if (!response.ok) throw new Error("Failed to update ingredient")
        toast.success("Ingredient updated")
      } else {
        // POST new
        const response = await fetch(`${XANO_BASE_URL}/expeditions_recipes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expedition_cookbook_id: Number(recipeId),
            ingredient: ingredientForm.ingredient,
            oz_per_meal: parseFloat(ingredientForm.oz_per_meal) || 0,
            expeditions_ingredient_types_id: ingredientForm.expeditions_ingredient_types_id,
            type: ingredientForm.type,
            prep_notes: ingredientForm.prep_notes,
          }),
        })
        if (!response.ok) throw new Error("Failed to add ingredient")
        toast.success("Ingredient added")
      }

      setIngredientSheetOpen(false)
      setEditingIngredient(null)
      mutate(`${XANO_BASE_URL}/expedition_cookbook/${recipeId}`)
    } catch (error) {
      console.error("Error saving ingredient:", error)
      toast.error("Failed to save ingredient")
    } finally {
      setIsSavingIngredient(false)
    }
  }

  const handleDeleteIngredient = async () => {
    if (!deleteIngredientDialog) return
    setIsDeletingIngredient(true)
    try {
      const response = await fetch(`${XANO_BASE_URL}/expeditions_recipes/${deleteIngredientDialog.id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete ingredient")
      toast.success("Ingredient deleted")
      setDeleteIngredientDialog(null)
      mutate(`${XANO_BASE_URL}/expedition_cookbook/${recipeId}`)
    } catch (error) {
      console.error("Error deleting ingredient:", error)
      toast.error("Failed to delete ingredient")
    } finally {
      setIsDeletingIngredient(false)
    }
  }

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-4 sm:mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/meal-planning">
              Meal Planning
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
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
        </div>
      ) : recipe ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Recipe Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {getPhotoUrl(recipe.recipe_photo) ? (
              <div className="w-full sm:w-48 h-48 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                <Image
                  src={getPhotoUrl(recipe.recipe_photo)!}
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
                {recipe.duration_minutes && parseInt(recipe.duration_minutes) > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>
                      {(() => {
                        const total = parseInt(recipe.duration_minutes)
                        const h = Math.floor(total / 60)
                        const m = total % 60
                        return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
                      })()}
                    </span>
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

          {/* Ingredients Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Ingredients</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddIngredient}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Ingredient
              </Button>
            </div>

            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <div className="border rounded-lg overflow-hidden bg-white">
                <div>
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead className="h-10 px-3 sm:px-4 text-xs font-semibold text-gray-600 w-[25%]">Ingredient</TableHead>
                        <TableHead className="h-10 px-3 sm:px-4 text-xs font-semibold text-gray-600 w-[10%]">Oz/Person</TableHead>
                        <TableHead className="h-10 px-3 sm:px-4 text-xs font-semibold text-gray-600 w-[10%]">Oz/Meal</TableHead>
                        <TableHead className="h-10 px-3 sm:px-4 text-xs font-semibold text-gray-600 w-[10%]">Lb/Meal</TableHead>
                        <TableHead className="h-10 px-3 sm:px-4 text-xs font-semibold text-gray-600 hidden sm:table-cell w-[10%]">Type</TableHead>
                        <TableHead className="h-10 px-3 sm:px-4 text-xs font-semibold text-gray-600 w-[20%]">Prep Notes</TableHead>
                        <TableHead className="h-10 px-3 sm:px-4 text-xs font-semibold text-gray-600 w-[10%]">Participants</TableHead>
                        <TableHead className="h-10 px-3 sm:px-4 text-xs font-semibold text-gray-600 w-[5%]">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTypes.map((type) => (
                        <React.Fragment key={type}>
                          {/* Type header row */}
                          <TableRow className="bg-gray-50/50">
                            <TableCell colSpan={8} className="py-2 px-3 sm:px-4">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                {type}
                              </span>
                            </TableCell>
                          </TableRow>
                          {/* Ingredient rows for this type */}
                          {groupedIngredients[type].map((ingredient) => (
                            <TableRow key={ingredient.id} className="hover:bg-gray-50 transition-colors">
                              <TableCell className="h-12 px-3 sm:px-4">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-2 h-2 rounded-full ${getIngredientTypeColor(ingredient.type)} shrink-0`} />
                                  <span className="font-medium text-gray-900 text-sm truncate">{ingredient.ingredient}</span>
                                </div>
                              </TableCell>
                              <TableCell className="h-12 px-3 sm:px-4">
                                <span className="text-sm text-gray-600">{ingredient.oz_per_meal} <span className="text-xs text-gray-400">oz</span></span>
                              </TableCell>
                              <TableCell className="h-12 px-3 sm:px-4">
                                <span className="text-sm text-gray-600">
                                  {numberOfParticipants > 0
                                    ? <>{(ingredient.oz_per_meal * numberOfParticipants).toFixed(1)} <span className="text-xs text-gray-400">oz</span></>
                                    : "—"}
                                </span>
                              </TableCell>
                              <TableCell className="h-12 px-3 sm:px-4">
                                <span className="text-sm text-gray-600">
                                  {numberOfParticipants > 0
                                    ? <>{((ingredient.oz_per_meal * numberOfParticipants) / 16).toFixed(2)} <span className="text-xs text-gray-400">lb</span></>
                                    : "—"}
                                </span>
                              </TableCell>
                              <TableCell className="h-12 px-3 sm:px-4 hidden sm:table-cell">
                                <span className="text-sm text-gray-600">{ingredient.type}</span>
                              </TableCell>
                              <TableCell className="h-12 px-3 sm:px-4">
                                <span className="text-sm text-gray-500 truncate block">
                                  {ingredient.prep_notes || "—"}
                                </span>
                              </TableCell>
                              <TableCell className="h-12 px-3 sm:px-4">
                                <span className="text-sm text-gray-600">{numberOfParticipants || "—"}</span>
                              </TableCell>
                              <TableCell className="h-12 px-3 sm:px-4">
                                <button
                                  type="button"
                                  onClick={() => handleEditIngredient(ingredient)}
                                  className="h-8 w-8 rounded-md border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-8 text-center text-muted-foreground bg-white">
                No ingredients found for this recipe.
              </div>
            )}
          </div>

          {/* Instructions Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Instructions</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddInstruction}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
            </div>

            {sortedInstructions.length > 0 ? (
              <div className="space-y-4">
                {sortedInstructions.map((instruction) => (
                  <div
                    key={instruction.id}
                    className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Step Label */}
                        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Step {instruction.step}
                        </div>

                        {/* Content */}
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

                      {/* Edit / Delete buttons */}
                      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleEditInstruction(instruction)}
                          className="h-8 w-8 rounded-md border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteInstructionDialog(instruction)}
                          className="h-8 w-8 rounded-md border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-red-50 hover:border-red-300 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-lg p-8 text-center text-muted-foreground bg-white">
                No instructions found for this recipe.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Recipe not found.</p>
          <Link href="/meal-planning" className="text-sm text-blue-600 hover:underline mt-4 inline-block">
            Return to Meal Planning
          </Link>
        </div>
      )}

      {/* Instruction Add/Edit Sheet */}
      <Sheet open={instructionSheetOpen} onOpenChange={setInstructionSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle>{editingInstruction ? "Edit Instruction" : "Add Instruction"}</SheetTitle>
              <button
                type="button"
                onClick={() => setInstructionSheetOpen(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <SheetDescription>
              {editingInstruction ? "Update this instruction step" : "Add a new instruction step to this recipe"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Step Number */}
            <div className="space-y-2">
              <Label htmlFor="instruction-step" className="text-sm font-medium">Step Number</Label>
              <Input
                id="instruction-step"
                type="number"
                min={1}
                value={instructionForm.step}
                onChange={(e) => setInstructionForm({ ...instructionForm, step: parseInt(e.target.value) || 1 })}
                className="h-11"
              />
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label htmlFor="instruction-text" className="text-sm font-medium">Instructions *</Label>
              <Textarea
                id="instruction-text"
                value={instructionForm.instructions}
                onChange={(e) => setInstructionForm({ ...instructionForm, instructions: e.target.value })}
                placeholder="Describe what to do in this step..."
                rows={4}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="instruction-duration" className="text-sm font-medium">Duration</Label>
              <Input
                id="instruction-duration"
                value={instructionForm.duration}
                onChange={(e) => setInstructionForm({ ...instructionForm, duration: e.target.value })}
                placeholder="e.g., 10"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">Duration in minutes</p>
            </div>

            {/* Equipment */}
            <div className="space-y-2">
              <Label htmlFor="instruction-equipment" className="text-sm font-medium">Equipment</Label>
              <Input
                id="instruction-equipment"
                value={instructionForm.equipment}
                onChange={(e) => setInstructionForm({ ...instructionForm, equipment: e.target.value })}
                placeholder="e.g., Pot, stove, cutting board"
                className="h-11"
              />
            </div>
          </div>

          <div className="p-6 border-t shrink-0">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setInstructionSheetOpen(false)}
                className="flex-1 cursor-pointer"
                disabled={isSavingInstruction}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveInstruction}
                className="flex-1 cursor-pointer"
                disabled={isSavingInstruction || !instructionForm.instructions.trim()}
              >
                {isSavingInstruction ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : editingInstruction ? (
                  "Save Changes"
                ) : (
                  "Add Step"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Ingredient Add/Edit Sheet */}
      <Sheet open={ingredientSheetOpen} onOpenChange={setIngredientSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle>{editingIngredient ? "Edit Ingredient" : "Add Ingredient"}</SheetTitle>
              <button
                type="button"
                onClick={() => setIngredientSheetOpen(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <SheetDescription>
              {editingIngredient ? "Update this ingredient" : "Add a new ingredient to this recipe"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Ingredient Name */}
            <div className="space-y-2">
              <Label htmlFor="ingredient-name" className="text-sm font-medium">Ingredient *</Label>
              <Input
                id="ingredient-name"
                value={ingredientForm.ingredient}
                onChange={(e) => setIngredientForm({ ...ingredientForm, ingredient: e.target.value })}
                placeholder="e.g., Chicken breast"
                className="h-11"
              />
            </div>

            {/* Oz per Meal */}
            <div className="space-y-2">
              <Label htmlFor="ingredient-oz" className="text-sm font-medium">Oz per Person</Label>
              <Input
                id="ingredient-oz"
                type="number"
                min={0}
                step={0.1}
                value={ingredientForm.oz_per_meal}
                onChange={(e) => setIngredientForm({ ...ingredientForm, oz_per_meal: e.target.value })}
                className="h-11"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type</Label>
              <Select
                value={ingredientForm.type}
                onValueChange={(val) => setIngredientForm({ ...ingredientForm, type: val })}
              >
                <SelectTrigger className="h-11 cursor-pointer">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {["Protein", "Starch", "Veg", "Dairy", "Frozen", "Dry Goods", "Seasoning"].map((t) => (
                    <SelectItem key={t} value={t} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getIngredientTypeColor(t)}`} />
                        {t}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prep Notes */}
            <div className="space-y-2">
              <Label htmlFor="ingredient-prep" className="text-sm font-medium">Prep Notes</Label>
              <Textarea
                id="ingredient-prep"
                value={ingredientForm.prep_notes}
                onChange={(e) => setIngredientForm({ ...ingredientForm, prep_notes: e.target.value })}
                placeholder="e.g., Dice into 1-inch cubes, thaw overnight..."
                rows={3}
              />
            </div>
          </div>

          <div className="p-6 border-t shrink-0">
            <div className="flex gap-3">
              {editingIngredient && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIngredientSheetOpen(false)
                    setDeleteIngredientDialog(editingIngredient)
                  }}
                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  disabled={isSavingIngredient}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIngredientSheetOpen(false)}
                className="flex-1 cursor-pointer"
                disabled={isSavingIngredient}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveIngredient}
                className="flex-1 cursor-pointer"
                disabled={isSavingIngredient || !ingredientForm.ingredient.trim()}
              >
                {isSavingIngredient ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : editingIngredient ? (
                  "Save Changes"
                ) : (
                  "Add Ingredient"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Instruction Dialog */}
      <AlertDialog open={!!deleteInstructionDialog} onOpenChange={(open) => !open && setDeleteInstructionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Instruction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Step {deleteInstructionDialog?.step}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" disabled={isDeletingInstruction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInstruction}
              className="bg-red-600 hover:bg-red-700 cursor-pointer"
              disabled={isDeletingInstruction}
            >
              {isDeletingInstruction ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Ingredient Dialog */}
      <AlertDialog open={!!deleteIngredientDialog} onOpenChange={(open) => !open && setDeleteIngredientDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ingredient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteIngredientDialog?.ingredient}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" disabled={isDeletingIngredient}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIngredient}
              className="bg-red-600 hover:bg-red-700 cursor-pointer"
              disabled={isDeletingIngredient}
            >
              {isDeletingIngredient ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
