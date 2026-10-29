// Expedition award: the daily cash award a student earns from their
// professionalism scores. Mirrors the "Expedition award" spreadsheet:
//
//   Step 1  earned $      = $5 per category that qualifies (School, Job Duties,
//                          Service, Crew scored >= 3; Journaling == 100; Fitness == 100)
//   Step 2  performance   = mean of the rated categories entered that day
//           perf percent  = first matching row of the performance tier table
//           cit percent   = exact lookup of the citizenship score
//   Step 3  daily award   = earned $ x perf percent x cit percent
//   Step 4  total         = sum of daily awards
//
// Everything that is a number in the spreadsheet's Settings tab lives in
// `DEFAULT_AWARD_SETTINGS`. Read from the settings object, never hardcode.
// `lib/__tests__/expedition-award.test.ts` replays the spreadsheet's Example
// Week row by row against this module.
//
// This file must stay free of "@/..." imports so the test can be compiled and
// run with plain tsc + node.

export type RatedCategory = "school" | "job" | "service" | "crew"
export type CompletionCategory = "journaling" | "fitness"
export type AwardCategory = RatedCategory | CompletionCategory

export interface PerformanceTier {
  /** "gt" = score must be greater than `value`; "gte" = at least `value`. */
  op: "gt" | "gte"
  value: number
  /** Fraction kept, e.g. 0.8 for 80%. */
  percent: number
}

export interface AwardSettings {
  /** Dollars earned per qualifying category. */
  dollarsPerCategory: number
  /** A rated category (1 to 5) earns when its score is at least this. */
  ratedThreshold: number
  /** A completion category (Journaling, Fitness) earns only when equal to this. */
  completionValue: number
  /** Checked from the top; the first row that matches sets the percent. Nothing matching keeps 0%. */
  performanceTiers: PerformanceTier[]
  /** Exact lookup by whole-number citizenship score. Anything missing (including blank) keeps 0%. */
  citizenshipPercents: Record<number, number>
}

export const DEFAULT_AWARD_SETTINGS: AwardSettings = {
  dollarsPerCategory: 5,
  ratedThreshold: 3,
  completionValue: 100,
  performanceTiers: [
    { op: "gt", value: 3.25, percent: 1.0 },
    { op: "gte", value: 3.0, percent: 0.8 },
    { op: "gte", value: 2.75, percent: 0.7 },
    { op: "gte", value: 2.5, percent: 0.5 },
  ],
  citizenshipPercents: { 5: 1.1, 4: 1.0, 3: 0.75, 2: 0.4, 1: 0 },
}

export const RATED_CATEGORIES: ReadonlyArray<{ key: RatedCategory; label: string }> = [
  { key: "school", label: "Academics" },
  { key: "job", label: "Job Duties" },
  { key: "service", label: "Service" },
  { key: "crew", label: "Crew" },
]

export const COMPLETION_CATEGORIES: ReadonlyArray<{ key: CompletionCategory; label: string }> = [
  { key: "journaling", label: "Journaling" },
  { key: "fitness", label: "Fitness" },
]

/** One student's scores for one day. `null` means blank (not scored / not applicable). */
export interface DailyScores {
  date: string
  school: number | null
  job: number | null
  service: number | null
  crew: number | null
  /** 100 (complete), 50 (partial), 0, or null when not applicable. */
  journaling: number | null
  /** 100 (complete), 0, or null when not applicable. */
  fitness: number | null
  /** 1 to 5; null is treated as 0 and keeps 0%. */
  citizenship: number | null
}

export interface DailyAward {
  date: string
  scores: DailyScores
  /** Dollars earned per category before tiers (0 when it did not qualify). */
  earnedByCategory: Record<AwardCategory, number>
  /** Step 1 total. */
  earned: number
  /** Step 2a: mean of the rated categories entered; 0 when none were. */
  performanceScore: number
  /** How many rated categories went into the mean. */
  ratedCount: number
  /** Step 2b, as a fraction. */
  performancePercent: number
  /** Step 2c, as a fraction. */
  citizenshipPercent: number
  /** performancePercent x citizenshipPercent. */
  combinedPercent: number
  /** Step 3, unrounded. */
  award: number
  /** earned - award. */
  withheld: number
}

export interface StudentAwardSummary {
  days: DailyAward[]
  daysScored: number
  earned: number
  withheld: number
  /** Step 4: sum of the daily awards, unrounded. */
  total: number
}

export function performancePercentFor(score: number, settings: AwardSettings = DEFAULT_AWARD_SETTINGS): number {
  for (const tier of settings.performanceTiers) {
    if (tier.op === "gt" ? score > tier.value : score >= tier.value) return tier.percent
  }
  return 0
}

export function citizenshipPercentFor(score: number | null, settings: AwardSettings = DEFAULT_AWARD_SETTINGS): number {
  if (score === null || score === undefined || !Number.isFinite(score)) return 0
  return settings.citizenshipPercents[score] ?? 0
}

