"use client"

import React, { useState, useMemo, useRef } from "react"
import Image from "next/image"
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
import {
  PlusCircle,
  Pencil,
  Trash2,
  Package,
  Eye,
  Minus,
  Plus,
  ExternalLink,
  X,
  Camera,
  ImagePlus,
  Tags,
  MapPin,
} from "lucide-react"
import {
  getExpeditionsSupplies,
  createExpeditionsSuppliesItem,
  updateExpeditionsSuppliesItem,
  deleteExpeditionsSuppliesItem,
  getExpeditionSupplyInventoryLocations,
  getExpeditionSupplyTypes,
  createExpeditionSupplyType,
  deleteExpeditionSupplyType,
  uploadImageToXano,
} from "@/lib/xano"
import { getPhotoUrl } from "@/lib/utils"
import { useCurrentUser } from "@/lib/contexts/user-context"

const SWR_KEY = "expeditions_supplies"
const TYPES_SWR_KEY = "expedition_supply_types"
const LOCATIONS_SWR_KEY = "expedition_supply_inventory_locations"

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
  location: string | null
  size: string | null
  image: any
}

interface SupplyType {
  id: number
  created_at: number
  name: string
}

type SortMode = "name" | "location"
type GroupMode = "type" | "none"

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

// Image thumbnail cell — tap to view (when photo exists) or tap to open camera (when empty)
function ImageThumb({
  image,
  name,
  isUploading,
  onClick,
}: {
  image: any
  name: string
  isUploading?: boolean
  onClick: () => void
}) {
  const url = getPhotoUrl(image)
  const hasPhoto = !!url
  return (
    <button
      onClick={onClick}
      disabled={isUploading}
      className={`w-10 h-10 rounded-md overflow-hidden relative transition-colors cursor-pointer touch-manipulation shrink-0 ${
        hasPhoto
          ? "bg-gray-100 border border-gray-200 hover:border-gray-300"
          : "bg-gray-50 border-2 border-dashed border-gray-300 hover:bg-gray-100 hover:border-gray-400"
      } disabled:cursor-wait`}
      title={hasPhoto ? "View image" : "Tap to take photo"}
      aria-label={hasPhoto ? `View image of ${name}` : `Take photo of ${name}`}
    >
      {url ? (
        <Image
          src={url}
          alt={name}
          width={40}
          height={40}
          className="object-cover w-full h-full"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <Camera className="h-4 w-4" />
        </div>
      )}
      {isUploading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
          <Spinner className="h-4 w-4" />
        </div>
      )}
    </button>
  )
}

