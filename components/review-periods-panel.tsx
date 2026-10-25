"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR, { mutate } from "swr"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  AlertTriangle,
  CalendarRange,
  Lock,
  LockOpen,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { isResidentialExpedition } from "@/lib/expedition-type"
import { formatAwardDollars } from "@/lib/expedition-award"
import {
  coverageIssues,
  daySpan,
  finalPeriod,
  suggestNextWeek,
  weeklyPeriods,
  type CoverageIssue,
} from "@/lib/review-periods"
import {
  createReviewPeriod,
  deleteReviewPeriod,
  finalizeReviewPeriod,
  getReviewPeriodAwardPreview,
  getReviewPeriods,
  regenerateReviewPeriod,
  reopenReviewPeriod,
} from "@/lib/xano"
import type { ReviewPeriod, ReviewPeriodKind } from "@/lib/types"

export const reviewPeriodsKey = (expeditionId: number) => `review_periods_${expeditionId}`

/** Review periods for an expedition, shared by the reviews page, Awards and the scores screen. */
export function useReviewPeriods(expeditionId: number | null) {
  return useSWR(expeditionId ? reviewPeriodsKey(expeditionId) : null, () => getReviewPeriods(expeditionId!))
}

function formatDay(day: string, pattern = "MMM d") {
  const [y, m, d] = day.split("-").map(Number)
  return format(new Date(y, m - 1, d), pattern)
}

function formatRange(start: string, end: string) {
  return `${formatDay(start)} – ${formatDay(end, "MMM d, yyyy")}`
}

function studentName(s: any) {
  return `${s?.firstName ?? ""} ${s?.lastName ?? ""}`.trim() || `Student ${s?.id ?? ""}`
}

// ---------------------------------------------------------------------------
// Timeline bar: every weekly period laid across the expedition's dates.
// ---------------------------------------------------------------------------

