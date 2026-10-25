// Pure helpers for review periods (weekly pay periods + final evaluation).
// Dates are YYYY-MM-DD strings throughout; they compare correctly as text.
// No "@/..." imports so this stays easy to test with plain node.

export interface PeriodLike {
  id: number
  name: string
  kind: "weekly" | "final"
  status: "draft" | "finalized"
  startDate: string
  endDate: string
  sequence?: number | null
}

/** "2026-03-24" -> Date at local midnight. */
function toDate(day: string): Date {
  const [y, m, d] = day.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function toDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function addDays(day: string, n: number): string {
  const d = toDate(day)
  d.setDate(d.getDate() + n)
  return toDay(d)
}

/** Inclusive number of days from start to end. */
export function daySpan(start: string, end: string): number {
  return Math.round((toDate(end).getTime() - toDate(start).getTime()) / 86_400_000) + 1
}

export function weeklyPeriods<T extends PeriodLike>(periods: ReadonlyArray<T>): T[] {
  return periods.filter((p) => p.kind === "weekly").sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function finalPeriod<T extends PeriodLike>(periods: ReadonlyArray<T>): T | undefined {
  return periods.find((p) => p.kind === "final")
}

/** Suggested dates for the next week: the day after the last week, seven days, clamped to the expedition. */
export function suggestNextWeek(
  periods: ReadonlyArray<PeriodLike>,
  expeditionStart: string,
  expeditionEnd: string
): { startDate: string; endDate: string; sequence: number } | null {
  const weeks = weeklyPeriods(periods)
  const last = weeks[weeks.length - 1]
  const startDate = last ? addDays(last.endDate, 1) : expeditionStart
  if (startDate > expeditionEnd) return null
  const sevenDays = addDays(startDate, 6)
  const endDate = sevenDays > expeditionEnd ? expeditionEnd : sevenDays
  const sequence = weeks.reduce((m, p) => Math.max(m, Number(p.sequence) || 0), 0) + 1
  return { startDate, endDate, sequence }
}

export interface CoverageIssue {
  kind: "gap" | "overlap"
  startDate: string
  endDate: string
  /** Names of the periods involved. */
  between: string[]
}

/**
 * Gaps (expedition days no week covers) and overlaps (days two weeks share),
 * across the weekly periods only. The final evaluation spans everything and
 * is not a pay period, so it is left out.
 */
export function coverageIssues(
  periods: ReadonlyArray<PeriodLike>,
  expeditionStart: string,
  expeditionEnd: string
): CoverageIssue[] {
  const weeks = weeklyPeriods(periods)
  const issues: CoverageIssue[] = []
  if (weeks.length === 0) return issues

  // Overlaps between any two weeks.
  for (let a = 0; a < weeks.length; a++) {
    for (let b = a + 1; b < weeks.length; b++) {
      const x = weeks[a]
      const y = weeks[b]
      const start = x.startDate > y.startDate ? x.startDate : y.startDate
      const end = x.endDate < y.endDate ? x.endDate : y.endDate
      if (start <= end) issues.push({ kind: "overlap", startDate: start, endDate: end, between: [x.name, y.name] })
    }
  }

  // Gaps: walk the weeks in order, from the expedition start up to the last week's end.
  let coveredThrough = addDays(expeditionStart, -1)
  let previous = "the expedition start"
  for (const w of weeks) {
    const nextDay = addDays(coveredThrough, 1)
    if (w.startDate > nextDay) {
      issues.push({ kind: "gap", startDate: nextDay, endDate: addDays(w.startDate, -1), between: [previous, w.name] })
    }
    if (w.endDate > coveredThrough) coveredThrough = w.endDate
    previous = w.name
  }
  void expeditionEnd // days after the last week are simply "not reviewed yet", not a gap

  return issues.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/** The finalized weekly period that covers a day, if any (these days are paid and locked). */
export function finalizedWeekForDate<T extends PeriodLike>(periods: ReadonlyArray<T>, day: string): T | undefined {
  return periods.find((p) => p.kind === "weekly" && p.status === "finalized" && p.startDate <= day && day <= p.endDate)
}

/** Any finalized period (weekly or final) that covers a day: scores on it are locked. */
export function lockingPeriodForDate<T extends PeriodLike>(periods: ReadonlyArray<T>, day: string): T | undefined {
  return periods.find((p) => p.status === "finalized" && p.startDate <= day && day <= p.endDate)
}
