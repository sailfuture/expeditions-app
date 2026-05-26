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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { PlusCircle, Pencil, Trash2, Package, Eye, Minus, Plus, ExternalLink, X } from "lucide-react"
import {
  getExpeditionsSupplies,
  createExpeditionsSuppliesItem,
  updateExpeditionsSuppliesItem,
  deleteExpeditionsSuppliesItem,
} from "@/lib/xano"
import { useCurrentUser } from "@/lib/contexts/user-context"

const SWR_KEY = "expeditions_supplies"

interface SupplyItem {
  id: number
  created_at: number
  name: string
  type: string
  isOutofStock: boolean
  notes: string
  quantity: number
  isArchived: boolean
  last_edited: number | null
  cost: number
  url: string
}

const TYPE_OPTIONS = [
  "Medical",
  "School",
  "Deck",
  "Student",
  "Galley",
  "Engine",
  "Safety",
  "Other",
]

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
    mutate(
      SWR_KEY,
      (current: SupplyItem[] | undefined) =>
        current?.map((item) =>
          item.id === itemId ? { ...item, [field]: newValue } : item
        ),
      false
    )
    try {
      await updateExpeditionsSuppliesItem(itemId, { [field]: newValue })
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

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || isNaN(value)) return "—"
  return `$${value.toFixed(2)}`
}

