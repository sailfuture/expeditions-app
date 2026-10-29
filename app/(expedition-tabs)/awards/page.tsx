"use client"

import { Fragment, Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { format } from "date-fns"
import { ChevronDown, ChevronRight, Info, Lock, Printer, Trophy } from "lucide-react"
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
import { useExpeditions, useStudentsByExpedition, useExpeditionJournalStatus, useExpeditionPerformanceReviews } from "@/lib/hooks/use-expeditions"
import { useReviewPeriods } from "@/components/review-periods-panel"
import { getProfessionalismByStudent } from "@/lib/xano"
import { cn } from "@/lib/utils"
import { isResidentialExpedition } from "@/lib/expedition-type"
import { DayReasons, ReasonsSummary } from "@/components/score-reasons"
import {
  DEFAULT_AWARD_SETTINGS,
  RATED_CATEGORIES,
  COMPLETION_CATEGORIES,
  dailyScoresFromProfessionalism,
  summarizeStudentAwards,
  formatAwardDollars,
  formatAwardPercent,
  computeDailyAward,
  type DailyAward,
  type DailyScores,
  type StudentAwardSummary,
} from "@/lib/expedition-award"

const SETTINGS = DEFAULT_AWARD_SETTINGS

interface StudentRow {
  student: any
  summary: StudentAwardSummary
  /** The raw score rows behind each scored day, for the per-category reasons. */
  rowsByDate: Record<string, Record<string, unknown>>
  /** Amount from finalized weeks (frozen when the week was finalized). */
  paid: number
  /** Live amount for days not in a finalized week. */
  open: number
  /** Day -> name of the finalized week that froze it. */
  lockedByDate: Record<string, string>
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
    s.journaling !== null || s.citizenship !== null
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

function DailyBreakdown({
  days,
  rowsByDate,
  lockedByDate,
}: {
  days: DailyAward[]
  rowsByDate: Record<string, Record<string, unknown>>
  lockedByDate: Record<string, string>
}) {
  return (
    <div className="space-y-3 border-t bg-gray-50/60 px-3 py-3 sm:px-6">
      <ReasonsSummary rows={days.map((d) => rowsByDate[d.date]).filter(Boolean)} title="Reasons this period" />
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
              <TableHead className={HEAD}>Reasons</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((d) => (
              <TableRow key={d.date} className="border-b last:border-0">
                <TableCell className={cn(CELL, "font-medium text-gray-900")}>
                  <span className="inline-flex items-center gap-1.5">
                    {formatDate(d.date)}
                    {lockedByDate[d.date] && (
                      <span title={`Finalized in ${lockedByDate[d.date]}`} className="text-gray-400">
                        <Lock className="h-3 w-3" />
                      </span>
                    )}
                  </span>
                </TableCell>
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
                <TableCell className="min-w-[16rem] px-3 py-2 align-top">
                  <DayReasons row={rowsByDate[d.date]} empty={<span className="text-sm text-gray-300">—</span>} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// "How the award is calculated": four step cards in a 2x2 grid. Every number
// comes from SETTINGS, so the explainer can't drift from the calculation.
// ---------------------------------------------------------------------------

const EXPLAIN_TH = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500"
const EXPLAIN_TD = "px-3 py-2 text-sm text-gray-700"
const EXPLAIN_NUM = "px-3 py-2 text-right text-sm font-semibold tabular-nums text-gray-900"

function StepCard({
  step,
  title,
  description,
  children,
}: {
  step: number
  title: string
  description: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
      <header className="flex items-start gap-3 border-b border-gray-200 px-4 py-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
          {step}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{description}</p>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </section>
  )
}

/** A two-column "condition → keeps" table. */
function KeepsTable({ heading, rows }: { heading: string; rows: Array<{ label: React.ReactNode; percent: number }> }) {
  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className={EXPLAIN_TH}>{heading}</th>
          <th className={cn(EXPLAIN_TH, "text-right")}>Keeps</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row, i) => (
          <tr key={i}>
            <td className={EXPLAIN_TD}>{row.label}</td>
            <td className={cn(EXPLAIN_NUM, row.percent === 0 && "text-gray-400")}>{formatAwardPercent(row.percent)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// The spreadsheet's Example Week, Day 3: four categories earn, performance 2.75, citizenship 3.
const WORKED_EXAMPLE = computeDailyAward({
  date: "example",
  school: 2,
  job: 3,
  service: 3,
  crew: 3,
  journaling: 100,
  citizenship: 3,
})

function HowItWorks() {
  const [open, setOpen] = useState(false)
  const perDay = SETTINGS.dollarsPerCategory * (RATED_CATEGORIES.length + COMPLETION_CATEGORIES.length)
  const lowestTier = SETTINGS.performanceTiers[SETTINGS.performanceTiers.length - 1]
  const ex = WORKED_EXAMPLE

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 pr-3 sm:pr-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cn(
            "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-l-xl px-4 py-3 text-left transition-colors sm:px-6",
            "outline-none hover:bg-gray-50/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-300"
          )}
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
        <div className="space-y-4 border-t bg-gray-50/60 px-4 py-4 sm:px-6">
          <p className="text-sm text-gray-600">
            Each scored day is worked out in three steps, then the days are added up for the expedition total.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <StepCard
              step={1}
              title="Earned dollars"
              description={
                <>
                  Each qualifying category earns {formatAwardDollars(SETTINGS.dollarsPerCategory)}. Blank or blocked categories earn
                  nothing.
                </>
              }
            >
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={EXPLAIN_TH}>Category</th>
                    <th className={EXPLAIN_TH}>Earns when</th>
                    <th className={cn(EXPLAIN_TH, "text-right")}>Earns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {RATED_CATEGORIES.map((c) => (
                    <tr key={c.key}>
                      <td className={cn(EXPLAIN_TD, "font-medium text-gray-900")}>{c.label}</td>
                      <td className={EXPLAIN_TD}>Score {SETTINGS.ratedThreshold} or higher</td>
                      <td className={EXPLAIN_NUM}>{formatAwardDollars(SETTINGS.dollarsPerCategory)}</td>
                    </tr>
                  ))}
                  {COMPLETION_CATEGORIES.map((c) => (
                    <tr key={c.key}>
                      <td className={cn(EXPLAIN_TD, "font-medium text-gray-900")}>{c.label}</td>
                      <td className={EXPLAIN_TD}>Marked Complete</td>
                      <td className={EXPLAIN_NUM}>{formatAwardDollars(SETTINGS.dollarsPerCategory)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={2} className={cn(EXPLAIN_TD, "font-semibold text-gray-900")}>Most per day</td>
                    <td className={EXPLAIN_NUM}>{formatAwardDollars(perDay)}</td>
                  </tr>
                </tfoot>
              </table>
            </StepCard>

            <StepCard
              step={2}
              title="Performance percent"
              description={
                <>
                  Average of the {RATED_CATEGORIES.map((c) => c.label).join(", ")} scores entered that day. Checked top to bottom;
                  the first match sets what is kept.
                </>
              }
            >
              <KeepsTable
                heading="Performance score"
                rows={[
                  ...SETTINGS.performanceTiers.map((t) => ({
                    label: `${t.op === "gt" ? "Greater than" : "At least"} ${t.value.toFixed(2)}`,
                    percent: t.percent,
                  })),
                  { label: `Below ${lowestTier?.value.toFixed(2)}`, percent: 0 },
                ]}
              />
            </StepCard>

            <StepCard
              step={3}
              title="Citizenship percent"
              description="Looked up from the day's citizenship score. A 5 adds a 10% bonus; a blank score keeps nothing."
            >
              <KeepsTable
                heading="Citizenship score"
                rows={[
                  ...Object.entries(SETTINGS.citizenshipPercents)
                    .map(([score, pct]) => ({ score: Number(score), pct }))
                    .sort((a, b) => b.score - a.score)
                    .map(({ score, pct }) => ({ label: String(score), percent: pct })),
                  { label: "Blank", percent: 0 },
                ]}
              />
            </StepCard>

            <StepCard
              step={4}
              title="Daily award and total"
              description="The earned dollars are multiplied by both percents. The expedition total adds up every day's award."
            >
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={EXPLAIN_TH}>Worked example</th>
                    <th className={EXPLAIN_TH}>Value</th>
                    <th className={cn(EXPLAIN_TH, "text-right")}>Running</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className={cn(EXPLAIN_TD, "font-medium text-gray-900")}>Earned</td>
                    <td className={EXPLAIN_TD}>{Object.values(ex.earnedByCategory).filter((v) => v > 0).length} categories qualified</td>
                    <td className={EXPLAIN_NUM}>{formatAwardDollars(ex.earned)}</td>
                  </tr>
                  <tr>
                    <td className={cn(EXPLAIN_TD, "font-medium text-gray-900")}>× Performance</td>
                    <td className={EXPLAIN_TD}>Score {ex.performanceScore.toFixed(2)} keeps {formatAwardPercent(ex.performancePercent)}</td>
                    <td className={EXPLAIN_NUM}>{formatAwardDollars(ex.earned * ex.performancePercent)}</td>
                  </tr>
                  <tr>
                    <td className={cn(EXPLAIN_TD, "font-medium text-gray-900")}>× Citizenship</td>
                    <td className={EXPLAIN_TD}>Score {ex.scores.citizenship} keeps {formatAwardPercent(ex.citizenshipPercent)}</td>
                    <td className={EXPLAIN_NUM}>{formatAwardDollars(ex.award)}</td>
                  </tr>
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={2} className={cn(EXPLAIN_TD, "font-semibold text-gray-900")}>
                      Daily award <span className="font-normal text-gray-500">· {formatAwardDollars(ex.withheld)} withheld</span>
                    </td>
                    <td className={EXPLAIN_NUM}>{formatAwardDollars(ex.award)}</td>
                  </tr>
                </tfoot>
              </table>
            </StepCard>
          </div>

          <p className="text-xs text-gray-500">
            Journaling counts as complete only with the &quot;Complete&quot; status. A 0 counts as 0 in the performance average;
            blank categories are left out of it. The performance score is not rounded before the lookup.
          </p>
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

  // Finalized weekly review periods are pay periods with frozen amounts.
  const { data: periodsData } = useReviewPeriods(residential ? expeditionId : null)
  const { data: reviews } = useExpeditionPerformanceReviews(residential ? expeditionId : null)
  const finalizedWeekIds = useMemo(
    () => new Set((periodsData?.periods ?? []).filter((p) => p.kind === "weekly" && p.status === "finalized").map((p) => p.id)),
    [periodsData]
  )
  const finalizedWeekName = useMemo(
    () => new Map((periodsData?.periods ?? []).map((p) => [p.id, p.name] as const)),
    [periodsData]
  )

  const rows: StudentRow[] = useMemo(() => {
    if (!rowsByStudent) return []
    return activeStudents
      .map((student: any) => {
        const raw: any[] = rowsByStudent[student.id] || []
        const rowsByDate: Record<string, Record<string, unknown>> = {}
        for (const r of raw) if (r?.date) rowsByDate[r.date] = r
        const days = raw
          .map((r: any) => dailyScoresFromProfessionalism(r, journalStatuses))
          .filter((d: DailyScores) => d.date && hasAnyScore(d))
          .filter((d: DailyScores) => (!startDate || d.date >= startDate) && (!endDate || d.date <= endDate))
        const summary = summarizeStudentAwards(days, SETTINGS)

        // Finalized weeks pay their frozen amounts; every other day is live.
        const frozenReviews = (reviews ?? []).filter(
          (r: any) => r.students_id === student.id && finalizedWeekIds.has(r.expedition_review_periods_id)
        )
        const frozenByDate: Record<string, number> = {}
        const lockedByDate: Record<string, string> = {}
        for (const r of frozenReviews) {
          const weekName = finalizedWeekName.get(r.expedition_review_periods_id) ?? "a finalized week"
          for (const day of Array.isArray(r.award_daily) ? r.award_daily : []) {
            if (!day?.date) continue
            frozenByDate[day.date] = Number(day.award) || 0
            lockedByDate[day.date] = weekName
          }
        }
        const inRange = (d: string) => (!startDate || d >= startDate) && (!endDate || d <= endDate)
        const paid = startDate || endDate
          ? Object.entries(frozenByDate).filter(([d]) => inRange(d)).reduce((sum, [, v]) => sum + v, 0)
          : frozenReviews.reduce((sum: number, r: any) => sum + (Number(r.award_total) || 0), 0)
        const open = summary.days.filter((d) => !(d.date in frozenByDate)).reduce((sum, d) => sum + d.award, 0)
        return { student, summary, rowsByDate, paid, open, lockedByDate }
      })
      .sort((a: StudentRow, b: StudentRow) => b.paid + b.open - (a.paid + a.open) || studentName(a.student).localeCompare(studentName(b.student)))
  }, [rowsByStudent, activeStudents, journalStatuses, startDate, endDate, reviews, finalizedWeekIds, finalizedWeekName])

  const totals = useMemo(
    () => rows.reduce(
      (acc, r) => ({
        earned: acc.earned + r.summary.earned,
        withheld: acc.withheld + r.summary.withheld,
        total: acc.total + r.paid + r.open,
        paid: acc.paid + r.paid,
      }),
      { earned: 0, withheld: 0, total: 0, paid: 0 }
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
                <TableHead className="h-10 px-3 text-right text-xs font-semibold text-gray-600" title="Saved when a week was finalized">Finalized</TableHead>
                <TableHead className="h-10 px-3 text-right text-xs font-semibold text-gray-600 sm:px-6">Award</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ student, summary, rowsByDate, paid, open, lockedByDate }) => {
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
                        {paid > 0 ? (
                          <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3 text-gray-400" />{formatAwardDollars(paid)}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="h-14 px-3 text-right sm:px-6">
                        <span className={cn("text-base font-semibold", paid + open > 0 ? "text-green-700" : "text-gray-400")}>
                          {formatAwardDollars(paid + open)}
                        </span>
                        {paid > 0 && open > 0 && (
                          <span className="block text-[11px] text-gray-400">{formatAwardDollars(open)} not finalized</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="p-0">
                          {summary.days.length === 0 ? (
                            <p className="border-t bg-gray-50/60 px-6 py-4 text-sm text-gray-500">No scored days in this range.</p>
                          ) : (
                            <DailyBreakdown days={summary.days} rowsByDate={rowsByDate} lockedByDate={lockedByDate} />
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
                <TableCell className="h-12 px-3 text-right text-sm font-semibold text-gray-900">
                  {totals.paid > 0 ? formatAwardDollars(totals.paid) : "—"}
                </TableCell>
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
