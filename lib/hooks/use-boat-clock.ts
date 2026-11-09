"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { getExpeditionSchedules } from "@/lib/xano"
import { boatClock, type BoatClock } from "@/lib/boat-clock"

/**
 * The boat's date and time for an expedition, ticking once a minute. Reads the expedition's
 * schedule rows (same SWR key as useExpeditionSchedules, so pages that already load them pay
 * nothing extra) and takes the UTC offset from the day's location. Until the rows arrive, or
 * when no day has a location with a timezone, it is the browser's clock and `source` says so.
 */
export function useBoatClock(expeditionId: number | null | undefined): { clock: BoatClock; isLoading: boolean } {
  const { data: schedules, isLoading } = useSWR(
    expeditionId ? `expedition_schedules_${expeditionId}` : null,
    expeditionId ? () => getExpeditionSchedules(expeditionId) : null
  )

  // Re-render on each new minute, aligned to the minute so the marker never lags by most of one.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let interval: number | undefined
    const toNextMinute = 60_000 - (Date.now() % 60_000)
    const timeout = window.setTimeout(() => {
      setTick((t) => t + 1)
      interval = window.setInterval(() => setTick((t) => t + 1), 60_000)
    }, toNextMinute)
    return () => {
      window.clearTimeout(timeout)
      if (interval !== undefined) window.clearInterval(interval)
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick` is the minute hand
  const clock = useMemo(() => boatClock(schedules), [schedules, tick])
  return { clock, isLoading }
}
