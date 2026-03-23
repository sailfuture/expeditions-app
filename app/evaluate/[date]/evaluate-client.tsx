"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DateNavigation } from "@/components/date-navigation"
import { Spinner } from "@/components/ui/spinner"
import { Unlock, MapPin, Calendar, X } from "lucide-react"
import { StudentCard } from "@/components/student-card"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import {
  useExpeditionSchedules,
  useStudents,
  useExpeditionsProfessionalismByDate,
  useExpeditionBonus,
  useExpeditionPenalty,
  useExpeditionJournalStatus,
} from "@/lib/hooks/use-expeditions"
import { updateExpeditionsProfessionalism, createExpeditionsProfessionalism, addStudentsToProfessionalism } from "@/lib/xano"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Users } from "lucide-react"
import { mutate } from "swr"
import type { ExpeditionProfessionalism } from "@/lib/types"
import { isDateWithinExpeditionRange } from "@/lib/utils"
import { ExpeditionHeader } from "@/components/expedition-header"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import { toast } from "sonner"

interface EvaluateClientProps {
  date: string
  expeditionId?: number
}

export function EvaluateClient({ date, expeditionId }: EvaluateClientProps) {
  const router = useRouter()
  const { activeExpedition, userExpeditions } = useExpeditionContext()
  const { data: allExpeditionsData } = useExpeditions()
  
  // Use expedition ID from URL if provided, otherwise fall back to active expedition
  const effectiveExpeditionId = expeditionId || activeExpedition?.id || null
  
  // Find the expedition to display - prioritize URL parameter, fetch full data with term info
  const displayExpedition = useMemo(() => {
    if (expeditionId && allExpeditionsData) {
      const expeditionFromUrl = allExpeditionsData.find((e: any) => e.id === expeditionId)
      if (expeditionFromUrl) return expeditionFromUrl
    }
    if (expeditionId && userExpeditions) {
      const expeditionFromUrl = userExpeditions.find((e: any) => e.id === expeditionId)
      if (expeditionFromUrl) return expeditionFromUrl
    }
    return activeExpedition
  }, [expeditionId, allExpeditionsData, userExpeditions, activeExpedition])

  const { data: schedules, isLoading: loadingSchedule } = useExpeditionSchedules(effectiveExpeditionId || undefined)
  const { data: students, isLoading: loadingStudents } = useStudents()
  const { data: allProfessionalism, isLoading: loadingProfessionalism } = useExpeditionsProfessionalismByDate(date, effectiveExpeditionId)
  const { data: bonusOptions = [], isLoading: loadingBonus } = useExpeditionBonus()
  const { data: penaltyOptions = [], isLoading: loadingPenalty } = useExpeditionPenalty()
  const { data: journalStatusOptions = [], isLoading: loadingJournalStatus } = useExpeditionJournalStatus()

  const [localUpdates, setLocalUpdates] = useState<Record<number, Partial<ExpeditionProfessionalism>>>({})
  const [isNavigating, setIsNavigating] = useState(false)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Get current schedule by date
  const schedule = useMemo(() => {
    if (!schedules) return null
    const found = schedules.find((s: any) => {
      // Compare date strings directly (both in YYYY-MM-DD format)
      return s.date === date
    })
    return found
  }, [schedules, date])

  const scheduleId = schedule?.id

  const formatLocation = (location: any) => {
    if (!location) return ""
    return `${location.port}, ${location.country}`
  }

  const [currentDate, setCurrentDate] = useState(() => {
    // Parse date string without timezone conversion
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day)
  })

  // Sync currentDate with URL date parameter
  useEffect(() => {
    const [year, month, day] = date.split('-').map(Number)
    setCurrentDate(new Date(year, month - 1, day))
  }, [date])
  
  // Check if current date is within expedition range
  const isWithinExpeditionRange = useMemo(() => {
    return isDateWithinExpeditionRange(
      currentDate,
      displayExpedition?.startDate || displayExpedition?.start_date,
      displayExpedition?.endDate || displayExpedition?.end_date
    )
  }, [currentDate, displayExpedition])

  // When date changes, navigate to new date (preserve expedition ID)
  const handleDateChange = (newDate: Date) => {
    const dateStr = newDate.toISOString().split('T')[0]
    if (dateStr !== date) {
      setIsNavigating(true)
      setLocalUpdates({})
      const url = effectiveExpeditionId ? `/evaluate/${dateStr}?expedition=${effectiveExpeditionId}` : `/evaluate/${dateStr}`
      router.push(url)
    }
  }

  // Clear local updates and navigation state when date changes
  useEffect(() => {
    setLocalUpdates({})
    setIsNavigating(false)
  }, [date])

  const isOffshore = schedule?.isOffshore ?? schedule?.is_offshore ?? false
  const isService = schedule?.isService ?? schedule?.is_service ?? false

  // Get students for this expedition
  const expeditionStudents = useMemo(() => {
    if (!students || !schedule) return []
    
    const filtered = students.filter((s: any) => {
      if (Array.isArray(s.expeditions_id)) {
        // Check if array contains objects with id property or just numbers
        return s.expeditions_id.some((exp: any) => 
          typeof exp === 'object' ? exp.id === schedule.expeditions_id : exp === schedule.expeditions_id
        )
      }
      return s.expeditions_id === schedule.expeditions_id
    })
    return filtered
  }, [students, schedule])

  // Build professionalism records - merge API data with local updates
  const records = useMemo(() => {
    if (!expeditionStudents.length || !scheduleId) return []

    return expeditionStudents.map((student: any) => {
      // Find existing professionalism record for this student + schedule
      const existing = allProfessionalism?.find(
        (p: any) => p.students_id === student.id && p.expedition_schedule_id === scheduleId,
      )

      // Map journaling string to journal_status_id
      const journalingString = existing?.journaling || existing?.note || ""
      const matchedJournalStatus = journalStatusOptions.find(
        opt => opt.name.toLowerCase() === journalingString.toLowerCase()
      )
      
      const baseRecord: ExpeditionProfessionalism = existing
        ? {
            id: existing.id,
            expedition_schedule_id: scheduleId,
            students_id: student.id,
            school: existing.academics ?? existing.school ?? null,
            job: existing.job ?? null,
            citizenship: existing.citizenship ?? null,
            crew: existing.crew ?? null,
            service_learning: existing.service ?? existing.service_learning ?? null,
            isFlagged: existing.isFlagged ?? existing.is_flagged ?? false,
            isLocked: existing.isLocked ?? existing.is_locked ?? false,
            bonuses: Array.isArray(existing.bonus) ? existing.bonus : (Array.isArray(existing.bonuses) ? existing.bonuses : []),
            penalties: Array.isArray(existing.penalty) ? existing.penalty : (Array.isArray(existing.penalties) ? existing.penalties : []),
            note: existing.note ?? null, // Note is separate from journaling status
            journal_status_id: matchedJournalStatus?.id ?? null,
            // Boolean flags for disabling categories (true = disabled)
            isAcademicsUsed: existing.isAcademicsUsed ?? false,
            isJobUsed: existing.isJobUsed ?? false,
            isCitizenshipUsed: existing.isCitizenshipUsed ?? false,
            isCrewUsed: existing.isCrewUsed ?? false,
            isServiceUsed: existing.isServiceUsed ?? false,
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
            // Boolean flags for disabling categories (default to false = enabled)
            isAcademicsUsed: false,
            isJobUsed: false,
            isCitizenshipUsed: false,
            isCrewUsed: false,
            isServiceUsed: false,
            _students: student,
          }

      // Apply local updates
      const localUpdate = localUpdates[baseRecord.id]
      if (localUpdate) {
        return { ...baseRecord, ...localUpdate }
      }

      return baseRecord
    })
  }, [expeditionStudents, allProfessionalism, scheduleId, localUpdates, journalStatusOptions])

  const isIncomplete = useCallback(
    (record: ExpeditionProfessionalism) => {
      // A record is incomplete only if it has NO scores entered at all
      // Categories that are disabled (isXUsed = true) are skipped
      
      // Helper to check if a category needs a score
      const needsScore = (value: number | null, isDisabled: boolean | undefined) => {
        if (isDisabled) return false // Disabled categories don't need scores
        return value === null
      }
      
      // Service Learning day (in port)
      if (!isOffshore && isService) {
        // At least one enabled category must have a score
        const schoolNeeds = needsScore(record.school, record.isAcademicsUsed)
        const jobNeeds = needsScore(record.job, record.isJobUsed)
        const citizenshipNeeds = needsScore(record.citizenship, record.isCitizenshipUsed)
        const serviceNeeds = needsScore(record.service_learning, record.isServiceUsed)
        return schoolNeeds && jobNeeds && citizenshipNeeds && serviceNeeds
      }
      // Offshore + Service Learning
      else if (isOffshore && isService) {
        const crewNeeds = needsScore(record.crew, record.isCrewUsed)
        const jobNeeds = needsScore(record.job, record.isJobUsed)
        const citizenshipNeeds = needsScore(record.citizenship, record.isCitizenshipUsed)
        const serviceNeeds = needsScore(record.service_learning, record.isServiceUsed)
        return crewNeeds && jobNeeds && citizenshipNeeds && serviceNeeds
      }
      // Offshore (no service)
      else if (isOffshore && !isService) {
        const crewNeeds = needsScore(record.crew, record.isCrewUsed)
        const jobNeeds = needsScore(record.job, record.isJobUsed)
        const citizenshipNeeds = needsScore(record.citizenship, record.isCitizenshipUsed)
        return crewNeeds && jobNeeds && citizenshipNeeds
      }
      // Regular day: school, job, citizenship
      const schoolNeeds = needsScore(record.school, record.isAcademicsUsed)
      const jobNeeds = needsScore(record.job, record.isJobUsed)
      const citizenshipNeeds = needsScore(record.citizenship, record.isCitizenshipUsed)
      return schoolNeeds && jobNeeds && citizenshipNeeds
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

  const filteredRecords = records

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

  const handleUnblockAllCategories = () => {
    setLocalUpdates((prev) => {
      const newUpdates = { ...prev }
      records.forEach((r) => {
        const unblocked = { ...r }
        // Unblock any null categories by setting them to 3
        if (unblocked.school === null) unblocked.school = 3
        if (unblocked.job === null) unblocked.job = 3
        if (unblocked.citizenship === null) unblocked.citizenship = 3
        if (unblocked.crew === null) unblocked.crew = 3
        if (unblocked.service_learning === null) unblocked.service_learning = 3
        newUpdates[r.id] = { ...newUpdates[r.id], ...unblocked }
      })
      return newUpdates
    })
  }

  const handleReload = async () => {
    setLocalUpdates({})
    await mutate(`expeditions_professionalism_date_${date}_${effectiveExpeditionId}`)
  }

  const handleLoadStudents = async () => {
    if (!effectiveExpeditionId) {
      toast.error("No expedition selected")
      return
    }
    
    setIsLoadingStudents(true)
    try {
      await addStudentsToProfessionalism(date, effectiveExpeditionId)
      // Refresh the professionalism data
      await mutate(`expeditions_professionalism_date_${date}_${effectiveExpeditionId}`)
    } catch (error) {
      console.error("Failed to load students:", error)
      toast.error("Failed to load students")
    } finally {
      setIsLoadingStudents(false)
    }
  }

  const handleSubmitScores = async () => {
    // Get all unlocked, non-flagged records (submit even if values are null - use default of 3)
    const recordsToSubmit = records.filter((r) => !r.isLocked && !r.isFlagged)
    
    if (recordsToSubmit.length === 0) return

    setIsSubmitting(true)
    
    try {
      for (const record of recordsToSubmit) {
        // Only submit scores for categories that are visible based on day type
        // Offshore: crew, citizenship (+ service if service day)
        // Anchored: school, job, citizenship (+ service if service day)
        
        // Get the journal status name from the selected ID
        const selectedJournalStatus = journalStatusOptions.find(opt => opt.id === record.journal_status_id)
        const journalingValue = selectedJournalStatus?.name || ""
        
        const data: Record<string, any> = {
          expedition_schedule_id: record.expedition_schedule_id,
          expeditions_id: effectiveExpeditionId || 0,
          students_id: record.students_id,
          date: date,
          // If isCitizenshipUsed is true (excluded), keep as null; otherwise default to 3
          citizenship: record.isCitizenshipUsed ? null : (record.citizenship ?? 3),
          isCitizenshipUsed: record.isCitizenshipUsed ?? false,
          isFlagged: record.isFlagged,
          isLocked: true, // Lock on submit
          bonus: record.bonuses || [],
          penalty: record.penalties || [],
          journaling: journalingValue,
        }

        if (isOffshore) {
          // Offshore days: crew and job are visible
          // If isXUsed is true (excluded), keep as null; otherwise default to 3
          data.crew = record.isCrewUsed ? null : (record.crew ?? 3)
          data.isCrewUsed = record.isCrewUsed ?? false
          data.job = record.isJobUsed ? null : (record.job ?? 3)
          data.isJobUsed = record.isJobUsed ?? false
          // Don't submit school on offshore days
          data.academics = null
          data.isAcademicsUsed = false
        } else {
          // Anchored days: school and job are visible
          // If isXUsed is true (excluded), keep as null; otherwise default to 3
          data.academics = record.isAcademicsUsed ? null : (record.school ?? 3)
          data.job = record.isJobUsed ? null : (record.job ?? 3)
          data.isAcademicsUsed = record.isAcademicsUsed ?? false
          data.isJobUsed = record.isJobUsed ?? false
          // Don't submit crew on anchored days
          data.crew = null
          data.isCrewUsed = false
        }

        if (isService) {
          // Service learning days: service is visible
          // If isServiceUsed is true (excluded), keep as null; otherwise default to 3
          data.service = record.isServiceUsed ? null : (record.service_learning ?? 3)
          data.isServiceUsed = record.isServiceUsed ?? false
        } else {
          // Non-service days: don't submit service score
          data.service = null
          data.isServiceUsed = false
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
          console.error("Failed to save record:", error, "Data:", data)
          toast.error(`Failed to save score for ${record._students?.firstName || 'student'}`)
          throw error // Re-throw to trigger the outer catch
        }
      }

      // Refresh data
      await mutate(`expeditions_professionalism_date_${date}_${effectiveExpeditionId}`)
      setLocalUpdates({})
      toast.success("Scores submitted successfully")
    } catch (error) {
      console.error("Error submitting scores:", error)
      toast.error("Failed to submit scores")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Count all unlocked, non-flagged records (they will all be submitted with default values if needed)
  const submitCount = records.filter((r) => !r.isLocked && !r.isFlagged).length

  const isLoading =
    loadingSchedule ||
    loadingStudents ||
    loadingProfessionalism ||
    loadingBonus ||
    loadingPenalty ||
    loadingJournalStatus

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Expedition Header with Navigation */}
      <ExpeditionHeader expedition={displayExpedition} isLoading={!displayExpedition} currentPage="add-scores" />

      {/* Date Navigation & Actions Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-row items-center gap-4 justify-between flex-wrap lg:flex-nowrap">
            {/* Date Navigation */}
            <DateNavigation 
              date={currentDate} 
              onDateChange={handleDateChange}
              isOffshore={isOffshore}
              isService={isService}
              size="large"
              isLoading={isLoading || !schedule}
              expeditionStartDate={schedule?._expeditions?.startDate}
              expeditionEndDate={schedule?._expeditions?.endDate}
            />

            {/* Stats & Actions */}
            <div className="flex items-center gap-3 flex-nowrap">
              {/* Location - hidden on mobile */}
              {schedule && schedule._expedition_current_location && (
                <div className="hidden sm:flex items-center gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm max-w-[150px]">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate" title={formatLocation(schedule._expedition_current_location)}>
                      {formatLocation(schedule._expedition_current_location)}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-border" />
                </div>
              )}

              {/* Number Squares - hidden on mobile */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-10 w-10 rounded border bg-gray-100 border-gray-300 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-600">
                    {loadingProfessionalism || isNavigating ? "–" : records.filter((r) => !r.isLocked).length}
                  </span>
                </div>
                <div className="h-10 w-10 rounded border bg-green-50 border-green-300 flex items-center justify-center">
                  <span className="text-sm font-semibold text-green-600">
                    {loadingProfessionalism || isNavigating ? "–" : stats.locked}
                  </span>
                </div>
              </div>

              <div className="hidden sm:block h-6 w-px bg-border" />

              {/* View Schedule button - hidden on mobile */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push(`/schedule/${date}`)}
                className="hidden sm:flex cursor-pointer h-10 w-10"
                disabled={!isWithinExpeditionRange}
                title={!isWithinExpeditionRange ? "Outside expedition date range" : "View schedule"}
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleUnblockAllCategories}
                className="cursor-pointer h-10 w-10"
                disabled={isNavigating || !isWithinExpeditionRange}
                title={!isWithinExpeditionRange ? "Outside expedition date range" : "Unblock all categories"}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleUnlockAll}
                className="cursor-pointer h-10 w-10"
                disabled={isNavigating || !isWithinExpeditionRange}
                title={!isWithinExpeditionRange ? "Outside expedition date range" : "Unlock All"}
              >
                <Unlock className="h-4 w-4" />
              </Button>
              <Button
                size="default"
                disabled={submitCount === 0 || isNavigating || isSubmitting || !isWithinExpeditionRange || !allProfessionalism || allProfessionalism.length === 0 || loadingProfessionalism}
                onClick={handleSubmitScores}
                className="cursor-pointer h-10 px-4"
                title={!isWithinExpeditionRange ? "Outside expedition date range" : (!allProfessionalism || allProfessionalism.length === 0) ? "No students loaded" : "Submit professionalism scores"}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="h-4 w-4 mr-2" />
                    Submitting...
                  </>
                ) : (
                  `Submit (${(loadingProfessionalism || isNavigating || !allProfessionalism || allProfessionalism.length === 0) ? 0 : submitCount})`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Submitting Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-xl shadow-lg border">
            <Spinner size="lg" />
            <div className="text-center">
              <p className="text-lg font-semibold">Submitting Scores</p>
              <p className="text-sm text-muted-foreground">Please wait while we save your data...</p>
            </div>
          </div>
        </div>
      )}

      {/* Student Cards Grid */}
      <main className="container mx-auto px-4 py-8 relative bg-transparent">
        {/* Loading Overlay */}
        {isNavigating && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">Loading schedule...</p>
            </div>
          </div>
        )}

        {!isWithinExpeditionRange ? (
          <Empty className="bg-white border-gray-200">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>Outside of Expedition Range</EmptyTitle>
              <EmptyDescription>
                This date is outside the expedition's scheduled date range. Please select a date within the expedition period.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-lg" />
            ))}
          </div>
        ) : !schedule || !scheduleId ? (
          <Empty className="bg-white border-gray-200">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No Schedule Found</EmptyTitle>
              <EmptyDescription>
                There is no schedule for this date. Try selecting a different date above.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : filteredRecords.length === 0 || !allProfessionalism || allProfessionalism.length === 0 ? (
          <Empty className="bg-white border-gray-200">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No Professionalism Scores</EmptyTitle>
              <EmptyDescription>
                There are no professionalism records for this date. Load students to start recording scores.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button 
                onClick={handleLoadStudents}
                disabled={isLoadingStudents}
                className="cursor-pointer"
              >
                {isLoadingStudents ? (
                  <>
                    <Spinner size="sm" className="h-4 w-4 mr-2" />
                    Loading Students...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Load Students
                  </>
                )}
              </Button>
            </EmptyContent>
          </Empty>
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



