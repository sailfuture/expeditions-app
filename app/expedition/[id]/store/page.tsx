"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ExpeditionHeader } from "@/components/expedition-header"
import { 
  PlusCircle, 
  Pencil, 
  Trash2,
  Package,
  DollarSign,
  ImageIcon,
  Receipt,
  ExternalLink,
  ShoppingCart,
  Copy,
  QrCode
} from "lucide-react"
import { 
  getExpeditionsStore, 
  createExpeditionsStoreItem, 
  updateExpeditionsStoreItem, 
  deleteExpeditionsStoreItem 
} from "@/lib/xano"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { NewOrderDialog } from "@/components/new-order-dialog"

interface PageProps {
  params: Promise<{ id: string }>
}

interface StoreItem {
  id: number
  created_at: number
  expeditions_id: number
  product_name: string
  quantity: number
  description: string
  isArchived: boolean
  product_image: string
  price: number
}

export default function StorePage({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)
  const expeditionId = parseInt(id)

  const { currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === "Admin"

  const { data: allExpeditions, isLoading: expeditionsLoading } = useExpeditions()
  const expedition = allExpeditions?.find((e: any) => e.id === expeditionId)

  const { data: storeItems, isLoading: storeLoading } = useSWR(
    expeditionId ? `expeditions_store_${expeditionId}` : null,
    () => getExpeditionsStore(expeditionId)
  )

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<StoreItem | null>(null)
  const [newOrderDialogOpen, setNewOrderDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)

  // Get the public store URL
  const publicStoreUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/public/store/${expeditionId}`
    : `/public/store/${expeditionId}`

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicStoreUrl)
      toast.success("Store URL copied to clipboard")
    } catch (error) {
      toast.error("Failed to copy URL")
    }
  }

  // Form state
  const [formData, setFormData] = useState({
    product_name: "",
    quantity: "" as string | number,
    description: "",
    isArchived: false,
    product_image: "",
    price: "" as string | number
  })

  const handleAddItem = () => {
    setEditingItem(null)
    setFormData({
      product_name: "",
      quantity: "",
      description: "",
      isArchived: false,
      product_image: "",
      price: ""
    })
    setDialogOpen(true)
  }

  const handleEditItem = (item: StoreItem) => {
    setEditingItem(item)
    setFormData({
      product_name: item.product_name || "",
      quantity: item.quantity || "",
      description: item.description || "",
      isArchived: item.isArchived || false,
      product_image: item.product_image || "",
      price: item.price || ""
    })
    setDialogOpen(true)
  }

  const handleDeleteClick = (item: StoreItem) => {
    setItemToDelete(item)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return

    try {
      await deleteExpeditionsStoreItem(itemToDelete.id)
      mutate(`expeditions_store_${expeditionId}`)
      toast.success("Item deleted successfully")
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
    } catch (error) {
      console.error("Error deleting item:", error)
      toast.error("Failed to delete item")
    }
  }

  const handleSubmit = async () => {
    if (!formData.product_name.trim()) {
      toast.error("Product name is required")
      return
    }

    setIsSubmitting(true)
    try {
      // Convert empty strings to 0 for numeric fields
      const submitData = {
        ...formData,
        price: formData.price === "" ? 0 : Number(formData.price),
        quantity: formData.quantity === "" ? 0 : Number(formData.quantity)
      }

      if (editingItem) {
        await updateExpeditionsStoreItem(editingItem.id, submitData)
        toast.success("Item updated successfully")
      } else {
        await createExpeditionsStoreItem({
          ...submitData,
          expeditions_id: expeditionId
        })
        toast.success("Item created successfully")
      }
      mutate(`expeditions_store_${expeditionId}`)
      setDialogOpen(false)
    } catch (error) {
      console.error("Error saving item:", error)
      toast.error("Failed to save item")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = expeditionsLoading || storeLoading

  // Filter out archived items for display (unless you want to show them)
  const activeItems = (storeItems || []).filter((item: StoreItem) => !item.isArchived)
  const archivedItems = (storeItems || []).filter((item: StoreItem) => item.isArchived)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Expedition Header with Navigation */}
      <ExpeditionHeader expedition={expedition} isLoading={expeditionsLoading} currentPage="store" />

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Store Items</h2>
              <p className="text-sm text-gray-600 mt-1">Manage items available for purchase on this expedition</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer"
                onClick={() => window.open(`/public/store/${expeditionId}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer"
                onClick={handleCopyUrl}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer"
                onClick={() => setQrDialogOpen(true)}
              >
                <QrCode className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 cursor-pointer"
                    onClick={() => router.push(`/expedition/${expeditionId}/store/transactions`)}
                  >
                    <Receipt className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddItem}
                    className="cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600">Product</TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden sm:table-cell">Description</TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-right">Price</TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center">Qty</TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="h-16 px-4 sm:px-6 hidden sm:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell className="h-16 px-4 sm:px-6"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : activeItems.length === 0 && archivedItems.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No store items yet</p>
              <p className="text-sm text-gray-500 mt-1">Add items that can be purchased during this expedition</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600">Product</TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 hidden sm:table-cell">Description</TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-right">Price</TableHead>
                    <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-center">Qty</TableHead>
                    {isAdmin && <TableHead className="h-10 px-4 sm:px-6 text-xs font-semibold text-gray-600 text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Active Items */}
                  {activeItems.map((item: StoreItem) => (
                    <TableRow key={item.id} className="border-b last:border-0 hover:bg-gray-50/50">
                      <TableCell className="h-16 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          {item.product_image ? (
                            <img 
                              src={item.product_image} 
                              alt={item.product_name}
                              className="h-10 w-10 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-medium text-gray-900 block truncate">{item.product_name}</span>
                            <span className="text-xs text-gray-500 block sm:hidden truncate">{item.description || ""}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="h-16 px-4 sm:px-6 hidden sm:table-cell">
                        <span className="text-sm text-gray-600 line-clamp-2">{item.description || "—"}</span>
                      </TableCell>
                      <TableCell className="h-16 px-4 sm:px-6 text-right">
                        <span className="font-medium text-gray-900">{formatPrice(item.price)}</span>
                      </TableCell>
                      <TableCell className="h-16 px-4 sm:px-6 text-center">
                        <Badge variant="outline" className="bg-white">
                          {item.quantity}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="h-16 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer"
                              onClick={() => handleEditItem(item)}
                            >
                              <Pencil className="h-4 w-4 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer"
                              onClick={() => handleDeleteClick(item)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}

                  {/* Archived Items Section */}
                  {archivedItems.length > 0 && (
                    <>
                      <TableRow className="bg-gray-100/50">
                        <TableCell colSpan={isAdmin ? 5 : 4} className="h-10 px-4 sm:px-6">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Archived ({archivedItems.length})
                          </span>
                        </TableCell>
                      </TableRow>
                      {archivedItems.map((item: StoreItem) => (
                        <TableRow key={item.id} className="border-b last:border-0 hover:bg-gray-50/50 opacity-60">
                          <TableCell className="h-16 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              {item.product_image ? (
                                <img 
                                  src={item.product_image} 
                                  alt={item.product_name}
                                  className="h-10 w-10 rounded-lg object-cover border border-gray-200 grayscale flex-shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <ImageIcon className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-medium text-gray-600 block truncate">{item.product_name}</span>
                                <span className="text-xs text-gray-400 block sm:hidden truncate">{item.description || ""}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="h-16 px-4 sm:px-6 hidden sm:table-cell">
                            <span className="text-sm text-gray-500 line-clamp-2">{item.description || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-4 sm:px-6 text-right">
                            <span className="text-gray-600">{formatPrice(item.price)}</span>
                          </TableCell>
                          <TableCell className="h-16 px-4 sm:px-6 text-center">
                            <Badge variant="outline" className="bg-white text-gray-500">
                              {item.quantity}
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="h-16 px-4 sm:px-6 text-right">
                              <div className="flex items-center justify-end gap-1 sm:gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 cursor-pointer"
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Pencil className="h-4 w-4 text-gray-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 cursor-pointer"
                                  onClick={() => handleDeleteClick(item)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Store Item" : "Add Store Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the details for this store item" : "Add a new item to the expedition store"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                placeholder="e.g., Expedition T-Shirt"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the product..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_image">Image URL</Label>
              <Input
                id="product_image"
                placeholder="https://..."
                value={formData.product_image}
                onChange={(e) => setFormData({ ...formData, product_image: e.target.value })}
              />
              {formData.product_image && (
                <div className="mt-2">
                  <img 
                    src={formData.product_image} 
                    alt="Preview"
                    className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isArchived">Archived</Label>
                <p className="text-xs text-muted-foreground">Hide this item from the active list</p>
              </div>
              <Switch
                id="isArchived"
                checked={formData.isArchived}
                onCheckedChange={(checked) => setFormData({ ...formData, isArchived: checked })}
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
              ) : (
                editingItem ? "Update Item" : "Add Item"
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
              Are you sure you want to delete &quot;{itemToDelete?.product_name}&quot;? This action cannot be undone.
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

      {/* New Order Dialog */}
      <NewOrderDialog
        open={newOrderDialogOpen}
        onOpenChange={setNewOrderDialogOpen}
        expeditionId={expeditionId}
      />

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-[320px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>Store QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <div className="bg-white p-4 rounded-lg border">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicStoreUrl)}`}
                alt="Store QR Code"
                className="w-48 h-48"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setQrDialogOpen(false)}
              className="cursor-pointer w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
