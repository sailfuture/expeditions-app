"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { BookMarked, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GradeCell, GradeLegend } from "@/components/grade-cell"
import { useExpeditions, useSchoolTerms, useSchoolYears, useStudentsByExpedition } from "@/lib/hooks/use-expeditions"
import { getTermGrades, refreshTermGrades } from "@/lib/xano"
import {
  asOfLabel, fmtGpa, gpaOf, meanOf, periodOptions, pickDefaultPeriod,
  type PeriodOption, type TermGradeRow,
} from "@/lib/grades"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// /grades?expedition=ID — the Toddle overall score in every class for the
// students on one expedition: students as rows, a column per course, each
// cell the score with its letter, tinted by letter. Rows come from the
// dashboard's Xano group (toddle_term_grades, filled by the Toddle pull)
// through /api/grades, matched to the roster by each student's Toddle id.
// ---------------------------------------------------------------------------

type SortKey = "name" | "gpa" | "average"

interface StudentRow {
  id: number
  name: string
  crew: string
  photo: string | null
  toddleId: string
  gpa: number | null
  average: number | null
  /** Score per teacher course id. */
  byCourse: Map<string, number>
}

interface CourseColumn {
  id: string
  title: string
}

function studentName(s: any): string {
  return `${s?.firstName ?? ""} ${s?.lastName ?? ""}`.trim() || "Unnamed student"
}

function initials(s: any): string {
  return `${(s?.firstName ?? "")[0] ?? ""}${(s?.lastName ?? "")[0] ?? ""}`.toUpperCase() || "?"
}

