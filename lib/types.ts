export interface ExpeditionStaff {
  id: number
  name: string
  email: string
  isActive: boolean
  expeditions_id: number[]
  photo_url?: string
}

export interface Expedition {
  id: number
  name: string
  startDate?: string
  endDate?: string
  start_date?: string
  end_date?: string
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
  name: string
  expeditions_id: number[]
  isArchived: boolean
  photo_url?: string
}

export interface ExpeditionBonus {
  id: number
  name: string
  value: number
}

export interface ExpeditionPenalty {
  id: number
  name: string
  value: number
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
  bonuses: ExpeditionBonus[]
  penalties: ExpeditionPenalty[]
  note: string | null
  journal_status_id: number | null
  // Boolean flags to disable categories (true = disabled/inactive)
  isAcademicsUsed?: boolean
  isJobUsed?: boolean
  isCitizenshipUsed?: boolean
  isCrewUsed?: boolean
  isServiceUsed?: boolean
  _students?: Student
}
