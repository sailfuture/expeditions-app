"use client"

import React, { useState, useMemo, Suspense } from "react"
import useSWR, { mutate } from "swr"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChefHat,
  UtensilsCrossed,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Pencil,
  FileText,
  PlusCircle,
  ArrowRight,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  useActiveExpedition,
  useExpeditionSchedules,
  useExpeditionScheduleItemsByDate,
} from "@/lib/hooks/use-expeditions"
import { getPhotoUrl } from "@/lib/utils"
import {
  getExpeditionsInventory,
  createExpeditionsInventoryItem,
  updateExpeditionsInventoryItem,
  getExpeditionCookbook,
  getExpeditionsIngredientTypes,
  getExpeditionInventoryLocations,
} from "@/lib/xano"

const INVENTORY_SWR_KEY = "expeditions_inventory"

const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y"
const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface InventoryItem {
  id: number
  created_at: number
  name: string
  type: string
  location: string
  packages: number
  oz_per_package: number
  notes: string
}

interface IngredientType {
  id: number
  created_at: number
  type_name: string
  color: string
}

// Only show actual meal types (isMeal boolean on the schedule item type)
const isMealType = (item: any) => {
  if (!item) return false
  return !!item?._expedition_schedule_item_types?.isMeal
}

// Bullet color mapping for ingredient types
const typeBulletColorMap: Record<string, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  brown: "bg-amber-600",
  gray: "bg-gray-400",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
}

const truncateText = (text: string, maxLength: number) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + "..."
}

// Get today's date string
const getTodayDateString = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const formatMilitaryTime = (militaryTime: number) => {
  if (militaryTime === 2400) return "12:00 AM"
  const hours = Math.floor(militaryTime / 100)
  const minutes = militaryTime % 100
  const displayHours = hours % 12 || 12
  const period = hours >= 12 ? "PM" : "AM"
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
}

// Stepper number cell with +/- buttons and tap-to-edit (matches inventory page exactly)
function StepperNumberCell({
  value,
  itemId,
  field,
}: {
  value: number
  itemId: number
  field: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const saveValue = async (newValue: number) => {
    newValue = Math.max(0, newValue)
    if (newValue === value) {
      setIsEditing(false)
      return
    }
    setIsEditing(false)
    mutate(
      INVENTORY_SWR_KEY,
      (current: InventoryItem[] | undefined) =>
        current?.map((item) =>
          item.id === itemId ? { ...item, [field]: newValue } : item
        ),
      false
    )
    try {
      await updateExpeditionsInventoryItem(itemId, { [field]: newValue })
      mutate(INVENTORY_SWR_KEY)
    } catch {
      toast.error("Failed to update")
      mutate(INVENTORY_SWR_KEY)
    }
  }

  const handleStep = async (delta: number) => {
    await saveValue(value + delta)
  }

  const handleNumberClick = () => {
    setEditValue(String(value))
    setIsEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const handleInputBlur = () => {
    const parsed = parseInt(editValue, 10)
    saveValue(isNaN(parsed) ? value : parsed)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const parsed = parseInt(editValue, 10)
      saveValue(isNaN(parsed) ? value : parsed)
    } else if (e.key === "Escape") {
      setIsEditing(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={() => handleStep(-1)}
        className="h-8 w-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
      >
        <Minus className="h-4 w-4 text-gray-500" />
      </button>
      <div className="w-9 h-8 flex items-center justify-center">
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-9 h-8 text-center text-sm font-medium text-gray-900 tabular-nums border border-gray-300 rounded px-0 py-0 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            autoFocus
          />
        ) : (
          <button
            onClick={handleNumberClick}
            className="w-9 h-8 text-center text-sm font-medium text-gray-900 tabular-nums cursor-pointer hover:bg-gray-100 rounded touch-manipulation"
          >
            {value}
          </button>
        )}
      </div>
      <button
        onClick={() => handleStep(1)}
        className="h-8 w-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
      >
        <Plus className="h-4 w-4 text-gray-500" />
      </button>
    </div>
  )
}

type TabId = "meals" | "cookbook" | "inventory"

export default function PublicGalleyPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <PublicGalleyPage />
    </Suspense>
  )
}

function PublicGalleyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get("tab") as TabId) || "meals"
  const initialDate = searchParams.get("date") || getTodayDateString()
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const [selectedDateStr, setSelectedDateStr] = useState(initialDate)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null)
  const [editingViewItem, setEditingViewItem] = useState(false)
  const [editFormData, setEditFormData] = useState({ packages: 0, notes: "" })
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addFormData, setAddFormData] = useState({
    name: "",
    type: "",
    location: "",
    packages: "" as string | number,
    oz_per_package: "" as string | number,
    notes: "",
  })

  // Active expedition for meal schedule
  const { data: activeExpedition } = useActiveExpedition()
  const expeditionId = activeExpedition?.id

  const { data: schedules } = useExpeditionSchedules(expeditionId)
  const { data: scheduleItemsData, isLoading: loadingSchedule } = useExpeditionScheduleItemsByDate(
    selectedDateStr,
    expeditionId,
    { refreshInterval: 30000, revalidateOnFocus: true }
  )
  const scheduleItems = scheduleItemsData?.items || scheduleItemsData || []

  // Get the schedule object (contains galley team, dish team data)
  const schedule = useMemo(() => {
    if (scheduleItemsData?.schedule) return scheduleItemsData.schedule
    if (!schedules) return null
    return schedules.find((s: any) => s.date === selectedDateStr)
  }, [schedules, selectedDateStr, scheduleItemsData])

  // Filter to only meal items
  const mealItems = useMemo(() => {
    if (!scheduleItems || !Array.isArray(scheduleItems)) return []
    return scheduleItems
      .filter((item: any) => isMealType(item))
      .sort((a: any, b: any) => (a.time_in || 0) - (b.time_in || 0))
  }, [scheduleItems])

  // Cookbook data
  const { data: cookbookItems, isLoading: loadingCookbook } = useSWR(
    `${XANO_BASE_URL}/expedition_cookbook`,
    fetcher
  )

  // Inventory data
  const { data: inventoryItems, isLoading: loadingInventory } = useSWR(
    INVENTORY_SWR_KEY,
    () => getExpeditionsInventory()
  )

  const { data: ingredientTypes } = useSWR("ingredient_types", getExpeditionsIngredientTypes)
  const { data: inventoryLocations } = useSWR("inventory_locations", getExpeditionInventoryLocations)

  const activeLocations = useMemo(() => {
    return (inventoryLocations || []).filter((loc: any) => !loc.notInUse)
  }, [inventoryLocations])

  const typeNames = useMemo(() => {
    return (ingredientTypes || []).map((t: IngredientType) => t.type_name)
  }, [ingredientTypes])

  const locationNames = useMemo(() => {
    return activeLocations.map((loc: any) => loc.name)
  }, [activeLocations])

  // Group cookbook by type (matching meal-planning page exactly)
  const groupedRecipes = useMemo(() => {
    if (!cookbookItems) return { Breakfast: [], Lunch: [], Dinner: [] }
    const groups: Record<string, any[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
    }
    cookbookItems.forEach((recipe: any) => {
      if (groups[recipe.type]) {
        groups[recipe.type].push(recipe)
      }
    })
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a: any, b: any) => a.recipe_name.localeCompare(b.recipe_name))
    })
    return groups
  }, [cookbookItems])

  // Build inventory type color lookup
  const typeColorLookup = useMemo(() => {
    const map: Record<string, string> = {}
    if (ingredientTypes) {
      ingredientTypes.forEach((t: IngredientType) => {
        map[t.type_name] = t.color
      })
    }
    return map
  }, [ingredientTypes])

  // Group inventory items by type (matching inventory page exactly)
  const groupedItems = useMemo(() => {
    const items = (inventoryItems || []) as InventoryItem[]
    const groups: { type: string; color: string; items: InventoryItem[] }[] = []
    const groupMap = new Map<string, InventoryItem[]>()

    items.forEach((item) => {
      const key = item.type || ""
      if (!groupMap.has(key)) {
        groupMap.set(key, [])
      }
      groupMap.get(key)!.push(item)
    })

    const typeOrder = (ingredientTypes || []).map((t: IngredientType) => t.type_name)
    const sortedKeys = [...groupMap.keys()].sort((a, b) => {
      if (!a) return 1
      if (!b) return -1
      const aIdx = typeOrder.indexOf(a)
      const bIdx = typeOrder.indexOf(b)
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b)
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })

    sortedKeys.forEach((key) => {
      const color = typeColorLookup[key] || "gray"
      groups.push({ type: key, color, items: groupMap.get(key)! })
    })

    return groups
  }, [inventoryItems, ingredientTypes, typeColorLookup])

  // Split into in-stock and out-of-stock groups
  const { inStockGroups, outOfStockGroups } = useMemo(() => {
    const inStock: typeof groupedItems = []
    const outOfStock: typeof groupedItems = []

    groupedItems.forEach((group) => {
      const inStockItems = group.items.filter((item) => (item.packages ?? 0) > 0)
      const outOfStockItems = group.items.filter((item) => (item.packages ?? 0) === 0)
      if (inStockItems.length > 0) {
        inStock.push({ ...group, items: inStockItems })
      }
      if (outOfStockItems.length > 0) {
        outOfStock.push({ ...group, items: outOfStockItems })
      }
    })

    return { inStockGroups: inStock, outOfStockGroups: outOfStock }
  }, [groupedItems])

  // Get bullet class for view dialog
  const viewItemBulletClass = viewItem
    ? typeBulletColorMap[typeColorLookup[viewItem.type] || "gray"] || "bg-gray-400"
    : "bg-gray-400"

  const handleRowClick = (id: number, fromTab?: TabId) => {
    const tab = fromTab || activeTab
    const params = new URLSearchParams()
    params.set("from", tab)
    if (tab === "meals") params.set("date", selectedDateStr)
    router.push(`/public/galley/${id}?${params.toString()}`)
  }

  const selectedDate = useMemo(() => {
    const [year, month, day] = selectedDateStr.split("-").map(Number)
    return new Date(year, month - 1, day)
  }, [selectedDateStr])

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

  const formattedDate = getRelativeDateLabel(selectedDateStr, selectedDate)

  const isToday = selectedDateStr === getTodayDateString()

  const goToPrevDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    const y = newDate.getFullYear()
    const m = String(newDate.getMonth() + 1).padStart(2, "0")
    const d = String(newDate.getDate()).padStart(2, "0")
    setSelectedDateStr(`${y}-${m}-${d}`)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    const y = newDate.getFullYear()
    const m = String(newDate.getMonth() + 1).padStart(2, "0")
    const d = String(newDate.getDate()).padStart(2, "0")
    setSelectedDateStr(`${y}-${m}-${d}`)
  }

  const handleDateChange = (newDate: Date) => {
    const y = newDate.getFullYear()
    const m = String(newDate.getMonth() + 1).padStart(2, "0")
    const d = String(newDate.getDate()).padStart(2, "0")
    setSelectedDateStr(`${y}-${m}-${d}`)
    setCalendarOpen(false)
  }

  const handleOpenAddDialog = () => {
    setAddFormData({
      name: "",
      type: "",
      location: "",
      packages: "",
      oz_per_package: "",
      notes: "",
    })
    setAddDialogOpen(true)
  }

  const handleAddSubmit = async () => {
    if (!addFormData.name.trim()) {
      toast.error("Item name is required")
      return
    }
    setIsSubmitting(true)
    try {
      await createExpeditionsInventoryItem({
        name: addFormData.name,
        type: addFormData.type,
        location: addFormData.location,
        packages: addFormData.packages === "" ? 0 : Number(addFormData.packages),
        oz_per_package: addFormData.oz_per_package === "" ? 0 : Number(addFormData.oz_per_package),
        notes: addFormData.notes,
      })
      mutate(INVENTORY_SWR_KEY)
      toast.success("Item added successfully")
      setAddDialogOpen(false)
    } catch {
      toast.error("Failed to add item")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Tab switching skeleton state
  const [tabSwitching, setTabSwitching] = useState(false)
  const tabSwitchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTabSwitch = (tabId: TabId) => {
    if (tabId === activeTab) return
    setTabSwitching(true)
    setActiveTab(tabId)
    if (tabSwitchTimer.current) clearTimeout(tabSwitchTimer.current)
    tabSwitchTimer.current = setTimeout(() => setTabSwitching(false), 300)
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "meals", label: "Meals" },
    { id: "cookbook", label: "Cookbook" },
    { id: "inventory", label: "Inventory" },
  ]

  // Skeleton loaders for each tab
  const renderMealsTabSkeleton = () => (
    <div>
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <Skeleton className="h-10 w-[72px] rounded-lg shrink-0" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start gap-4">
              <Skeleton className="w-20 h-20 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderCookbookTabSkeleton = () => (
    <div>
      <div className="mb-6 sm:mb-8">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-5 w-48" />
      </div>
      {renderSkeletonTable()}
      {renderSkeletonTable()}
      {renderSkeletonTable()}
    </div>
  )

  const renderInventoryTabSkeleton = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b bg-gray-50/50">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="overflow-hidden">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                <TableHead className="h-9 px-3 sm:px-4 w-[35%]"><Skeleton className="h-4 w-12" /></TableHead>
                <TableHead className="h-9 px-3 sm:px-4 hidden md:table-cell w-[20%]"><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead className="h-9 px-3 sm:px-4 w-[20%]"><Skeleton className="h-4 w-16 mx-auto" /></TableHead>
                <TableHead className="h-9 px-3 sm:px-4 w-[12%]"><Skeleton className="h-4 w-10 mx-auto" /></TableHead>
                <TableHead className="h-9 px-3 sm:px-4 w-[13%]"><Skeleton className="h-4 w-12 mx-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="h-16 px-3 sm:px-4"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="h-16 px-3 sm:px-4 hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="h-16 px-3 sm:px-4"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                  <TableCell className="h-16 px-3 sm:px-4"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                  <TableCell className="h-16 px-3 sm:px-4"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )

  // Cookbook section renderer (matches meal-planning page exactly, minus Assign column)
  const renderMealSection = (title: string, meals: any[]) => (
    <Card className="mb-6">
      <CardHeader className="pb-4 border-b">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[60px] sm:w-[80px]">Photo</TableHead>
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[35%]">Recipe Name</TableHead>
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[100px] sm:w-[120px]">Duration</TableHead>
                <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden lg:table-cell">Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                    No {title.toLowerCase()} recipes found
                  </TableCell>
                </TableRow>
              ) : (
                meals.map((meal: any) => (
                  <TableRow
                    key={meal.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(meal.id, "cookbook")}
                  >
                    <TableCell className="h-16 px-4 sm:px-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-gray-100">
                        {getPhotoUrl(meal.recipe_photo) ? (
                          <img
                            src={getPhotoUrl(meal.recipe_photo)!}
                            alt={meal.recipe_name}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No img
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="h-16 px-4 sm:px-6 overflow-hidden">
                      <span className="font-medium text-gray-900 text-sm truncate block">{meal.recipe_name}</span>
                    </TableCell>
                    <TableCell className="h-16 px-4 sm:px-6">
                      <span className="text-sm text-gray-600">{meal.duration_minutes || "—"}</span>
                    </TableCell>
                    <TableCell className="h-16 px-4 sm:px-6 hidden lg:table-cell overflow-hidden">
                      <span className="text-sm text-gray-500 truncate block">
                        {meal.summary || "—"}
                      </span>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg" /></TableCell>
                  <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-5 w-32 sm:w-48" /></TableCell>
                  <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-5 w-16 sm:w-20" /></TableCell>
                  <TableCell className="h-16 px-4 sm:px-6 hidden lg:table-cell"><Skeleton className="h-5 w-64" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

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
          <div className="border-b border-gray-200">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabSwitch(tab.id)}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer text-center ${
                    activeTab === tab.id
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tab switching skeleton */}
        {tabSwitching && activeTab === "meals" && renderMealsTabSkeleton()}
        {tabSwitching && activeTab === "cookbook" && renderCookbookTabSkeleton()}
        {tabSwitching && activeTab === "inventory" && renderInventoryTabSkeleton()}

        {/* ===== MEALS TAB ===== */}
        {!tabSwitching && activeTab === "meals" && (
          <div>
            {/* Date Navigation */}
            <div className="mb-6 sm:mb-8">
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
                  onClick={() => setSelectedDateStr(getTodayDateString())}
                >
                  Today
                </Button>
              </div>
            </div>

            {/* Galley Team & Dish Team Assignments */}
            {schedule && (schedule._expedition_dish_days || schedule._expeditions_galley_team) && (
              <div className="mb-6 px-4 py-3 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center flex-wrap gap-6">
                  {/* Galley Team */}
                  {schedule._expeditions_galley_team && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-600">
                        Galley {schedule._expeditions_galley_team.name?.replace('Galley Team ', '')}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Students */}
                        {schedule._expeditions_galley_team.students_id?.filter((s: any) => s)?.length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex -space-x-1.5">
                                  {schedule._expeditions_galley_team.students_id.filter((s: any) => s).map((s: any, idx: number) => (
                                    <Avatar key={idx} className="h-7 w-7 border-2 border-white">
                                      <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">
                                        {s.firstName?.[0]}{s.lastName?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                <span className="font-medium">Students:</span> {schedule._expeditions_galley_team.students_id.filter((s: any) => s).map((s: any) => `${s.firstName} ${s.lastName}`).join(', ')}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {/* Supervisor */}
                        {schedule._expeditions_galley_team._galley_supervisor?.name && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400">Sv</span>
                                  <Avatar className="h-7 w-7 border-2 border-white">
                                    <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">
                                      {schedule._expeditions_galley_team._galley_supervisor.name.split(' ').map((n: string) => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                <span className="font-medium">Supervisor:</span> {schedule._expeditions_galley_team._galley_supervisor.name}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Separator */}
                  {schedule._expedition_dish_days && schedule._expeditions_galley_team && (
                    <div className="h-5 w-px bg-gray-300" />
                  )}

                  {/* Dish Team */}
                  {schedule._expedition_dish_days && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-600">
                        Dish {schedule._expedition_dish_days.dishteam?.replace('Dish Team ', '') || ''}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Wash */}
                        {schedule._expedition_dish_days.wash?.filter((s: any) => s)?.length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400">W</span>
                                  <div className="flex -space-x-1.5">
                                    {schedule._expedition_dish_days.wash.filter((s: any) => s).map((s: any, idx: number) => (
                                      <Avatar key={idx} className="h-7 w-7 border-2 border-white">
                                        <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">
                                          {s.firstName?.[0]}{s.lastName?.[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                <span className="font-medium">Wash:</span> {schedule._expedition_dish_days.wash.filter((s: any) => s).map((s: any) => `${s.firstName} ${s.lastName}`).join(', ')}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {/* Dry */}
                        {schedule._expedition_dish_days.dry?.filter((s: any) => s)?.length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400">D</span>
                                  <div className="flex -space-x-1.5">
                                    {schedule._expedition_dish_days.dry.filter((s: any) => s).map((s: any, idx: number) => (
                                      <Avatar key={idx} className="h-7 w-7 border-2 border-white">
                                        <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">
                                          {s.firstName?.[0]}{s.lastName?.[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                <span className="font-medium">Dry:</span> {schedule._expedition_dish_days.dry.filter((s: any) => s).map((s: any) => `${s.firstName} ${s.lastName}`).join(', ')}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {loadingSchedule ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-20 h-20 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : mealItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <UtensilsCrossed className="h-16 w-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-600 mb-2">No meals scheduled</h2>
                <p className="text-gray-500 text-center max-w-sm">
                  There are no meals scheduled for this date.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {mealItems.map((item: any) => {
                  const hasRecipe = item._expedition_cookbook?.id || item.expedition_cookbook_id > 0
                  const recipeId = item._expedition_cookbook?.id || item.expedition_cookbook_id
                  const recipePhoto = getPhotoUrl(item._expedition_cookbook?.recipe_photo)
                  const recipeName = item._expedition_cookbook?.recipe_name

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all ${
                        hasRecipe ? "hover:shadow-md hover:border-gray-300 cursor-pointer active:scale-[0.99]" : ""
                      }`}
                      onClick={() => hasRecipe && handleRowClick(recipeId, "meals")}
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Recipe Photo */}
                          {recipePhoto ? (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                              <img
                                src={recipePhoto}
                                alt={recipeName || item.name}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <UtensilsCrossed className="h-8 w-8 text-gray-300" />
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs font-medium text-gray-500">
                                {item._expedition_schedule_item_types?.name || "Meal"}
                              </span>
                              {item.time_in !== 0 && (
                                <>
                                  <span className="text-xs text-gray-300">•</span>
                                  <span className="text-xs text-gray-500">
                                    {formatMilitaryTime(item.time_in)}
                                    {item.time_out !== 0 && ` – ${formatMilitaryTime(item.time_out)}`}
                                  </span>
                                </>
                              )}
                            </div>

                            <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                              {hasRecipe ? (recipeName || item.name) : "Not Assigned"}
                            </h3>

                            {(item._expedition_cookbook?.summary || item._expedition_cookbook?.type) && (
                              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                                {item._expedition_cookbook.summary || item._expedition_cookbook.type}
                              </p>
                            )}

                            {/* Led By */}
                            {item._expedition_staff && (
                              <p className="text-sm text-gray-500 mt-1.5">
                                Led by {item._expedition_staff.name}
                              </p>
                            )}

                            {/* Notes */}
                            {item.notes && (
                              <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-2 line-clamp-2">
                                {item.notes}
                              </p>
                            )}
                          </div>

                          {/* Arrow indicator for clickable cards */}
                          {hasRecipe && (
                            <div className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center shrink-0 mt-6 sm:mt-7">
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== COOKBOOK TAB ===== */}
        {!tabSwitching && activeTab === "cookbook" && (
          <div>
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Cookbook</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Browse recipes by meal type
              </p>
            </div>

            {loadingCookbook ? (
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
          </div>
        )}

        {/* ===== INVENTORY TAB ===== */}
        {!tabSwitching && activeTab === "inventory" && (
          <div className="space-y-6">
            {/* In Stock Table */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 border-b bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Inventory</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Food and supply inventory on the boat
                  </p>
                </div>
                <Button size="sm" onClick={handleOpenAddDialog} className="cursor-pointer">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {/* Table */}
              {loadingInventory ? (
                <div className="overflow-hidden">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 w-[35%]">Name</TableHead>
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 hidden md:table-cell w-[20%]">Location</TableHead>
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 text-center w-[20%]">Packages</TableHead>
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 text-center w-[12%]">Oz/Pkg</TableHead>
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 text-center w-[13%]">Total Lbs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="h-16 px-3 sm:px-4"><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell className="h-16 px-3 sm:px-4 hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell className="h-16 px-3 sm:px-4"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                          <TableCell className="h-16 px-3 sm:px-4"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                          <TableCell className="h-16 px-3 sm:px-4"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (inventoryItems || []).length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Boxes className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium text-gray-600">No inventory items yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    No items have been added to inventory
                  </p>
                </div>
              ) : inStockGroups.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Boxes className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium text-gray-600">All items out of stock</p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 w-[35%]">Name</TableHead>
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 hidden md:table-cell w-[20%]">Location</TableHead>
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 text-center w-[20%]">Packages</TableHead>
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 text-center w-[12%]">Oz/Pkg</TableHead>
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 text-center w-[13%]">Total Lbs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inStockGroups.map((group) => {
                        const bulletClass = typeBulletColorMap[group.color] || "bg-gray-400"
                        return (
                          <React.Fragment key={group.type || "__uncategorized"}>
                            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
                              <TableCell colSpan={5} className="h-8 px-3 sm:px-4 py-0">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${bulletClass}`} />
                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {group.type || "Uncategorized"}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    ({group.items.length})
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                            {group.items.map((item) => (
                              <TableRow
                                key={item.id}
                                className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-all duration-300"
                                onClick={() => { setEditingViewItem(false); setViewItem(item) }}
                              >
                                <TableCell className="h-16 px-3 sm:px-4 overflow-hidden">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-gray-900 truncate text-sm">{item.name}</span>
                                    {item.notes && (
                                      <FileText className="h-3 w-3 text-gray-400 shrink-0" />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="h-16 px-3 sm:px-4 hidden md:table-cell overflow-hidden">
                                  <span className="text-sm text-gray-600 truncate block">{item.location || "—"}</span>
                                </TableCell>
                                <TableCell className="h-16 px-3 sm:px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  <StepperNumberCell
                                    value={item.packages ?? 0}
                                    itemId={item.id}
                                    field="packages"
                                  />
                                </TableCell>
                                <TableCell className="h-16 px-3 sm:px-4 text-center">
                                  <span className="text-sm text-gray-700">{item.oz_per_package ?? 0}</span>
                                </TableCell>
                                <TableCell className="h-16 px-3 sm:px-4 text-center">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {(((item.packages ?? 0) * (item.oz_per_package ?? 0)) / 16).toFixed(1)}
                                    <span className="text-xs font-semibold text-gray-400 ml-0.5">lb</span>
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Out of Stock Table */}
            {!loadingInventory && outOfStockGroups.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden opacity-75 transition-all duration-300">
                {/* Header */}
                <div className="px-4 sm:px-6 py-3 border-b bg-gray-50/50">
                  <h2 className="text-base font-semibold text-gray-500">Out of Stock</h2>
                </div>

                <div className="overflow-hidden">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 w-[35%]">Name</TableHead>
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 hidden md:table-cell w-[20%]">Location</TableHead>
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 text-center w-[20%]">Packages</TableHead>
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 text-center w-[12%]">Oz/Pkg</TableHead>
                        <TableHead className="h-9 px-3 sm:px-4 text-xs font-semibold text-gray-600 text-center w-[13%]">Total Lbs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outOfStockGroups.map((group) => {
                        const bulletClass = typeBulletColorMap[group.color] || "bg-gray-400"
                        return (
                          <React.Fragment key={`oos_${group.type || "__uncategorized"}`}>
                            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
                              <TableCell colSpan={5} className="h-8 px-3 sm:px-4 py-0">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${bulletClass}`} />
                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {group.type || "Uncategorized"}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    ({group.items.length})
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                            {group.items.map((item) => (
                              <TableRow
                                key={item.id}
                                className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-all duration-300"
                                onClick={() => { setEditingViewItem(false); setViewItem(item) }}
                              >
                                <TableCell className="h-16 px-3 sm:px-4 overflow-hidden">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-gray-400 truncate text-sm">{item.name}</span>
                                    {item.notes && (
                                      <FileText className="h-3 w-3 text-gray-300 shrink-0" />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="h-16 px-3 sm:px-4 hidden md:table-cell overflow-hidden">
                                  <span className="text-sm text-gray-400 truncate block">{item.location || "—"}</span>
                                </TableCell>
                                <TableCell className="h-16 px-3 sm:px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  <StepperNumberCell
                                    value={item.packages ?? 0}
                                    itemId={item.id}
                                    field="packages"
                                  />
                                </TableCell>
                                <TableCell className="h-16 px-3 sm:px-4 text-center">
                                  <span className="text-sm text-gray-400">{item.oz_per_package ?? 0}</span>
                                </TableCell>
                                <TableCell className="h-16 px-3 sm:px-4 text-center">
                                  <span className="text-sm font-semibold text-gray-400">
                                    {(((item.packages ?? 0) * (item.oz_per_package ?? 0)) / 16).toFixed(1)}
                                    <span className="text-xs font-semibold text-gray-300 ml-0.5">lb</span>
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* View Item Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(open) => {
        if (!open) {
          setViewItem(null)
          setEditingViewItem(false)
        }
      }}>
        <DialogContent className="sm:max-w-[480px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewItem?.name}
              {viewItem && (viewItem.packages ?? 0) === 0 && (
                <Badge variant="outline" className="text-xs text-red-500 border-red-200 bg-red-50">
                  Out of Stock
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {viewItem?.type && (
                <span className="inline-flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${viewItemBulletClass}`} />
                  {viewItem.type}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {viewItem && !editingViewItem && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location</p>
                  <p className="text-sm text-gray-900 mt-1">{viewItem.location || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Packages</p>
                  <p className="text-sm text-gray-900 mt-1">{viewItem.packages ?? 0}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Oz / Package</p>
                  <p className="text-sm text-gray-900 mt-1">{viewItem.oz_per_package ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Weight</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {(viewItem.packages ?? 0) * (viewItem.oz_per_package ?? 0)}
                    <span className="text-xs text-gray-400 ml-1">oz</span>
                    <span className="text-gray-300 mx-1.5">/</span>
                    {(((viewItem.packages ?? 0) * (viewItem.oz_per_package ?? 0)) / 16).toFixed(1)}
                    <span className="text-xs text-gray-400 ml-1">lb</span>
                  </p>
                </div>
              </div>
              {viewItem.notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</p>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{viewItem.notes}</p>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => {
                    setEditFormData({
                      packages: viewItem.packages ?? 0,
                      notes: viewItem.notes || "",
                    })
                    setEditingViewItem(true)
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
              </DialogFooter>
            </div>
          )}

          {viewItem && editingViewItem && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location</p>
                  <p className="text-sm text-gray-900 mt-1">{viewItem.location || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Oz / Package</p>
                  <p className="text-sm text-gray-900 mt-1">{viewItem.oz_per_package ?? 0}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Packages</label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1"
                  value={editFormData.packages}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, packages: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setEditingViewItem(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="cursor-pointer"
                  onClick={async () => {
                    try {
                      const updates: Record<string, any> = {}
                      if (editFormData.packages !== (viewItem.packages ?? 0)) {
                        updates.packages = editFormData.packages
                      }
                      if (editFormData.notes !== (viewItem.notes || "")) {
                        updates.notes = editFormData.notes
                      }
                      if (Object.keys(updates).length === 0) {
                        setEditingViewItem(false)
                        return
                      }
                      mutate(
                        INVENTORY_SWR_KEY,
                        (current: InventoryItem[] | undefined) =>
                          current?.map((item) =>
                            item.id === viewItem.id ? { ...item, ...updates } : item
                          ),
                        false
                      )
                      setViewItem({ ...viewItem, ...updates })
                      setEditingViewItem(false)
                      await updateExpeditionsInventoryItem(viewItem.id, updates)
                      mutate(INVENTORY_SWR_KEY)
                      toast.success("Item updated")
                    } catch {
                      toast.error("Failed to update item")
                      mutate(INVENTORY_SWR_KEY)
                    }
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Add a new item to the inventory</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name *</Label>
              <Input
                id="add-name"
                placeholder="e.g., Rice, Pasta, Chicken"
                value={addFormData.name}
                onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={addFormData.type}
                  onChange={(e) => setAddFormData({ ...addFormData, type: e.target.value })}
                >
                  <option value="">Select type...</option>
                  {typeNames.map((name: string) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={addFormData.location}
                  onChange={(e) => setAddFormData({ ...addFormData, location: e.target.value })}
                >
                  <option value="">Select location...</option>
                  {locationNames.map((name: string) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-packages">Packages</Label>
                <Input
                  id="add-packages"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={addFormData.packages}
                  onChange={(e) => setAddFormData({ ...addFormData, packages: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-oz">Oz / Package</Label>
                <Input
                  id="add-oz"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={addFormData.oz_per_package}
                  onChange={(e) => setAddFormData({ ...addFormData, oz_per_package: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-notes">Notes</Label>
              <Input
                id="add-notes"
                placeholder="Optional notes..."
                value={addFormData.notes}
                onChange={(e) => setAddFormData({ ...addFormData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Adding...
                </>
              ) : (
                "Add Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4 text-center">
        <p className="text-sm text-gray-400">Galley Department</p>
      </footer>
    </div>
  )
}
