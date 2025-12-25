"use client"

import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useExpeditionSchedules, useExpeditionScheduleItems, useTeachers } from "@/lib/hooks/use-expeditions"

interface ScheduleDetailDialogProps {
  scheduleId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 100)
  const mins = minutes % 100
  const period = hours >= 12 ? "PM" : "AM"
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  return `${displayHours}:${mins.toString().padStart(2, "0")} ${period}`
}

export function ScheduleDetailDialog({ scheduleId, open, onOpenChange }: ScheduleDetailDialogProps) {
  const { data: schedules, isLoading: loadingSchedule } = useExpeditionSchedules()
  const { data: allItems, isLoading: loadingItems } = useExpeditionScheduleItems()
  const { data: teachers } = useTeachers()

  const schedule = useMemo(() => {
    if (!schedules || !scheduleId) return null
    return schedules.find((s: any) => s.id === scheduleId)
  }, [schedules, scheduleId])

  const items = useMemo(() => {
    if (!allItems || !scheduleId) return []
    return allItems.filter((item: any) => item.expedition_schedule_id === scheduleId)
  }, [allItems, scheduleId])

  const getTeacherName = (teacherId: number) => {
    const teacher = teachers?.find((t: any) => t.id === teacherId)
    return teacher?.name ?? "Unknown"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const isLoading = loadingSchedule || loadingItems

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          {isLoading ? (
            <>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </>
          ) : schedule ? (
            <>
              <DialogTitle className="text-xl">{schedule.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{formatDate(schedule.date)}</p>
            </>
          ) : (
            <DialogTitle>Schedule not found</DialogTitle>
          )}
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No schedule items for this day</p>
          ) : (
            <div className="space-y-3">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        Activity
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(item.time_in)} — {formatTime(item.time_out)}
                    </p>
                    {item.led_by && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Led by: <span className="text-foreground">{getTeacherName(item.led_by)}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
