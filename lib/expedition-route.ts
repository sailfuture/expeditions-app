/**
 * Turns an expedition's destinations and day-by-day schedule into an ordered
 * route for the map: one stop per destination (in the order the itinerary
 * first reaches them), the date ranges the boat is at each stop, which stops
 * are already visited, the legs sailed between them, and where the boat is
 * today.
 *
 * Pure functions only: no React, no fetching. Dates are "YYYY-MM-DD" strings
 * compared lexically, which avoids timezone drift.
 */

import { PORTS, normalizeSearch } from "@/lib/ports"

export type StopStatus = "visited" | "current" | "upcoming" | "unscheduled"

export interface DateRange {
  start: string
  end: string
}

export interface RouteStop {
  id: number
  /** 0-based position along the route (display as index + 1). */
  index: number
  port: string
  country: string
  /** Null when neither the record nor the PORTS reference list has coordinates. */
  lng: number | null
  lat: number | null
  status: StopStatus
  /** Contiguous spans of days the boat is anchored at this stop, in date order. */
  dateRanges: DateRange[]
  /** First and last itinerary dates touching this stop, for quick display. */
  firstDate: string | null
  lastDate: string | null
}

export interface RouteSegment {
  from: RouteStop
  to: RouteStop
  /** "sailed" is behind the boat, "active" is the passage underway today, "planned" is ahead. */
  status: "sailed" | "active" | "planned"
}

export type ExpeditionPhase = "before" | "during" | "after" | "no-schedule"

export interface CurrentPosition {
  /** Where the boat is (or last was) according to the itinerary. */
  stop: RouteStop
  /** Date range of the current stay. */
  range: DateRange
  /** True when today's itinerary row is an offshore passage. */
  underway: boolean
  /** Next stop after the current one, if the itinerary has one. */
  next: RouteStop | null
  /** First date at the next stop. */
  nextDate: string | null
}

export interface ExpeditionRoute {
  stops: RouteStop[]
  /** Stops that have coordinates and appear in the itinerary, in route order. */
  mappable: RouteStop[]
  /** Legs between mappable stops in the order they are sailed; a stop may appear in several. */
  segments: RouteSegment[]
  current: CurrentPosition | null
  phase: ExpeditionPhase
  firstDate: string | null
  lastDate: string | null
}

interface ScheduleLike {
  date?: string
  isOffshore?: boolean
  is_offshore?: boolean
  current_location?: number | null
  destination?: number | null
  _expedition_current_location?: Record<string, any> | null
  _expedition_destination_location?: Record<string, any> | null
}

interface LocationLike {
  id: number
  port?: string
  country?: string
  lat?: number | string | null
  long?: number | string | null
  lng?: number | string | null
}

type Row = ScheduleLike & { date: string }