function GradesPageContent() {
  const searchParams = useSearchParams()
  const expeditionParam = searchParams.get("expedition")
  const expeditionId = expeditionParam ? parseInt(expeditionParam, 10) : null

  const { data: expeditions } = useExpeditions()
  const { data: schoolYears } = useSchoolYears()
  const { data: schoolTerms } = useSchoolTerms()
  const { data: students, isLoading: loadingStudents } = useStudentsByExpedition(expeditionId)

  const expedition = useMemo(
    () => (expeditions && expeditionId ? expeditions.find((e: any) => e.id === expeditionId) : null),
    [expeditions, expeditionId],
  )

  // The expedition's school year by name joins the two Xano groups' separate
  // schoolyears tables; its school term names the grading period to open on.
  const schoolYearName: string | null = useMemo(() => {
    if (!expedition || !schoolYears) return null
    const year = schoolYears.find((y: any) => y.id === expedition.schoolyears_id)
    return year?.name ?? null
  }, [expedition, schoolYears])
  const termName: string | null = useMemo(() => {
    if (!expedition || !schoolTerms) return null
    const term = schoolTerms.find((t: any) => t.id === expedition.schoolterms_id)
    return term?.short_name ?? null
  }, [expedition, schoolTerms])

  const roster = useMemo(() => (students || []).filter((s: any) => !s.isArchived), [students])
  const toddleIds = useMemo(
    () => roster.map((s: any) => String(s.toddleID ?? "").trim()).filter(Boolean).sort(),
    [roster],
  )
  const toddleKey = toddleIds.join(",")

  const yearResolved = Boolean(expedition) && Boolean(schoolYears)
  const { data: payload, error, isLoading: loadingGrades, mutate } = useSWR(
    yearResolved && schoolYearName && !loadingStudents ? `term_grades_${schoolYearName}_${toddleKey}` : null,
    () => getTermGrades(schoolYearName!, toddleIds),
    { revalidateOnFocus: false },
  )

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [refreshing, setRefreshing] = useState(false)

  const periods = useMemo<PeriodOption[]>(() => periodOptions(payload?.grades ?? []), [payload])

  useEffect(() => {
    if (periods.length === 0) return
    if (selectedPeriodId && periods.some((p) => p.id === selectedPeriodId)) return
    const match = pickDefaultPeriod(periods, payload?.grades ?? [], termName)
    if (match) setSelectedPeriodId(match.id)
  }, [periods, selectedPeriodId, payload, termName])

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) ?? null

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const result = await refreshTermGrades()
      await mutate()
      if (result.skipped) {
        toast.info(`Toddle was checked ${Math.max(1, Math.round(result.seconds_ago ?? 0))} seconds ago; showing that pull.`)
      } else if (result.last_run) {
        const changed = result.last_run.changed ?? 0
        const added = result.last_run.added ?? 0
        toast.success(
          changed === 0 && added === 0
            ? "Toddle checked: no scores changed."
            : `Toddle checked: ${changed} ${changed === 1 ? "score" : "scores"} changed, ${added} new.`,
        )
      } else {
        toast.success("Toddle checked.")
      }
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error && err.message ? err.message : "Refresh from Toddle failed")
    } finally {
      setRefreshing(false)
    }
  }

  // One row per roster student; students without a Toddle id or without
  // scores in the period keep their row with dashes, sorted to the bottom.
  const rows = useMemo<StudentRow[]>(() => {
    const byStudent = new Map<string, TermGradeRow[]>()
    if (payload && selectedPeriod) {
      for (const r of payload.grades) {
        if (r.grading_period_id !== selectedPeriod.id || r.score == null) continue
        if (!byStudent.has(r.student_toddle_id)) byStudent.set(r.student_toddle_id, [])
        byStudent.get(r.student_toddle_id)!.push(r)
      }
    }
    const built = roster.map((s: any): StudentRow => {
      const toddleId = String(s.toddleID ?? "").trim()
      const mine = toddleId ? byStudent.get(toddleId) ?? [] : []
      const byCourse = new Map<string, number>()
      for (const r of mine) byCourse.set(r.teacher_course_id, r.score as number)
      const scores = Array.from(byCourse.values())
      return {
        id: s.id,
        name: studentName(s),
        crew: (s.crew_name || "").trim(),
        photo: s.profileImage || null,
        toddleId,
        gpa: gpaOf(scores),
        average: meanOf(scores),
        byCourse,
      }
    })
    const compare = (a: StudentRow, b: StudentRow): number => {
      const aGraded = a.byCourse.size > 0
      const bGraded = b.byCourse.size > 0
      if (aGraded !== bGraded) return aGraded ? -1 : 1
      if (sortKey === "name") return a.name.localeCompare(b.name)
      const va = sortKey === "gpa" ? a.gpa : a.average
      const vb = sortKey === "gpa" ? b.gpa : b.average
      if (va == null && vb == null) return a.name.localeCompare(b.name)
      if (va == null) return 1
      if (vb == null) return -1
      return vb - va || a.name.localeCompare(b.name)
    }
    return built.sort(compare)
  }, [payload, selectedPeriod, roster, sortKey])

  const columns = useMemo<CourseColumn[]>(() => {
    if (!payload || !selectedPeriod) return []
    const titles = new Map<string, string>()
    const onRoster = new Set(toddleIds)
    for (const r of payload.grades) {
      if (r.grading_period_id !== selectedPeriod.id || r.score == null) continue
      if (!onRoster.has(r.student_toddle_id)) continue
      titles.set(r.teacher_course_id, r.teacher_course_title)
    }
    return Array.from(titles.entries())
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
  }, [payload, selectedPeriod, toddleIds])

  const graded = rows.filter((r) => r.byCourse.size > 0)
  const unlinked = rows.filter((r) => !r.toddleId).length
  const columnMeans = useMemo(() => {
    const means = new Map<string, number | null>()
    for (const c of columns) means.set(c.id, meanOf(graded.map((r) => r.byCourse.get(c.id) ?? null)))
    return means
  }, [columns, graded])
  const expeditionGpa = meanOf(graded.map((r) => r.gpa))
  const expeditionAverage = meanOf(graded.map((r) => r.average))
  const asOf = asOfLabel(payload?.last_run)

  const loading = loadingStudents || (!payload && !error && (loadingGrades || !yearResolved))

  if (!expeditionId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        <BookMarked className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p className="text-lg font-medium text-gray-600">Pick an expedition to see its grades</p>
      </div>
    )
  }

  return (
    <main className="container mx-auto space-y-4 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Grades</h2>
          <p className="mt-1 text-sm text-gray-600">
            Toddle overall score in every class for the students on {expedition?.name ?? "this expedition"}
            {schoolYearName ? ` (${schoolYearName})` : ""}.
          </p>
        </div>
        <GradeLegend />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedPeriodId ?? ""} onValueChange={setSelectedPeriodId} disabled={periods.length === 0}>
          <SelectTrigger className="h-9 w-[200px] cursor-pointer bg-white">
            <SelectValue placeholder={loading ? "Loading…" : "No grading periods"} />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                {p.label}{p.type === "CUMULATIVE" ? " (cumulative)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-9 w-[160px] cursor-pointer bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name" className="cursor-pointer">Sort by name</SelectItem>
            <SelectItem value="gpa" className="cursor-pointer">Sort by GPA</SelectItem>
            <SelectItem value="average" className="cursor-pointer">Sort by average</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-gray-500">
          {loading
            ? "Loading…"
            : `${graded.length} of ${rows.length} students graded${unlinked > 0 ? ` · ${unlinked} not linked to Toddle` : ""}`}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-gray-500 md:inline">
            {asOf ? `Toddle scores as of ${asOf}. Checked once a day, before school.` : payload ? "No Toddle pull recorded yet." : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="h-9 cursor-pointer gap-2 bg-white"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? "Checking Toddle…" : "Refresh from Toddle"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {error ? (
          <div className="p-8 text-center text-sm text-red-600">
            Could not load grades: {String((error as Error).message || error)}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500">
            <Spinner size="sm" /> Loading grades…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <BookMarked className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">No students on this expedition</p>
          </div>
        ) : periods.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <BookMarked className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">No Toddle grades yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
              {payload && "unknown_year" in (payload as any)
                ? `The grades store has no school year named ${schoolYearName}.`
                : toddleIds.length === 0
                  ? "None of these students is linked to a Toddle record, so there are no grades to show."
                  : `Nothing is stored for ${schoolYearName ?? "this school year"} yet. Refresh from Toddle to pull it now.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="sticky left-0 z-10 h-10 min-w-[220px] bg-white px-3 text-xs font-semibold text-gray-600 sm:px-6">Student</TableHead>
                  <TableHead className="h-10 w-[70px] px-3 text-right text-xs font-semibold text-gray-600">GPA</TableHead>
                  <TableHead className="h-10 w-[100px] px-3 text-center text-xs font-semibold text-gray-600">Average</TableHead>
                  {columns.map((c) => (
                    <TableHead key={c.id} className="h-10 min-w-[120px] whitespace-nowrap px-3 text-center text-xs font-semibold text-gray-600" title={c.title}>
                      {c.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const isGraded = r.byCourse.size > 0
                  return (
                    <TableRow key={r.id} className={cn("border-b", !isGraded && "text-gray-400")}>
                      <TableCell className="sticky left-0 z-10 h-14 whitespace-nowrap bg-white px-3 sm:px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={r.photo || undefined} alt={r.name} />
                            <AvatarFallback className="text-xs">{initials({ firstName: r.name.split(" ")[0], lastName: r.name.split(" ").slice(1).join(" ") })}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link href={`/student/${r.id}`} className={cn("font-medium hover:underline", isGraded ? "text-gray-900" : "text-gray-500")}>
                              {r.name}
                            </Link>
                            {(r.crew || !r.toddleId) && (
                              <div className="text-xs text-gray-500">
                                {!r.toddleId ? "Not linked to Toddle" : r.crew}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 text-right tabular-nums font-medium">{fmtGpa(r.gpa)}</TableCell>
                      <GradeCell percent={r.average} />
                      {columns.map((c) => (
                        <GradeCell key={c.id} percent={r.byCourse.get(c.id) ?? null} />
                      ))}
                    </TableRow>
                  )
                })}
                {graded.length > 1 && (
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableCell className="sticky left-0 z-10 whitespace-nowrap bg-gray-50 px-3 text-xs font-medium text-gray-500 sm:px-6">Expedition average</TableCell>
                    <TableCell className="px-3 text-right tabular-nums text-xs font-medium text-gray-700">{fmtGpa(expeditionGpa)}</TableCell>
                    <GradeCell percent={expeditionAverage} className="text-xs" />
                    {columns.map((c) => (
                      <GradeCell key={c.id} percent={columnMeans.get(c.id) ?? null} className="text-xs" />
                    ))}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </main>
  )
}

export default function GradesPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-4 h-64 w-full" />
        </div>
      }
    >
      <GradesPageContent />
    </Suspense>
  )
}
