// Discipline records (Xano expedition_discipline).
//
// Every reason has a fixed severity: critical or non-critical. The record's
// `isReferral` column stores that flag (true = critical); it is set from the
// reason when a record is saved, so staff no longer choose it separately.
// Older records keep whatever was stored at the time.

export interface DisciplineReason {
  /** Stored in expedition_discipline.reason. */
  value: string
  critical: boolean
}

export const OTHER_CRITICAL = "Other (critical)"
export const OTHER_NON_CRITICAL = "Other"

export const DISCIPLINE_REASONS: ReadonlyArray<DisciplineReason> = [
  { value: "Physically Dangerous", critical: true },
  { value: "Property Damage", critical: true },
  { value: "Safety Violation", critical: true },
  { value: "Insubordination", critical: true },
  { value: "Substance Use", critical: true },
  { value: "Unauthorized Absence", critical: true },
  { value: OTHER_CRITICAL, critical: true },
  { value: "Verbally Aggressive", critical: false },
  { value: "Academic Dishonesty", critical: false },
  { value: OTHER_NON_CRITICAL, critical: false },
]

export const DISCIPLINE_CONSEQUENCES: ReadonlyArray<string> = [
  "Shore Leave Revoked",
  "Suspension from Activity",
  "Parent Phone Call",
]

/** Consequences that last a number of days (stored in expedition_discipline.consequence_days). */
export const CONSEQUENCES_WITH_DAYS: ReadonlyArray<string> = ["Shore Leave Revoked", "Suspension from Activity"]

export function consequenceHasDays(consequence: string | null | undefined): boolean {
  return !!consequence && CONSEQUENCES_WITH_DAYS.includes(consequence)
}

/** "Shore Leave Revoked · 3 days", or just the consequence when there's no length. */
export function formatConsequence(consequence: string | null | undefined, days: number | null | undefined): string {
  if (!consequence) return ""
  const n = Number(days) || 0
  return consequenceHasDays(consequence) && n > 0 ? `${consequence} · ${n} day${n === 1 ? "" : "s"}` : consequence
}

export function isCriticalReason(reason: string | null | undefined): boolean {
  return DISCIPLINE_REASONS.find((r) => r.value === reason)?.critical ?? false
}

/**
 * A record's severity for display. Known reasons always use their fixed
 * severity, so older records filed the other way read consistently; an old
 * "Other" (or a retired reason) keeps the flag stored on the record.
 */
export function recordIsCritical(record: { reason?: string | null; isReferral?: boolean | null } | null | undefined): boolean {
  if (!record) return false
  const reason = record.reason ?? ""
  if (reason === OTHER_NON_CRITICAL) return !!record.isReferral
  const known = DISCIPLINE_REASONS.find((r) => r.value === reason)
  return known ? known.critical : !!record.isReferral
}

/** The label used for a record's severity everywhere (list, detail, PDF). */
export function severityLabel(critical: boolean | null | undefined): string {
  return critical ? "Critical" : "Non-critical"
}

/**
 * The reason to preselect when editing an older record. Old "Other" records
 * that were filed as referrals map to "Other (critical)" so saving them
 * doesn't quietly downgrade them.
 */
export function reasonForEdit(record: { reason?: string | null; isReferral?: boolean | null }): string {
  const reason = record.reason ?? ""
  if (reason === OTHER_NON_CRITICAL && record.isReferral) return OTHER_CRITICAL
  return reason
}

/**
 * Consequence choices for the form. A record that still has a retired
 * consequence (e.g. "Cell Phone Confiscated") keeps it as an extra option so
 * editing it doesn't lose the value.
 */
export function consequenceOptionsFor(current: string | null | undefined): string[] {
  const options = [...DISCIPLINE_CONSEQUENCES]
  if (current && !options.includes(current)) options.push(current)
  return options
}

export function isRetiredConsequence(value: string): boolean {
  return !DISCIPLINE_CONSEQUENCES.includes(value)
}
