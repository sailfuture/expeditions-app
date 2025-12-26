"use client"

import useSWR from "swr"
import {
  getExpeditions,
  getExpeditionSchedules,
  getExpeditionScheduleItems,
  getExpeditionScheduleItemsByDate,
  getExpeditionScheduleItemTypes,
  getStudents,
  getStudentsByExpedition,
  getTeachers,
  getTeachersByExpedition,
  getExpeditionsProfessionalism,
  getExpeditionsProfessionalismByDate,
  getExpeditionBonus,
  getExpeditionPenalty,
  getExpeditionLocations,
  getExpeditionJournalStatus,
} from "@/lib/xano"

// SWR fetcher keys
const KEYS = {
  expeditions: "expeditions",
  schedules: "expedition_schedules",
  scheduleItems: "expedition_schedule_items",
  students: "students",
  teachers: "teachers",
  professionalism: "expeditions_professionalism",
  bonus: "expedition_bonus",
  penalty: "expedition_penalty",
  locations: "expedition_locations",
  journalStatus: "expedition_journal_status",
}

export function useExpeditions() {
  return useSWR(KEYS.expeditions, getExpeditions)
}

export function useExpeditionSchedules() {
  return useSWR(KEYS.schedules, getExpeditionSchedules)
}

export function useExpeditionScheduleItems() {
  return useSWR(KEYS.scheduleItems, getExpeditionScheduleItems)
}

export function useExpeditionScheduleItemsByDate(date: string | null) {
  return useSWR(
    date ? `expedition_schedule_items_date_${date}` : null,
    date ? () => getExpeditionScheduleItemsByDate(date) : null
  )
}

export function useStudents() {
  return useSWR(KEYS.students, getStudents)
}

export function useTeachers() {
  return useSWR(KEYS.teachers, getTeachers)
}

export function useExpeditionsProfessionalism() {
  return useSWR(KEYS.professionalism, getExpeditionsProfessionalism)
}

export function useExpeditionsProfessionalismByDate(date: string | null) {
  return useSWR(
    date ? `expeditions_professionalism_date_${date}` : null,
    date ? () => getExpeditionsProfessionalismByDate(date) : null
  )
}

export function useExpeditionBonus() {
  return useSWR(KEYS.bonus, getExpeditionBonus)
}

export function useExpeditionPenalty() {
  return useSWR(KEYS.penalty, getExpeditionPenalty)
}

export function useExpeditionLocations(expeditionsId?: number) {
  return useSWR(
    expeditionsId ? `${KEYS.locations}_${expeditionsId}` : KEYS.locations,
    () => getExpeditionLocations(expeditionsId)
  )
}

export function useExpeditionJournalStatus() {
  return useSWR(KEYS.journalStatus, getExpeditionJournalStatus)
}

export function useExpeditionScheduleTemplates() {
  return useSWR("expedition_schedule_templates", () => {
    const { getExpeditionScheduleTemplates } = require("@/lib/xano")
    return getExpeditionScheduleTemplates()
  })
}

export function useExpeditionScheduleItemTypes() {
  return useSWR("expedition_schedule_item_types", getExpeditionScheduleItemTypes)
}

export function useTeachersByExpedition(expeditionsId: number | null) {
  return useSWR(
    expeditionsId ? `teachers_by_expedition_${expeditionsId}` : null,
    expeditionsId ? () => getTeachersByExpedition(expeditionsId) : null
  )
}

export function useStudentsByExpedition(expeditionsId: number | null) {
  return useSWR(
    expeditionsId ? `students_by_expedition_${expeditionsId}` : null,
    expeditionsId ? () => getStudentsByExpedition(expeditionsId) : null
  )
}
