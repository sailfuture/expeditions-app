// Auto-assignment of dish teams and galley teams to expedition schedule days.
//
// Dish teams are matched by weekday: a dish team carries a `day_of_week`
// (e.g. "Monday"), and each schedule day is linked to whichever dish team
// matches the day's actual calendar weekday.
//
// Galley teams are rotated: schedule days are sorted by date and galley teams
// (sorted by name) are assigned round-robin so they alternate across the days.
//
// Both assignments are idempotent — a schedule row is only PATCHed when its
// current value differs from the computed one, so re-running is cheap and safe.

import {
  getExpeditionDishDays,
  getExpeditionsGalleyTeam,
  getExpeditionSchedules,
  updateExpeditionSchedule,
} from "@/lib/xano"

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

// Resolve the weekday name for a "yyyy-MM-dd" date string using local time
// (constructing from parts avoids the UTC off-by-one that `new Date(str)` hits).
function weekdayName(dateString: string): string {
  const [year, month, day] = dateString.slice(0, 10).split("-").map(Number)
  return WEEKDAYS[new Date(year, month - 1, day).getDay()]
}

export interface AutoAssignOptions {
  // Only consider schedule days within this inclusive range (yyyy-MM-dd).
  startDate?: string
  endDate?: string
  // Pre-fetched data to avoid extra round-trips. Omit any to have it fetched.
  dishDays?: any[]
  galleyTeams?: any[]
  schedules?: any[]
  // Toggle each assignment independently (both default to true).
  assignDish?: boolean
  assignGalley?: boolean
}

export interface AutoAssignResult {
  daysProcessed: number
  dishUpdated: number
  galleyUpdated: number
  failures: number
}

// Compute and apply dish-team / galley-team links for an expedition's schedule
// days. Returns counts of what changed. Already-correct rows are left untouched.
export async function autoAssignTeamsForExpedition(
  expeditionId: number,
  options: AutoAssignOptions = {}
): Promise<AutoAssignResult> {
  const assignDish = options.assignDish ?? true
  const assignGalley = options.assignGalley ?? true

  const [dishDays, galleyTeams, schedules] = await Promise.all([
    options.dishDays ?? getExpeditionDishDays(expeditionId),
    options.galleyTeams ?? getExpeditionsGalleyTeam(expeditionId),
    options.schedules ?? getExpeditionSchedules(expeditionId),
  ])

  const { startDate, endDate } = options
  const sortedSchedules = [...(schedules || [])]
    .filter((s: any) => {
      if (!s?.date) return false
      if (!startDate || !endDate) return true
      return s.date >= startDate && s.date <= endDate
    })
    .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))

  // weekday name -> dish day id
  const dishByWeekday = new Map<string, number>()
  for (const dd of dishDays || []) {
    if (dd?.day_of_week) dishByWeekday.set(dd.day_of_week, dd.id)
  }

  // Galley teams sorted by name so rotation order is stable (Team A, Team B, ...)
  const sortedGalleyTeams = [...(galleyTeams || [])].sort((a: any, b: any) =>
    (a.name || "").localeCompare(b.name || "")
  )

  let dishUpdated = 0
  let galleyUpdated = 0
  let failures = 0

  for (let i = 0; i < sortedSchedules.length; i++) {
    const schedule = sortedSchedules[i]
    const update: Record<string, any> = {}

    if (assignDish && dishByWeekday.size > 0) {
      const dishId = dishByWeekday.get(weekdayName(schedule.date))
      if (dishId && schedule.expedition_dish_days_id !== dishId) {
        update.expedition_dish_days_id = dishId
      }
    }

    if (assignGalley && sortedGalleyTeams.length > 0) {
      const galleyTeam = sortedGalleyTeams[i % sortedGalleyTeams.length]
      if (galleyTeam && schedule.expeditions_galley_team_id !== galleyTeam.id) {
        update.expeditions_galley_team_id = galleyTeam.id
      }
    }

    if (Object.keys(update).length === 0) continue

    try {
      await updateExpeditionSchedule(schedule.id, update)
      if ("expedition_dish_days_id" in update) dishUpdated++
      if ("expeditions_galley_team_id" in update) galleyUpdated++
    } catch (error) {
      failures++
      console.error(`Failed to auto-assign teams for schedule ${schedule.id}:`, error)
    }
  }

  return { daysProcessed: sortedSchedules.length, dishUpdated, galleyUpdated, failures }
}
