import { Skeleton } from "@/components/ui/skeleton"
import { ExpeditionHeaderSkeleton } from "@/components/expedition-header"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50" aria-busy="true" aria-live="polite">
      <ExpeditionHeaderSkeleton currentPage="dashboard" />
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-5 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-80 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-[420px] w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-[420px] w-full rounded-xl lg:col-span-3" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )
}
