"use client"

import React, { useMemo, useState, Suspense } from "react"
import useSWR from "swr"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  ChefHat,
  UtensilsCrossed,
  Boxes,
  Clock,
  Wrench,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  useActiveExpedition,
  useExpeditionScheduleItemsByDate,
} from "@/lib/hooks/use-expeditions"
import { getPhotoUrl } from "@/lib/utils"

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

const isMealType = (item: any) => {
  if (!item) return false
  return !!item?._expedition_schedule_item_types?.isMeal
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
  recipe_photo: any
  type: string
  summary?: string
  duration_minutes?: string
  equipment_required?: string
  instructions?: Instruction[]
  ingredients?: Ingredient[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const getTodayDateString = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getRelativeDateLabel = (dateStr: string, date: Date) => {
  const todayStr = getTodayDateString()
  if (dateStr === todayStr) return "Today"

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`
  const tStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`

  if (dateStr === yStr) return "Yesterday"
  if (dateStr === tStr) return "Tomorrow"

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

const dateToStr = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

type TabId = "meals" | "cookbook" | "inventory"

export default function PublicRecipeDetailPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <PublicRecipeDetailPage />
    </Suspense>
  )
}

function PublicRecipeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const recipeId = params.id as string
  const fromTab = searchParams.get("from") || "meals"
  const fromDate = searchParams.get("date")

  // Date state
  const [selectedDateStr, setSelectedDateStr] = useState(fromDate || getTodayDateString())
  const [calendarOpen, setCalendarOpen] = useState(false)

  const selectedDate = useMemo(() => {
    const [year, month, day] = selectedDateStr.split("-").map(Number)
    return new Date(year, month - 1, day)
  }, [selectedDateStr])

  const formattedDate = getRelativeDateLabel(selectedDateStr, selectedDate)
  const isToday = selectedDateStr === getTodayDateString()

  const goToPrevDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    const newStr = dateToStr(newDate)
    setSelectedDateStr(newStr)
    router.push(`/public/galley?tab=meals&date=${newStr}`)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    const newStr = dateToStr(newDate)
    setSelectedDateStr(newStr)
    router.push(`/public/galley?tab=meals&date=${newStr}`)
  }

  const handleDateChange = (newDate: Date) => {
    const newStr = dateToStr(newDate)
    setSelectedDateStr(newStr)
    setCalendarOpen(false)
    router.push(`/public/galley?tab=meals&date=${newStr}`)
  }

  const backUrl = useMemo(() => {
    const p = new URLSearchParams()
    p.set("tab", fromTab)
    p.set("date", selectedDateStr)
    return `/public/galley?${p.toString()}`
  }, [fromTab, selectedDateStr])

  // Recipe data
  const { data: recipe, isLoading } = useSWR<Recipe>(
    recipeId ? `${XANO_BASE_URL}/expedition_cookbook/${recipeId}` : null,
    fetcher
  )

  // Active expedition + schedule items for prev/next meal nav
  const { data: activeExpedition } = useActiveExpedition()
  const expeditionId = activeExpedition?.id

  const { data: scheduleItemsData } = useExpeditionScheduleItemsByDate(
    selectedDateStr,
    expeditionId,
  )
  const scheduleItems = scheduleItemsData?.items || scheduleItemsData || []

  // Filtered meal items for that day, sorted by time
  const mealItems = useMemo(() => {
    if (!scheduleItems || !Array.isArray(scheduleItems)) return []
    return scheduleItems
      .filter((item: any) => isMealType(item))
      .sort((a: any, b: any) => (a.time_in || 0) - (b.time_in || 0))
  }, [scheduleItems])

  // Build ordered list of cookbook IDs for that day's meals
  const mealCookbookIds = useMemo(() => {
    return mealItems
      .map((item: any) => item._expedition_cookbook?.id || item.expedition_cookbook_id)
      .filter((id: number) => id > 0)
  }, [mealItems])

  const currentMealIndex = mealCookbookIds.indexOf(Number(recipeId))
  const hasPrevMeal = currentMealIndex > 0
  const hasNextMeal = currentMealIndex >= 0 && currentMealIndex < mealCookbookIds.length - 1

  const goToPrevMeal = () => {
    if (!hasPrevMeal) return
    const prevId = mealCookbookIds[currentMealIndex - 1]
    router.push(`/public/galley/${prevId}?from=meals&date=${selectedDateStr}`)
  }

  const goToNextMeal = () => {
    if (!hasNextMeal) return
    const nextId = mealCookbookIds[currentMealIndex + 1]
    router.push(`/public/galley/${nextId}?from=meals&date=${selectedDateStr}`)
  }

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

    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.ingredient.localeCompare(b.ingredient))
    })

    return groups
  }, [recipe?.ingredients])

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

  const sortedInstructions = useMemo(() => {
    if (!recipe?.instructions) return []
    return [...recipe.instructions].sort((a, b) => a.step - b.step)
  }, [recipe?.instructions])

  const tabs: { id: TabId; label: string; icon: React.ReactNode; href: string }[] = [
    { id: "meals", label: "Meals", icon: <UtensilsCrossed className="h-4 w-4" />, href: `/public/galley?tab=meals&date=${selectedDateStr}` },
    { id: "cookbook", label: "Cookbook", icon: <ChefHat className="h-4 w-4" />, href: "/public/galley?tab=cookbook" },
    { id: "inventory", label: "Inventory", icon: <Boxes className="h-4 w-4" />, href: "/public/galley?tab=inventory" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full overflow-hidden">
                <img
                  src="/sailfuture-square (8).webp"
                  alt="SailFuture Academy"
                  className="h-full w-full object-cover"
                />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Galley Department</h1>
            </div>
          </div>

          {/* Tabs */}
          <div>
            <div className="flex">
              {tabs.map((tab) => (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors text-center ${
                    tab.id === fromTab
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Date Navigation */}
        {fromTab === "meals" && (
          <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevDay}
                className="h-10 w-10 rounded-lg flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors shrink-0"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>

              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 flex-1 text-base font-semibold text-gray-900 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    {formattedDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    defaultMonth={selectedDate}
                    onSelect={(d) => {
                      if (d) handleDateChange(d)
                    }}
                    initialFocus
                    className="rounded-md border"
                  />
                </PopoverContent>
              </Popover>

              <button
                onClick={goToNextDay}
                className="h-10 w-10 rounded-lg flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors shrink-0"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>

              <Button
                variant="outline"
                className="h-10 text-base rounded-lg shrink-0 px-4"
                disabled={isToday}
                onClick={() => {
                  const todayStr = getTodayDateString()
                  setSelectedDateStr(todayStr)
                  router.push(`/public/galley?tab=meals&date=${todayStr}`)
                }}
              >
                Today
              </Button>
            </div>
          </div>
        )}
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

            {/* Nav buttons skeleton */}
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1 rounded-lg" />
              <Skeleton className="h-10 flex-1 rounded-lg" />
              <Skeleton className="h-10 flex-1 rounded-lg" />
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
            {/* Recipe Header — vertically centered */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {getPhotoUrl(recipe.recipe_photo) ? (
                <div className="w-full sm:w-48 h-48 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <img
                    src={getPhotoUrl(recipe.recipe_photo)!}
                    alt={recipe.recipe_name}
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

            {/* Navigation Buttons — Previous Meal / See All / Next Meal */}
            {fromTab === "meals" && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={goToPrevMeal}
                  disabled={!hasPrevMeal}
                  className="flex-1 h-10 text-base rounded-lg bg-white cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous Meal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/public/galley?tab=meals&date=${selectedDateStr}`)}
                  className="flex-1 h-10 text-base rounded-lg bg-white cursor-pointer"
                >
                  See All
                </Button>
                <Button
                  variant="outline"
                  onClick={goToNextMeal}
                  disabled={!hasNextMeal}
                  className="flex-1 h-10 text-base rounded-lg bg-white cursor-pointer"
                >
                  Next Meal
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Ingredients Table */}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ingredients</h2>
                <div className="border rounded-lg overflow-hidden bg-white">
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
                        <React.Fragment key={type}>
                          <TableRow className="bg-gray-50/50">
                            <TableCell colSpan={4} className="py-2 px-4 sm:px-6">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                {type}
                              </span>
                            </TableCell>
                          </TableRow>
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
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state for ingredients */}
            {(!recipe.ingredients || recipe.ingredients.length === 0) && (
              <div className="border rounded-lg p-8 text-center text-muted-foreground bg-white">
                No ingredients found for this recipe.
              </div>
            )}

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
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Step {instruction.step}
                      </div>

                      <div>
                        <p className="text-gray-900 leading-relaxed mb-3">
                          {instruction.instructions}
                        </p>

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
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Recipe not found.</p>
            <Link href="/public/galley" className="text-sm text-blue-600 hover:underline mt-4 inline-block">
              Return to Galley Department
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4 text-center">
        <p className="text-sm text-gray-400">Galley Department</p>
      </footer>
    </div>
  )
}
