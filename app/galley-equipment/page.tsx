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
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  PlusCircle,
  Pencil,
  Trash2,
  ChefHat,
  Eye,
  X,
} from "lucide-react"
import {
  getGalleyEquipment,
  createGalleyEquipment,
  updateGalleyEquipment,
  deleteGalleyEquipment,
  getExpeditionSupplyInventoryLocations,
} from "@/lib/xano"
import { useCurrentUser } from "@/lib/contexts/user-context"

const SWR_KEY = "expedition_galley_equipment"
const LOCATIONS_SWR_KEY = "expedition_supply_inventory_locations"

interface EquipmentItem {
  id: number
  created_at: number
  name: string
  category: string
  location: string
}

type SortMode = "name" | "location"
type GroupMode = "category" | "none"

export default function GalleyEquipmentPage() {
  const { currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === "Admin"

  const { data: equipmentItems, isLoading } = useSWR(
    SWR_KEY,
    () => getGalleyEquipment()
  )

  const { data: locationData } = useSWR(
    LOCATIONS_SWR_KEY,
    () => getExpeditionSupplyInventoryLocations()
  )
  const locationOptions = useMemo(() => {
    const list = (locationData || []) as Array<{ id: number; name: string }>
    return list
      .map((l) => l.name)
      .filter((name): name is string => !!name)
      .sort((a, b) => a.localeCompare(b))
  }, [locationData])

  // Collect existing categories from data for the datalist
  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    ;((equipmentItems || []) as EquipmentItem[]).forEach((i) => {
      if (i.category) set.add(i.category)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [equipmentItems])

  // Sort + group controls
  const [sortMode, setSortMode] = useState<SortMode>("name")
  const [groupMode, setGroupMode] = useState<GroupMode>("category")

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<EquipmentItem | null>(null)

  const emptyForm = { name: "", category: "", location: "" }
  const [formData, setFormData] = useState(emptyForm)

  const handleAddItem = () => {
    setEditingItem(null)
    setFormData(emptyForm)
    setSheetOpen(true)
  }

  const handleEditItem = (item: EquipmentItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name || "",
      category: item.category || "",
      location: item.location || "",
    })
    setSheetOpen(true)
  }

  const handleDeleteClick = (item: EquipmentItem) => {
    setItemToDelete(item)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    try {
      await deleteGalleyEquipment(itemToDelete.id)
      mutate(SWR_KEY)
      toast.success("Equipment deleted")
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
      setSheetOpen(false)
    } catch (error) {
      console.error("Error deleting equipment:", error)
      toast.error("Failed to delete equipment")
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required")
      return
    }

    setIsSubmitting(true)
    try {
      const submitData = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        location: formData.location.trim(),
      }

      if (editingItem) {
        await updateGalleyEquipment(editingItem.id, submitData)
        toast.success("Equipment updated")
      } else {
        await createGalleyEquipment(submitData)
        toast.success("Equipment added")
      }
      mutate(SWR_KEY)
      setSheetOpen(false)
    } catch (error) {
      console.error("Error saving equipment:", error)
      toast.error("Failed to save equipment")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Comparators
  const compareByLocation = (a: EquipmentItem, b: EquipmentItem) => {
    const al = (a.location || "").toLowerCase()
    const bl = (b.location || "").toLowerCase()
    if (!al && bl) return 1
    if (al && !bl) return -1
    if (al !== bl) return al.localeCompare(bl)
    return (a.name || "").localeCompare(b.name || "")
  }
  const compareByName = (a: EquipmentItem, b: EquipmentItem) =>
    (a.name || "").localeCompare(b.name || "")
  const comparator = sortMode === "location" ? compareByLocation : compareByName

  const groupedItems = useMemo(() => {
    const items = (equipmentItems || []) as EquipmentItem[]

    if (groupMode === "none") {
      const sorted = [...items].sort(comparator)
      return [{ category: "All Equipment", items: sorted }]
    }

    const groupMap = new Map<string, EquipmentItem[]>()
    items.forEach((item) => {
      const key = item.category || "Uncategorized"
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push(item)
    })

    const groups: { category: string; items: EquipmentItem[] }[] = []
    const sortedKeys = [...groupMap.keys()].sort((a, b) => a.localeCompare(b))

    sortedKeys.forEach((key) => {
      const groupItems = groupMap.get(key)!.slice().sort(comparator)
      groups.push({ category: key, items: groupItems })
    })

    return groups
  }, [equipmentItems, groupMode, comparator])

  const items = (equipmentItems || []) as EquipmentItem[]

  const renderTableHeaders = () => (
    <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[34%]">Name</TableHead>
      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[26%]">Category</TableHead>
      <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[24%]">Location</TableHead>
      <TableHead className="h-10 px-2 text-xs font-semibold text-gray-600 text-right w-[16%]">Actions</TableHead>
    </TableRow>
  )

  const renderItemRow = (item: EquipmentItem) => (
    <TableRow
      key={item.id}
      className="border-b last:border-0 hover:bg-gray-50/50 transition-all duration-300"
    >
      <TableCell className="h-12 px-4 sm:px-6 overflow-hidden">
        <span className="font-medium text-gray-900 truncate block">{item.name}</span>
      </TableCell>
      <TableCell className="h-12 px-4 sm:px-6 overflow-hidden">
        {item.category ? (
          <span className="text-sm text-gray-600 truncate block">{item.category}</span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className="h-12 px-4 sm:px-6 overflow-hidden">
        {item.location ? (
          <span className="text-sm text-gray-600 truncate block">{item.location}</span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
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

  const renderGroupHeader = (category: string, count: number) => (
    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
      <TableCell colSpan={4} className="h-9 px-4 sm:px-6 py-0">
        <div className="flex items-center gap-2">
          <ChefHat className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {category}
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
          <div className="px-4 sm:px-6 py-4 border-b bg-gray-50/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Galley Equipment</h2>
              <p className="text-sm text-gray-600 mt-1">
                Pots, pans, prep tools, and other galley equipment — and where they live
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span className="hidden sm:inline">Sort</span>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="h-8 rounded-md border border-input bg-transparent pl-2 pr-6 text-xs shadow-sm cursor-pointer"
                  aria-label="Sort items by"
                >
                  <option value="name">Name</option>
                  <option value="location">Location</option>
                </select>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span className="hidden sm:inline">Group</span>
                <select
                  value={groupMode}
                  onChange={(e) => setGroupMode(e.target.value as GroupMode)}
                  className="h-8 rounded-md border border-input bg-transparent pl-2 pr-6 text-xs shadow-sm cursor-pointer"
                  aria-label="Group items by"
                >
                  <option value="category">By Category</option>
                  <option value="none">None</option>
                </select>
              </div>
              {isAdmin && (
                <Button size="sm" onClick={handleAddItem} className="cursor-pointer">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Equipment
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <Table className="w-full table-fixed">
              <TableHeader>{renderTableHeaders()}</TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-24" /></TableCell>
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
              <ChefHat className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No galley equipment yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Add pots, pans, knives, and other equipment to track what&apos;s aboard
              </p>
            </div>
          ) : (
            <Table className="w-full table-fixed">
              <TableHeader>{renderTableHeaders()}</TableHeader>
              <TableBody>
                {groupedItems.map((group) => (
                  <React.Fragment key={group.category}>
                    {groupMode === "category" && renderGroupHeader(group.category, group.items.length)}
                    {group.items.map((item) => renderItemRow(item))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:w-[480px] sm:max-w-[90vw] p-0 flex flex-col h-full overflow-hidden">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl">
                  {editingItem ? "Edit Equipment" : "Add Equipment"}
                </SheetTitle>
                <SheetDescription>
                  {editingItem
                    ? "Update the details for this piece of galley equipment"
                    : "Add a new piece of equipment to the galley inventory"}
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
                placeholder="e.g., Stove, Cutting board, Whisk"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                list="galley-equipment-categories"
                placeholder="e.g., Heat Sources, Cookware, Utensils"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={!isAdmin}
              />
              <datalist id="galley-equipment-categories">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="text-xs text-gray-500">
                Pick an existing category or type a new one to group similar items together.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <select
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={!isAdmin}
                className="flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-8 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">No location</option>
                {locationOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
                {/* Preserve legacy free-text values that no longer match a managed location */}
                {formData.location && !locationOptions.includes(formData.location) && (
                  <option value={formData.location}>{formData.location} (legacy)</option>
                )}
              </select>
              <p className="text-xs text-gray-500">
                Locations are shared with the Supplies inventory. Manage them on the Locations page.
              </p>
            </div>
          </div>

          {isAdmin && (
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
                    "Add Equipment"
                  )}
                </Button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Delete Equipment</DialogTitle>
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
