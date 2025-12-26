import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <Skeleton className="h-6 w-64" />
        </div>
      </div>
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-5 w-96" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </div>
  )
}

