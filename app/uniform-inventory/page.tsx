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
import { PlusCircle, Pencil, Trash2, Shirt, Eye, Minus, Plus } from "lucide-react"
import {
  getExpeditionUniformInventory,
  createExpeditionUniformInventoryItem,
  updateExpeditionUniformInventoryItem,
  deleteExpeditionUniformInventoryItem,
} from "@/lib/xano"
import { useCurrentUser } from "@/lib/contexts/user-context"

const SWR_KEY = "expedition_uniform_inventory"

interface UniformItem {
  id: number
  created_at: number
  name: string
  type: string
  size: string
  color: string
  quantity: number
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]

const NAME_OPTIONS = ["Staff", "Student"]

const COLOR_OPTIONS = ["Black", "White", "Navy", "Light Blue", "Gray", "Red", "Green", "Yellow", "Orange", "Khaki"]

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
      (current: UniformItem[] | undefined) =>
        current?.map((item) =>
          item.id === itemId ? { ...item, [field]: newValue } : item
        ),
      false
    )
    try {
      await updateExpeditionUniformInventoryItem(itemId, { [field]: newValue })
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

export default function UniformInventoryPage() {
  const { currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === "Admin"

  const { data: uniformItems, isLoading } = useSWR(
    SWR_KEY,
    () => getExpeditionUniformInventory()
  )

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<UniformItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<UniformItem | null>(null)
  const [viewItem, setViewItem] = useState<UniformItem | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    size: "",
    color: "",
    quantity: "" as string | number,
  })

  const handleAddItem = () => {
    setEditingItem(null)
    setFormData({ name: "", type: "", size: "", color: "", quantity: "" })
    setDialogOpen(true)
  }

  const handleEditItem = (item: UniformItem) => {
    setViewItem(null)
    setEditingItem(item)
    setFormData({
      name: item.name || "",
      type: item.type || "",
      size: item.size || "",
      color: item.color || "",
      quantity: item.quantity ?? "",
    })
    setDialogOpen(true)
  }

  const handleDeleteClick = (item: UniformItem) => {
    setViewItem(null)
    setItemToDelete(item)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    try {
      await deleteExpeditionUniformInventoryItem(itemToDelete.id)
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
        size: formData.size,
        color: formData.color,
        quantity: formData.quantity === "" ? 0 : Number(formData.quantity),
      }

      if (editingItem) {
        await updateExpeditionUniformInventoryItem(editingItem.id, submitData)
        toast.success("Item updated successfully")
      } else {
        await createExpeditionUniformInventoryItem(submitData)
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

  // Group items by name, then sort sizes within each group
  const groupedItems = useMemo(() => {
    const items = (uniformItems || []) as UniformItem[]
    const groupMap = new Map<string, UniformItem[]>()

    items.forEach((item) => {
      const key = item.name || "Uncategorized"
      if (!groupMap.has(key)) {
        groupMap.set(key, [])
      }
      groupMap.get(key)!.push(item)
    })

    // Sort items within each group by size order
    const groups: { name: string; items: UniformItem[] }[] = []
    const sortedKeys = [...groupMap.keys()].sort((a, b) => a.localeCompare(b))

    sortedKeys.forEach((key) => {
      const groupItems = groupMap.get(key)!
      groupItems.sort((a, b) => {
        const aIdx = SIZE_ORDER.indexOf(a.size)
        const bIdx = SIZE_ORDER.indexOf(b.size)
        if (aIdx === -1 && bIdx === -1) return a.size.localeCompare(b.size)
        if (aIdx === -1) return 1
        if (bIdx === -1) return -1
        return aIdx - bIdx
      })
      groups.push({ name: key, items: groupItems })
    })

    return groups
  }, [uniformItems])

  // Split into in-stock and out-of-stock groups
  const { inStockGroups, outOfStockGroups } = useMemo(() => {
    const inStock: typeof groupedItems = []
    const outOfStock: typeof groupedItems = []

    groupedItems.forEach((group) => {
      const inStockItems = group.items.filter((item) => (item.quantity ?? 0) > 0)
      const outOfStockItems = group.items.filter((item) => (item.quantity ?? 0) === 0)
      if (inStockItems.length > 0) {
        inStock.push({ ...group, items: inStockItems })
      }
      if (outOfStockItems.length > 0) {
        outOfStock.push({ ...group, items: outOfStockItems })
      }
    })

    return { inStockGroups: inStock, outOfStockGroups: outOfStock }
  }, [groupedItems])

  const items = (uniformItems || []) as UniformItem[]

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Uniform Inventory</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage uniform and clothing inventory for expeditions
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
          {isLoading ? (
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[25%]">Type</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[15%]">Size</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden md:table-cell w-[20%]">Color</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[20%]">Quantity</TableHead>
                  <TableHead className="h-10 w-[20%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6 hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
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
              <Shirt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No uniform items yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Add items to track uniform inventory for expeditions
              </p>
            </div>
          ) : inStockGroups.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Shirt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">All items out of stock</p>
            </div>
          ) : (
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[25%]">Type</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[15%]">Size</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden md:table-cell w-[20%]">Color</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[20%]">Quantity</TableHead>
                  <TableHead className="h-10 w-[20%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {inStockGroups.map((group) => (
                  <React.Fragment key={group.name}>
                    {/* Group header row */}
                    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
                      <TableCell colSpan={5} className="h-9 px-4 sm:px-6 py-0">
                        <div className="flex items-center gap-2">
                          <Shirt className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {group.name}
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
                          <span className="font-medium text-gray-900 truncate block">{item.type || "—"}</span>
                        </TableCell>
                        <TableCell className="h-12 px-4 sm:px-6 overflow-hidden">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                            {item.size || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="h-12 px-4 sm:px-6 hidden md:table-cell overflow-hidden">
                          <span className="text-sm text-gray-600 truncate block">{item.color || "—"}</span>
                        </TableCell>
                        <TableCell className="h-12 px-4 sm:px-6 text-center">
                          <StepperNumberCell
                            value={item.quantity ?? 0}
                            itemId={item.id}
                            field="quantity"
                          />
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
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Out of Stock Table */}
        {!isLoading && outOfStockGroups.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden opacity-75 transition-all duration-300">
            <div className="px-4 sm:px-6 py-3 border-b bg-gray-50/50 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-500">Out of Stock</h2>
              <span className="text-xs text-gray-400">{outOfStockGroups.reduce((sum, g) => sum + g.items.length, 0)} items</span>
            </div>

            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[25%]">Type</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[15%]">Size</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden md:table-cell w-[20%]">Color</TableHead>
                  <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[20%]">Quantity</TableHead>
                  <TableHead className="h-10 w-[20%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {outOfStockGroups.map((group) => (
                  <React.Fragment key={`oos_${group.name}`}>
                    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
                      <TableCell colSpan={5} className="h-9 px-4 sm:px-6 py-0">
                        <div className="flex items-center gap-2">
                          <Shirt className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {group.name}
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
                          <span className="font-medium text-gray-400 truncate block">{item.type || "—"}</span>
                        </TableCell>
                        <TableCell className="h-12 px-4 sm:px-6 overflow-hidden">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-400">
                            {item.size || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="h-12 px-4 sm:px-6 hidden md:table-cell overflow-hidden">
                          <span className="text-sm text-gray-400 truncate block">{item.color || "—"}</span>
                        </TableCell>
                        <TableCell className="h-12 px-4 sm:px-6 text-center">
                          <StepperNumberCell
                            value={item.quantity ?? 0}
                            itemId={item.id}
                            field="quantity"
                          />
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* View Item Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="sm:max-w-[400px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>{viewItem?.name}</DialogTitle>
            <DialogDescription>
              {viewItem?.size && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                  Size: {viewItem.size}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type</p>
                  <p className="text-sm text-gray-900 mt-1">{viewItem.type || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Size</p>
                  <p className="text-sm text-gray-900 mt-1">{viewItem.size || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Color</p>
                  <p className="text-sm text-gray-900 mt-1">{viewItem.color || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</p>
                  <p className="text-sm text-gray-900 mt-1">{viewItem.quantity ?? 0}</p>
                </div>
              </div>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Uniform Item" : "Add Uniform Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the details for this uniform item"
                : "Add a new item to the uniform inventory"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <select
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                <option value="">Select</option>
                {NAME_OPTIONS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                placeholder="e.g., Long Sleeve, Polo, Shorts"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <select
                  id="size"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="">Select size</option>
                  {SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <select
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="">Select color</option>
                  {COLOR_OPTIONS.map((color) => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                />
              </div>
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
              Are you sure you want to delete &quot;{itemToDelete?.name} ({itemToDelete?.size})&quot;?
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
