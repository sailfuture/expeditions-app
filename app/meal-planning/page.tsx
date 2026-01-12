"use client"

import { useMemo, useState } from "react"
import useSWR, { mutate } from "swr"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { toast } from "sonner"
import { Plus } from "lucide-react"

const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y"

interface Recipe {
  id: number
  created_at: number
  recipe_name: string
  recipe_photo: string
  type: string
  summary?: string
  duration_minutes?: string
  expeditions_id?: number[]
}

const truncateText = (text: string, maxLength: number) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + "..."
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function MealPlanningPage() {
  const router = useRouter()
  const [assignSheetOpen, setAssignSheetOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [selectedExpeditions, setSelectedExpeditions] = useState<number[]>([])
  const [isAssigning, setIsAssigning] = useState(false)
  
  const { data: recipes, isLoading, error } = useSWR<Recipe[]>(
    `${XANO_BASE_URL}/expedition_cookbook`,
    fetcher
  )

  const { data: expeditions } = useSWR<any[]>(
    `${XANO_BASE_URL}/expeditions`,
    fetcher
  )

  // Group recipes by type
  const groupedRecipes = useMemo(() => {
    if (!recipes) return { Breakfast: [], Lunch: [], Dinner: [] }
    
    const groups: Record<string, Recipe[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
    }
    
    recipes.forEach((recipe) => {
      if (groups[recipe.type]) {
        groups[recipe.type].push(recipe)
      }
    })
    
    // Sort each group alphabetically by name
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.recipe_name.localeCompare(b.recipe_name))
    })
    
    return groups
  }, [recipes])

  const handleRowClick = (id: number) => {
    router.push(`/meal-planning/${id}`)
  }

  const handleAssignClick = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation()
    setSelectedRecipe(recipe)
    // Pre-populate with existing assignments
    setSelectedExpeditions(recipe.expeditions_id || [])
    setAssignSheetOpen(true)
  }

  const handleExpeditionToggle = (expeditionId: number) => {
    setSelectedExpeditions(prev => 
      prev.includes(expeditionId)
        ? prev.filter(id => id !== expeditionId)
        : [...prev, expeditionId]
    )
  }

  const handleSaveAssignments = async () => {
    if (!selectedRecipe) {
      toast.error("No recipe selected")
      return
    }

    setIsAssigning(true)
    try {
      // Update the recipe with the array of expedition IDs
      const response = await fetch(`${XANO_BASE_URL}/expedition_cookbook/${selectedRecipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expeditions_id: selectedExpeditions,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update recipe")
      }

      toast.success("Recipe assigned to expeditions successfully")
      setAssignSheetOpen(false)
      setSelectedRecipe(null)
      setSelectedExpeditions([])
      // Refresh the recipes list
      mutate(`${XANO_BASE_URL}/expedition_cookbook`)
    } catch (error) {
      console.error("Error assigning recipe:", error)
      toast.error("Failed to assign recipe to expeditions")
    } finally {
      setIsAssigning(false)
    }
  }

  const renderMealSection = (title: string, meals: Recipe[]) => (
    <Card className="mb-6">
      <CardHeader className="pb-4 border-b">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[60px] sm:w-[80px]">Photo</TableHead>
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600">Recipe Name</TableHead>
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[100px] sm:w-[120px]">Duration</TableHead>
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden lg:table-cell">Summary</TableHead>
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[100px]">Assign</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                    No {title.toLowerCase()} recipes found
                  </TableCell>
                </TableRow>
              ) : (
                meals.map((meal) => (
                  <TableRow
                    key={meal.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="h-16 px-4 sm:px-6 cursor-pointer" onClick={() => handleRowClick(meal.id)}>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-gray-100">
                        {meal.recipe_photo ? (
                          <Image
                            src={meal.recipe_photo}
                            alt={meal.recipe_name}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No img
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="h-16 px-4 sm:px-6 cursor-pointer" onClick={() => handleRowClick(meal.id)}>
                      <span className="font-medium text-gray-900 text-sm">{meal.recipe_name}</span>
                    </TableCell>
                    <TableCell className="h-16 px-4 sm:px-6 cursor-pointer" onClick={() => handleRowClick(meal.id)}>
                      <span className="text-sm text-gray-600">{meal.duration_minutes || "—"}</span>
                    </TableCell>
                    <TableCell className="h-16 px-4 sm:px-6 hidden lg:table-cell cursor-pointer" onClick={() => handleRowClick(meal.id)}>
                      <span className="text-sm text-gray-500">
                        {meal.summary ? truncateText(meal.summary, 80) : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="h-16 px-4 sm:px-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleAssignClick(e, meal)}
                        className="cursor-pointer"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  const renderSkeletonTable = () => (
    <Card className="mb-6">
      <CardHeader className="pb-4 border-b">
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="h-10 px-4 sm:px-6 w-[60px] sm:w-[80px]"><Skeleton className="h-4 w-12" /></TableHead>
                <TableHead className="h-10 px-4 sm:px-6"><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead className="h-10 px-4 sm:px-6 w-[100px] sm:w-[120px]"><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead className="h-10 px-4 sm:px-6 hidden lg:table-cell"><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead className="h-10 px-4 sm:px-6 w-[100px]"><Skeleton className="h-4 w-16" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg" /></TableCell>
                  <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-5 w-32 sm:w-48" /></TableCell>
                  <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-5 w-16 sm:w-20" /></TableCell>
                  <TableCell className="h-16 px-4 sm:px-6 hidden lg:table-cell"><Skeleton className="h-5 w-64" /></TableCell>
                  <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Meal Planning</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Browse and manage expedition recipes by meal type
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Failed to load recipes. Please try again later.</p>
        </div>
      )}

      {isLoading ? (
        <>
          {renderSkeletonTable()}
          {renderSkeletonTable()}
          {renderSkeletonTable()}
        </>
      ) : (
        <>
          {renderMealSection("Breakfast", groupedRecipes.Breakfast)}
          {renderMealSection("Lunch", groupedRecipes.Lunch)}
          {renderMealSection("Dinner", groupedRecipes.Dinner)}
        </>
      )}

      {/* Assign to Expedition Sheet */}
      <Sheet open={assignSheetOpen} onOpenChange={setAssignSheetOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <SheetTitle>Assign Recipe to Expeditions</SheetTitle>
            <SheetDescription>
              Select which expeditions should have access to{" "}
              <span className="font-medium">{selectedRecipe?.recipe_name}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {!expeditions || expeditions.length === 0 ? (
              <div className="p-6">
                <p className="text-sm text-muted-foreground">No expeditions available</p>
              </div>
            ) : (
              <Table>
                <TableBody>
                  {expeditions.map((expedition) => (
                    <TableRow 
                      key={expedition.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleExpeditionToggle(expedition.id)}
                    >
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedExpeditions.includes(expedition.id)}
                            onChange={() => handleExpeditionToggle(expedition.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{expedition.name}</div>
                            {expedition.startDate && expedition.endDate && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {expedition.startDate} — {expedition.endDate}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="p-6 border-t shrink-0">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setAssignSheetOpen(false)}
                className="flex-1 cursor-pointer"
                disabled={isAssigning}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAssignments}
                className="flex-1 cursor-pointer"
                disabled={isAssigning}
              >
                {isAssigning ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  )
}
