"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight, ClipboardList, ClipboardPen, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { readStoredReasons, type ScoreKey } from "@/lib/evaluation-reasons"
import { useExpeditionsProfessionalismByDate } from "@/lib/hooks/use-expeditions"
import { journalStatusFromName } from "@/lib/journal-status"
import { addDays } from "@/lib/review-periods"
import { cn } from "@/lib/utils"

type ScoreField = "academics" | "crew" | "job" | "service" | "citizenship"

const SCORE_COLUMNS: ReadonlyArray<{ field: ScoreField; blockedFlag: string; label: string; reasonKey: ScoreKey }> = [
  { field: "academics", blockedFlag: "isAcademicsUsed", label: "School", reasonKey: "school" },
  { field: "crew", blockedFlag: "isCrewUsed", label: "Crew", reasonKey: "crew" },
  { field: "job", blockedFlag: "isJobUsed", label: "Job", reasonKey: "job" },
  { field: "service", blockedFlag: "isServiceUsed", label: "Service", reasonKey: "service_learning" },
  { field: "citizenship", blockedFlag: "isCitizenshipUsed", label: "Citizenship", reasonKey: "citizenship" },
]

const REASON_CHIP = {
  bonus: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-200",
  penalty: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
} as const

// Same scale the score steppers use on the evaluation card.
const SCORE_TONE: Record<number, string> = {
  0: "bg-red-100 text-red-800",
  1: "bg-orange-100 text-orange-800",
  2: "bg-yellow-100 text-yellow-800",
  3: "bg-gray-100 text-gray-700",
  4: "bg-green-100 text-green-800",
  5: "bg-blue-100 text-blue-800",
}

const JOURNAL_LABEL = { complete: "Done", incomplete: "Late", not_started: "Missed" } as const
const JOURNAL_TONE = {
  complete: "bg-green-50 text-green-700",
  incomplete: "bg-yellow-50 text-yellow-700",
  not_started: "bg-red-50 text-red-700",
} as const

/** A score if it counts that day: null when blank or blocked (N/A). */
function scoreOf(row: any, field: ScoreField, blockedFlag: string): number | null {
  if (row?.[blockedFlag] === true) return null
  const v = row?.[field]
  return v === null || v === undefined ? null : Number(v)
}

function isScored(row: any): boolean {
  return (
    SCORE_COLUMNS.some((c) => scoreOf(row, c.field, c.blockedFlag) !== null) ||
    !!journalStatusFromName(row?.journaling) ||
    (row?.fitness !== null && row?.fitness !== undefined)
  )
}

function studentName(s: any) {
  return `${s?.firstName ?? ""} ${s?.lastName ?? ""}`.trim() || `Student ${s?.id ?? ""}`
}

function formatDay(day: string) {
  const [y, m, d] = day.split("-").map(Number)
  return format(new Date(y, m - 1, d), "EEEE, MMM d")
}

/** How many bonus and penalty reasons were given across all of a day's categories. */
function reasonCounts(row: any) {
  let bonus = 0
  let penalty = 0
  for (const reasons of Object.values(readStoredReasons(row))) {
    for (const reason of reasons) {
      if (reason.type === "bonus") bonus++
      else penalty++
    }
  }
  return { bonus, penalty }
}

function CountPill({ count, tone }: { count: number; tone: "bonus" | "penalty" }) {
  if (count === 0) return <span className="text-gray-300 tabular-nums">0</span>
  return (
    <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums", REASON_CHIP[tone])}>
      {count}
    </span>
  )
}

function JournalChip({ row }: { row: any }) {
  const journal = journalStatusFromName(row?.journaling)
  if (!journal) return <span className="text-gray-300">—</span>
  return (
    <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium", JOURNAL_TONE[journal])}>
      {JOURNAL_LABEL[journal]}
    </span>
  )
}

function FitnessChip({ row }: { row: any }) {
  if (row?.fitness === null || row?.fitness === undefined) return <span className="text-gray-300">—</span>
  return Number(row.fitness) >= 100 ? (
    <span className="inline-flex rounded-md bg-green-50 px-1.5 py-0.5 text-[11px] font-medium text-green-700">Done</span>
  ) : (
    <span className="inline-flex rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">No</span>
  )
}

