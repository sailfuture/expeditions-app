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
  getStudentProfessionalismByExpedition,
  getExpeditionBonus,
  getExpeditionPenalty,
  getExpeditionLocations,
  getExpeditionJournalStatus,
  getSchoolTerms,
  getSchoolYears,
  getExpeditionsStudentInformation,
  getEvaluationByStudent,
  getEvaluationByStudentType,
  getProfessionalismByStudent,
  getExpeditionPerformanceReviews,
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

export function useExpeditionSchedules(expeditionsId?: number, options?: { refreshInterval?: number; revalidateOnFocus?: boolean }) {
  return useSWR(
    expeditionsId ? `${KEYS.schedules}_${expeditionsId}` : KEYS.schedules,
    () => getExpeditionSchedules(expeditionsId),
    options
  )
}

export function useExpeditionScheduleItems() {
  return useSWR(KEYS.scheduleItems, getExpeditionScheduleItems)
}

export function useExpeditionScheduleItemsByDate(date: string | null, expeditionsId?: number, options?: { refreshInterval?: number; revalidateOnFocus?: boolean }) {
  return useSWR(
    date ? `expedition_schedule_items_date_${date}_${expeditionsId || 'all'}` : null,
    date ? () => getExpeditionScheduleItemsByDate(date, expeditionsId) : null,
    options
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

export function useExpeditionsProfessionalismByDate(date: string | null, expeditionsId: number | null) {
  return useSWR(
    date && expeditionsId ? `expeditions_professionalism_date_${date}_${expeditionsId}` : null,
    date && expeditionsId ? () => getExpeditionsProfessionalismByDate(date, expeditionsId) : null
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

export function useSchoolTerms() {
  return useSWR("school_terms", getSchoolTerms)
}

export function useSchoolYears() {
  return useSWR("school_years", getSchoolYears)
}

export function useIntakeSubmissions() {
  return useSWR("expeditions_student_information", getExpeditionsStudentInformation)
}

export function useStudentProfessionalismByExpedition(studentsId: number | null, expeditionsId: number | null) {
  return useSWR(
    studentsId && expeditionsId ? `student_professionalism_${studentsId}_${expeditionsId}` : null,
    studentsId && expeditionsId ? () => getStudentProfessionalismByExpedition(studentsId, expeditionsId) : null
  )
}

export function useEvaluationByStudent(studentsId: number | null, expeditionsId: number | null) {
  return useSWR(
    studentsId && expeditionsId ? `evaluation_by_student_${studentsId}_${expeditionsId}` : null,
    studentsId && expeditionsId ? () => getEvaluationByStudent(studentsId, expeditionsId) : null
  )
}

export function useEvaluationByStudentType(studentsId: number | null, expeditionsId: number | null, type: string | null) {
  return useSWR(
    studentsId && expeditionsId && type ? `evaluation_by_student_type_${studentsId}_${expeditionsId}_${type}` : null,
    studentsId && expeditionsId && type ? () => getEvaluationByStudentType(studentsId, expeditionsId, type) : null
  )
}

export function useProfessionalismByStudent(studentsId: number | null, expeditionsId: number | null) {
  return useSWR(
    studentsId && expeditionsId ? `professionalism_by_student_${studentsId}_${expeditionsId}` : null,
    studentsId && expeditionsId ? () => getProfessionalismByStudent(studentsId, expeditionsId) : null
  )
}

export function useExpeditionPerformanceReviews(expeditionsId: number | null) {
  return useSWR(
    expeditionsId ? `expedition_performance_reviews_${expeditionsId}` : null,
    expeditionsId ? () => getExpeditionPerformanceReviews(expeditionsId) : null
  )
}
