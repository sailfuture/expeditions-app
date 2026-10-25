import { calculateDistanceBetweenLocations, calculateRouteDistance } from "@/lib/haversine"

export interface ExpeditionStats {
  totalDays: number
  anchoredDays: number
  offshoreDays: number
  serviceDays: number
  totalNauticalMiles: number
}

/**
 * Day counts and route distance for an expedition, computed from its
 * day-by-day schedule rows and its destinations. This is the single source
 * for the stat cards on the overview page and the home dashboard, so both
 * always show the same numbers.
 */
export function computeExpeditionStats(
  schedules: any[] | null | undefined,
  locations: any[] | null | undefined,
  expeditionId?: number | null
): ExpeditionStats {
  const rows = (schedules ?? []).filter((s: any) => !expeditionId || s?.expeditions_id === expeditionId)

  const totalDays = rows.length
  const anchoredDays = rows.filter((s: any) => !s.isOffshore && !s.isService).length
  const offshoreDays = rows.filter((s: any) => s.isOffshore).length
  const serviceDays = rows.filter((s: any) => s.isService).length

  let totalNauticalMiles = 0
  if (locations && locations.length >= 2) {
    try {
      // Destinations in creation order describe the planned route.
      const sortedLocations = [...locations].sort((a, b) => a.created_at - b.created_at)
      totalNauticalMiles = calculateRouteDistance(sortedLocations).total_nm
    } catch (error) {
      console.error("Error calculating route distance:", error)
      // Fall back to per-day distances when a destination lacks coordinates.
      rows.forEach((schedule: any) => {
        if (schedule.nautical_miles) {
          totalNauticalMiles += schedule.nautical_miles
        } else if (schedule._expedition_current_location && schedule._expedition_destination) {
          const distance = calculateDistanceBetweenLocations(
            schedule._expedition_current_location,
            schedule._expedition_destination
          )
          if (distance) totalNauticalMiles += distance
        }
      })
      totalNauticalMiles = Math.round(totalNauticalMiles * 10) / 10
    }
  }

  return { totalDays, anchoredDays, offshoreDays, serviceDays, totalNauticalMiles }
}
