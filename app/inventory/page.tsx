"use client"

import React, { useState, useMemo } from "react"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { PlusCircle, Trash2, Boxes, Minus, Plus, Search, MapPin, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getExpeditionsInventory,
  createExpeditionsInventoryItem,
  updateExpeditionsInventoryItem,
  deleteExpeditionsInventoryItem,
  getExpeditionsIngredientTypes,
  getExpeditionInventoryLocations,
  createExpeditionInventoryLocation,
  deleteExpeditionInventoryLocation,
} from "@/lib/xano"
import { useCurrentUser } from "@/lib/contexts/user-context"

const SWR_KEY = "expeditions_inventory"

interface InventoryItem {
  id: number
  created_at: number
  name: string
  type: string
  location: string
  packages: number
  oz_per_package: number
  isNotPackage?: boolean
  notes: string
  fullness?: number
}

// Allowed fullness values in 25% increments
const FULLNESS_STEPS = [0, 25, 50, 75, 100] as const

interface IngredientType {
  id: number
  created_at: number
  type_name: string
  color: string
}

interface InventoryLocation {
  id: number
  created_at: number
  name: string
  Description: string
  notInUse: boolean
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

// Stepper number cell with +/- buttons and tap-to-edit
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
    // Optimistic update
    mutate(
      SWR_KEY,
      (current: InventoryItem[] | undefined) =>
        current?.map((item) =>
          item.id === itemId ? { ...item, [field]: newValue } : item
        ),
      false
    )
    try {
      await updateExpeditionsInventoryItem(itemId, { [field]: newValue })
      mutate(SWR_KEY)
    } catch {
      toast.error("Failed to update")
      mutate(SWR_KEY)
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
    <div
      className="inline-flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => handleStep(-1)}
        className="h-6 w-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
      >
        <Minus className="h-3 w-3 text-gray-500" />
      </button>
      <div className="w-8 h-6 flex items-center justify-center">
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-8 h-6 text-center text-sm font-medium text-gray-900 tabular-nums border border-gray-300 rounded px-0 py-0 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            autoFocus
          />
        ) : (
          <button
            onClick={handleNumberClick}
            className="w-8 h-6 text-center text-sm font-medium text-gray-900 tabular-nums cursor-pointer hover:bg-gray-100 rounded touch-manipulation"
          >
            {value}
          </button>
        )}
      </div>
      <button
        onClick={() => handleStep(1)}
        className="h-6 w-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
      >
        <Plus className="h-3 w-3 text-gray-500" />
      </button>
    </div>
  )
}

// Inline fullness picker for the table — 5 small segments in 25% steps.
// Click any segment to set the value; the active step is highlighted blue.
function FullnessInline({
  value,
  itemId,
}: {
  value: number
  itemId: number
}) {
  const current = Math.max(0, Math.min(100, value || 0))
  const setFullness = async (next: number) => {
    if (next === current) return
    mutate(
      SWR_KEY,
      (items: InventoryItem[] | undefined) =>
        items?.map((it) => (it.id === itemId ? { ...it, fullness: next } : it)),
      false
    )
    try {
      await updateExpeditionsInventoryItem(itemId, { fullness: next })
      mutate(SWR_KEY)
    } catch {
      toast.error("Failed to update fullness")
      mutate(SWR_KEY)
    }
  }
  return (
    <div
      className="inline-flex items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5">
        {FULLNESS_STEPS.map((step) => {
          const filled = current >= step && step > 0
          // step 0 is a small "empty" dot for resetting
          if (step === 0) {
            return (
              <button
                key={step}
                type="button"
                onClick={() => setFullness(0)}
                className={cn(
                  "h-3 w-3 rounded-full border transition-colors cursor-pointer touch-manipulation",
                  current === 0
                    ? "bg-gray-400 border-gray-400"
                    : "bg-white border-gray-300 hover:border-gray-400"
                )}
                title="0%"
                aria-label="Set fullness to 0%"
              />
            )
          }
          return (
            <button
              key={step}
              type="button"
              onClick={() => setFullness(step)}
              className={cn(
                "h-3 w-4 rounded-sm transition-colors cursor-pointer touch-manipulation",
                filled
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-gray-200 hover:bg-gray-300"
              )}
              title={`${step}%`}
              aria-label={`Set fullness to ${step}%`}
            />
          )
        })}
      </div>
      <span className="text-xs font-medium text-gray-600 tabular-nums w-8">
        {current}%
      </span>
    </div>
  )
}

