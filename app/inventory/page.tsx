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
import { PlusCircle, Pencil, Trash2, Boxes, Eye, Minus, Plus } from "lucide-react"
import {
  getExpeditionsInventory,
  createExpeditionsInventoryItem,
  updateExpeditionsInventoryItem,
  deleteExpeditionsInventoryItem,
  getExpeditionsIngredientTypes,
  getExpeditionInventoryLocations,
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
  notes: string
}

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
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => handleStep(-1)}
        className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
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
        className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
      >
        <Plus className="h-3 w-3 text-gray-500" />
      </button>
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

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null)
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    location: "",
    packages: "" as string | number,
    oz_per_package: "" as string | number,
    notes: "",
  })

  const handleAddItem = () => {
    setEditingItem(null)
    setFormData({
      name: "",
      type: "",
      location: "",
      packages: "",
      oz_per_package: "",
      notes: "",
    })
    setDialogOpen(true)
  }

  const handleEditItem = (item: InventoryItem) => {
    setViewItem(null)
    setEditingItem(item)
    setFormData({
      name: item.name || "",
      type: item.type || "",
      location: item.location || "",
      packages: item.packages || "",
      oz_per_package: item.oz_per_package || "",
      notes: item.notes || "",
    })
    setDialogOpen(true)
  }

  const handleDeleteClick = (item: InventoryItem) => {
    setViewItem(null)
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
        oz_per_package: formData.oz_per_package === "" ? 0 : Number(formData.oz_per_package),
        notes: formData.notes,
      }

      if (editingItem) {
        await updateExpeditionsInventoryItem(editingItem.id, submitData)
        toast.success("Item updated successfully")
      } else {
        await createExpeditionsInventoryItem(submitData)
        toast.success("Item added successfully")
      }
      mutate(SWR_KEY)
      setDialogOpen(false)
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

  const items = (inventoryItems || []) as InventoryItem[]

  // Get bullet class for view dialog
  const viewItemBulletClass = viewItem
    ? typeBulletColorMap[typeColorLookup[viewItem.type] || "gray"] || "bg-gray-400"
    : "bg-gray-400"

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Inventory</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage food and supply inventory on the boat
              </p>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={handleAddItem} className="cursor-pointer">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )}
          </div>

          {/* Table */}
          {inventoryLoading ? (
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[20%]">Name</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden md:table-cell w-[15%]">Location</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[10%]">Packages</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[10%]">Oz/Pkg</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[12%]">Total Oz</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[12%]">Total Lbs</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden lg:table-cell w-[21%]">Notes</TableHead>
                  <TableHead className="h-10 w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6 hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-12 px-2">
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
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[20%]">Name</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden md:table-cell w-[15%]">Location</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[10%]">Packages</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[10%]">Oz/Pkg</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[12%]">Total Oz</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[12%]">Total Lbs</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden lg:table-cell w-[21%]">Notes</TableHead>
                  <TableHead className="h-10 w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {inStockGroups.map((group) => {
                  const bulletClass = typeBulletColorMap[group.color] || "bg-gray-400"
                  return (
                    <React.Fragment key={group.type || "__uncategorized"}>
                      {/* Group header row */}
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
                        <TableCell colSpan={8} className="h-9 px-4 sm:px-6 py-0">
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
                          className="border-b last:border-0 hover:bg-gray-50/50 transition-all duration-300"
                        >
                          <TableCell className="h-12 px-4 sm:px-6 overflow-hidden">
                            <span className="font-medium text-gray-900 truncate block">{item.name}</span>
                          </TableCell>
                          <TableCell className="h-12 px-4 sm:px-6 hidden md:table-cell overflow-hidden">
                            <span className="text-sm text-gray-600 truncate block">{item.location || "—"}</span>
                          </TableCell>
                          <TableCell className="h-12 px-4 sm:px-6 text-center">
                            <StepperNumberCell
                              value={item.packages ?? 0}
                              itemId={item.id}
                              field="packages"
                            />
                          </TableCell>
                          <TableCell className="h-12 px-4 sm:px-6 text-center">
                            <span className="text-sm text-gray-700">{item.oz_per_package ?? 0}</span>
                          </TableCell>
                          <TableCell className="h-12 px-4 sm:px-6 text-center">
                            <span className="text-sm font-semibold text-gray-900">
                              {(item.packages ?? 0) * (item.oz_per_package ?? 0)}
                              <span className="text-xs font-semibold text-gray-400 ml-1">oz</span>
                            </span>
                          </TableCell>
                          <TableCell className="h-12 px-4 sm:px-6 text-center">
                            <span className="text-sm font-semibold text-gray-900">
                              {(((item.packages ?? 0) * (item.oz_per_package ?? 0)) / 16).toFixed(1)}
                              <span className="text-xs font-semibold text-gray-400 ml-1">lb</span>
                            </span>
                          </TableCell>
                          <TableCell className="h-12 px-4 sm:px-6 hidden lg:table-cell overflow-hidden">
                            <span className="text-sm text-gray-500 truncate block">{item.notes || "—"}</span>
                          </TableCell>
                          <TableCell className="h-12 px-2 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                onClick={() => setViewItem(item)}
                                className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
                                title="View"
                              >
                                <Eye className="h-3.5 w-3.5 text-gray-400" />
                              </button>
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => handleEditItem(item)}
                                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
                                    title="Edit"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-gray-400" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(item)}
                                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                                  </button>
                                </>
                              )}
                            </div>
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
            <div className="px-4 sm:px-6 py-3 border-b bg-gray-50/50 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-500">Out of Stock</h2>
              <span className="text-xs text-gray-400">{outOfStockGroups.reduce((sum, g) => sum + g.items.length, 0)} items</span>
            </div>

            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[20%]">Name</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden md:table-cell w-[15%]">Location</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[10%]">Packages</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[10%]">Oz/Pkg</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[12%]">Total Oz</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[12%]">Total Lbs</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden lg:table-cell w-[21%]">Notes</TableHead>
                  <TableHead className="h-10 w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {outOfStockGroups.map((group) => {
                  const bulletClass = typeBulletColorMap[group.color] || "bg-gray-400"
                  return (
                    <React.Fragment key={`oos_${group.type || "__uncategorized"}`}>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
                        <TableCell colSpan={8} className="h-9 px-4 sm:px-6 py-0">
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
                          className="border-b last:border-0 hover:bg-gray-50/50 transition-all duration-300"
                        >
                          <TableCell className="h-12 px-4 sm:px-6 overflow-hidden">
                            <span className="font-medium text-gray-400 truncate block">{item.name}</span>
                          </TableCell>
                          <TableCell className="h-12 px-4 sm:px-6 hidden md:table-cell overflow-hidden">
                            <span className="text-sm text-gray-400 truncate block">{item.location || "—"}</span>
                          </TableCell>
                          <TableCell className="h-12 px-4 sm:px-6 text-center">
                            <StepperNumberCell
                              value={item.packages ?? 0}
                              itemId={item.id}
                              field="packages"
                            />
                          </TableCell>
                          <TableCell className="h-12 px-4 sm:px-6 text-center">
                            <span className="text-sm text-gray-400">{item.oz_per_package ?? 0}</span>
                          </TableCell>
                          <TableCell className="h-12 px-4 sm:px-6 text-center">
                            <span className="text-sm font-semibold text-gray-400">
                              {(item.packages ?? 0) * (item.oz_per_package ?? 0)}
                              <span className="text-xs font-semibold text-gray-300 ml-1">oz</span>
                            </span>
                          </TableCell>
                          <TableCell className="h-12 px-4 sm:px-6 text-center">
                            <span className="text-sm font-semibold text-gray-400">
                              {(((item.packages ?? 0) * (item.oz_per_package ?? 0)) / 16).toFixed(1)}
                              <span className="text-xs font-semibold text-gray-300 ml-1">lb</span>
                            </span>
                          </TableCell>
                          <TableCell className="h-12 px-4 sm:px-6 hidden lg:table-cell overflow-hidden">
                            <span className="text-sm text-gray-400 truncate block">{item.notes || "—"}</span>
                          </TableCell>
                          <TableCell className="h-12 px-2 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                onClick={() => setViewItem(item)}
                                className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
                                title="View"
                              >
                                <Eye className="h-3.5 w-3.5 text-gray-400" />
                              </button>
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => handleEditItem(item)}
                                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
                                    title="Edit"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-gray-400" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(item)}
                                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                                  </button>
                                </>
                              )}
                            </div>
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

      {/* View Item Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="sm:max-w-[480px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>{viewItem?.name}</DialogTitle>
            <DialogDescription>
              {viewItem?.type && (
                <span className="inline-flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${viewItemBulletClass}`} />
                  {viewItem.type}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {viewItem && (
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
            </div>
          )}

          {isAdmin && viewItem && (
            <DialogFooter className="flex !justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(viewItem)}
                className="cursor-pointer h-8 w-8"
              >
                <Trash2 className="h-4 w-4 text-gray-500" />
              </Button>
              <Button
                size="sm"
                onClick={() => handleEditItem(viewItem)}
                className="cursor-pointer"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog - modal={false} so base-ui Combobox portal can receive clicks */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 animate-in fade-in-0"
          onClick={() => setDialogOpen(false)}
        />
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} modal={false}>
        <DialogContent className="sm:max-w-[500px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Inventory Item" : "Add Inventory Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the details for this inventory item"
                : "Add a new item to the inventory"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Rice, Pasta, Chicken"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="packages">Packages</Label>
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
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
                "Update Item"
              ) : (
                "Add Item"
              )}
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
    </div>
  )
}
