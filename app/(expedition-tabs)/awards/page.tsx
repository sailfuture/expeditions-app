"use client"

import { Fragment, Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { format } from "date-fns"
import { ChevronDown, ChevronRight, Info, Printer, Trophy } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useExpeditions, useStudentsByExpedition, useExpeditionJournalStatus } from "@/lib/hooks/use-expeditions"
import { getProfessionalismByStudent } from "@/lib/xano"
import { cn } from "@/lib/utils"
import { isResidentialExpedition } from "@/lib/expedition-type"
import {
  DEFAULT_AWARD_SETTINGS,
  RATED_CATEGORIES,
  COMPLETION_CATEGORIES,
  dailyScoresFromProfessionalism,
  summarizeStudentAwards,
  formatAwardDollars,
  formatAwardPercent,
  type DailyAward,
  type DailyScores,
  type StudentAwardSummary,
} from "@/lib/expedition-award"

const SETTINGS = DEFAULT_AWARD_SETTINGS

interface StudentRow {
  student: any
  summary: StudentAwardSummary
}

function formatDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split("-").map(Number)
    return format(new Date(y, m - 1, d), "EEE MMM d")
  } catch {
    return dateStr
  }
}

function studentName(student: any) {
  return `${student?.firstName ?? ""} ${student?.lastName ?? ""}`.trim() || `Student ${student?.id ?? ""}`
}