export function todayLocalDateString(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

/**
 * Coordinates from the record itself when present and non-zero, otherwise
 * from the PORTS reference list matched on port + country.
 */
export function resolveCoordinates(location: LocationLike): { lng: number; lat: number } | null {
  const lat = toNumber(location.lat)
  const lng = toNumber(location.long ?? location.lng)
  if (lat !== null && lng !== null && !(lat === 0 && lng === 0)) {
    return { lat, lng }
  }
  const port = normalizeSearch(location.port ?? "")
  const country = normalizeSearch(location.country ?? "")
  if (!port) return null
  const exact = PORTS.find(
    (p) => normalizeSearch(p.name) === port && normalizeSearch(p.country) === country
  )
  const match = exact ?? PORTS.find((p) => normalizeSearch(p.name) === port)
  return match ? { lat: match.lat, lng: match.long } : null
}

/**
 * Collapse a sorted list of dates into ranges. Two dates are contiguous when
 * no other itinerary row falls between them, so a missing day in the schedule
 * does not split a stay in two.
 */
function toRanges(dates: string[], rowIndex: Map<string, number>): DateRange[] {
  const ranges: DateRange[] = []
  for (const date of dates) {
    const last = ranges[ranges.length - 1]
    if (last && (rowIndex.get(date) ?? -1) === (rowIndex.get(last.end) ?? -2) + 1) {
      last.end = date
    } else if (!last || last.end !== date) {
      ranges.push({ start: date, end: date })
    }
  }
  return ranges
}

function locationIdOf(row: ScheduleLike, field: "current" | "destination"): number | null {
  const direct = field === "current" ? row.current_location : row.destination
  const addon = field === "current" ? row._expedition_current_location : row._expedition_destination_location
  const id = toNumber(direct) ?? toNumber(addon?.id)
  return id && id > 0 ? id : null
}

function isOffshore(row: ScheduleLike): boolean {
  return Boolean(row.isOffshore ?? row.is_offshore)
}

export function buildExpeditionRoute(
  locations: LocationLike[] | undefined | null,
  schedules: ScheduleLike[] | undefined | null,
  today: string = todayLocalDateString()
): ExpeditionRoute {
  const locationById = new Map<number, LocationLike>()
  for (const loc of locations ?? []) {
    if (loc && typeof loc.id === "number") locationById.set(loc.id, loc)
  }
  // Schedule rows embed the location record, which lets the map work even
  // when the locations request is still loading or a stop was deleted.
  for (const row of schedules ?? []) {
    for (const addon of [row._expedition_current_location, row._expedition_destination_location]) {
      const id = toNumber(addon?.id)
      if (addon && id && !locationById.has(id)) locationById.set(id, addon as LocationLike)
    }
  }

  const rows: Row[] = (schedules ?? [])
    .filter((r) => typeof r.date === "string" && r.date.length >= 10)
    .map((r) => ({ ...r, date: r.date!.slice(0, 10) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const rowIndex = new Map<string, number>()
  for (const row of rows) {
    if (!rowIndex.has(row.date)) rowIndex.set(row.date, rowIndex.size)
  }

  // Route order: destinations in the order the itinerary reaches them, with an
  // offshore day's destination slotted in before the boat arrives there.
  const order: number[] = []
  const seen = new Set<number>()
  const push = (id: number | null) => {
    if (id && locationById.has(id) && !seen.has(id)) {
      seen.add(id)
      order.push(id)
    }
  }
  for (const row of rows) {
    push(locationIdOf(row, "current"))
    if (isOffshore(row)) push(locationIdOf(row, "destination"))
  }
  const scheduledCount = order.length
  for (const id of locationById.keys()) push(id)

  // Days spent at each stop, and days spent sailing towards it.
  const daysAt = new Map<number, string[]>()
  const daysTowards = new Map<number, string[]>()
  const record = (map: Map<number, string[]>, id: number | null, date: string) => {
    if (!id) return
    const list = map.get(id) ?? []
    if (list[list.length - 1] !== date) list.push(date)
    map.set(id, list)
  }
  for (const row of rows) {
    record(daysAt, locationIdOf(row, "current"), row.date)
    if (isOffshore(row)) record(daysTowards, locationIdOf(row, "destination"), row.date)
  }

  // Chronological visits: consecutive distinct locations with their arrival
  // date. A final offshore leg whose destination never gets its own row is
  // appended as an arrival-less visit so the line still reaches it.
  const visits: Array<{ id: number; arrival: string | null }> = []
  for (const row of rows) {
    const id = locationIdOf(row, "current")
    if (id && locationById.has(id) && visits[visits.length - 1]?.id !== id) {
      visits.push({ id, arrival: row.date })
    }
  }
  const lastRow = rows[rows.length - 1]
  if (lastRow && isOffshore(lastRow)) {
    const dest = locationIdOf(lastRow, "destination")
    if (dest && locationById.has(dest) && visits[visits.length - 1]?.id !== dest) {
      visits.push({ id: dest, arrival: null })
    }
  }

  const firstDate = rows[0]?.date ?? null
  const lastDate = rows[rows.length - 1]?.date ?? null

  let phase: ExpeditionPhase = "no-schedule"
  if (firstDate && lastDate) {
    phase = today < firstDate ? "before" : today > lastDate ? "after" : "during"
  }

  // Today's row, or the most recent row on or before today.
  let referenceRow: Row | null = null
  if (phase === "during") {
    for (const row of rows) {
      if (row.date <= today) referenceRow = row
      else break
    }
  }
  const currentId = referenceRow ? locationIdOf(referenceRow, "current") : null

  const stops: RouteStop[] = order.map((id, index) => {
    const loc = locationById.get(id)!
    const dates = daysAt.get(id) ?? []
    const towards = daysTowards.get(id) ?? []
    const coords = resolveCoordinates(loc)
    const ranges = toRanges(dates, rowIndex)
    let status: StopStatus
    if (index >= scheduledCount || (dates.length === 0 && towards.length === 0)) {
      status = "unscheduled"
    } else if (phase === "after") {
      status = "visited"
    } else if (phase === "before") {
      status = "upcoming"
    } else if (id === currentId) {
      status = "current"
    } else if (ranges.some((r) => r.end < today)) {
      status = "visited"
    } else if (dates.length === 0 && towards[towards.length - 1] < today) {
      status = "visited"
    } else {
      status = "upcoming"
    }
    return {
      id,
      index,
      port: loc.port ?? "Unknown port",
      country: loc.country ?? "",
      lng: coords?.lng ?? null,
      lat: coords?.lat ?? null,
      status,
      dateRanges: ranges,
      firstDate: dates[0] ?? null,
      lastDate: dates[dates.length - 1] ?? null,
    }
  })

  const stopById = new Map(stops.map((s) => [s.id, s]))

  let current: CurrentPosition | null = null
  if (referenceRow && currentId && stopById.has(currentId)) {
    const stop = stopById.get(currentId)!
    const refDate = referenceRow.date
    const range =
      stop.dateRanges.find((r) => r.start <= today && today <= r.end) ??
      stop.dateRanges.find((r) => r.start <= refDate && refDate <= r.end) ??
      { start: refDate, end: refDate }
    const underway = isOffshore(referenceRow)
    let next: RouteStop | null = null
    let nextDate: string | null = null
    const destinationId = underway ? locationIdOf(referenceRow, "destination") : null
    if (destinationId && stopById.has(destinationId) && destinationId !== currentId) {
      next = stopById.get(destinationId)!
      nextDate = next.dateRanges.find((r) => r.start > today)?.start ?? next.firstDate
    } else {
      for (const row of rows) {
        if (row.date <= today) continue
        const id = locationIdOf(row, "current")
        if (id && id !== currentId && stopById.has(id)) {
          next = stopById.get(id)!
          nextDate = row.date
          break
        }
      }
    }
    current = { stop, range, underway, next, nextDate }
  }

  const isMappable = (s: RouteStop) => s.lng !== null && s.lat !== null && s.status !== "unscheduled"
  const mappable = stops.filter(isMappable)

  // Legs between consecutive mappable visits. Stops without coordinates are
  // skipped so the line stays connected around them.
  const mappableVisits = visits.filter((v) => {
    const s = stopById.get(v.id)
    return s && isMappable(s)
  })
  const segments: RouteSegment[] = []
  let activeAssigned = false
  for (let i = 0; i < mappableVisits.length - 1; i++) {
    const from = stopById.get(mappableVisits[i].id)!
    const to = stopById.get(mappableVisits[i + 1].id)!
    const arrival = mappableVisits[i + 1].arrival
    let status: RouteSegment["status"]
    if (phase === "after" || (arrival !== null && arrival <= today)) {
      status = "sailed"
    } else if (phase === "during" && current?.underway && from.id === current.stop.id && !activeAssigned) {
      status = "active"
      activeAssigned = true
    } else {
      status = "planned"
    }
    segments.push({ from, to, status })
  }

  return { stops, mappable, segments, current, phase, firstDate, lastDate }
}

/** "Oct 12" / "Oct 12 – Oct 15" / "Oct 30 – Nov 2" style label for a range. */
export function formatDateRange(range: DateRange): string {
  const fmt = (date: string) => {
    const [y, m, d] = date.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  return range.start === range.end ? fmt(range.start) : `${fmt(range.start)} – ${fmt(range.end)}`
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return ""
  return formatDateRange({ start: date, end: date })
}
