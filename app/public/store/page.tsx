"use client"

import useSWR from "swr"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  ShoppingBag,
  ImageIcon
} from "lucide-react"
import { getExpeditionsStore } from "@/lib/xano"

interface StoreItem {
  id: number
  created_at: number
  product_name: string
  quantity: number
  description: string
  isArchived: boolean
  product_image: string
  price: number
}

export default function PublicStorePage() {
  const { data: storeItems, isLoading } = useSWR(
    "public_expeditions_store",
    () => getExpeditionsStore()
  )

  // Filter out archived items, sort in-stock first then out-of-stock
  const activeItems = (storeItems || [])
    .filter((item: StoreItem) => !item.isArchived)
    .sort((a: StoreItem, b: StoreItem) => {
      const aInStock = a.quantity > 0 ? 0 : 1
      const bInStock = b.quantity > 0 ? 0 : 1
      return aInStock - bInStock
    })

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
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Store</h1>
              <p className="text-sm text-gray-500">Items available for purchase</p>
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
              There are no items currently available in the store. Check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {activeItems.map((item: StoreItem) => {
              const outOfStock = item.quantity === 0
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border border-gray-200 overflow-hidden transition-shadow ${
                    outOfStock
                      ? "bg-gray-100 opacity-60 grayscale"
                      : "bg-white hover:shadow-lg"
                  }`}
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
                    {outOfStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">Out of Stock</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className={`font-semibold text-lg leading-tight mb-1 ${outOfStock ? "text-gray-500" : "text-gray-900"}`}>
                      {item.product_name}
                    </h3>
                    {item.description && (
                      <p className={`text-sm line-clamp-2 mb-3 ${outOfStock ? "text-gray-400" : "text-gray-600"}`}>
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`text-xl font-bold ${outOfStock ? "text-gray-400" : "text-gray-900"}`}>
                        {formatPrice(item.price)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4 text-center">
        <p className="text-sm text-gray-400">Store</p>
      </footer>
    </div>
  )
}
