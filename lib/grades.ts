/** Toddle term grades for the Grades tab: the row shape the dashboard's Xano
 *  group stores (toddle_term_grades, filled by Toddle_Term_Grades_Pull), the
 *  letter and GPA scales, and the roll-ups. Everything here is pure.
 *
 *  Toddle's term-grades API sends only the numeric "Overall score" per course;
 *  the letter grade and GPA are computed here from two separate scales, both
 *  applied to the percent rounded to a whole number (Toddle shows 66.51 as a
 *  D+, so it rounds before it looks up the scale). The scales are the same
 *  ones the professionalism dashboard's /grades page uses. */
import { format } from "date-fns"

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export interface TermGradeRow {
  id: number
  schoolyears_id: number | null
  /** The dashboard's terms row for a reporting period; 0/null for Semester/Final. */
  terms_id: number | null
  grading_period_id: string
  grading_period_label: string
  grading_period_type: "REPORTING" | "CUMULATIVE" | string
  student_toddle_id: string
  student_name: string
  teacher_course_id: string
  teacher_course_title: string
  course_toddle_id: string | null
  course_name: string | null
  score: number | null
  snapshot_date: string | null
  score_changed_date: string | null
}

export interface TermGradesRunSummary {
  snapshot_date?: string
  schoolyears_id?: number
  periods_pulled?: string[]
  rows?: number
  added?: number
  changed?: number
  unchanged?: number
  /** Epoch ms when the pull finished. */
  finished_at?: number
}

export interface TermGradesPayload {
  grades: TermGradeRow[]
  last_run: TermGradesRunSummary | null
}

export interface TermGradesRefreshResult {
  /** True when Toddle was already checked less than a minute ago; last_run is that pull. */
  skipped: boolean
  seconds_ago: number | null
  last_run: TermGradesRunSummary | null
}

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export function parseTermGradesPayload(data: any): TermGradesPayload {
  const grades: TermGradeRow[] = (Array.isArray(data?.grades) ? data.grades : []).map((r: any) => ({
    ...r,
    student_toddle_id: String(r.student_toddle_id ?? ""),
    score: num(r.score),
    terms_id: r.terms_id ? Number(r.terms_id) : null,
  }))
  return {
    grades,
    last_run: data?.last_run && typeof data.last_run === "object" ? data.last_run : null,
  }
}

// ---------------------------------------------------------------------------
// Scales
// ---------------------------------------------------------------------------

export interface LetterGrade {
  letter: string
  /** Lowest whole percent that earns this letter. */
  min: number
}

/** Highest first. The last entry catches everything below 60. No minus grades. */
export const LETTER_SCALE: LetterGrade[] = [
  { letter: "A", min: 90 },
  { letter: "B+", min: 87 },
  { letter: "B", min: 80 },
  { letter: "C+", min: 77 },
  { letter: "C", min: 70 },
  { letter: "D+", min: 67 },
  { letter: "D", min: 60 },
  { letter: "F", min: 0 },
]

/** Toddle's own grade point scale (school settings), highest first. */
export const GPA_SCALE: { min: number; points: number }[] = [
  { min: 90, points: 4.0 },
  { min: 85, points: 3.5 },
  { min: 80, points: 3.0 },
  { min: 75, points: 2.5 },
  { min: 70, points: 2.0 },
  { min: 65, points: 1.5 },
  { min: 60, points: 1.0 },
  { min: 0, points: 0.0 },
]

/** Percent → letter, rounding to a whole percent the way Toddle does. */
export function letterFor(percent: number | null | undefined): LetterGrade | null {
  if (percent == null || !Number.isFinite(percent)) return null
  const whole = Math.round(percent)
  return LETTER_SCALE.find((g) => whole >= g.min) ?? LETTER_SCALE[LETTER_SCALE.length - 1]
}

/** Percent → grade points on Toddle's scale, same rounding as the letter. */
export function gpaPointsFor(percent: number | null | undefined): number | null {
  if (percent == null || !Number.isFinite(percent)) return null
  const whole = Math.round(percent)
  return (GPA_SCALE.find((b) => whole >= b.min) ?? GPA_SCALE[GPA_SCALE.length - 1]).points
}

/** Unweighted GPA: the mean of each course's grade points. */
export function gpaOf(percents: (number | null | undefined)[]): number | null {
  const pts = percents.map(gpaPointsFor).filter((p): p is number => p != null)
  if (pts.length === 0) return null
  return pts.reduce((a, b) => a + b, 0) / pts.length
}

export function meanOf(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v))
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

export interface PeriodOption {
  id: string
  label: string
  type: string
  termsId: number | null
}

/** Distinct grading periods present in a set of rows: reporting periods
 *  first in term order, then the cumulative ones (Semester, Final). */
export function periodOptions(rows: TermGradeRow[]): PeriodOption[] {
  const byId = new Map<string, PeriodOption>()
  for (const r of rows) {
    if (!byId.has(r.grading_period_id)) {
      byId.set(r.grading_period_id, {
        id: r.grading_period_id,
        label: r.grading_period_label,
        type: r.grading_period_type,
        termsId: r.terms_id ?? null,
      })
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    if (a.type !== b.type) return a.type === "REPORTING" ? -1 : 1
    return a.label.localeCompare(b.label, undefined, { numeric: true })
  })
}

/** The period to open on: the one named like the expedition's school term
 *  ("Term 2"), else the latest reporting period that holds a score, else the
 *  first reporting period, else the first. */
export function pickDefaultPeriod(
  periods: PeriodOption[],
  rows: TermGradeRow[],
  termName: string | null | undefined,
): PeriodOption | null {
  if (periods.length === 0) return null
  const wanted = (termName || "").trim().toLowerCase()
  if (wanted) {
    const byName = periods.find((p) => p.label.trim().toLowerCase() === wanted)
    if (byName) return byName
  }
  const scored = new Set(rows.filter((r) => r.score != null).map((r) => r.grading_period_id))
  const reporting = periods.filter((p) => p.type === "REPORTING")
  const latestScored = [...reporting].reverse().find((p) => scored.has(p.id))
  return latestScored || reporting[0] || periods[0]
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function fmtPercent(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(digits)}%`
}

export function fmtGpa(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return value.toFixed(2)
}

/** When Toddle was last checked ("Nov 9, 4:13 AM"), or null without a pull. */
export function asOfLabel(lastRun: TermGradesRunSummary | null | undefined): string | null {
  if (!lastRun) return null
  if (lastRun.finished_at && Number.isFinite(lastRun.finished_at)) {
    const d = new Date(lastRun.finished_at)
    if (!Number.isNaN(d.getTime())) return format(d, "MMM d, h:mm a")
  }
  if (lastRun.snapshot_date) {
    const d = new Date(`${lastRun.snapshot_date.slice(0, 10)}T12:00:00`)
    if (!Number.isNaN(d.getTime())) return format(d, "MMM d")
  }
  return null
}