export function computeDailyAward(scores: DailyScores, settings: AwardSettings = DEFAULT_AWARD_SETTINGS): DailyAward {
  const earnedByCategory = {} as Record<AwardCategory, number>

  for (const { key } of RATED_CATEGORIES) {
    const value = scores[key]
    earnedByCategory[key] = value !== null && value >= settings.ratedThreshold ? settings.dollarsPerCategory : 0
  }
  for (const { key } of COMPLETION_CATEGORIES) {
    const value = scores[key]
    earnedByCategory[key] = value !== null && value === settings.completionValue ? settings.dollarsPerCategory : 0
  }

  const earned = Object.values(earnedByCategory).reduce((sum, v) => sum + v, 0)

  const rated = RATED_CATEGORIES.map(({ key }) => scores[key]).filter((v): v is number => v !== null)
  const ratedCount = rated.length
  const performanceScore = ratedCount > 0 ? rated.reduce((sum, v) => sum + v, 0) / ratedCount : 0

  const performancePercent = performancePercentFor(performanceScore, settings)
  const citizenshipPercent = citizenshipPercentFor(scores.citizenship, settings)
  const combinedPercent = performancePercent * citizenshipPercent
  const award = earned * combinedPercent

  return {
    date: scores.date,
    scores,
    earnedByCategory,
    earned,
    performanceScore,
    ratedCount,
    performancePercent,
    citizenshipPercent,
    combinedPercent,
    award,
    withheld: earned - award,
  }
}

export function summarizeStudentAwards(days: DailyScores[], settings: AwardSettings = DEFAULT_AWARD_SETTINGS): StudentAwardSummary {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const computed = sorted.map((d) => computeDailyAward(d, settings))
  return {
    days: computed,
    daysScored: computed.length,
    earned: computed.reduce((sum, d) => sum + d.earned, 0),
    withheld: computed.reduce((sum, d) => sum + d.withheld, 0),
    total: computed.reduce((sum, d) => sum + d.award, 0),
  }
}

// ---------------------------------------------------------------------------
// Mapping from the Xano `expeditions_professionalism` row to DailyScores.
// ---------------------------------------------------------------------------

/** The subset of an `expeditions_professionalism` row the award needs. */
export interface ProfessionalismRowLike {
  date?: string | null
  academics?: number | null
  isAcademicsUsed?: boolean | null
  job?: number | null
  isJobUsed?: boolean | null
  service?: number | null
  isServiceUsed?: boolean | null
  crew?: number | null
  isCrewUsed?: boolean | null
  citizenship?: number | null
  isCitizenshipUsed?: boolean | null
  /** Journal status name, e.g. "Completed", "Incomplete", "Late Entry", "Not Started", "Excused", or "". */
  journaling?: string | null
  /** 100, 0 or null. */
  fitness?: number | null
}

export interface JournalStatusLike {
  name: string
  /** 1 = complete, 0.5 = partial, 0 = not started, null = excused. */
  value: number | null
}

/**
 * In the evaluate screen an `isXUsed` flag set to true means the category was
 * excluded for that day (same convention as the Xano averages function), so the
 * score is treated as blank even if a number is still stored.
 */
function ratedScore(value: number | null | undefined, excluded: boolean | null | undefined): number | null {
  if (excluded === true) return null
  return value === null || value === undefined ? null : Number(value)
}

/** "Completed" (value 1) -> 100, "Incomplete" (0.5) -> 50, "Not Started" (0) -> 0, "Excused"/blank -> null. */
export function journalingScoreFromStatus(
  statusName: string | null | undefined,
  statuses: ReadonlyArray<JournalStatusLike>
): number | null {
  const name = (statusName ?? "").trim().toLowerCase()
  if (!name) return null
  const status = statuses.find((s) => s.name.trim().toLowerCase() === name)
  if (!status || status.value === null || status.value === undefined) return null
  return Math.round(Number(status.value) * 100)
}

export function dailyScoresFromProfessionalism(
  row: ProfessionalismRowLike,
  statuses: ReadonlyArray<JournalStatusLike>
): DailyScores {
  return {
    date: row.date ?? "",
    school: ratedScore(row.academics, row.isAcademicsUsed),
    job: ratedScore(row.job, row.isJobUsed),
    service: ratedScore(row.service, row.isServiceUsed),
    crew: ratedScore(row.crew, row.isCrewUsed),
    journaling: journalingScoreFromStatus(row.journaling, statuses),
    fitness: row.fitness === null || row.fitness === undefined ? null : Number(row.fitness),
    citizenship: ratedScore(row.citizenship, row.isCitizenshipUsed),
  }
}

/** Round to cents the way the spreadsheet displays (half up), guarding against 67.975 -> 67.97 float drift. */
export function roundToCents(amount: number): number {
  // Normalise to 13 significant digits first so 6797.499999999999 reads as 6797.5.
  const cents = Number((amount * 100).toPrecision(13))
  return Math.round(cents) / 100
}

export function formatAwardDollars(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(roundToCents(amount))
}

export function formatAwardPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}