function ScorePill({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-300">—</span>
  return (
    <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums", SCORE_TONE[value] ?? SCORE_TONE[3])}>
      {value}
    </span>
  )
}

/**
 * How each student did on the previous expedition day: every category score,
 * citizenship, journaling, fitness and how many bonus and penalty reasons were
 * given, students with the lowest scores first. A row opens that student's day
 * in a sheet with the reasons. Arrows step back through earlier days.
 */
export function PreviousDayPerformance({
  expeditionId,
  students,
  today,
  startDate,
  endDate,
  className,
}: {
  expeditionId: number | null
  students: any[]
  today: string
  startDate?: string
  endDate?: string
  className?: string
}) {
  // Latest day that can have scores: yesterday, but never past the expedition's end.
  const latest = useMemo(() => {
    const yesterday = addDays(today, -1)
    return endDate && yesterday > endDate ? endDate : yesterday
  }, [today, endDate])
  const [date, setDate] = useState<string | null>(null)
  const day = date ?? latest
  // The row whose breakdown is in the side sheet; kept after closing so the sheet can animate out.
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const beforeStart = !!startDate && day < startDate

  const { data: rows, isLoading } = useExpeditionsProfessionalismByDate(beforeStart ? null : day, expeditionId)

  const studentById = useMemo(() => new Map(students.map((s: any) => [s.id, s])), [students])
  const scored = useMemo(
    () => (Array.isArray(rows) ? rows : []).filter((r: any) => isScored(r) && studentById.has(r.students_id)),
    [rows, studentById]
  )
  const schedule = (Array.isArray(rows) ? rows : [])[0]?._expedition_schedule
  const dayType = schedule ? (schedule.isOffshore ? "Offshore" : schedule.isService ? "Service" : "Anchored") : null

  // Only the categories that were scored that day.
  const columns = SCORE_COLUMNS.filter((c) => scored.some((r: any) => scoreOf(r, c.field, c.blockedFlag) !== null))
  const showFitness = scored.some((r: any) => r.fitness !== null && r.fitness !== undefined)

  // Lowest score first, so the students who need attention are at the top.
  const ordered = useMemo(() => {
    const minScore = (r: any) => {
      const values = SCORE_COLUMNS.map((c) => scoreOf(r, c.field, c.blockedFlag)).filter((v): v is number => v !== null)
      return values.length ? Math.min(...values) : 99
    }
    return [...scored].sort(
      (a: any, b: any) =>
        minScore(a) - minScore(b) || studentName(studentById.get(a.students_id)).localeCompare(studentName(studentById.get(b.students_id)))
    )
  }, [scored, studentById])

  const below3 = scored.filter((r: any) => SCORE_COLUMNS.some((c) => {
    const v = scoreOf(r, c.field, c.blockedFlag)
    return v !== null && v < 3
  })).length
  const citizenship = scored.map((r: any) => scoreOf(r, "citizenship", "isCitizenshipUsed")).filter((v): v is number => v !== null)
  const avgCitizenship = citizenship.length ? citizenship.reduce((a, b) => a + b, 0) / citizenship.length : null
  const journals = scored.map((r: any) => journalStatusFromName(r.journaling)).filter(Boolean)
  const journalsDone = journals.filter((j) => j === "complete").length

  const canGoBack = !startDate || day > startDate
  const canGoForward = day < latest

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3 border-b bg-gray-50/50 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">
            {day === addDays(today, -1) ? "Yesterday's performance" : "Daily performance"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatDay(day)}
            {dayType && <span> · {dayType}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            disabled={!canGoBack}
            onClick={() => setDate(addDays(day, -1))}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            disabled={!canGoForward}
            onClick={() => setDate(addDays(day, 1) >= latest ? null : addDays(day, 1))}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {beforeStart ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-sm text-muted-foreground">
          <ClipboardList className="h-8 w-8 text-gray-300" />
          The expedition starts {startDate ? formatDay(startDate) : "soon"}. Scores will show here the day after.
        </div>
      ) : isLoading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : scored.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
          <ClipboardList className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-muted-foreground">No scores were entered for {formatDay(day)}.</p>
          {expeditionId && (
            <Button asChild variant="outline" size="sm" className="cursor-pointer">
              <Link href={`/evaluate/${day}?expedition=${expeditionId}`}>Enter scores</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 divide-x border-b text-center">
            <div className="px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Below 3</p>
              <p className={cn("text-lg font-semibold tabular-nums", below3 > 0 ? "text-orange-700" : "text-gray-900")}>
                {below3}<span className="text-sm font-normal text-gray-400">/{scored.length}</span>
              </p>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Avg citizenship</p>
              <p className="text-lg font-semibold tabular-nums text-gray-900">{avgCitizenship !== null ? avgCitizenship.toFixed(1) : "—"}</p>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Journals done</p>
              <p className="text-lg font-semibold tabular-nums text-gray-900">
                {journals.length ? <>{journalsDone}<span className="text-sm font-normal text-gray-400">/{journals.length}</span></> : "—"}
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <th className="w-[30%] px-4 py-2">Student</th>
                  {columns.map((c) => (
                    <th key={c.field} className="px-1 py-2 text-center">{c.label === "Citizenship" ? "Citz" : c.label}</th>
                  ))}
                  <th className="px-1 py-2 text-center">Jrnl</th>
                  {showFitness && <th className="px-1 py-2 text-center">Fit</th>}
                  <th className="px-1 py-2 text-center">Bonus</th>
                  <th className="px-1 py-2 text-center">Penalty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ordered.map((r: any) => {
                  const student = studentById.get(r.students_id)
                  const counts = reasonCounts(r)
                  const open = () => {
                    setSelectedId(r.id)
                    setSheetOpen(true)
                  }
                  return (
                    <tr
                      key={r.id}
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          open()
                        }
                      }}
                      className="cursor-pointer hover:bg-gray-50/60 focus-visible:bg-gray-50 focus-visible:outline-none"
                    >
                      <td className="truncate px-4 py-2 font-medium text-gray-900">{studentName(student)}</td>
                      {columns.map((c) => (
                        <td key={c.field} className="px-1 py-2 text-center">
                          <ScorePill value={scoreOf(r, c.field, c.blockedFlag)} />
                        </td>
                      ))}
                      <td className="px-1 py-2 text-center">
                        <JournalChip row={r} />
                      </td>
                      {showFitness && (
                        <td className="px-1 py-2 text-center">
                          <FitnessChip row={r} />
                        </td>
                      )}
                      <td className="px-1 py-2 text-center">
                        <CountPill count={counts.bonus} tone="bonus" />
                      </td>
                      <td className="px-1 py-2 text-center">
                        <CountPill count={counts.penalty} tone="penalty" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <DayBreakdownSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        row={scored.find((r: any) => r.id === selectedId) ?? null}
        student={studentById.get(scored.find((r: any) => r.id === selectedId)?.students_id)}
        day={day}
        dayType={dayType}
        expeditionId={expeditionId}
      />
    </div>
  )
}

/** One student's day in a side sheet: every score with the reasons behind it, journaling, fitness and the note. */
function DayBreakdownSheet({
  open,
  onOpenChange,
  row,
  student,
  day,
  dayType,
  expeditionId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: any
  student: any
  day: string
  dayType: string | null
  expeditionId: number | null
}) {
  const reasons = readStoredReasons(row)
  // A category shows when it was scored or has reasons; blocked (N/A) ones without either are left out.
  const categories = SCORE_COLUMNS.map((c) => ({ ...c, score: scoreOf(row, c.field, c.blockedFlag), reasons: reasons[c.reasonKey] }))
    .filter((c) => c.score !== null || c.reasons.length > 0)

  return (
    <Sheet open={open && !!row} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[480px] sm:max-w-[90vw] p-0 flex flex-col h-full overflow-hidden gap-0">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-xl truncate">{studentName(student)}</SheetTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <SheetDescription>
            {formatDay(day)}
            {dayType && <span> · {dayType}</span>}
          </SheetDescription>
        </SheetHeader>

        {row && (
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Scores</div>
              <div className="divide-y rounded-lg border">
                {categories.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-gray-500">No category scores this day.</p>
                ) : (
                  categories.map((c) => (
                    <div key={c.field} className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{c.label}</p>
                        {c.reasons.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.reasons.map((reason) => (
                              <span
                                key={`${reason.type}-${reason.id}`}
                                className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4", REASON_CHIP[reason.type])}
                              >
                                {reason.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-0.5 text-xs text-gray-400">No reasons given</p>
                        )}
                      </div>
                      <ScorePill value={c.score} />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border px-3 py-2.5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Journaling</p>
                <JournalChip row={row} />
              </div>
              <div className="rounded-lg border px-3 py-2.5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Fitness</p>
                <FitnessChip row={row} />
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Note</div>
              {row.note ? (
                <p className="whitespace-pre-wrap text-sm text-gray-700">{row.note}</p>
              ) : (
                <span className="text-sm text-gray-400">No note</span>
              )}
            </div>
          </div>
        )}

        {row && expeditionId && (
          <div className="flex gap-2 p-4 border-t shrink-0 mt-auto">
            <Button asChild variant="outline" className="flex-1 cursor-pointer">
              <Link href={`/student/${row.students_id}?expedition=${expeditionId}`}>
                <User className="h-4 w-4 mr-2" />
                Student page
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 cursor-pointer">
              <Link href={`/evaluate/${day}?expedition=${expeditionId}`}>
                <ClipboardPen className="h-4 w-4 mr-2" />
                Edit scores
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
