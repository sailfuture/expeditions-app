"use client"

import useSWR from "swr"
import {
  getExpeditions,
  getExpeditionSchedules,
  getExpeditionScheduleItems,
  getStudents,
  getTeachers,
  getExpeditionsProfessionalism,
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

export function useStudents() {
  return useSWR(KEYS.students, getStudents)
}

export function useTeachers() {
  return useSWR(KEYS.teachers, getTeachers)
}

export function useExpeditionsProfessionalism() {
  return useSWR(KEYS.professionalism, getExpeditionsProfessionalism)
}

export function useExpeditionBonus() {
  return useSWR(KEYS.bonus, getExpeditionBonus)
}

export function useExpeditionPenalty() {
  return useSWR(KEYS.penalty, getExpeditionPenalty)
}

export function useExpeditionLocations() {
  return useSWR(KEYS.locations, getExpeditionLocations)
}

export function useExpeditionJournalStatus() {
  return useSWR(KEYS.journalStatus, getExpeditionJournalStatus)
}
