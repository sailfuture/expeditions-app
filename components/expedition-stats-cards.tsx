"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { computeExpeditionStats } from "@/lib/expedition-stats"
import { useExpeditionLocations, useExpeditionSchedules, useStudentsByExpedition } from "@/lib/hooks/use-expeditions"

interface ExpeditionStatsCardsProps {
  expeditionId: number | null | undefined
  /** Extra loading signal from the parent (e.g. the expedition record itself). */
  isLoading?: boolean
  className?: string
}

function StatCard({ label, value, isLoading, wide }: { label: string; value: number | string; isLoading: boolean; wide?: boolean }) {
  return (
    <Card className="py-4">
      <CardHeader className="px-3 py-0 pb-0 gap-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 py-0 pt-0">
        {isLoading ? (
          <Skeleton className={cn("h-5", wide ? "w-12" : "w-10")} />
        ) : (
          <p className="text-lg font-bold leading-tight">{value}</p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * The six expedition stat cards: Total Days, Anchored, Offshore, Service,
 * Nautical Miles and Students. Shared by the overview page and the home
 * dashboard so the numbers and the look stay identical.
 */
export function ExpeditionStatsCards({ expeditionId, isLoading = false, className }: ExpeditionStatsCardsProps) {
  const id = expeditionId || undefined
  const { data: schedules, isLoading: schedulesLoading } = useExpeditionSchedules(id)
  const { data: locations } = useExpeditionLocations(id)
  const { data: students, isLoading: studentsLoading } = useStudentsByExpedition(id ?? null)

  const stats = useMemo(() => computeExpeditionStats(schedules, locations, id), [schedules, locations, id])
  const loading = isLoading || !id || schedulesLoading

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3", className)}>
      <StatCard label="Total Days" value={stats.totalDays} isLoading={loading} />
      <StatCard label="Anchored" value={stats.anchoredDays} isLoading={loading} />
      <StatCard label="Offshore" value={stats.offshoreDays} isLoading={loading} />
      <StatCard label="Service" value={stats.serviceDays} isLoading={loading} />
      <StatCard label="Nautical Miles" value={stats.totalNauticalMiles} isLoading={loading} wide />
      <StatCard label="Students" value={students?.length || 0} isLoading={isLoading || !id || studentsLoading} />
    </div>
  )
}
