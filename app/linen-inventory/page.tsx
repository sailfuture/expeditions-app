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
import { PlusCircle, Pencil, Trash2, BedDouble, Eye, Minus, Plus, X } from "lucide-react"
import {
  getExpeditionLinenInventory,
  createExpeditionLinenInventoryItem,
  updateExpeditionLinenInventoryItem,
  deleteExpeditionLinenInventoryItem,
  getExpeditionLinenInventoryLocations,
} from "@/lib/xano"
import { useCurrentUser } from "@/lib/contexts/user-context"

const SWR_KEY = "expedition_linen_inventory"

interface LinenItem {
  id: number
  created_at: number
  name: string
  type: string
  size: string
  color: string
  quantity: number
  brand: string
  location: string | null
}

const TYPE_OPTIONS = ["Charter", "Student", "Staff", "Crew"]

const SIZE_OPTIONS = ["Twin", "Full", "Queen", "King", "Standard", "One Size"]

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
      (current: LinenItem[] | undefined) =>
        current?.map((item) =>
          item.id === itemId ? { ...item, [field]: newValue } : item
        ),
      false
    )
    try {
      await updateExpeditionLinenInventoryItem(itemId, { [field]: newValue })
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

export default function LinenInventoryPage() {
  const { currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === "Admin"

  const { data: linenItems, isLoading } = useSWR(
    SWR_KEY,
    () => getExpeditionLinenInventory()
  )

  const { data: locationData } = useSWR(
    "expedition_linen_inventory_locations",
    () => getExpeditionLinenInventoryLocations()
  )
  const locationOptions = useMemo(() => {
    const list = (locationData || []) as Array<{ id: number; name: string }>
    return list
      .map((l) => l.name)
      .filter((name): name is string => !!name)
      .sort((a, b) => a.localeCompare(b))
  }, [locationData])

  // Sheet state (edit) + dialog state (view, delete)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LinenItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<LinenItem | null>(null)
  const [viewItem, setViewItem] = useState<LinenItem | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    size: "",
    color: "",
    quantity: "" as string | number,
    brand: "",
    location: "",
  })

  const handleAddItem = () => {
    setEditingItem(null)
    setFormData({ name: "", type: "", size: "", color: "", quantity: "", brand: "", location: "" })
    setSheetOpen(true)
  }

  const handleEditItem = (item: LinenItem) => {
    setViewItem(null)
    setEditingItem(item)
    setFormData({
      name: item.name || "",
      type: item.type || "",
      size: item.size || "",
      color: item.color || "",
      quantity: item.quantity ?? "",
      brand: item.brand || "",
      location: item.location || "",
    })
    setSheetOpen(true)
  }

  const handleDeleteClick = (item: LinenItem) => {
    setViewItem(null)
    setItemToDelete(item)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    try {
      await deleteExpeditionLinenInventoryItem(itemToDelete.id)
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
        brand: formData.brand,
        location: formData.location,
      }

      if (editingItem) {
        await updateExpeditionLinenInventoryItem(editingItem.id, submitData)
        toast.success("Item updated successfully")
      } else {
        await createExpeditionLinenInventoryItem(submitData)
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

  // Group items by type (Charter, Student, Staff, etc.)
  const groupedItems = useMemo(() => {
    const items = (linenItems || []) as LinenItem[]
    const groupMap = new Map<string, LinenItem[]>()

    items.forEach((item) => {
      const key = item.type || "Uncategorized"
      if (!groupMap.has(key)) {
        groupMap.set(key, [])
      }
      groupMap.get(key)!.push(item)
    })

    const groups: { type: string; items: LinenItem[] }[] = []
    // Sort by TYPE_OPTIONS order, then alphabetical for unknowns
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
  }, [linenItems])

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

  const items = (linenItems || []) as LinenItem[]

  const renderTableHeaders = () => (
    <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
      <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 w-1/3 md:w-[20%]">Name</TableHead>
      <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 w-1/3 md:w-[10%]">Size</TableHead>
      <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 hidden md:table-cell md:w-[12%]">Color</TableHead>
      <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 hidden lg:table-cell lg:w-[12%]">Brand</TableHead>
      <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 text-center w-1/3 md:w-[14%]">Quantity</TableHead>
      <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 hidden md:table-cell md:w-[18%]">Location</TableHead>
      <TableHead className="h-10 w-[14%] hidden md:table-cell" />
    </TableRow>
  )

  const renderItemRow = (item: LinenItem, muted: boolean) => (
    <TableRow
      key={item.id}
      onClick={() => setViewItem(item)}
      className="border-b last:border-0 hover:bg-gray-50/50 transition-all duration-300 cursor-pointer"
    >
      <TableCell className="h-12 px-2 md:px-6 overflow-hidden">
        <span className={`font-medium truncate block ${muted ? "text-gray-400" : "text-gray-900"}`} title={item.name}>{item.name}</span>
      </TableCell>
      <TableCell className="h-12 px-2 md:px-6 overflow-hidden">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 max-w-full truncate ${muted ? "text-gray-400" : "text-gray-700"}`} title={item.size || undefined}>
          {item.size || "\u2014"}
        </span>
      </TableCell>
      <TableCell className="h-12 px-4 md:px-6 hidden md:table-cell overflow-hidden">
        <span className={`text-sm truncate block ${muted ? "text-gray-400" : "text-gray-600"}`}>{item.color || "\u2014"}</span>
      </TableCell>
      <TableCell className="h-12 px-4 md:px-6 hidden lg:table-cell overflow-hidden">
        <span className={`text-sm truncate block ${muted ? "text-gray-400" : "text-gray-600"}`}>{item.brand || "\u2014"}</span>
      </TableCell>
      <TableCell className="h-12 px-2 md:px-6 text-center">
        <StepperNumberCell
          value={item.quantity ?? 0}
          itemId={item.id}
          field="quantity"
        />
      </TableCell>
      <TableCell className="h-12 px-4 md:px-6 hidden md:table-cell overflow-hidden">
        {item.location ? (
          <span className={`text-sm truncate block ${muted ? "text-gray-400" : "text-gray-600"}`} title={item.location}>{item.location}</span>
        ) : (
          <span className="text-sm text-gray-400">{"\u2014"}</span>
        )}
      </TableCell>
      <TableCell
        className="h-12 px-2 text-right hidden md:table-cell"
        onClick={(e) => e.stopPropagation()}
      >
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
  )

  const renderGroupHeader = (type: string, count: number) => (
    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
      <TableCell colSpan={7} className="h-9 px-4 sm:px-6 py-0">
        <div className="flex items-center gap-2">
          <BedDouble className="h-3.5 w-3.5 text-gray-400" />
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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b bg-gray-50/50 flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold">Linen Inventory</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage sheets, comforters, pillows, and other linens
              </p>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 w-full">
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
          {isLoading ? (
            <Table className="w-full table-fixed">
              <TableHeader>{renderTableHeaders()}</TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-12 px-2 md:px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-12 px-2 md:px-6"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="h-12 px-4 md:px-6 hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-12 px-4 md:px-6 hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-12 px-2 md:px-6"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                    <TableCell className="h-12 px-4 md:px-6 hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
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
              <BedDouble className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No linen items yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Add items to track linen inventory for the vessel
              </p>
            </div>
          ) : inStockGroups.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <BedDouble className="h-12 w-12 mx-auto mb-3 text-gray-300" />
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

      {/* View Item Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="sm:max-w-[420px] [&>button]:cursor-pointer">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap pr-6">
              <DialogTitle className="text-left">{viewItem?.name || "Item"}</DialogTitle>
              {viewItem?.size && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                  {viewItem.size}
                </span>
              )}
            </div>
            {viewItem?.type && (
              <DialogDescription className="text-left">{viewItem.type}</DialogDescription>
            )}
          </DialogHeader>

          {viewItem && (
            <div className="grid grid-cols-2 gap-4 py-1">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Color</p>
                <p className="text-sm text-gray-900 mt-1 break-words">{viewItem.color || "\u2014"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{viewItem.quantity ?? 0}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</p>
                <p className="text-sm text-gray-900 mt-1 break-words">{viewItem.brand || "\u2014"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Size</p>
                <p className="text-sm text-gray-900 mt-1 break-words">{viewItem.size || "\u2014"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location</p>
                <p className="text-sm text-gray-900 mt-1 break-words">{viewItem.location || "\u2014"}</p>
              </div>
            </div>
          )}

          {isAdmin && viewItem && (
            <DialogFooter className="!flex-row items-center !justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteClick(viewItem)}
                className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
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

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:w-[520px] sm:max-w-[90vw] p-0 flex flex-col h-full overflow-hidden">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl">
                  {editingItem ? "Edit Linen Item" : "Add Linen Item"}
                </SheetTitle>
                <SheetDescription>
                  {editingItem
                    ? "Update the details for this linen item"
                    : "Add a new item to the linen inventory"}
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
                placeholder="e.g., Fitted Sheet, Comforter, Pillow Case"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-8 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                <option value="">Select type</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <select
                id="size"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-8 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                <option value="">Select size</option>
                {SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                placeholder="e.g., Navy"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                placeholder="e.g., Walmart"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <select
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-8 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                <option value="">No location</option>
                {locationOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
                {formData.location && !locationOptions.includes(formData.location) && (
                  <option value={formData.location}>{formData.location} (legacy)</option>
                )}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{itemToDelete?.name}{itemToDelete?.size ? ` (${itemToDelete.size})` : ""}&quot;?
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