// Pill-button fullness picker for the edit sheet — 5 labeled buttons.
function FullnessPills({
  value,
  onChange,
}: {
  value: number
  onChange: (next: number) => void
}) {
  const current = Math.max(0, Math.min(100, value || 0))
  return (
    <div className="flex flex-wrap gap-1.5">
      {FULLNESS_STEPS.map((step) => {
        const active = current === step
        return (
          <button
            key={step}
            type="button"
            onClick={() => onChange(step)}
            className={cn(
              "h-9 min-w-[56px] px-3 rounded-md border text-sm font-medium transition-colors cursor-pointer",
              active
                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
            aria-pressed={active}
          >
            {step}%
          </button>
        )
      })}
    </div>
  )
}

export default function InventoryPage() {
  const { currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === "Admin"

  const { data: inventoryItems, isLoading: inventoryLoading } = useSWR(
    SWR_KEY,
    () => getExpeditionsInventory()
  )

  const { data: ingredientTypes } = useSWR("ingredient_types", getExpeditionsIngredientTypes)
  const { data: inventoryLocations } = useSWR("inventory_locations", getExpeditionInventoryLocations)

  const [inventorySearch, setInventorySearch] = useState("")
  const [locationsDialogOpen, setLocationsDialogOpen] = useState(false)
  const [newLocationName, setNewLocationName] = useState("")
  const [savingLocation, setSavingLocation] = useState(false)
  const [deletingLocationId, setDeletingLocationId] = useState<number | null>(null)

  // Sheet state (edit) + dialog state (view, delete, locations)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)

  // Bulk selection + bulk action dialogs
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkMarkOosConfirmOpen, setBulkMarkOosConfirmOpen] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [deleteAllOosConfirmOpen, setDeleteAllOosConfirmOpen] = useState(false)
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    location: "",
    packages: "" as string | number,
    oz_per_package: "" as string | number,
    isNotPackage: false,
    notes: "",
    fullness: 100 as number,
  })

  const handleAddItem = () => {
    setEditingItem(null)
    setFormData({
      name: "",
      type: "",
      location: "",
      packages: "",
      oz_per_package: "",
      isNotPackage: false,
      notes: "",
      fullness: 100,
    })
    setSheetOpen(true)
  }

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name || "",
      type: item.type || "",
      location: item.location || "",
      packages: item.packages || "",
      oz_per_package: item.oz_per_package || "",
      isNotPackage: item.isNotPackage || false,
      notes: item.notes || "",
      fullness: typeof item.fullness === "number" ? item.fullness : 100,
    })
    setSheetOpen(true)
  }

  const handleDeleteClick = (item: InventoryItem) => {
    setItemToDelete(item)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    try {
      await deleteExpeditionsInventoryItem(itemToDelete.id)
      mutate(SWR_KEY)
      toast.success("Item deleted successfully")
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
    } catch (error) {
      console.error("Error deleting item:", error)
      toast.error("Failed to delete item")
    }
  }

  // Bulk selection helpers
  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const clearSelection = () => setSelectedIds(new Set())

  const handleBulkMarkOos = async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setIsBulkProcessing(true)
    try {
      await Promise.all(
        ids.map((id) => updateExpeditionsInventoryItem(id, { packages: 0 }))
      )
      mutate(SWR_KEY)
      toast.success(`${ids.length} item${ids.length === 1 ? "" : "s"} marked out of stock`)
      clearSelection()
      setBulkMarkOosConfirmOpen(false)
    } catch (error) {
      console.error("Bulk mark-out-of-stock failed:", error)
      toast.error("Failed to update items")
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setIsBulkProcessing(true)
    try {
      await Promise.all(ids.map((id) => deleteExpeditionsInventoryItem(id)))
      mutate(SWR_KEY)
      toast.success(`${ids.length} item${ids.length === 1 ? "" : "s"} deleted`)
      clearSelection()
      setBulkDeleteConfirmOpen(false)
    } catch (error) {
      console.error("Bulk delete failed:", error)
      toast.error("Failed to delete items")
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const handleDeleteAllOutOfStock = async () => {
    const allOosIds = (inventoryItems || [])
      .filter((it: InventoryItem) => (it.packages ?? 0) === 0)
      .map((it: InventoryItem) => it.id)
    if (allOosIds.length === 0) {
      setDeleteAllOosConfirmOpen(false)
      return
    }
    setIsBulkProcessing(true)
    try {
      await Promise.all(allOosIds.map((id: number) => deleteExpeditionsInventoryItem(id)))
      mutate(SWR_KEY)
      toast.success(`${allOosIds.length} out-of-stock item${allOosIds.length === 1 ? "" : "s"} deleted`)
      // Clear any selection of items that were just deleted
      setSelectedIds((prev) => {
        const next = new Set(prev)
        allOosIds.forEach((id: number) => next.delete(id))
        return next
      })
      setDeleteAllOosConfirmOpen(false)
    } catch (error) {
      console.error("Delete-all-out-of-stock failed:", error)
      toast.error("Failed to delete items")
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Item name is required")
      return
    }

    setIsSubmitting(true)
    try {
      const submitData = {
        name: formData.name,
        type: formData.type,
        location: formData.location,
        packages: formData.packages === "" ? 0 : Number(formData.packages),
        oz_per_package: formData.isNotPackage ? 0 : (formData.oz_per_package === "" ? 0 : Number(formData.oz_per_package)),
        isNotPackage: formData.isNotPackage,
        notes: formData.notes,
        fullness: formData.fullness,
      }

      if (editingItem) {
        await updateExpeditionsInventoryItem(editingItem.id, submitData)
        toast.success("Item updated successfully")
      } else {
        await createExpeditionsInventoryItem(submitData)
        toast.success("Item added successfully")
      }
      mutate(SWR_KEY)
      setSheetOpen(false)
    } catch (error) {
      console.error("Error saving item:", error)
      toast.error("Failed to save item")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Build lookup maps
  const typeColorLookup = useMemo(() => {
    const map: Record<string, string> = {}
    if (ingredientTypes) {
      ingredientTypes.forEach((t: IngredientType) => {
        map[t.type_name] = t.color
      })
    }
    return map
  }, [ingredientTypes])

  const activeLocations = useMemo(() => {
    return (inventoryLocations || []).filter((loc: InventoryLocation) => !loc.notInUse)
  }, [inventoryLocations])

  const typeNames = useMemo(() => {
    return (ingredientTypes || []).map((t: IngredientType) => t.type_name)
  }, [ingredientTypes])

  const locationNames = useMemo(() => {
    return activeLocations.map((loc: InventoryLocation) => loc.name)
  }, [activeLocations])

  // Group items by type, preserving ingredient type order
  const groupedItems = useMemo(() => {
    const items = (inventoryItems || []) as InventoryItem[]
    const groups: { type: string; color: string; items: InventoryItem[] }[] = []
    const groupMap = new Map<string, InventoryItem[]>()

    // Group items by type
    items.forEach((item) => {
      const key = item.type || ""
      if (!groupMap.has(key)) {
        groupMap.set(key, [])
      }
      groupMap.get(key)!.push(item)
    })

    // Order groups by ingredient type order, uncategorized last
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
      const items = groupMap.get(key)!.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      groups.push({ type: key, color, items })
    })

    return groups
  }, [inventoryItems, ingredientTypes, typeColorLookup])

  // Split into in-stock and out-of-stock groups, filtered by search
  const { inStockGroups, outOfStockGroups } = useMemo(() => {
    const inStock: typeof groupedItems = []
    const outOfStock: typeof groupedItems = []
    const query = inventorySearch.toLowerCase().trim()

    groupedItems.forEach((group) => {
      const filtered = query
        ? group.items.filter((item) => item.name?.toLowerCase().includes(query) || item.type?.toLowerCase().includes(query))
        : group.items
      const inStockItems = filtered.filter((item) => (item.packages ?? 0) > 0)
      const outOfStockItems = filtered.filter((item) => (item.packages ?? 0) === 0)
      if (inStockItems.length > 0) {
        inStock.push({ ...group, items: inStockItems })
      }
      if (outOfStockItems.length > 0) {
        outOfStock.push({ ...group, items: outOfStockItems })
      }
    })

    return { inStockGroups: inStock, outOfStockGroups: outOfStock }
  }, [groupedItems, inventorySearch])

  const items = (inventoryItems || []) as InventoryItem[]

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) return
    setSavingLocation(true)
    try {
      await createExpeditionInventoryLocation({ name: newLocationName.trim(), notInUse: false })
      mutate("inventory_locations")
      setNewLocationName("")
      toast.success("Location added")
    } catch {
      toast.error("Failed to add location")
    } finally {
      setSavingLocation(false)
    }
  }

  const handleDeleteLocation = async (id: number) => {
    setDeletingLocationId(id)
    try {
      await deleteExpeditionInventoryLocation(id)
      mutate("inventory_locations")
      toast.success("Location deleted")
    } catch {
      toast.error("Failed to delete location")
    } finally {
      setDeletingLocationId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bulk action bar — sticky, slides in/out when items are selected */}
      {isAdmin && (
        <div
          aria-hidden={selectedIds.size === 0}
          className={cn(
            "sticky top-14 z-30 overflow-hidden transition-all duration-200 ease-out",
            selectedIds.size > 0
              ? "max-h-16 opacity-100"
              : "max-h-0 opacity-0 pointer-events-none"
          )}
        >
          <div className="border-b bg-gray-100 text-gray-900 shadow-md">
            <div className="container mx-auto px-4 py-2 flex items-center gap-2">
              <span className="text-sm font-medium shrink-0">
                {selectedIds.size} selected
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setBulkMarkOosConfirmOpen(true)}
                disabled={isBulkProcessing}
                className="cursor-pointer h-8"
                title="Mark selected as out of stock"
              >
                <Boxes className="h-4 w-4 mr-1.5" />
                <span>Mark Out of Stock</span>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteConfirmOpen(true)}
                disabled={isBulkProcessing}
                className="cursor-pointer h-8"
                title="Delete selected"
              >
                <Trash2 className="h-4 w-4 md:mr-1.5" />
                <span className="hidden md:inline">Delete</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                disabled={isBulkProcessing}
                className="cursor-pointer h-8 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                title="Clear selection"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b bg-gray-50/50 flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold">Galley Inventory</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage food and supply inventory on the boat
              </p>
            </div>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search inventory..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="pl-9 h-9 w-full"
              />
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 w-full">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLocationsDialogOpen(true)}
                  className="cursor-pointer flex-1 min-w-0 shrink"
                  title="Manage locations"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">Locations</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddItem}
                  className="cursor-pointer flex-1 min-w-0 shrink"
                  title="Add item"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className="truncate">Add Item</span>
                </Button>
              </div>
            )}
          </div>

          {/* Table */}
          {inventoryLoading ? (
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  {isAdmin && <TableHead className="h-10 px-2 md:px-3 w-[12%] md:w-[5%] border-r border-gray-200" />}
                  <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 w-[30%] md:w-[18%]">Name</TableHead>
                  <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 hidden md:table-cell md:w-[14%]">Location</TableHead>
                  <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 text-center w-[28%] md:w-[10%]">Pkg / Qty</TableHead>
                  <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 text-center hidden md:table-cell md:w-[9%]">Oz/Pkg</TableHead>
                  <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 text-center w-[30%] md:w-[11%]">Total Oz</TableHead>
                  <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 text-center hidden md:table-cell md:w-[11%]">Total Lbs</TableHead>
                  <TableHead className="h-10 px-2 md:px-3 text-xs font-semibold text-gray-600 hidden md:table-cell md:w-[14%]">Fullness</TableHead>
                  <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 hidden lg:table-cell lg:w-[10%]">Notes</TableHead>
                  <TableHead className="h-10 w-[100px] hidden md:table-cell" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {isAdmin && <TableCell className="h-12 px-2 md:px-3"><Skeleton className="h-4 w-4 rounded" /></TableCell>}
                    <TableCell className="h-12 px-2 md:px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-12 px-4 md:px-6 hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-12 px-2 md:px-6"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                    <TableCell className="h-12 px-4 md:px-6 hidden md:table-cell"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                    <TableCell className="h-12 px-2 md:px-6"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                    <TableCell className="h-12 px-4 md:px-6 hidden md:table-cell"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                    <TableCell className="h-12 px-2 md:px-3 hidden md:table-cell"><Skeleton className="h-3 w-20" /></TableCell>
                    <TableCell className="h-12 px-4 md:px-6 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-12 px-2 hidden md:table-cell">
                      <div className="flex items-center justify-end gap-0.5">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-5 w-5 rounded" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Boxes className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No inventory items yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Add items to track food and supply inventory on the boat
              </p>
            </div>
          ) : inStockGroups.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Boxes className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">All items out of stock</p>
            </div>
          ) : (
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  {isAdmin && <TableHead className="h-10 px-2 md:px-3 w-[12%] md:w-[5%] border-r border-gray-200" />}
                  <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 w-[30%] md:w-[18%]">Name</TableHead>
                  <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 hidden md:table-cell md:w-[14%]">Location</TableHead>
                  <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 text-center w-[28%] md:w-[10%]">Pkg / Qty</TableHead>
                  <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 text-center hidden md:table-cell md:w-[9%]">Oz/Pkg</TableHead>
                  <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 text-center w-[30%] md:w-[11%]">Total Oz</TableHead>
                  <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 text-center hidden md:table-cell md:w-[11%]">Total Lbs</TableHead>
                  <TableHead className="h-10 px-2 md:px-3 text-xs font-semibold text-gray-600 hidden md:table-cell md:w-[14%]">Fullness</TableHead>
                  <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 hidden lg:table-cell lg:w-[10%]">Notes</TableHead>
                  <TableHead className="h-10 w-[100px] hidden md:table-cell" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {inStockGroups.map((group) => {
                  const bulletClass = typeBulletColorMap[group.color] || "bg-gray-400"
                  return (
                    <React.Fragment key={group.type || "__uncategorized"}>
                      {/* Group header row */}
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
                        <TableCell colSpan={isAdmin ? 10 : 9} className="h-9 px-4 sm:px-6 py-0">
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
                      {/* Items in group */}
                      {group.items.map((item) => (
                        <TableRow
                          key={item.id}
                          onClick={() => handleEditItem(item)}
                          data-selected={selectedIds.has(item.id) ? "true" : undefined}
                          className="border-b last:border-0 hover:bg-gray-50/50 transition-all duration-300 cursor-pointer data-[selected=true]:bg-blue-50/60 data-[selected=true]:hover:bg-blue-50"
                        >
                          {isAdmin && (
                            <TableCell
                              className="h-12 px-2 md:px-3 border-r border-gray-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.has(item.id)}
                                onChange={() => toggleSelected(item.id)}
                                aria-label={`Select ${item.name}`}
                                className="h-4 w-4 rounded border-gray-300 accent-blue-600 cursor-pointer touch-manipulation"
                              />
                            </TableCell>
                          )}
                          <TableCell className="h-12 px-2 md:px-6 overflow-hidden">
                            <span className="font-medium text-gray-900 truncate block">{item.name}</span>
                          </TableCell>
                          <TableCell className="h-12 px-4 md:px-6 hidden md:table-cell overflow-hidden">
                            <span className="text-sm text-gray-600 truncate block">{item.location || "—"}</span>
                          </TableCell>
                          <TableCell className="h-12 px-2 md:px-6 text-center">
                            <StepperNumberCell
                              value={item.packages ?? 0}
                              itemId={item.id}
                              field="packages"
                            />
                          </TableCell>
                          <TableCell className="h-12 px-4 md:px-6 text-center hidden md:table-cell">
                            <span className="text-sm text-gray-700">{item.isNotPackage ? "—" : (item.oz_per_package ?? 0)}</span>
                          </TableCell>
                          <TableCell className="h-12 px-2 md:px-6 text-center">
                            {item.isNotPackage ? (
                              <span className="text-sm text-gray-400">—</span>
                            ) : (
                              <span className="text-sm font-semibold text-gray-900">
                                {(item.packages ?? 0) * (item.oz_per_package ?? 0)}
                                <span className="text-xs font-semibold text-gray-400 ml-1">oz</span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="h-12 px-4 md:px-6 text-center hidden md:table-cell">
                            {item.isNotPackage ? (
                              <span className="text-sm text-gray-400">—</span>
                            ) : (
                              <span className="text-sm font-semibold text-gray-900">
                                {(((item.packages ?? 0) * (item.oz_per_package ?? 0)) / 16).toFixed(1)}
                                <span className="text-xs font-semibold text-gray-400 ml-1">lb</span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell
                            className="h-12 px-2 md:px-3 hidden md:table-cell"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FullnessInline
                              value={item.fullness ?? 100}
                              itemId={item.id}
                            />
                          </TableCell>
                          <TableCell className="h-12 px-4 md:px-6 hidden lg:table-cell overflow-hidden">
                            <span className="text-sm text-gray-500 truncate block">{item.notes || "—"}</span>
                          </TableCell>
                          <TableCell
                            className="h-12 px-2 text-right hidden md:table-cell"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isAdmin && (
                              <div className="flex items-center justify-end gap-0.5">
                                <button
                                  onClick={() => handleDeleteClick(item)}
                                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                                </button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Out of Stock Table */}
        {!inventoryLoading && outOfStockGroups.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden opacity-75 transition-all duration-300">
            <div className="px-4 sm:px-6 py-3 border-b bg-gray-50/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-base font-semibold text-gray-500">Out of Stock</h2>
                <span className="text-xs text-gray-400">{outOfStockGroups.reduce((sum, g) => sum + g.items.length, 0)} items</span>
              </div>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteAllOosConfirmOpen(true)}
                  className="cursor-pointer shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                  title="Delete every out-of-stock item"
                >
                  <Trash2 className="h-4 w-4 md:mr-1.5" />
                  <span className="hidden md:inline">Delete All</span>
                </Button>
              )}
            </div>

            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  {isAdmin && <TableHead className="h-10 px-2 md:px-3 w-[12%] md:w-[5%] border-r border-gray-200" />}
                  <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 w-[30%] md:w-[18%]">Name</TableHead>
                  <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 hidden md:table-cell md:w-[14%]">Location</TableHead>
                  <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 text-center w-[28%] md:w-[10%]">Pkg / Qty</TableHead>
                  <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 text-center hidden md:table-cell md:w-[9%]">Oz/Pkg</TableHead>
                  <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 text-center w-[30%] md:w-[11%]">Total Oz</TableHead>
                  <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 text-center hidden md:table-cell md:w-[11%]">Total Lbs</TableHead>
                  <TableHead className="h-10 px-2 md:px-3 text-xs font-semibold text-gray-600 hidden md:table-cell md:w-[14%]">Fullness</TableHead>
                  <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 hidden lg:table-cell lg:w-[10%]">Notes</TableHead>
                  <TableHead className="h-10 w-[100px] hidden md:table-cell" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {outOfStockGroups.map((group) => {
                  const bulletClass = typeBulletColorMap[group.color] || "bg-gray-400"
                  return (
                    <React.Fragment key={`oos_${group.type || "__uncategorized"}`}>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
                        <TableCell colSpan={isAdmin ? 10 : 9} className="h-9 px-4 sm:px-6 py-0">
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
                          onClick={() => handleEditItem(item)}
                          data-selected={selectedIds.has(item.id) ? "true" : undefined}
                          className="border-b last:border-0 hover:bg-gray-50/50 transition-all duration-300 cursor-pointer data-[selected=true]:bg-blue-50/60 data-[selected=true]:hover:bg-blue-50"
                        >
                          {isAdmin && (
                            <TableCell
                              className="h-12 px-2 md:px-3 border-r border-gray-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.has(item.id)}
                                onChange={() => toggleSelected(item.id)}
                                aria-label={`Select ${item.name}`}
                                className="h-4 w-4 rounded border-gray-300 accent-blue-600 cursor-pointer touch-manipulation"
                              />
                            </TableCell>
                          )}
                          <TableCell className="h-12 px-2 md:px-6 overflow-hidden">
                            <span className="font-medium text-gray-400 truncate block">{item.name}</span>
                          </TableCell>
                          <TableCell className="h-12 px-4 md:px-6 hidden md:table-cell overflow-hidden">
                            <span className="text-sm text-gray-400 truncate block">{item.location || "—"}</span>
                          </TableCell>
                          <TableCell className="h-12 px-2 md:px-6 text-center">
                            <StepperNumberCell
                              value={item.packages ?? 0}
                              itemId={item.id}
                              field="packages"
                            />
                          </TableCell>
                          <TableCell className="h-12 px-4 md:px-6 text-center hidden md:table-cell">
                            <span className="text-sm text-gray-400">{item.isNotPackage ? "—" : (item.oz_per_package ?? 0)}</span>
                          </TableCell>
                          <TableCell className="h-12 px-2 md:px-6 text-center">
                            <span className="text-sm text-gray-400">{item.isNotPackage ? "—" : `${(item.packages ?? 0) * (item.oz_per_package ?? 0)} oz`}</span>
                          </TableCell>
                          <TableCell className="h-12 px-4 md:px-6 text-center hidden md:table-cell">
                            <span className="text-sm text-gray-400">{item.isNotPackage ? "—" : `${(((item.packages ?? 0) * (item.oz_per_package ?? 0)) / 16).toFixed(1)} lb`}</span>
                          </TableCell>
                          <TableCell
                            className="h-12 px-2 md:px-3 hidden md:table-cell"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FullnessInline
                              value={item.fullness ?? 0}
                              itemId={item.id}
                            />
                          </TableCell>
                          <TableCell className="h-12 px-4 md:px-6 hidden lg:table-cell overflow-hidden">
                            <span className="text-sm text-gray-400 truncate block">{item.notes || "—"}</span>
                          </TableCell>
                          <TableCell
                            className="h-12 px-2 text-right hidden md:table-cell"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isAdmin && (
                              <div className="flex items-center justify-end gap-0.5">
                                <button
                                  onClick={() => handleDeleteClick(item)}
                                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                                </button>
                              </div>
                            )}
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
      </main>

      {/* Add/Edit Sheet — modal={false} so the base-ui Combobox portal can receive
          clicks, with a manual overlay since Radix skips its overlay in non-modal mode. */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
          onClick={() => setSheetOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} modal={false}>
        <SheetContent className="w-full sm:w-[520px] sm:max-w-[90vw] p-0 flex flex-col h-full overflow-hidden">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl">
                  {editingItem ? "Edit Inventory Item" : "Add Inventory Item"}
                </SheetTitle>
                <SheetDescription>
                  {editingItem
                    ? "Update the details for this inventory item"
                    : "Add a new item to the inventory"}
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <button
                  className="rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </SheetClose>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Rice, Pasta, Chicken"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Type Combobox */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Combobox
                items={typeNames}
                value={formData.type || null}
                onValueChange={(val: string | null) => {
                  setFormData({ ...formData, type: val || "" })
                }}
              >
                <ComboboxInput placeholder="Select type..." showClear className="truncate" />
                <ComboboxContent>
                  <ComboboxEmpty>No type found.</ComboboxEmpty>
                  <ComboboxList>
                    {(typeName: string) => {
                      const color = typeColorLookup[typeName] || "gray"
                      const bulletClass = typeBulletColorMap[color] || "bg-gray-400"
                      return (
                        <ComboboxItem key={typeName} value={typeName} className="cursor-pointer">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${bulletClass}`} />
                          {typeName}
                        </ComboboxItem>
                      )
                    }}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>

            {/* Location Combobox */}
            <div className="space-y-2">
              <Label>Location</Label>
              <Combobox
                items={locationNames}
                value={formData.location || null}
                onValueChange={(val: string | null) => {
                  setFormData({ ...formData, location: val || "" })
                }}
              >
                <ComboboxInput placeholder="Select location..." showClear className="truncate" />
                <ComboboxContent>
                  <ComboboxEmpty>No location found.</ComboboxEmpty>
                  <ComboboxList>
                    {(locName: string) => (
                      <ComboboxItem key={locName} value={locName} className="cursor-pointer">
                        {locName}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isNotPackage: !formData.isNotPackage })}
                className={cn(
                  "h-5 w-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors",
                  formData.isNotPackage
                    ? "bg-gray-900 border-gray-900 text-white"
                    : "border-gray-300 bg-white"
                )}
              >
                {formData.isNotPackage && <Check className="h-3 w-3" />}
              </button>
              <Label className="text-sm cursor-pointer" onClick={() => setFormData({ ...formData, isNotPackage: !formData.isNotPackage })}>
                Individual item (not packaged)
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="packages">{formData.isNotPackage ? "Quantity" : "Packages"}</Label>
              <Input
                id="packages"
                type="number"
                min="0"
                placeholder="0"
                value={formData.packages}
                onChange={(e) =>
                  setFormData({ ...formData, packages: e.target.value })
                }
              />
            </div>

            {!formData.isNotPackage && (
              <div className="space-y-2">
                <Label htmlFor="oz_per_package">Oz / Package</Label>
                <Input
                  id="oz_per_package"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.oz_per_package}
                  onChange={(e) =>
                    setFormData({ ...formData, oz_per_package: e.target.value })
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Fullness</Label>
              <FullnessPills
                value={formData.fullness}
                onChange={(next) => setFormData({ ...formData, fullness: next })}
              />
              <p className="text-xs text-gray-500">
                How full the current package/item is.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Optional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <SheetFooter className="border-t p-4 flex-row items-center justify-between gap-2 shrink-0 bg-white">
            <div>
              {editingItem && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(editingItem)}
                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <SheetClose asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
              </SheetClose>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : editingItem ? (
                  "Update"
                ) : (
                  "Add Item"
                )}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Bulk: mark selected as out of stock confirmation */}
      <Dialog open={bulkMarkOosConfirmOpen} onOpenChange={setBulkMarkOosConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Mark {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"} out of stock?</DialogTitle>
            <DialogDescription>
              This sets Pkg / Qty to 0 on the selected items. They&apos;ll move to the Out of Stock list and you can restock them later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="!flex-row items-center !justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkMarkOosConfirmOpen(false)}
              disabled={isBulkProcessing}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleBulkMarkOos}
              disabled={isBulkProcessing}
              className="cursor-pointer"
            >
              {isBulkProcessing ? <><Spinner className="h-4 w-4 mr-2" />Updating…</> : "Mark Out of Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk: delete selected confirmation */}
      <Dialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"}?</DialogTitle>
            <DialogDescription>
              This permanently removes the selected items from inventory. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="!flex-row items-center !justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkDeleteConfirmOpen(false)}
              disabled={isBulkProcessing}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isBulkProcessing}
              className="cursor-pointer"
            >
              {isBulkProcessing ? <><Spinner className="h-4 w-4 mr-2" />Deleting…</> : <><Trash2 className="h-4 w-4 mr-1.5" />Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete all out-of-stock confirmation */}
      <Dialog open={deleteAllOosConfirmOpen} onOpenChange={setDeleteAllOosConfirmOpen}>
        <DialogContent className="sm:max-w-[440px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Delete all out-of-stock items?</DialogTitle>
            <DialogDescription>
              This permanently removes every item with Pkg / Qty at 0
              {outOfStockGroups.length > 0 && (
                <> — {outOfStockGroups.reduce((sum, g) => sum + g.items.length, 0)} item{outOfStockGroups.reduce((sum, g) => sum + g.items.length, 0) === 1 ? "" : "s"} total</>
              )}
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="!flex-row items-center !justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteAllOosConfirmOpen(false)}
              disabled={isBulkProcessing}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAllOutOfStock}
              disabled={isBulkProcessing}
              className="cursor-pointer"
            >
              {isBulkProcessing ? <><Spinner className="h-4 w-4 mr-2" />Deleting…</> : <><Trash2 className="h-4 w-4 mr-1.5" />Delete All</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{itemToDelete?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="cursor-pointer"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Locations Dialog */}
      <Dialog open={locationsDialogOpen} onOpenChange={setLocationsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inventory Locations</DialogTitle>
            <DialogDescription>
              Manage storage locations on the boat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New location name..."
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddLocation()}
                className="flex-1"
              />
              <Button onClick={handleAddLocation} disabled={savingLocation || !newLocationName.trim()} className="cursor-pointer">
                {savingLocation ? <Spinner size="sm" className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
              {(inventoryLocations || []).length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">No locations yet</div>
              ) : (
                (inventoryLocations as InventoryLocation[]).map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm text-gray-900">{loc.name}</span>
                      {loc.notInUse && <span className="text-xs text-gray-400">(inactive)</span>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer text-gray-400 hover:text-red-600"
                      onClick={() => handleDeleteLocation(loc.id)}
                      disabled={deletingLocationId === loc.id}
                    >
                      {deletingLocationId === loc.id ? <Spinner size="sm" className="h-3 w-3" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