function Timeline({
  periods,
  issues,
  start,
  end,
}: {
  periods: ReviewPeriod[]
  issues: CoverageIssue[]
  start: string
  end: string
}) {
  const total = daySpan(start, end)
  const pos = (from: string, to: string) => {
    const left = ((daySpan(start, from) - 1) / total) * 100
    const width = (daySpan(from, to) / total) * 100
    return { left: `${Math.max(0, left)}%`, width: `${Math.max(0.8, width)}%` }
  }
  const weeks = weeklyPeriods(periods)
  const final = finalPeriod(periods)

  return (
    <div className="space-y-1.5">
      <div className="relative h-9 overflow-hidden rounded-md bg-gray-100 ring-1 ring-inset ring-gray-200">
        {issues
          .filter((i) => i.kind === "gap")
          .map((i, n) => (
            <div
              key={`gap-${n}`}
              className="absolute inset-y-0 bg-[repeating-linear-gradient(45deg,var(--color-amber-200),var(--color-amber-200)_4px,var(--color-amber-50)_4px,var(--color-amber-50)_8px)]"
              style={pos(i.startDate, i.endDate)}
              title={`Not in any week: ${formatRange(i.startDate, i.endDate)}`}
            />
          ))}
        {weeks.map((w) => (
          <div
            key={w.id}
            className={cn(
              "absolute inset-y-1 flex items-center justify-center overflow-hidden rounded-sm border text-[10px] font-semibold",
              w.status === "finalized" ? "border-gray-900 bg-gray-800 text-white" : "border-gray-400 bg-white text-gray-700"
            )}
            style={pos(w.startDate, w.endDate)}
            title={`${w.name} · ${formatRange(w.startDate, w.endDate)} · ${w.status === "finalized" ? "Finalized" : "Draft"}`}
          >
            <span className="truncate px-1">{w.sequence ? `W${w.sequence}` : w.name}</span>
          </div>
        ))}
        {issues
          .filter((i) => i.kind === "overlap")
          .map((i, n) => (
            <div
              key={`ov-${n}`}
              className="pointer-events-none absolute inset-y-0 bg-red-500/40 ring-1 ring-inset ring-red-500"
              style={pos(i.startDate, i.endDate)}
              title={`Overlap: ${i.between.join(" and ")}`}
            />
          ))}
      </div>
      {final && (
        <div className="relative h-2 rounded-full bg-gray-100">
          <div
            className={cn("absolute inset-y-0 rounded-full", final.status === "finalized" ? "bg-gray-800" : "bg-gray-400")}
            style={pos(final.startDate, final.endDate)}
            title={`${final.name} · ${final.status === "finalized" ? "Finalized" : "Draft"}`}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
        <span>{formatDay(start, "MMM d")}</span>
        <span className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-gray-400 bg-white" />Draft</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-gray-800" />Finalized</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-200" />Not in a week</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-400" />Overlap</span>
          {final && <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-gray-400" />Final evaluation</span>}
        </span>
        <span>{formatDay(end, "MMM d")}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create dialog
// ---------------------------------------------------------------------------

function CreatePeriodDialog({
  open,
  onOpenChange,
  kind,
  expedition,
  periods,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: ReviewPeriodKind
  expedition: any
  periods: ReviewPeriod[]
  onCreated: () => void
}) {
  const expStart: string = expedition?.startDate || expedition?.start_date || ""
  const expEnd: string = expedition?.endDate || expedition?.end_date || ""
  const suggestion = useMemo(
    () => (kind === "weekly" ? suggestNextWeek(periods, expStart, expEnd) : { startDate: expStart, endDate: expEnd, sequence: 0 }),
    [kind, periods, expStart, expEnd]
  )
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName("")
    setStartDate(suggestion?.startDate ?? expStart)
    setEndDate(suggestion?.endDate ?? expEnd)
  }, [open, suggestion, expStart, expEnd])

  const defaultName = kind === "final" ? "Final Expedition Evaluation" : `Week ${suggestion?.sequence ?? weeklyPeriods(periods).length + 1}`
  // Same rule the server enforces, shown before submitting.
  const clash =
    kind === "weekly" && startDate && endDate
      ? weeklyPeriods(periods).find((p) => p.startDate <= endDate && startDate <= p.endDate)
      : undefined
  const invalid = !startDate || !endDate || startDate > endDate || !!clash

  const submit = async () => {
    setSaving(true)
    try {
      const res = await createReviewPeriod({
        expeditions_id: expedition.id,
        kind,
        name: name.trim() || undefined,
        startDate,
        endDate,
      })
      toast.success(`${res.period.name} created with ${res.generated.created} review${res.generated.created === 1 ? "" : "s"}`)
      onOpenChange(false)
      onCreated()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the review period")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{kind === "final" ? "Create final evaluation" : `Create ${defaultName}`}</DialogTitle>
          <DialogDescription>
            {kind === "final"
              ? "One final evaluation per expedition, covering the whole expedition by default."
              : "Each student gets exactly one review for this week. Weeks can't overlap."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="period-name">Name</Label>
            <Input id="period-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultName} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="period-start">Start</Label>
              <Input
                id="period-start"
                type="date"
                value={startDate}
                min={expStart || undefined}
                max={endDate || expEnd || undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-end">End</Label>
              <Input
                id="period-end"
                type="date"
                value={endDate}
                min={startDate || expStart || undefined}
                max={expEnd || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          {startDate && endDate && startDate <= endDate && (
            <p className="text-xs text-gray-500">{daySpan(startDate, endDate)} days · {formatRange(startDate, endDate)}</p>
          )}
          {clash && (
            <p className="flex items-start gap-1.5 text-xs text-red-600">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Overlaps {clash.name} ({formatRange(clash.startDate, clash.endDate)}).
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button className="cursor-pointer" onClick={submit} disabled={invalid || saving}>
            {saving ? <Spinner size="sm" className="mr-2" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Finalize dialog: shows what will be frozen.
// ---------------------------------------------------------------------------

function FinalizeDialog({
  period,
  expedition,
  students,
  activeStudents,
  onOpenChange,
  onDone,
}: {
  period: ReviewPeriod | null
  expedition: any
  students: any[]
  activeStudents: number
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const { currentUser } = useCurrentUser()
  const residential = isResidentialExpedition(expedition)
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => setConfirmed(false), [period?.id])

  const { data: preview, isLoading } = useSWR(
    period && residential ? `award_preview_${period.id}_${period.startDate}_${period.endDate}` : null,
    () => getReviewPeriodAwardPreview(period!.expeditions_id, period!.startDate, period!.endDate),
    { revalidateOnFocus: false }
  )

  if (!period) return null
  const missing = (period.missing_students ?? []).map((id) => students.find((s) => s.id === id)).filter(Boolean)
  const withoutNotes = Math.max(0, (period.review_count ?? 0) - (period.with_notes ?? 0))
  const previewRows = (preview?.students ?? [])
    .map((s) => ({ ...s, student: students.find((x) => x.id === s.students_id) }))
    .sort((a, b) => b.total - a.total)
  const previewTotal = previewRows.reduce((sum, r) => sum + r.total, 0)

  const submit = async () => {
    setSaving(true)
    try {
      await finalizeReviewPeriod(period.id, currentUser?.id ?? null)
      toast.success(`${period.name} finalized`)
      onOpenChange(false)
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not finalize")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!period} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" /> Finalize {period.name}?
          </DialogTitle>
          <DialogDescription>
            {formatRange(period.startDate, period.endDate)}. Scores on these days will be locked
            {residential ? " and each student's award for the period will be saved as the amount to pay" : ""}.
            An admin can reopen it later if something needs fixing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border bg-gray-50 p-2.5">
              <p className="text-[11px] text-gray-500">Reviews</p>
              <p className="font-semibold">{period.review_count ?? 0} / {activeStudents}</p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-2.5">
              <p className="text-[11px] text-gray-500">Without notes</p>
              <p className={cn("font-semibold", withoutNotes > 0 && "text-amber-700")}>{withoutNotes}</p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-2.5">
              <p className="text-[11px] text-gray-500">Days</p>
              <p className="font-semibold">{daySpan(period.startDate, period.endDate)}</p>
            </div>
          </div>

          {missing.length > 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
              Reviews will be added for {missing.map(studentName).join(", ")} before locking.
            </p>
          )}

          {residential && (
            <div className="overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                <span>Award to be saved</span>
                {!isLoading && <span className="text-gray-900">{formatAwardDollars(previewTotal)}</span>}
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-500"><Spinner size="sm" /> Calculating…</div>
              ) : previewRows.length === 0 ? (
                <p className="px-3 py-3 text-xs text-gray-500">No scored days in this period, so every award is $0.00.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">Student</th>
                      <th className="px-3 py-1.5 text-right font-semibold">Days</th>
                      <th className="px-3 py-1.5 text-right font-semibold">Earned</th>
                      <th className="px-3 py-1.5 text-right font-semibold">Award</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewRows.map((r) => (
                      <tr key={r.students_id}>
                        <td className="px-3 py-1.5 text-gray-800">{r.student ? studentName(r.student) : `Student ${r.students_id}`}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{r.days}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-500">{formatAwardDollars(r.earned)}</td>
                        <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatAwardDollars(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2.5">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-0.5" />
            <span className="text-xs text-gray-700">
              I&apos;ve checked the scores for these dates. Lock them{residential ? " and save these amounts" : ""}.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button className="cursor-pointer" onClick={submit} disabled={!confirmed || saving}>
            {saving ? <Spinner size="sm" className="mr-2" /> : <Lock className="mr-1.5 h-4 w-4" />}
            Finalize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Simple confirm for reopen / delete
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  onOpenChange,
}: {
  open: boolean
  title: string
  description: React.ReactNode
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => Promise<void>
  onOpenChange: (open: boolean) => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            className="cursor-pointer"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm()
                onOpenChange(false)
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? <Spinner size="sm" className="mr-2" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// The panel
// ---------------------------------------------------------------------------

export function ReviewPeriodsPanel({ expedition, students }: { expedition: any; students: any[] }) {
  const { currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === "Admin"
  const expeditionId: number | null = expedition?.id ?? null
  const residential = isResidentialExpedition(expedition)
  const { data, isLoading } = useReviewPeriods(expeditionId)
  const periods = data?.periods ?? []
  const expStart: string = expedition?.startDate || expedition?.start_date || ""
  const expEnd: string = expedition?.endDate || expedition?.end_date || ""
  const issues = useMemo(() => (expStart && expEnd ? coverageIssues(periods, expStart, expEnd) : []), [periods, expStart, expEnd])
  const next = expStart && expEnd ? suggestNextWeek(periods, expStart, expEnd) : null
  const hasFinal = !!finalPeriod(periods)
  const ordered = useMemo(
    () => [...weeklyPeriods(periods), ...periods.filter((p) => p.kind === "final")],
    [periods]
  )

  const [createKind, setCreateKind] = useState<ReviewPeriodKind | null>(null)
  const [finalizing, setFinalizing] = useState<ReviewPeriod | null>(null)
  const [reopening, setReopening] = useState<ReviewPeriod | null>(null)
  const [deleting, setDeleting] = useState<ReviewPeriod | null>(null)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)

  const refreshAll = async () => {
    if (!expeditionId) return
    await Promise.all([mutate(reviewPeriodsKey(expeditionId)), mutate(`expedition_performance_reviews_${expeditionId}`)])
  }

  const regenerate = async (p: ReviewPeriod) => {
    setRefreshingId(p.id)
    try {
      const res = await regenerateReviewPeriod(p.id)
      toast.success(`${p.name}: ${res.created} added, ${res.updated} refreshed`)
      await refreshAll()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh")
    } finally {
      setRefreshingId(null)
    }
  }

  if (!expeditionId) return null

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b bg-gray-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarRange className="h-5 w-5 text-gray-400" /> Review periods
          </h2>
          <p className="mt-0.5 text-sm text-gray-600">
            {residential
              ? "Each week is a pay period. Finalizing a week locks its scores and saves each student's award."
              : "Finalizing a period locks its scores and reviews."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!hasFinal && (
            <Button variant="outline" className="cursor-pointer" onClick={() => setCreateKind("final")}>
              <Plus className="mr-1.5 h-4 w-4" /> Final evaluation
            </Button>
          )}
          <Button className="cursor-pointer" onClick={() => setCreateKind("weekly")} disabled={!next}>
            <Plus className="mr-1.5 h-4 w-4" />
            {next ? `Create Week ${next.sequence}` : "All weeks created"}
          </Button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500"><Spinner size="sm" /> Loading periods…</div>
        ) : periods.length === 0 ? (
          <p className="text-sm text-gray-500">
            No review periods yet. Create Week 1 to start; each week gets one review per student.
          </p>
        ) : (
          <>
            {expStart && expEnd && <Timeline periods={periods} issues={issues} start={expStart} end={expEnd} />}

            {issues.length > 0 && (
              <ul className="space-y-1">
                {issues.map((i, n) => (
                  <li
                    key={n}
                    className={cn(
                      "flex items-start gap-2 rounded-md px-3 py-2 text-xs ring-1",
                      i.kind === "overlap" ? "bg-red-50 text-red-800 ring-red-200" : "bg-amber-50 text-amber-900 ring-amber-200"
                    )}
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {i.kind === "overlap"
                      ? `${i.between.join(" and ")} both include ${formatRange(i.startDate, i.endDate)}. Only one of them can be finalized.`
                      : `${formatRange(i.startDate, i.endDate)} isn't in any week (between ${i.between.join(" and ")}).`}
                  </li>
                ))}
              </ul>
            )}

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2">Dates</th>
                    <th className="px-3 py-2 text-center">Reviews</th>
                    <th className="px-3 py-2 text-center">Notes</th>
                    {residential && <th className="px-3 py-2 text-right">Award saved</th>}
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ordered.map((p) => {
                    const finalized = p.status === "finalized"
                    const missing = p.missing_students?.length ?? 0
                    const active = data?.active_students ?? 0
                    return (
                      <tr key={p.id} className={cn(p.kind === "final" && "bg-gray-50/60")}>
                        <td className="px-3 py-2.5">
                          <span className="font-medium text-gray-900">{p.name}</span>
                          {p.kind === "final" && <span className="ml-2 text-[11px] text-gray-500">Final evaluation</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                          {formatRange(p.startDate, p.endDate)}
                          <span className="ml-1.5 text-xs text-gray-400">{daySpan(p.startDate, p.endDate)}d</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={cn("tabular-nums", missing > 0 && !finalized && "font-semibold text-amber-700")}
                            title={missing > 0 ? `${missing} active student${missing === 1 ? "" : "s"} without a review` : "Every active student has a review"}
                          >
                            {active - missing}/{active}
                          </span>
                          {(p.review_count ?? 0) > active - missing && (
                            <span className="block text-[10px] text-gray-400">
                              +{(p.review_count ?? 0) - (active - missing)} former
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-gray-600">
                          {p.with_notes ?? 0}/{p.review_count ?? 0}
                        </td>
                        {residential && (
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {finalized ? (
                              <span className="font-semibold text-gray-900">{formatAwardDollars(p.award_total ?? 0)}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          {finalized ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2 py-0.5 text-[11px] font-medium text-white">
                              <Lock className="h-3 w-3" /> Finalized
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600">
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {!finalized && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 cursor-pointer"
                                  title={missing > 0 ? `Add ${missing} missing and refresh scores` : "Refresh scores"}
                                  disabled={refreshingId === p.id}
                                  onClick={() => regenerate(p)}
                                >
                                  {refreshingId === p.id ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4 text-gray-500" />}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 cursor-pointer"
                                  onClick={() => setFinalizing(p)}
                                >
                                  <Lock className="mr-1 h-3.5 w-3.5" /> Finalize
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 cursor-pointer hover:bg-red-50"
                                  title="Delete period"
                                  onClick={() => setDeleting(p)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            {finalized && isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 cursor-pointer text-gray-600"
                                onClick={() => setReopening(p)}
                              >
                                <LockOpen className="mr-1 h-3.5 w-3.5" /> Reopen
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {(data?.unassigned_count ?? 0) > 0 && (
              <p className="text-xs text-gray-500">
                {data!.unassigned_count} older review{data!.unassigned_count === 1 ? " isn't" : "s aren't"} in any period.
              </p>
            )}
          </>
        )}
      </div>

      <CreatePeriodDialog
        open={createKind !== null}
        onOpenChange={(o) => !o && setCreateKind(null)}
        kind={createKind ?? "weekly"}
        expedition={expedition}
        periods={periods}
        onCreated={refreshAll}
      />
      <FinalizeDialog
        period={finalizing}
        expedition={expedition}
        students={students}
        activeStudents={data?.active_students ?? 0}
        onOpenChange={(o) => !o && setFinalizing(null)}
        onDone={refreshAll}
      />
      <ConfirmDialog
        open={!!reopening}
        title={`Reopen ${reopening?.name ?? ""}?`}
        description="Its scores become editable again and the saved award amounts are no longer final until you finalize it again."
        confirmLabel="Reopen"
        onOpenChange={(o) => !o && setReopening(null)}
        onConfirm={async () => {
          if (!reopening) return
          try {
            await reopenReviewPeriod(reopening.id)
            toast.success(`${reopening.name} reopened`)
            await refreshAll()
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not reopen")
          }
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        destructive
        title={`Delete ${deleting?.name ?? ""}?`}
        description={`This deletes the period and its ${deleting?.review_count ?? 0} review${deleting?.review_count === 1 ? "" : "s"}${
          deleting?.with_notes ? `, including ${deleting.with_notes} with notes` : ""
        }. It can't be undone.`}
        confirmLabel="Delete period"
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            const res = await deleteReviewPeriod(deleting.id)
            toast.success(`${deleting.name} deleted (${res.deleted_reviews} reviews)`)
            await refreshAll()
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete")
          }
        }}
      />
    </section>
  )
}
