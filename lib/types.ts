export interface ExpeditionStaff {
  id: number
  name: string
  email: string
  isActive: boolean
  expeditions_id: number[]
}

export interface Expedition {
  id: number
  name: string
  startDate: string
  endDate: string
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
}

export interface ExpeditionScheduleItem {
  id: number
  name: string
  expedition_schedule_id: number
  time_in: number
  time_out: number
  led_by: number
  _expedition_staff?: ExpeditionStaff
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
  _students?: Student
}
