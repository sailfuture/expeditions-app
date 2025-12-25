"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Search, Unlock, RefreshCw, RotateCcw, Send } from "lucide-react"
import { StudentCard } from "@/components/student-card"
import {
  useExpeditionSchedules,
  useStudents,
  useExpeditionsProfessionalism,
  useExpeditionBonus,
  useExpeditionPenalty,
  useExpeditionJournalStatus,
} from "@/lib/hooks/use-expeditions"
import { updateExpeditionsProfessionalism, createExpeditionsProfessionalism } from "@/lib/xano"
import { mutate } from "swr"
import type { ExpeditionProfessionalism } from "@/lib/types"

type FilterOption = "all" | "flagged" | "locked" | "incomplete"

interface EvaluateClientProps {
  scheduleId: number
}

export function EvaluateClient({ scheduleId }: EvaluateClientProps) {
  const router = useRouter()

  const { data: schedules, isLoading: loadingSchedule } = useExpeditionSchedules()
  const { data: students, isLoading: loadingStudents } = useStudents()
  const { data: allProfessionalism, isLoading: loadingProfessionalism } = useExpeditionsProfessionalism()
  const { data: bonusOptions = [], isLoading: loadingBonus } = useExpeditionBonus()
  const { data: penaltyOptions = [], isLoading: loadingPenalty } = useExpeditionPenalty()
  const { data: journalStatusOptions = [], isLoading: loadingJournalStatus } = useExpeditionJournalStatus()

  const [localUpdates, setLocalUpdates] = useState<Record<number, Partial<ExpeditionProfessionalism>>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<FilterOption>("all")

  // Get current schedule
  const schedule = useMemo(() => {
    if (!schedules) return null
    return schedules.find((s: any) => s.id === scheduleId)
  }, [schedules, scheduleId])

  const isOffshore = schedule?.isOffshore ?? schedule?.is_offshore ?? false
  const isService = schedule?.isService ?? schedule?.is_service ?? false

  // Get students for this expedition
  const expeditionStudents = useMemo(() => {
    if (!students || !schedule) return []
    return students.filter((s: any) =>
      Array.isArray(s.expeditions_id)
        ? s.expeditions_id.includes(schedule.expeditions_id)
        : s.expeditions_id === schedule.expeditions_id,
    )
  }, [students, schedule])

  // Build professionalism records - merge API data with local updates
  const records = useMemo(() => {
    if (!expeditionStudents.length) return []

    return expeditionStudents.map((student: any) => {
      // Find existing professionalism record for this student + schedule
      const existing = allProfessionalism?.find(
        (p: any) => p.students_id === student.id && p.expedition_schedule_id === scheduleId,
      )

      const baseRecord: ExpeditionProfessionalism = existing
        ? {
            id: existing.id,
            expedition_schedule_id: scheduleId,
            students_id: student.id,
            school: existing.school ?? null,
            job: existing.job ?? null,
            citizenship: existing.citizenship ?? null,
            crew: existing.crew ?? null,
            service_learning: existing.service_learning ?? null,
            isFlagged: existing.isFlagged ?? existing.is_flagged ?? false,
            isLocked: existing.isLocked ?? existing.is_locked ?? false,
            bonuses: existing.bonuses ?? [],
            penalties: existing.penalties ?? [],
            note: existing.note ?? null,
            journal_status_id: existing.journal_status_id ?? null,
            _students: student,
          }
        : {
            id: -student.id, // Negative ID indicates new record
            expedition_schedule_id: scheduleId,
            students_id: student.id,
            school: null,
            job: null,
            citizenship: null,
            crew: null,
            service_learning: null,
            isFlagged: false,
            isLocked: false,
            bonuses: [],
            penalties: [],
            note: null,
            journal_status_id: null,
            _students: student,
          }

      // Apply local updates
      const localUpdate = localUpdates[baseRecord.id]
      if (localUpdate) {
        return { ...baseRecord, ...localUpdate }
      }

      return baseRecord
    })
  }, [expeditionStudents, allProfessionalism, scheduleId, localUpdates])

  const isIncomplete = useCallback(
    (record: ExpeditionProfessionalism) => {
      if (!isOffshore && !isService) {
        // Regular day: school, job, citizenship
        return record.school === null || record.job === null || record.citizenship === null
      } else if (isOffshore && !isService) {
        // Offshore day: crew, citizenship
        return record.crew === null || record.citizenship === null
      } else if (isOffshore && isService) {
        // Offshore + Service: school, job, citizenship, service_learning
        return (
          record.school === null ||
          record.job === null ||
          record.citizenship === null ||
          record.service_learning === null
        )
      }
      return false
    },
    [isOffshore, isService],
  )

  const stats = useMemo(() => {
    return {
      total: records.length,
      incomplete: records.filter(isIncomplete).length,
      flagged: records.filter((r) => r.isFlagged).length,
      locked: records.filter((r) => r.isLocked).length,
    }
  }, [records, isIncomplete])

  const filteredRecords = useMemo(() => {
    let result = records

    // Apply search filter
    if (searchQuery) {
      result = result.filter((r) => r._students?.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // Apply status filter
    switch (filter) {
      case "flagged":
        result = result.filter((r) => r.isFlagged)
        break
      case "locked":
        result = result.filter((r) => r.isLocked)
        break
      case "incomplete":
        result = result.filter(isIncomplete)
        break
    }

    return result
  }, [records, searchQuery, filter, isIncomplete])

  const handleUpdateRecord = useCallback((updated: ExpeditionProfessionalism) => {
    setLocalUpdates((prev) => ({
      ...prev,
      [updated.id]: updated,
    }))
  }, [])

  const handleUnlockAll = () => {
    setLocalUpdates((prev) => {
      const newUpdates = { ...prev }
      records.forEach((r) => {
        newUpdates[r.id] = { ...newUpdates[r.id], ...r, isLocked: false }
      })
      return newUpdates
    })
  }

  const handleReload = () => {
    setLocalUpdates({})
    mutate("expeditions_professionalism")
  }

  const handleRemoveFlags = () => {
    setLocalUpdates((prev) => {
      const newUpdates = { ...prev }
      records.forEach((r) => {
        newUpdates[r.id] = { ...newUpdates[r.id], ...r, isFlagged: false }
      })
      return newUpdates
    })
  }

  const handleReset = () => {
    setLocalUpdates((prev) => {
      const newUpdates = { ...prev }
      records.forEach((r) => {
        newUpdates[r.id] = {
          ...r,
          school: null,
          job: null,
          citizenship: null,
          crew: null,
          service_learning: null,
          isFlagged: false,
          isLocked: false,
          bonuses: [],
          penalties: [],
          note: null,
          journal_status_id: null,
        }
      })
      return newUpdates
    })
  }

  const handleSubmitScores = async () => {
    const completedRecords = records.filter((r) => !isIncomplete(r))

    for (const record of completedRecords) {
      const data = {
        expedition_schedule_id: record.expedition_schedule_id,
        students_id: record.students_id,
        school: record.school,
        job: record.job,
        citizenship: record.citizenship,
        crew: record.crew,
        service_learning: record.service_learning,
        is_flagged: record.isFlagged,
        is_locked: true, // Lock on submit
        bonus_ids: record.bonuses?.map((b) => b.id) ?? [],
        penalty_ids: record.penalties?.map((p) => p.id) ?? [],
        note: record.note,
        journal_status_id: record.journal_status_id,
      }

      try {
        if (record.id > 0) {
          // Update existing record
          await updateExpeditionsProfessionalism(record.id, data)
        } else {
          // Create new record
          await createExpeditionsProfessionalism(data)
        }
      } catch (error) {
        console.error("Failed to save record:", error)
      }
    }

    // Refresh data
    mutate("expeditions_professionalism")
    setLocalUpdates({})
  }

  const completedCount = records.filter((r) => !isIncomplete(r)).length

  const isLoading =
    loadingSchedule ||
    loadingStudents ||
    loadingProfessionalism ||
    loadingBonus ||
    loadingPenalty ||
    loadingJournalStatus

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10" />
              <div>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24 mt-1" />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Schedule not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Back + Title */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="cursor-pointer">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-lg">{schedule.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {new Date(schedule.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  {isOffshore && <span className="ml-2 text-blue-500">(Offshore)</span>}
                  {isService && <span className="ml-2 text-green-500">(Service)</span>}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Filter */}
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterOption)}>
              <SelectTrigger className="w-[160px] cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="flagged">Flagged Only</SelectItem>
                <SelectItem value="locked">Locked Only</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Stats & Actions Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            {/* Stats */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="px-3 py-1 text-green-600 border-green-300">
                {records.filter((r) => !r.isLocked).length} Unlocked
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-gray-600 border-gray-300">
                {stats.locked} Locked
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleUnlockAll} className="cursor-pointer bg-transparent">
                <Unlock className="h-4 w-4 mr-1" />
                Unlock All
              </Button>
              <Button variant="outline" size="sm" onClick={handleReload} className="cursor-pointer bg-transparent">
                <RefreshCw className="h-4 w-4 mr-1" />
                Reload
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset} className="cursor-pointer bg-transparent">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button size="sm" disabled={completedCount === 0} onClick={handleSubmitScores} className="cursor-pointer">
                <Send className="h-4 w-4 mr-1" />
                Submit Scores ({completedCount})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Student Cards Grid */}
      <main className="container mx-auto px-4 py-6">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No students found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map((record) => (
              <StudentCard
                key={record.id}
                record={record}
                bonusOptions={bonusOptions}
                penaltyOptions={penaltyOptions}
                journalStatusOptions={journalStatusOptions}
                isOffshore={isOffshore}
                isService={isService}
                onUpdate={handleUpdateRecord}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
