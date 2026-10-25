// Per-category "reasons" for a daily professionalism score.
//
// A score of 3 is the neutral expectation. Anything above 3 must be explained
// with one or more bonus reasons (expedition_bonus) and anything below 3 with
// one or more penalty reasons (expedition_penalty). The chosen reasons are
// stored on the expeditions_professionalism record in one json[] column per
// category (academics_reason, job_reason, ...) so they can be reported on
// later. The legacy `bonus` / `penalty` arrays on the same record are kept in
// sync from those reasons so older readers keep working.

import type { ExpeditionBonus, ExpeditionPenalty } from "@/lib/types"

export type ReasonType = "bonus" | "penalty"

/** Shape of each entry stored in a `<category>_reason` json[] column. */
export interface ExpeditionReason {
  type: ReasonType
  id: number
  name: string
  value: number
}

/** Score keys as the evaluation form names them. */
export type ScoreKey = "school" | "job" | "citizenship" | "crew" | "service_learning"

export const SCORE_KEYS: ReadonlyArray<ScoreKey> = ["school", "job", "citizenship", "crew", "service_learning"]

/** Xano column that holds the reasons for each score key. */
export const REASON_FIELD_BY_KEY: Record<ScoreKey, string> = {
  school: "academics_reason",
  job: "job_reason",
  citizenship: "citizenship_reason",
  crew: "crew_reason",
  service_learning: "service_reason",
}

/** The isXUsed flag that blocks (N/A) each score category for the day. */
export const BLOCK_FLAG_BY_KEY: Record<ScoreKey, "isAcademicsUsed" | "isJobUsed" | "isCitizenshipUsed" | "isCrewUsed" | "isServiceUsed"> = {
  school: "isAcademicsUsed",
  job: "isJobUsed",
  citizenship: "isCitizenshipUsed",
  crew: "isCrewUsed",
  service_learning: "isServiceUsed",
}

export const SCORE_LABELS: Record<ScoreKey, string> = {
  school: "School",
  job: "Job",
  citizenship: "Citizenship",
  crew: "Crew",
  service_learning: "Service",
}

/** Score categories shown for a day type, in display order. */
export function visibleScoreKeys(isOffshore: boolean, isService: boolean): ScoreKey[] {
  const keys: ScoreKey[] = isOffshore ? ["crew", "job", "citizenship"] : ["school", "job", "citizenship"]
  if (isService) keys.push("service_learning")
  return keys
}

export type CategoryReasons = Record<ScoreKey, ExpeditionReason[]>

export function emptyReasons(): CategoryReasons {
  return { school: [], job: [], citizenship: [], crew: [], service_learning: [] }
}

export const NEUTRAL_SCORE = 3

/** Which kind of reason a score needs. `null` (displayed as 3) and 3 need none. */
export function reasonTypeForScore(score: number | null | undefined): ReasonType | null {
  if (score === null || score === undefined) return null
  if (score > NEUTRAL_SCORE) return "bonus"
  if (score < NEUTRAL_SCORE) return "penalty"
  return null
}

export function toReason(option: { id: number; name: string; value?: number | null }, type: ReasonType): ExpeditionReason {
  return { type, id: option.id, name: option.name, value: Number(option.value ?? 0) }
}

/** Parse one stored reason entry; tolerates nulls, strings and partial objects. */
export function parseStoredReason(raw: unknown): ExpeditionReason | null {
  if (!raw || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>
  const type = obj.type === "bonus" || obj.type === "penalty" ? obj.type : null
  const id = Number(obj.id)
  if (!type || !Number.isFinite(id) || typeof obj.name !== "string") return null
  return { type, id, name: obj.name, value: Number(obj.value ?? 0) }
}

/** Parse a stored reason column: an array of entries, or (legacy) a single object. */
export function parseStoredReasons(raw: unknown): ExpeditionReason[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  const seen = new Set<string>()
  const reasons: ExpeditionReason[] = []
  for (const item of list) {
    const reason = parseStoredReason(item)
    if (!reason) continue
    const dedupeKey = `${reason.type}:${reason.id}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    reasons.push(reason)
  }
  return reasons
}

/** Read every reason column off a raw expeditions_professionalism row. */
export function readStoredReasons(row: Record<string, unknown> | null | undefined): CategoryReasons {
  const reasons = emptyReasons()
  if (!row) return reasons
  for (const key of SCORE_KEYS) {
    reasons[key] = parseStoredReasons(row[REASON_FIELD_BY_KEY[key]])
  }
  return reasons
}

/** Keep only the reasons that match the direction of the score they explain. */
export function reconcileReasons(reasons: ExpeditionReason[] | null | undefined, score: number | null | undefined): ExpeditionReason[] {
  const type = reasonTypeForScore(score)
  if (!type || !reasons) return []
  return reasons.filter((r) => r.type === type)
}

/** True when at least one reason matches the score's direction. */
export function reasonMatchesScore(reasons: ExpeditionReason[] | null | undefined, score: number | null | undefined): boolean {
  return reconcileReasons(reasons, score).length > 0
}

/** A category needs a reason when it is scored off 3 and not blocked. */
export function needsReason(score: number | null | undefined, blocked: boolean | undefined): boolean {
  if (blocked) return false
  return reasonTypeForScore(score) !== null
}

/** Legacy `bonus` / `penalty` arrays derived from the per-category reasons (deduplicated by id). */
export function splitReasons(reasons: Partial<CategoryReasons>): { bonus: ExpeditionBonus[]; penalty: ExpeditionPenalty[] } {
  const bonus = new Map<number, ExpeditionBonus>()
  const penalty = new Map<number, ExpeditionPenalty>()
  for (const key of SCORE_KEYS) {
    for (const reason of reasons[key] ?? []) {
      const option = { id: reason.id, name: reason.name, value: reason.value }
      if (reason.type === "bonus") bonus.set(reason.id, option)
      else penalty.set(reason.id, option)
    }
  }
  return { bonus: Array.from(bonus.values()), penalty: Array.from(penalty.values()) }
}