function initials(student: any) {
  return `${student?.firstName?.[0] ?? ""}${student?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
}

/** A row where nothing was scored is an unsubmitted placeholder, not a scored day. */
function hasAnyScore(s: DailyScores) {
  return (
    s.school !== null || s.job !== null || s.service !== null || s.crew !== null ||
    s.journaling !== null || s.fitness !== null || s.citizenship !== null
  )
}

const CELL = "px-3 py-2 text-sm whitespace-nowrap"
const HEAD = "h-9 px-3 text-xs font-semibold text-gray-600 whitespace-nowrap"

function ScoreCell({ value, earned }: { value: number | null; earned: number }) {
  if (value === null) return <TableCell className={cn(CELL, "text-center text-gray-300")}>—</TableCell>
  return (
    <TableCell className={cn(CELL, "text-center")}>
      <span className={cn("inline-flex min-w-[2.25rem] justify-center rounded-md px-1.5 py-0.5 text-xs font-medium",
        earned > 0 ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600")}>
        {value}
      </span>
    </TableCell>
  )
}

function DailyBreakdown({ days }: { days: DailyAward[] }) {
  return (
    <div className="border-t bg-gray-50/60 px-3 py-3 sm:px-6">
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-gray-50 hover:bg-gray-50">
              <TableHead className={HEAD}>Day</TableHead>
              {RATED_CATEGORIES.map((c) => (
                <TableHead key={c.key} className={cn(HEAD, "text-center")}>{c.label}</TableHead>
              ))}
              {COMPLETION_CATEGORIES.map((c) => (
                <TableHead key={c.key} className={cn(HEAD, "text-center")}>{c.label}</TableHead>
              ))}
              <TableHead className={cn(HEAD, "text-center")}>Citizenship</TableHead>
              <TableHead className={cn(HEAD, "text-right")}>Earned</TableHead>
              <TableHead className={cn(HEAD, "text-right")}>Perf. score</TableHead>
              <TableHead className={cn(HEAD, "text-right")}>Perf. %</TableHead>
              <TableHead className={cn(HEAD, "text-right")}>Cit. %</TableHead>
              <TableHead className={cn(HEAD, "text-right")}>Withheld</TableHead>
              <TableHead className={cn(HEAD, "text-right")}>Award</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((d) => (
              <TableRow key={d.date} className="border-b last:border-0">
                <TableCell className={cn(CELL, "font-medium text-gray-900")}>{formatDate(d.date)}</TableCell>
                {RATED_CATEGORIES.map((c) => (
                  <ScoreCell key={c.key} value={d.scores[c.key]} earned={d.earnedByCategory[c.key]} />
                ))}
                {COMPLETION_CATEGORIES.map((c) => (
                  <ScoreCell key={c.key} value={d.scores[c.key]} earned={d.earnedByCategory[c.key]} />
                ))}
                <TableCell className={cn(CELL, "text-center")}>
                  {d.scores.citizenship === null ? (
                    <span className="text-gray-300">—</span>
                  ) : (
                    <span className={cn("inline-flex min-w-[2.25rem] justify-center rounded-md px-1.5 py-0.5 text-xs font-medium",
                      d.citizenshipPercent >= 1 ? "bg-green-50 text-green-700"
                        : d.citizenshipPercent > 0 ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700")}>
                      {d.scores.citizenship}
                    </span>
                  )}
                </TableCell>
                <TableCell className={cn(CELL, "text-right text-gray-700")}>{formatAwardDollars(d.earned)}</TableCell>
                <TableCell className={cn(CELL, "text-right text-gray-700")}>
                  {d.ratedCount > 0 ? d.performanceScore.toFixed(2) : <span className="text-gray-300">—</span>}
                </TableCell>
                <TableCell className={cn(CELL, "text-right", d.performancePercent === 0 ? "text-red-600" : "text-gray-700")}>
                  {formatAwardPercent(d.performancePercent)}
                </TableCell>
                <TableCell className={cn(CELL, "text-right", d.citizenshipPercent === 0 ? "text-red-600" : "text-gray-700")}>
                  {formatAwardPercent(d.citizenshipPercent)}
                </TableCell>
                <TableCell className={cn(CELL, "text-right text-gray-500")}>
                  {d.withheld > 0 ? `-${formatAwardDollars(d.withheld)}` : "—"}
                </TableCell>
                <TableCell className={cn(CELL, "text-right font-semibold", d.award > 0 ? "text-green-700" : "text-gray-400")}>
                  {formatAwardDollars(d.award)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function HowItWorks() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 pr-3 sm:pr-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-4 py-3 text-left sm:px-6"
        >
          {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          <Info className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">How the award is calculated</span>
          <span className="ml-auto hidden text-xs text-gray-500 lg:inline">
            Daily award = earned $ × performance % × citizenship %
          </span>
        </button>
        <Button asChild variant="outline" size="sm" className="h-7 flex-shrink-0 cursor-pointer text-xs">
          <Link href="/public/award-guide" target="_blank" rel="noopener">
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Student hand-out</span>
            <span className="sm:hidden">Hand-out</span>
          </Link>
        </Button>
      </div>
      {open && (
        <div className="border-t px-4 py-4 text-sm text-gray-600 sm:px-6">
          <div className="max-w-3xl space-y-6">
            <p className="text-gray-700">
              Each scored day is worked out in three steps, then the days are added up for the expedition total.
              Every number below comes from the award settings.
            </p>

            <section className="space-y-2">
              <p className="font-semibold text-gray-800">Step 1 · Earned dollars</p>
              <p className="text-xs text-gray-500">
                Each category that qualifies earns {formatAwardDollars(SETTINGS.dollarsPerCategory)}. Blank categories (not part of
                the day, or blocked on the scores screen) earn nothing and are left out of every average. Most per day:{" "}
                {formatAwardDollars(SETTINGS.dollarsPerCategory * (RATED_CATEGORIES.length + COMPLETION_CATEGORIES.length))}.
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-1 pr-2 font-medium">Category</th>
                    <th className="py-1 pr-2 font-medium">Qualifies when</th>
                    <th className="py-1 text-right font-medium">Earns</th>
                  </tr>
                </thead>
                <tbody>
                  {RATED_CATEGORIES.map((c) => (
                    <tr key={c.key} className="border-t">
                      <td className="py-1 pr-2 text-gray-800">{c.label}</td>
                      <td className="py-1 pr-2">Scored {SETTINGS.ratedThreshold} or higher</td>
                      <td className="py-1 text-right font-medium text-gray-800">{formatAwardDollars(SETTINGS.dollarsPerCategory)}</td>
                    </tr>
                  ))}
                  {COMPLETION_CATEGORIES.map((c) => (
                    <tr key={c.key} className="border-t">
                      <td className="py-1 pr-2 text-gray-800">{c.label}</td>
                      <td className="py-1 pr-2">
                        Marked complete ({SETTINGS.completionValue}){c.key === "journaling" ? " — only the \"Completed\" journal status counts" : ""}
                      </td>
                      <td className="py-1 text-right font-medium text-gray-800">{formatAwardDollars(SETTINGS.dollarsPerCategory)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="space-y-2">
              <p className="font-semibold text-gray-800">Step 2 · Performance percent</p>
              <p className="text-xs text-gray-500">
                Performance score = average of the {RATED_CATEGORIES.map((c) => c.label).join(", ")} scores entered that day (a 0
                counts as 0; blanks are left out). Rows are checked from the top; the first match sets the percent kept.
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-1 pr-2 font-medium">Performance score</th>
                    <th className="py-1 text-right font-medium">Keeps</th>
                  </tr>
                </thead>
                <tbody>
                  {SETTINGS.performanceTiers.map((t) => (
                    <tr key={`${t.op}-${t.value}`} className="border-t">
                      <td className="py-1 pr-2 text-gray-800">{t.op === "gt" ? "Greater than" : "At least"} {t.value.toFixed(2)}</td>
                      <td className="py-1 text-right font-medium text-gray-800">{formatAwardPercent(t.percent)}</td>
                    </tr>
                  ))}
                  <tr className="border-t">
                    <td className="py-1 pr-2 text-gray-800">Below {SETTINGS.performanceTiers[SETTINGS.performanceTiers.length - 1]?.value.toFixed(2)}</td>
                    <td className="py-1 text-right font-medium text-gray-800">0%</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="space-y-2">
              <p className="font-semibold text-gray-800">Step 3 · Citizenship percent</p>
              <p className="text-xs text-gray-500">Exact lookup by the day&apos;s citizenship score. A blank citizenship score keeps 0%.</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-1 pr-2 font-medium">Citizenship score</th>
                    <th className="py-1 text-right font-medium">Keeps</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(SETTINGS.citizenshipPercents)
                    .map(([score, pct]) => ({ score: Number(score), pct }))
                    .sort((a, b) => b.score - a.score)
                    .map(({ score, pct }) => (
                      <tr key={score} className="border-t">
                        <td className="py-1 pr-2 text-gray-800">{score}</td>
                        <td className="py-1 text-right font-medium text-gray-800">{formatAwardPercent(pct)}</td>
                      </tr>
                    ))}
                  <tr className="border-t">
                    <td className="py-1 pr-2 text-gray-800">Blank</td>
                    <td className="py-1 text-right font-medium text-gray-800">0%</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="space-y-2">
              <p className="font-semibold text-gray-800">Step 4 · Daily award and expedition total</p>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-t">
                    <td className="py-1 pr-2 text-gray-800">Daily award</td>
                    <td className="py-1 text-right font-medium text-gray-800">earned $ × performance % × citizenship %</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-1 pr-2 text-gray-800">Withheld</td>
                    <td className="py-1 text-right font-medium text-gray-800">earned $ − daily award</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-1 pr-2 text-gray-800">Expedition total</td>
                    <td className="py-1 text-right font-medium text-gray-800">sum of every day&apos;s award</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

function AwardsPageContent() {
  const searchParams = useSearchParams()
  const expeditionParam = searchParams.get("expedition")
  const expeditionId = expeditionParam ? parseInt(expeditionParam, 10) : null

  const { data: expeditions } = useExpeditions()
  const { data: students, isLoading: loadingStudents } = useStudentsByExpedition(expeditionId)
  const { data: journalStatuses = [], isLoading: loadingStatuses } = useExpeditionJournalStatus()

  const expedition = useMemo(
    () => (expeditions && expeditionId ? expeditions.find((e: any) => e.id === expeditionId) : null),
    [expeditions, expeditionId]
  )

  // Only residential expeditions use the award system. null = expedition not loaded yet.
  const residential = expedition ? isResidentialExpedition(expedition) : null

  const activeStudents = useMemo(
    () => (students || []).filter((s: any) => !s.isArchived),
    [students]
  )
  const studentKey = activeStudents.map((s: any) => s.id).join(",")

  // One professionalism query per student (the by-student endpoint is the only
  // one that filters server-side by expedition).
  const { data: rowsByStudent, isLoading: loadingRows, error } = useSWR(
    residential && expeditionId && studentKey ? `awards_${expeditionId}_${studentKey}` : null,
    async () => {
      const results = await Promise.all(
        activeStudents.map(async (s: any) => [s.id, await getProfessionalismByStudent(s.id, expeditionId!)] as const)
      )
      return Object.fromEntries(results) as Record<number, any[]>
    }
  )

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  // The From/To filter can only cover the expedition's own dates.
  const expeditionStart: string | undefined = expedition?.startDate || expedition?.start_date || undefined
  const expeditionEnd: string | undefined = expedition?.endDate || expedition?.end_date || undefined
  const clampToExpedition = (value: string) => {
    if (!value) return ""
    if (expeditionStart && value < expeditionStart) return expeditionStart
    if (expeditionEnd && value > expeditionEnd) return expeditionEnd
    return value
  }

  const rows: StudentRow[] = useMemo(() => {
    if (!rowsByStudent) return []
    return activeStudents
      .map((student: any) => {
        const days = (rowsByStudent[student.id] || [])
          .map((r: any) => dailyScoresFromProfessionalism(r, journalStatuses))
          .filter((d: DailyScores) => d.date && hasAnyScore(d))
          .filter((d: DailyScores) => (!startDate || d.date >= startDate) && (!endDate || d.date <= endDate))
        return { student, summary: summarizeStudentAwards(days, SETTINGS) }
      })
      .sort((a: StudentRow, b: StudentRow) => b.summary.total - a.summary.total || studentName(a.student).localeCompare(studentName(b.student)))
  }, [rowsByStudent, activeStudents, journalStatuses, startDate, endDate])

  const totals = useMemo(
    () => rows.reduce(
      (acc, r) => ({
        earned: acc.earned + r.summary.earned,
        withheld: acc.withheld + r.summary.withheld,
        total: acc.total + r.summary.total,
      }),
      { earned: 0, withheld: 0, total: 0 }
    ),
    [rows]
  )

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const isLoading = loadingStudents || loadingStatuses || loadingRows

  if (!expeditionId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        <Trophy className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p className="text-lg font-medium text-gray-600">Pick an expedition to see awards</p>
      </div>
    )
  }

  if (residential === false) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        <Trophy className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p className="text-lg font-medium text-gray-600">Awards are for residential expeditions</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
          {expedition?.name ?? "This expedition"} is an academy expedition, which uses daily scores and performance reviews
          only. Change its type on the All Expeditions page to turn on the award.
        </p>
      </div>
    )
  }

  return (
    <main className="container mx-auto space-y-4 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Expedition Awards</h2>
          <p className="mt-1 text-sm text-gray-600">
            Daily cash award per student from their professionalism scores{expedition ? ` on ${expedition.name}` : ""}.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="awards-start" className="text-xs text-gray-500">From</Label>
            <Input
              id="awards-start"
              type="date"
              value={startDate}
              min={expeditionStart}
              max={endDate || expeditionEnd}
              onChange={(e) => setStartDate(clampToExpedition(e.target.value))}
              className="mt-1 h-8 bg-white"
            />
          </div>
          <div>
            <Label htmlFor="awards-end" className="text-xs text-gray-500">To</Label>
            <Input
              id="awards-end"
              type="date"
              value={endDate}
              min={startDate || expeditionStart}
              max={expeditionEnd}
              onChange={(e) => setEndDate(clampToExpedition(e.target.value))}
              className="mt-1 h-8 bg-white"
            />
          </div>
          {(startDate || endDate) && (
            <Button variant="outline" size="sm" className="h-8 cursor-pointer" onClick={() => { setStartDate(""); setEndDate("") }}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <HowItWorks />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {error ? (
          <div className="p-8 text-center text-sm text-red-600">Could not load scores: {String((error as Error).message || error)}</div>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500">
            <Spinner size="sm" /> Calculating awards…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Trophy className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">No students on this expedition</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                <TableHead className="h-10 w-8 px-3" />
                <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600 sm:px-6">Student</TableHead>
                <TableHead className="h-10 px-3 text-center text-xs font-semibold text-gray-600">Days scored</TableHead>
                <TableHead className="h-10 px-3 text-right text-xs font-semibold text-gray-600">Earned</TableHead>
                <TableHead className="h-10 px-3 text-right text-xs font-semibold text-gray-600">Withheld</TableHead>
                <TableHead className="h-10 px-3 text-right text-xs font-semibold text-gray-600">Avg / day</TableHead>
                <TableHead className="h-10 px-3 text-right text-xs font-semibold text-gray-600 sm:px-6">Award</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ student, summary }) => {
                const isOpen = expanded.has(student.id)
                const keptPct = summary.earned > 0 ? summary.total / summary.earned : 0
                return (
                  <Fragment key={student.id}>
                    <TableRow
                      className="cursor-pointer border-b hover:bg-gray-50/50"
                      onClick={() => toggle(student.id)}
                    >
                      <TableCell className="h-14 px-3">
                        {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                      </TableCell>
                      <TableCell className="h-14 px-3 sm:px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={student.profileImage || student.photo_url || undefined} alt={studentName(student)} />
                            <AvatarFallback className="text-xs">{initials(student)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-900">{studentName(student)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="h-14 px-3 text-center">
                        <Badge variant="outline" className="bg-white">{summary.daysScored}</Badge>
                      </TableCell>
                      <TableCell className="h-14 px-3 text-right text-sm text-gray-700">{formatAwardDollars(summary.earned)}</TableCell>
                      <TableCell className="h-14 px-3 text-right text-sm text-gray-500">
                        {summary.withheld > 0 ? `-${formatAwardDollars(summary.withheld)}` : "—"}
                        {summary.earned > 0 && (
                          <span className="ml-1 text-xs text-gray-400">({formatAwardPercent(keptPct)} kept)</span>
                        )}
                      </TableCell>
                      <TableCell className="h-14 px-3 text-right text-sm text-gray-700">
                        {summary.daysScored > 0 ? formatAwardDollars(summary.total / summary.daysScored) : "—"}
                      </TableCell>
                      <TableCell className="h-14 px-3 text-right sm:px-6">
                        <span className={cn("text-base font-semibold", summary.total > 0 ? "text-green-700" : "text-gray-400")}>
                          {formatAwardDollars(summary.total)}
                        </span>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="p-0">
                          {summary.days.length === 0 ? (
                            <p className="border-t bg-gray-50/60 px-6 py-4 text-sm text-gray-500">No scored days in this range.</p>
                          ) : (
                            <DailyBreakdown days={summary.days} />
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
              <TableRow className="border-t-2 bg-gray-50 hover:bg-gray-50">
                <TableCell className="h-12 px-3" />
                <TableCell className="h-12 px-3 text-sm font-semibold text-gray-900 sm:px-6">Total · {rows.length} students</TableCell>
                <TableCell className="h-12 px-3" />
                <TableCell className="h-12 px-3 text-right text-sm font-semibold text-gray-900">{formatAwardDollars(totals.earned)}</TableCell>
                <TableCell className="h-12 px-3 text-right text-sm font-semibold text-gray-500">
                  {totals.withheld > 0 ? `-${formatAwardDollars(totals.withheld)}` : "—"}
                </TableCell>
                <TableCell className="h-12 px-3" />
                <TableCell className="h-12 px-3 text-right text-base font-bold text-green-700 sm:px-6">{formatAwardDollars(totals.total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
    </main>
  )
}

export default function AwardsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-4 h-64 w-full" />
        </div>
      }
    >
      <AwardsPageContent />
    </Suspense>
  )
}
