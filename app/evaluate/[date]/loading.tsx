import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <Skeleton className="h-6 w-64" />
        </div>
      </div>
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-80 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
      </div>
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-lg" />
          ))}
        </div>
      </main>
    </div>
  )
}