export default function SuppliesPage() {
  const { currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === "Admin"

  const { data: supplyItems, isLoading } = useSWR(
    SWR_KEY,
    () => getExpeditionsSupplies()
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

  const { data: typesData } = useSWR(
    TYPES_SWR_KEY,
    () => getExpeditionSupplyTypes()
  )
  const typeOptions = useMemo(() => {
    const list = (typesData || []) as SupplyType[]
    return list
      .map((t) => t.name)
      .filter((name): name is string => !!name)
      .sort((a, b) => a.localeCompare(b))
  }, [typesData])

  // Sort + group controls
  const [sortMode, setSortMode] = useState<SortMode>("name")
  const [groupMode, setGroupMode] = useState<GroupMode>("type")

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SupplyItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<SupplyItem | null>(null)

  // Image upload state for the edit sheet
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [removePhotoConfirmOpen, setRemovePhotoConfirmOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Lightbox state
  const [lightboxItem, setLightboxItem] = useState<SupplyItem | null>(null)

  // Inline thumbnail-tap upload state
  const [inlineUploadingId, setInlineUploadingId] = useState<number | null>(null)
  const inlineCameraInputRef = useRef<HTMLInputElement>(null)
  const pendingInlineItemRef = useRef<SupplyItem | null>(null)

  // Types manager state
  const [typesDialogOpen, setTypesDialogOpen] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [savingType, setSavingType] = useState(false)
  const [deletingTypeId, setDeletingTypeId] = useState<number | null>(null)

  // Form state
  const emptyForm = {
    name: "",
    type: "",
    size: "",
    location: "",
    notes: "",
    quantity: "" as string | number,
    cost: "" as string | number,
    url: "",
    isOutofStock: false,
    isArchived: false,
    image: null as any,
  }
  const [formData, setFormData] = useState(emptyForm)

  const resetPhotoState = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setIsUploadingPhoto(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  const handleAddItem = () => {
    setEditingItem(null)
    setFormData(emptyForm)
    resetPhotoState()
    setSheetOpen(true)
  }

  const handleEditItem = (item: SupplyItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name || "",
      type: item.type || "",
      size: item.size || "",
      location: item.location || "",
      notes: item.notes || "",
      quantity: item.quantity ?? "",
      cost: item.cost ?? "",
      url: item.url || "",
      isOutofStock: !!item.isOutofStock,
      isArchived: !!item.isArchived,
      image: item.image || null,
    })
    resetPhotoState()
    setPhotoPreview(getPhotoUrl(item.image))
    setSheetOpen(true)
  }

  const handleDeleteClick = (item: SupplyItem) => {
    setItemToDelete(item)
    setDeleteConfirmOpen(true)
  }

  // Smart thumbnail tap: preview if photo exists, otherwise open camera directly
  const handleThumbTap = (item: SupplyItem) => {
    if (inlineUploadingId === item.id) return
    if (getPhotoUrl(item.image)) {
      setLightboxItem(item)
    } else {
      if (!isAdmin) {
        toast.error("Only admins can add photos")
        return
      }
      pendingInlineItemRef.current = item
      // Reset to allow re-selecting the same file
      if (inlineCameraInputRef.current) {
        inlineCameraInputRef.current.value = ""
        inlineCameraInputRef.current.click()
      }
    }
  }

  const handleInlineCameraChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const targetItem = pendingInlineItemRef.current
    pendingInlineItemRef.current = null
    if (e.target) e.target.value = ""
    if (!file || !targetItem) return

    setInlineUploadingId(targetItem.id)

    // Optimistic preview from data URL
    const optimisticUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    })
    if (optimisticUrl) {
      mutate(
        SWR_KEY,
        (current: SupplyItem[] | undefined) =>
          current?.map((it) =>
            it.id === targetItem.id ? { ...it, image: { url: optimisticUrl } } : it
          ),
        false
      )
    }

    try {
      const uploaded = await uploadImageToXano(file)
      await updateExpeditionsSuppliesItem(targetItem.id, { image: uploaded })
      mutate(SWR_KEY)
      toast.success("Photo added")
    } catch (error) {
      console.error("Inline photo upload failed:", error)
      toast.error("Failed to upload photo")
      mutate(SWR_KEY)
    } finally {
      setInlineUploadingId(null)
    }
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

  const handlePhotoSelected = (file: File | null) => {
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setPhotoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleClearPhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setFormData((prev) => ({ ...prev, image: null }))
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Item name is required")
      return
    }

    setIsSubmitting(true)
    try {
      let imageData = formData.image
      if (photoFile) {
        setIsUploadingPhoto(true)
        try {
          imageData = await uploadImageToXano(photoFile)
        } finally {
          setIsUploadingPhoto(false)
        }
      }

      const submitData = {
        name: formData.name.trim(),
        type: formData.type,
        size: (formData.size || "").trim(),
        location: (formData.location || "").trim(),
        notes: formData.notes,
        quantity: formData.quantity === "" ? 0 : Number(formData.quantity),
        cost: formData.cost === "" ? 0 : Number(formData.cost),
        url: (formData.url || "").trim(),
        isOutofStock: formData.isOutofStock,
        isArchived: formData.isArchived,
        image: imageData,
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

  // Comparators
  const compareByLocation = (a: SupplyItem, b: SupplyItem) => {
    const al = (a.location || "").toLowerCase()
    const bl = (b.location || "").toLowerCase()
    // Items without a location sort last
    if (!al && bl) return 1
    if (al && !bl) return -1
    if (al !== bl) return al.localeCompare(bl)
    return (a.name || "").localeCompare(b.name || "")
  }
  const compareByName = (a: SupplyItem, b: SupplyItem) =>
    (a.name || "").localeCompare(b.name || "")
  const comparator = sortMode === "location" ? compareByLocation : compareByName

  // Build groups: either by type, or a single flat "All" group
  const groupedItems = useMemo(() => {
    const items = ((supplyItems || []) as SupplyItem[]).filter((i) => !i.isArchived)

    if (groupMode === "none") {
      const sorted = [...items].sort(comparator)
      return [{ type: "All Items", items: sorted }]
    }

    const groupMap = new Map<string, SupplyItem[]>()
    items.forEach((item) => {
      const key = item.type || "Uncategorized"
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push(item)
    })

    const groups: { type: string; items: SupplyItem[] }[] = []
    const sortedKeys = [...groupMap.keys()].sort((a, b) => {
      const aIdx = typeOptions.indexOf(a)
      const bIdx = typeOptions.indexOf(b)
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b)
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })

    sortedKeys.forEach((key) => {
      const groupItems = groupMap.get(key)!.slice().sort(comparator)
      groups.push({ type: key, items: groupItems })
    })

    return groups
  }, [supplyItems, groupMode, comparator, typeOptions])

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

  // Types manager handlers
  const handleAddType = async () => {
    const name = newTypeName.trim()
    if (!name) return
    if (typeOptions.includes(name)) {
      toast.error("That type already exists")
      return
    }
    setSavingType(true)
    try {
      await createExpeditionSupplyType({ name })
      mutate(TYPES_SWR_KEY)
      setNewTypeName("")
      toast.success("Type added")
    } catch {
      toast.error("Failed to add type")
    } finally {
      setSavingType(false)
    }
  }

  const handleDeleteType = async (id: number) => {
    setDeletingTypeId(id)
    try {
      await deleteExpeditionSupplyType(id)
      mutate(TYPES_SWR_KEY)
      toast.success("Type deleted")
    } catch {
      toast.error("Failed to delete type")
    } finally {
      setDeletingTypeId(null)
    }
  }

  const renderTableHeaders = () => (
    <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
      <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 w-[15%] md:w-[8%]">Photo</TableHead>
      <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 w-[30%] md:w-[18%]">Name</TableHead>
      <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 w-[25%] md:w-[8%]">Size</TableHead>
      <TableHead className="h-10 px-2 md:px-6 text-xs font-semibold text-gray-600 text-center w-[30%] md:w-[12%]">Quantity</TableHead>
      <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 hidden lg:table-cell lg:w-[14%]">Location</TableHead>
      <TableHead className="h-10 px-4 md:px-6 text-xs font-semibold text-gray-600 hidden lg:table-cell lg:w-[24%]">Notes</TableHead>
      <TableHead className="h-10 px-2 text-xs font-semibold text-gray-600 text-right hidden md:table-cell md:w-[16%]">Actions</TableHead>
    </TableRow>
  )

  const renderItemRow = (item: SupplyItem, muted: boolean) => (
    <TableRow
      key={item.id}
      onClick={() => handleEditItem(item)}
      className="border-b last:border-0 hover:bg-gray-50/50 transition-all duration-300 cursor-pointer"
    >
      <TableCell
        className="h-14 px-2 md:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <ImageThumb
          image={item.image}
          name={item.name}
          isUploading={inlineUploadingId === item.id}
          onClick={() => handleThumbTap(item)}
        />
      </TableCell>
      <TableCell className="h-14 px-2 md:px-6 overflow-hidden">
        <span className={`font-medium truncate block ${muted ? "text-gray-400" : "text-gray-900"}`} title={item.name}>{item.name}</span>
      </TableCell>
      <TableCell className="h-14 px-2 md:px-6 overflow-hidden">
        {item.size ? (
          <span className={`text-sm truncate block ${muted ? "text-gray-400" : "text-gray-600"}`} title={item.size}>
            {item.size}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className="h-14 px-2 md:px-6 text-center">
        <StepperNumberCell
          value={item.quantity ?? 0}
          itemId={item.id}
          field="quantity"
        />
      </TableCell>
      <TableCell className="h-14 px-4 md:px-6 hidden lg:table-cell overflow-hidden">
        {item.location ? (
          <span className={`text-sm truncate block ${muted ? "text-gray-400" : "text-gray-600"}`} title={item.location}>
            {item.location}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className="h-14 px-4 md:px-6 hidden lg:table-cell overflow-hidden">
        {item.notes ? (
          <span className={`text-sm truncate block ${muted ? "text-gray-400" : "text-gray-600"}`} title={item.notes}>
            {item.notes}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell
        className="h-14 px-2 text-right hidden md:table-cell"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-0.5">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation ${muted ? "text-gray-300" : "text-blue-600"}`}
              title={`Open link: ${item.url}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
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
      <TableCell colSpan={7} className="h-9 px-4 sm:px-6 py-0">
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

  const isStudentType = formData.type === "Student" || formData.type === "Students"
  const lightboxUrl = lightboxItem ? getPhotoUrl(lightboxItem.image) : null

  // Preserve legacy type values not present in the API list (so existing items aren't reassigned blindly)
  const typeSelectOptions = useMemo(() => {
    if (formData.type && !typeOptions.includes(formData.type)) {
      return [...typeOptions, formData.type]
    }
    return typeOptions
  }, [typeOptions, formData.type])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden input driven by tap-on-empty-thumbnail. capture="environment" opens the rear camera on mobile. */}
      <input
        ref={inlineCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInlineCameraChange}
      />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b bg-gray-50/50 flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold">Supplies Inventory</h2>
              <p className="text-sm text-gray-600 mt-1">
                Track general supplies — medical, school, deck, kitchen, cleaning, and more
              </p>
            </div>
            <div className="flex items-center gap-2 w-full">
              {/* Sort */}
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="h-8 flex-1 min-w-0 rounded-md border border-input bg-transparent pl-2 pr-6 text-xs shadow-sm cursor-pointer truncate"
                aria-label="Sort items by"
                title="Sort"
              >
                <option value="name">Sort: Name</option>
                <option value="location">Sort: Location</option>
              </select>
              {/* Group */}
              <select
                value={groupMode}
                onChange={(e) => setGroupMode(e.target.value as GroupMode)}
                className="h-8 flex-1 min-w-0 rounded-md border border-input bg-transparent pl-2 pr-6 text-xs shadow-sm cursor-pointer truncate"
                aria-label="Group items by"
                title="Group"
              >
                <option value="type">Group: Type</option>
                <option value="none">Group: None</option>
              </select>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTypesDialogOpen(true)}
                  className="cursor-pointer flex-1 min-w-0 shrink"
                  title="Manage supply types"
                >
                  <Tags className="h-4 w-4" />
                  <span className="truncate">Types</span>
                </Button>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={handleAddItem}
                  className="cursor-pointer flex-1 min-w-0 shrink"
                  title="Add item"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className="truncate">Add Item</span>
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
                    <TableCell className="h-14 px-2 md:px-6"><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                    <TableCell className="h-14 px-2 md:px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-14 px-2 md:px-6"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="h-14 px-2 md:px-6"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                    <TableCell className="h-14 px-4 md:px-6 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-14 px-4 md:px-6 hidden lg:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="h-14 px-2 hidden md:table-cell">
                      <div className="flex items-center justify-end gap-0.5">
                        <Skeleton className="h-5 w-5 rounded" />
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
                    {groupMode === "type" && renderGroupHeader(group.type, group.items.length)}
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
                    {groupMode === "type" && renderGroupHeader(group.type, group.items.length)}
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
              <div>
                <SheetTitle className="text-xl">
                  {editingItem ? "Edit Supply Item" : "Add Supply Item"}
                </SheetTitle>
                <SheetDescription>
                  {editingItem
                    ? "Update the details for this supply item"
                    : "Add a new item to the supplies inventory"}
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
            {/* Photo */}
            <div className="space-y-2">
              <Label>Photo</Label>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handlePhotoSelected(e.target.files?.[0] || null)}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoSelected(e.target.files?.[0] || null)}
              />
              {/* Full-width preview */}
              <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt={formData.name || "Item photo"}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-1">
                    <ImagePlus className="h-10 w-10" />
                    <span className="text-xs">No photo yet</span>
                  </div>
                )}
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Spinner className="h-6 w-6" />
                  </div>
                )}
              </div>
              {/* Inline action buttons */}
              <div className="flex items-center gap-2">
                {(photoPreview || formData.image) && isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRemovePhotoConfirmOpen(true)}
                    aria-label="Remove photo"
                    title="Remove photo"
                    className="cursor-pointer shrink-0 h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={!isAdmin}
                  className="cursor-pointer flex-1 min-w-0"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  <span className="truncate">Take photo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isAdmin}
                  className="cursor-pointer flex-1 min-w-0"
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  <span className="truncate">Choose file</span>
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Tap “Take photo” on mobile to open the camera, or “Choose file” to upload from your device.
              </p>
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                disabled={!isAdmin}
                className="flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-8 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select type</option>
                {typeSelectOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setTypesDialogOpen(true)}
                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  Manage types…
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Input
                id="size"
                placeholder="e.g., Large, 16oz, One Size"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                disabled={!isAdmin}
              />
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
              <div className="flex items-center gap-2">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://www.amazon.com/..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  disabled={!isAdmin}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!formData.url.trim()}
                  onClick={() => {
                    const url = formData.url.trim()
                    if (url) window.open(url, "_blank", "noopener,noreferrer")
                  }}
                  className="cursor-pointer shrink-0 h-9"
                  title={formData.url.trim() ? `Open ${formData.url.trim()}` : "Enter a URL to enable"}
                >
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Open
                </Button>
              </div>
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
                  disabled={isSubmitting || isUploadingPhoto}
                  className="cursor-pointer"
                >
                  {isSubmitting || isUploadingPhoto ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2" />
                      {isUploadingPhoto ? "Uploading…" : "Saving..."}
                    </>
                  ) : editingItem ? (
                    "Update"
                  ) : (
                    "Add Item"
                  )}
                </Button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Remove Photo Confirmation Dialog */}
      <Dialog open={removePhotoConfirmOpen} onOpenChange={setRemovePhotoConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Remove photo?</DialogTitle>
            <DialogDescription>
              This will clear the photo on this item. You can take or upload a new one anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="!flex-row items-center !justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRemovePhotoConfirmOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                handleClearPhoto()
                setRemovePhotoConfirmOpen(false)
              }}
              className="cursor-pointer"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Remove
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

      {/* Types Manager Dialog */}
      <Dialog open={typesDialogOpen} onOpenChange={setTypesDialogOpen}>
        <DialogContent className="sm:max-w-md [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Supply Types</DialogTitle>
            <DialogDescription>
              Manage the type categories used across the supplies inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isAdmin && (
              <div className="flex gap-2">
                <Input
                  placeholder="New type name (e.g., Kitchen Utensils)"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddType()}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddType}
                  disabled={savingType || !newTypeName.trim()}
                  className="cursor-pointer"
                >
                  {savingType ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            )}
            <div className="border rounded-lg divide-y max-h-[320px] overflow-y-auto">
              {((typesData || []) as SupplyType[]).length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">No types yet</div>
              ) : (
                (typesData as SupplyType[]).map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm text-gray-900">{t.name}</span>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer text-gray-400 hover:text-red-600"
                        onClick={() => handleDeleteType(t.id)}
                        disabled={deletingTypeId === t.id}
                      >
                        {deletingTypeId === t.id ? <Spinner className="h-3 w-3" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxItem} onOpenChange={(open) => !open && setLightboxItem(null)}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden [&>button]:cursor-pointer">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>{lightboxItem?.name}</DialogTitle>
            <DialogDescription>
              {[lightboxItem?.type, lightboxItem?.location].filter(Boolean).join(" • ") || "Supply item"}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-black flex items-start justify-center max-h-[70vh] overflow-hidden">
            {lightboxUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightboxUrl}
                alt={lightboxItem?.name || "Supply item"}
                className="object-contain max-h-[70vh] w-full"
              />
            ) : (
              <div className="p-12 text-gray-400 flex flex-col items-center gap-2">
                <ImagePlus className="h-10 w-10" />
                <p className="text-sm">No image yet</p>
                {isAdmin && lightboxItem && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const item = lightboxItem
                      setLightboxItem(null)
                      handleEditItem(item)
                    }}
                    className="cursor-pointer mt-2"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Add photo
                  </Button>
                )}
              </div>
            )}
          </div>
          {isAdmin && lightboxItem && lightboxUrl && (
            <div className="border-t p-3 flex items-center justify-end bg-background">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!lightboxItem) return
                  pendingInlineItemRef.current = lightboxItem
                  setLightboxItem(null)
                  if (inlineCameraInputRef.current) {
                    inlineCameraInputRef.current.value = ""
                    inlineCameraInputRef.current.click()
                  }
                }}
                className="cursor-pointer"
              >
                <Camera className="h-4 w-4 mr-2" />
                Retake
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
