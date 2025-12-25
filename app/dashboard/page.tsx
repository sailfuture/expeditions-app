"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Ship, Calendar, Eye, ClipboardList } from "lucide-react"
import { ScheduleDetailDialog } from "@/components/schedule-detail-dialog"
import { useExpeditions, useExpeditionSchedules, useTeachers } from "@/lib/hooks/use-expeditions"

export default function DashboardPage() {
  const router = useRouter()

  const { data: expeditions, isLoading: loadingExpeditions } = useExpeditions()
  const { data: schedules, isLoading: loadingSchedules } = useExpeditionSchedules()
  const { data: teachers } = useTeachers()

  const [selectedExpeditionId, setSelectedExpeditionId] = useState<number | null>(null)
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Set default expedition once loaded
  const sortedExpeditions = useMemo(() => {
    if (!expeditions) return []
    return [...expeditions].sort(
      (a, b) => new Date(b.startDate || b.start_date).getTime() - new Date(a.startDate || a.start_date).getTime(),
    )
  }, [expeditions])

  // Auto-select first expedition
  const activeExpeditionId = selectedExpeditionId ?? sortedExpeditions[0]?.id

  // Filter schedules by selected expedition
  const filteredSchedules = useMemo(() => {
    if (!schedules || !activeExpeditionId) return []
    return schedules.filter((s: any) => s.expeditions_id === activeExpeditionId)
  }, [schedules, activeExpeditionId])

  const selectedExpedition = expeditions?.find((e: any) => e.id === activeExpeditionId)

  // Get current staff (first teacher for now)
  const currentStaff = teachers?.[0]

  const handleViewSchedule = (scheduleId: number) => {
    setSelectedScheduleId(scheduleId)
    setDialogOpen(true)
  }

  const handleRecordScores = (scheduleId: number) => {
    router.push(`/evaluate/${scheduleId}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const isLoading = loadingExpeditions || loadingSchedules

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Title */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Ship className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-semibold text-xl">Expedition Tracker</span>
            </div>

            {/* Right side: Expedition selector + Staff info */}
            <div className="flex items-center gap-4">
              {loadingExpeditions ? (
                <Skeleton className="h-10 w-[180px]" />
              ) : (
                <Select
                  value={activeExpeditionId?.toString() ?? ""}
                  onValueChange={(v) => setSelectedExpeditionId(Number(v))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Expedition" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedExpeditions.map((expedition: any) => (
                      <SelectItem key={expedition.id} value={expedition.id.toString()}>
                        {expedition.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">{currentStaff?.name ?? "Staff"}</span>
                <Avatar className="h-9 w-9 bg-primary">
                  <AvatarFallback className="text-primary-foreground text-sm">
                    {currentStaff?.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("") ?? "ST"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Expedition Info */}
        {selectedExpedition && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{selectedExpedition.name}</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              {formatDate(selectedExpedition.startDate || selectedExpedition.start_date)} —{" "}
              {formatDate(selectedExpedition.endDate || selectedExpedition.end_date)}
            </p>
          </div>
        )}

        {/* Schedule Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-28" />
                        <Skeleton className="h-8 w-28" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredSchedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No schedules found for this expedition
                  </TableCell>
                </TableRow>
              ) : (
                filteredSchedules.map((schedule: any) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{formatDate(schedule.date)}</TableCell>
                    <TableCell>{schedule.name}</TableCell>
                    <TableCell>
                      {schedule.isOffshore || schedule.is_offshore ? (
                        <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Offshore</Badge>
                      ) : (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white">In Port</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewSchedule(schedule.id)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Schedule
                        </Button>
                        <Button size="sm" onClick={() => handleRecordScores(schedule.id)}>
                          <ClipboardList className="h-4 w-4 mr-1" />
                          Record Scores
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Schedule Detail Dialog */}
      <ScheduleDetailDialog scheduleId={selectedScheduleId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
