"use client"

import { use } from "react"
import useSWR from "swr"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { 
  Package,
  ShoppingBag,
  ImageIcon
} from "lucide-react"
import { getExpeditionsStore } from "@/lib/xano"
import { useExpeditions } from "@/lib/hooks/use-expeditions"

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

export default function PublicStorePage({ params }: PageProps) {
  const { id } = use(params)
  const expeditionId = parseInt(id)

  const { data: allExpeditions, isLoading: expeditionsLoading } = useExpeditions()
  const expedition = allExpeditions?.find((e: any) => e.id === expeditionId)

  const { data: storeItems, isLoading: storeLoading } = useSWR(
    expeditionId ? `public_expeditions_store_${expeditionId}` : null,
    () => getExpeditionsStore(expeditionId)
  )

  const isLoading = expeditionsLoading || storeLoading

  // Filter out archived items for public view
  const activeItems = (storeItems || []).filter((item: StoreItem) => !item.isArchived)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                {expeditionsLoading ? (
                  <Skeleton className="h-6 w-32" />
                ) : (
                  expedition?.name || "Expedition Store"
                )}
              </h1>
              <p className="text-sm text-gray-500">Store</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 sm:px-6 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : activeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Package className="h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No items available</h2>
            <p className="text-gray-500 text-center max-w-sm">
              There are no items currently available in this store. Check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {activeItems.map((item: StoreItem) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Product Image */}
                <div className="aspect-square relative bg-gray-100">
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                  {/* Quantity Badge */}
                  {item.quantity > 0 && (
                    <div className="absolute top-3 right-3">
                      <Badge 
                        variant="secondary" 
                        className="bg-white/90 backdrop-blur-sm text-gray-700 shadow-sm"
                      >
                        {item.quantity} available
                      </Badge>
                    </div>
                  )}
                  {item.quantity === 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">Out of Stock</span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1">
                    {item.product_name}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-gray-900">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4 text-center">
        <p className="text-sm text-gray-400">
          {expedition?.name ? `${expedition.name} Store` : "Expedition Store"}
        </p>
      </footer>
    </div>
  )
}