export default function SuppliesPage() {
  const { currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === "Admin"

  const { data: supplyItems, isLoading } = useSWR(
    SWR_KEY,
    () => getExpeditionsSupplies()
  )

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SupplyItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<SupplyItem | null>(null)

  // Form state
  const emptyForm = {
    name: "",
    type: "",
    notes: "",
    quantity: "" as string | number,
    cost: "" as string | number,
    url: "",
    isOutofStock: false,
    isArchived: false,
  }
  const [formData, setFormData] = useState(emptyForm)

  const handleAddItem = () => {
    setEditingItem(null)
    setFormData(emptyForm)
    setSheetOpen(true)
  }

  const handleEditItem = (item: SupplyItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name || "",
      type: item.type || "",
      notes: item.notes || "",
      quantity: item.quantity ?? "",
      cost: item.cost ?? "",
      url: item.url || "",
      isOutofStock: !!item.isOutofStock,
      isArchived: !!item.isArchived,
    })
    setSheetOpen(true)
  }

  const handleDeleteClick = (item: SupplyItem) => {
    setItemToDelete(item)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    try {
      await deleteExpeditionsSuppliesItem(itemToDelete.id)
      mutate(SWR_KEY)
      toast.success("Item deleted successfully")
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
      setSheetOpen(false)
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
        name: formData.name.trim(),
        type: formData.type,
        notes: formData.notes,
        quantity: formData.quantity === "" ? 0 : Number(formData.quantity),
        cost: formData.cost === "" ? 0 : Number(formData.cost),
        url: formData.url.trim(),
        isOutofStock: formData.isOutofStock,
        isArchived: formData.isArchived,
      }

      if (editingItem) {
        await updateExpeditionsSuppliesItem(editingItem.id, submitData)
        toast.success("Item updated successfully")
      } else {
        await createExpeditionsSuppliesItem(submitData)
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

  // Filter out archived, group by type
  const groupedItems = useMemo(() => {
    const items = ((supplyItems || []) as SupplyItem[]).filter((i) => !i.isArchived)
    const groupMap = new Map<string, SupplyItem[]>()

    items.forEach((item) => {
      const key = item.type || "Uncategorized"
      if (!groupMap.has(key)) {
        groupMap.set(key, [])
      }
      groupMap.get(key)!.push(item)
    })

    const groups: { type: string; items: SupplyItem[] }[] = []
    const sortedKeys = [...groupMap.keys()].sort((a, b) => {
      const aIdx = TYPE_OPTIONS.indexOf(a)
      const bIdx = TYPE_OPTIONS.indexOf(b)
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b)
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })

    sortedKeys.forEach((key) => {
      const groupItems = groupMap.get(key)!
      groupItems.sort((a, b) => a.name.localeCompare(b.name))
      groups.push({ type: key, items: groupItems })
    })

    return groups
  }, [supplyItems])

  // Split into in-stock / out-of-stock
  const { inStockGroups, outOfStockGroups } = useMemo(() => {
    const inStock: typeof groupedItems = []
    const outOfStock: typeof groupedItems = []

    groupedItems.forEach((group) => {
      const inStockItems = group.items.filter(
        (item) => !item.isOutofStock && (item.quantity ?? 0) > 0
      )
      const outOfStockItems = group.items.filter(
        (item) => item.isOutofStock || (item.quantity ?? 0) === 0
      )
      if (inStockItems.length > 0) inStock.push({ ...group, items: inStockItems })
      if (outOfStockItems.length > 0) outOfStock.push({ ...group, items: outOfStockItems })
    })

    return { inStockGroups: inStock, outOfStockGroups: outOfStock }
  }, [groupedItems])

  const items = ((supplyItems || []) as SupplyItem[]).filter((i) => !i.isArchived)

  const renderTableHeaders = () => (
    <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[28%]">Name</TableHead>
      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden md:table-cell w-[14%]">Cost</TableHead>
      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden lg:table-cell w-[18%]">Link</TableHead>
      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center w-[20%]">Quantity</TableHead>
      <TableHead className="h-10 w-[20%]" />
    </TableRow>
  )

  const renderItemRow = (item: SupplyItem, muted: boolean) => (
    <TableRow
      key={item.id}
      className="border-b last:border-0 hover:bg-gray-50/50 transition-all duration-300"
    >
      <TableCell className="h-12 px-4 sm:px-6 overflow-hidden">
        <div className="flex flex-col">
          <span className={`font-medium truncate ${muted ? "text-gray-400" : "text-gray-900"}`}>{item.name}</span>
          {item.notes && (
            <span className={`text-xs truncate ${muted ? "text-gray-300" : "text-gray-500"}`}>{item.notes}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="h-12 px-4 sm:px-6 hidden md:table-cell overflow-hidden">
        <span className={`text-sm tabular-nums ${muted ? "text-gray-400" : "text-gray-600"}`}>
          {item.type === "Student" ? formatCurrency(item.cost) : "—"}
        </span>
      </TableCell>
      <TableCell className="h-12 px-4 sm:px-6 hidden lg:table-cell overflow-hidden">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center gap-1 text-sm hover:underline ${muted ? "text-gray-400" : "text-blue-600"}`}
            title={item.url}
          >
            <ExternalLink className="h-3 w-3" />
            <span className="truncate max-w-[140px]">Link</span>
          </a>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
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
            onClick={() => handleEditItem(item)}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
            title="View / Edit"
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
  )

  const renderGroupHeader = (type: string, count: number) => (
    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
      <TableCell colSpan={5} className="h-9 px-4 sm:px-6 py-0">
        <div className="flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {type}
          </span>
          <span className="text-xs text-gray-400">
            ({count})
          </span>
        </div>
      </TableCell>
    </TableRow>
  )

  const isStudentType = formData.type === "Student"

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Supplies Inventory</h2>
              <p className="text-sm text-gray-600 mt-1">
                Track general supplies — medical, school, deck, student items, and more
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
              <TableHeader>{renderTableHeaders()}</TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6 hidden md:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6 hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
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
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No supplies yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Add items to track general supplies on the vessel
              </p>
            </div>
          ) : inStockGroups.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">All items out of stock</p>
            </div>
          ) : (
            <Table className="w-full table-fixed">
              <TableHeader>{renderTableHeaders()}</TableHeader>
              <TableBody>
                {inStockGroups.map((group) => (
                  <React.Fragment key={group.type}>
                    {renderGroupHeader(group.type, group.items.length)}
                    {group.items.map((item) => renderItemRow(item, false))}
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
              <TableHeader>{renderTableHeaders()}</TableHeader>
              <TableBody>
                {outOfStockGroups.map((group) => (
                  <React.Fragment key={`oos_${group.type}`}>
                    {renderGroupHeader(group.type, group.items.length)}
                    {group.items.map((item) => renderItemRow(item, true))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:w-[520px] sm:max-w-[90vw] p-0 flex flex-col h-full overflow-hidden">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl">
                {editingItem ? "Edit Supply Item" : "Add Supply Item"}
              </SheetTitle>
              <button
                onClick={() => setSheetOpen(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Bandages, Notebook, Sunscreen"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isAdmin}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  disabled={!isAdmin}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select type</option>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
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
                  disabled={!isAdmin}
                />
              </div>
            </div>

            {isStudentType && (
              <div className="space-y-2">
                <Label htmlFor="cost">Cost (USD)</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  disabled={!isAdmin}
                />
                <p className="text-xs text-gray-500">
                  Charged to students when issued
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="url">Purchase URL (e.g., Amazon)</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://www.amazon.com/..."
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional details about this item..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={!isAdmin}
                className="min-h-[88px]"
              />
            </div>

            <div className="space-y-3 pt-2 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isOutofStock}
                  onChange={(e) => setFormData({ ...formData, isOutofStock: e.target.checked })}
                  disabled={!isAdmin}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="text-sm text-gray-700">Mark as out of stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isArchived}
                  onChange={(e) => setFormData({ ...formData, isArchived: e.target.checked })}
                  disabled={!isAdmin}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="text-sm text-gray-700">Archive this item</span>
              </label>
            </div>
          </div>

          {isAdmin && (
            <div className="border-t p-4 flex items-center justify-between shrink-0 bg-white">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSheetOpen(false)}
                  disabled={isSubmitting}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
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
            </div>
          )}
        </SheetContent>
      </Sheet>

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
