import type { JournalStatus } from "@/lib/journal-status"
import type { CategoryReasons } from "@/lib/evaluation-reasons"

export interface ExpeditionStaff {
  id: number
  name: string
  email: string
  isActive: boolean
  expeditions_id: number[]
  photo_url?: string
  role?: "Admin" | "Staff" | "Instructor"
}

// "academy" = a school expedition (scores, professionalism reviews);
// "residential" = a residential-program expedition, which will use its own
// incentive system. Stored as the `expedition_type` enum on the Xano table.
export type ExpeditionType = "academy" | "residential"

export interface Expedition {
  id: number
  name: string
  startDate?: string
  endDate?: string
  start_date?: string
  end_date?: string
  number_participants?: number
  expedition_type?: ExpeditionType
  isActive?: boolean
}

export interface ExpeditionLocation {
  id: number
  created_at: number
  port: string
  country: string
  lat: number
  long: number
}

export interface ExpeditionSchedule {
  id: number
  name: string
  date: string
  isOffshore: boolean
  isService: boolean
  current_location: number
  destination: number
  expeditions_id: number
  _expedition_current_location?: ExpeditionLocation
  _expedition_destination?: ExpeditionLocation
  _expeditions?: Expedition
}

export interface ExpeditionScheduleItemType {
  id: number
  created_at: number
  name: string
  color?: string
  isMeal?: boolean
}

export interface ExpeditionScheduleItem {
  id: number
  name: string
  expedition_schedule_item_types_id: number
  expedition_schedule_id: number
  time_in: number
  time_out: number
  led_by: number
  participants: ExpeditionStaff[]
  notes?: string
  address?: string
  things_to_bring?: string
  _expedition_staff?: ExpeditionStaff
  _expedition_schedule_item_types?: ExpeditionScheduleItemType
  _expedition_schedule?: ExpeditionSchedule
}

export interface Student {
  id: number
  firstName: string
  lastName: string
  expeditions_id: number[]
  isArchived: boolean
  photo_url?: string
  profileImage?: string
}

/** Score categories a reason can be tagged with (expedition_bonus/penalty.categories). */
export type ReasonCategory = "school" | "job" | "crew" | "service" | "citizenship"

export interface ExpeditionBonus {
  id: number
  name: string
  value: number
  /** Categories whose picker offers this reason; empty or missing means all. */
  categories?: ReasonCategory[] | null
}

export interface ExpeditionPenalty {
  id: number
  name: string
  value: number
  /** Categories whose picker offers this reason; empty or missing means all. */
  categories?: ReasonCategory[] | null
}

export interface ExpeditionJournalStatus {
  id: number
  name: string
}

export interface ExpeditionProfessionalism {
  id: number
  expedition_schedule_id: number
  students_id: number
  school: number | null
  job: number | null
  citizenship: number | null
  crew: number | null
  service_learning: number | null
  isFlagged: boolean
  isLocked: boolean
  note: string | null
  // Daily journaling: Not Started / Incomplete-Late / Complete (stored as a journal status name)
  journaling: JournalStatus | null
  // One reason per score category, required whenever that score is above or below 3
  reasons: CategoryReasons
  // Boolean flags to disable categories (true = disabled/inactive)
  isAcademicsUsed?: boolean
  isJobUsed?: boolean
  isCitizenshipUsed?: boolean
  isCrewUsed?: boolean
  isServiceUsed?: boolean
  _students?: Student
}

// ---------------------------------------------------------------------------
// Review periods (Xano expedition_review_periods): weekly pay periods and the
// final evaluation. A finalized period has its reviews and award amounts frozen.
// ---------------------------------------------------------------------------
export type ReviewPeriodKind = "weekly" | "final"
export type ReviewPeriodStatus = "draft" | "finalized"

export interface ReviewPeriod {
  id: number
  created_at?: number
  expeditions_id: number
  name: string
  kind: ReviewPeriodKind
  sequence?: number | null
  startDate: string
  endDate: string
  status: ReviewPeriodStatus
  finalized_at?: number | null
  finalized_by_staff_id?: number | null
  /** From GET review_periods. */
  review_count?: number
  with_notes?: number
  with_reviewer?: number
  missing_students?: number[]
  award_total?: number
}

export interface ReviewPeriodsResponse {
  periods: ReviewPeriod[]
  active_students: number
  unassigned_count: number
}

export interface ReviewPeriodAwardPreview {
  settings: unknown
  students: Array<{
    students_id: number
    days: number
    earned: number
    withheld: number
    total: number
  }>
}
