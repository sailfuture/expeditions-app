"use client"

import React, { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { PlusCircle, Pencil, Trash2, MapPin, X } from "lucide-react"
import {
  getExpeditionInventoryLocations,
  createExpeditionInventoryLocation,
  updateExpeditionInventoryLocation,
  deleteExpeditionInventoryLocation,
  getExpeditionSupplyInventoryLocations,
  createExpeditionSupplyInventoryLocation,
  updateExpeditionSupplyInventoryLocation,
  deleteExpeditionSupplyInventoryLocation,
  getExpeditionLinenInventoryLocations,
  createExpeditionLinenInventoryLocation,
  updateExpeditionLinenInventoryLocation,
  deleteExpeditionLinenInventoryLocation,
} from "@/lib/xano"
import { useCurrentUser } from "@/lib/contexts/user-context"

interface LocationItem {
  id: number
  created_at?: number
  name: string
  description?: string
}

type CategoryKey = "supply" | "galley" | "linen"

interface CategoryConfig {
  key: CategoryKey
  title: string
  subtitle: string
  swrKey: string
  fetcher: () => Promise<any[]>
  create: (data: { name: string; description?: string }) => Promise<any>
  update: (id: number, data: Record<string, any>) => Promise<any>
  remove: (id: number) => Promise<any>
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: "supply",
    title: "Supply Locations",
    subtitle: "Used by the Supplies inventory dropdown",
    swrKey: "expedition_supply_inventory_locations",
    fetcher: getExpeditionSupplyInventoryLocations,
    create: createExpeditionSupplyInventoryLocation,
    update: updateExpeditionSupplyInventoryLocation,
    remove: deleteExpeditionSupplyInventoryLocation,
  },
  {
    key: "galley",
    title: "Galley Locations",
    subtitle: "Used by the Galley inventory dropdown",
    swrKey: "expedition_inventory_locations",
    fetcher: getExpeditionInventoryLocations,
    create: createExpeditionInventoryLocation,
    update: updateExpeditionInventoryLocation,
    remove: deleteExpeditionInventoryLocation,
  },
  {
    key: "linen",
    title: "Linen & Uniform Locations",
    subtitle: "Shared between the Linen and Uniform inventory dropdowns",
    swrKey: "expedition_linen_inventory_locations",
    fetcher: getExpeditionLinenInventoryLocations,
    create: createExpeditionLinenInventoryLocation,
    update: updateExpeditionLinenInventoryLocation,
    remove: deleteExpeditionLinenInventoryLocation,
  },
]

type SheetState =
  | { mode: "closed" }
  | { mode: "add"; category: CategoryConfig }
  | { mode: "edit"; category: CategoryConfig; item: LocationItem }

function LocationsTable({ category }: { category: CategoryConfig }) {
  const { currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === "Admin"

  const { data, isLoading } = useSWR(category.swrKey, category.fetcher)
  const items = ((data || []) as LocationItem[]).slice().sort((a, b) => a.name.localeCompare(b.name))

  const [sheetState, setSheetState] = useState<SheetState>({ mode: "closed" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: "", description: "" })

  const [deleteConfirm, setDeleteConfirm] = useState<LocationItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const openAdd = () => {
    setFormData({ name: "", description: "" })
    setSheetState({ mode: "add", category })
  }

  const openEdit = (item: LocationItem) => {
    setFormData({ name: item.name || "", description: item.description || "" })
    setSheetState({ mode: "edit", category, item })
  }

  const closeSheet = () => setSheetState({ mode: "closed" })

  const handleSubmit = async () => {
    const trimmedName = formData.name.trim()
    if (!trimmedName) {
      toast.error("Name is required")
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        name: trimmedName,
        description: formData.description.trim(),
      }
      if (sheetState.mode === "edit") {
        await category.update(sheetState.item.id, payload)
        toast.success("Location updated")
      } else {
        await category.create(payload)
        toast.success("Location added")
      }
      mutate(category.swrKey)
      closeSheet()
    } catch (error) {
      console.error("Error saving location:", error)
      toast.error("Failed to save location")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      await category.remove(deleteConfirm.id)
      mutate(category.swrKey)
      toast.success("Location deleted")
      setDeleteConfirm(null)
    } catch (error) {
      console.error("Error deleting location:", error)
      toast.error("Failed to delete location")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{category.title}</h2>
          <p className="text-sm text-gray-600 mt-1">{category.subtitle}</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openAdd} className="cursor-pointer">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        )}
      </div>

      {isLoading ? (
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
              <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[35%]">Name</TableHead>
              <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[50%]">Description</TableHead>
              <TableHead className="h-10 px-2 text-xs font-semibold text-gray-600 text-right w-[15%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="h-12 px-4 sm:px-6"><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell className="h-12 px-2">
                  <div className="flex items-center justify-end gap-0.5">
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
          <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">No locations yet</p>
          <p className="text-sm text-gray-500 mt-1">Add a location to use it in the inventory dropdowns</p>
        </div>
      ) : (
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
              <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[35%]">Name</TableHead>
              <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 w-[50%]">Description</TableHead>
              <TableHead className="h-10 px-2 text-xs font-semibold text-gray-600 text-right w-[15%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-b last:border-0 hover:bg-gray-50/50 transition-all duration-300">
                <TableCell className="h-12 px-4 sm:px-6 overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-900 truncate">{item.name}</span>
                  </div>
                </TableCell>
                <TableCell className="h-12 px-4 sm:px-6 overflow-hidden">
                  {item.description ? (
                    <span className="text-sm text-gray-600 truncate block" title={item.description}>{item.description}</span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell className="h-12 px-2 text-right">
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        onClick={() => openEdit(item)}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(item)}
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
          </TableBody>
        </Table>
      )}

      {/* Add/Edit Sheet */}
      <Sheet open={sheetState.mode !== "closed"} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="w-full sm:w-[480px] sm:max-w-[90vw] p-0 flex flex-col h-full overflow-hidden">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl">
                  {sheetState.mode === "edit" ? "Edit Location" : "Add Location"}
                </SheetTitle>
                <SheetDescription>
                  {sheetState.mode === "edit"
                    ? `Update this ${category.title.toLowerCase().replace(" locations", "")} location`
                    : `Add a new ${category.title.toLowerCase().replace(" locations", "")} location`}
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
              <Label htmlFor={`${category.key}-name`}>Name *</Label>
              <Input
                id={`${category.key}-name`}
                placeholder="e.g., Forepeak Starboard"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${category.key}-description`}>Description</Label>
              <Textarea
                id={`${category.key}-description`}
                placeholder="Optional notes about this location..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={!isAdmin}
                className="min-h-[88px]"
              />
            </div>
          </div>

          {isAdmin && (
            <SheetFooter className="border-t p-4 flex-row items-center justify-between gap-2 shrink-0 bg-white">
              <div>
                {sheetState.mode === "edit" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeleteConfirm(sheetState.item)
                      closeSheet()
                    }}
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
                  ) : sheetState.mode === "edit" ? (
                    "Update"
                  ) : (
                    "Add Location"
                  )}
                </Button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[400px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;? Items currently assigned to this location will keep the saved string but won&apos;t match a managed location anymore.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function LocationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Locations</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage the location options that appear in the supply, galley, linen, and uniform inventory dropdowns.
          </p>
        </div>

        {CATEGORIES.map((c) => (
          <LocationsTable key={c.key} category={c} />
        ))}
      </main>
    </div>
  )
}
