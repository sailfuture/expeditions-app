import { Skeleton } from "@/components/ui/skeleton"

/**
 * Content-only placeholder shown while an expedition tab's page loads.
 * The breadcrumb and tab bar stay mounted in the shared layout above it.
 */
export function ExpeditionTabSkeleton() {
  return (
    <div className="flex-1 bg-gray-50" aria-busy="true" aria-live="polite">
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-10 w-72 max-w-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    </div>
  )
}
