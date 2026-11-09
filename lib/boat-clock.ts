/**
 * The boat's clock: what day and time it is where the vessel actually is, not where the
 * person looking at the app is sitting.
 *
 * Each expedition_schedule row names the day's current location, and expedition_locations
 * carry a UTC offset label such as "UTC−4" (the picker writes a Unicode minus). Given the
 * expedition's schedule rows this derives the offset for a day, and from that the boat's
 * local date and HHMM time. Pure functions only; the hook in lib/hooks/use-boat-clock.ts
 * keeps them ticking.
 */

export interface BoatClock {
  /** Hours east of UTC, e.g. -4 for the Eastern Caribbean; fractional for half-hour zones. */
  offsetHours: number
  /** The label the offset came from ("UTC−4"), or null when falling back to the browser. */
  timezoneLabel: string | null
  /** "YYYY-MM-DD" on the boat. */
  date: string
  /** Boat-local time as HHMM, the same shape schedule items use for time_in / time_out. */
  military: number
  /** Where the offset came from: the day's location, or the viewer's browser when no location has one. */
  source: "location" | "browser"
}

/** Parses "UTC−4", "UTC-4", "UTC+5:30", "UTC±0" or "GMT-4" into hours; null when unreadable. */
export function parseUtcOffsetHours(label: string | null | undefined): number | null {
  if (!label) return null
  const m = String(label).trim().match(/^(?:UTC|GMT)\s*([+\-−–±]?)\s*(\d{1,2})(?::?([0-5]\d))?$/i)
  if (!m) return null
  const sign = m[1] === "-" || m[1] === "−" || m[1] === "–" ? -1 : 1
  const hours = Number(m[2]) + (m[3] ? Number(m[3]) / 60 : 0)
  if (hours > 14) return null
  return sign * hours
}

function rowDate(row: any): string | null {
  const d = row?.date
  return typeof d === "string" && d.length >= 10 ? d.slice(0, 10) : null
}

function rowTimezone(row: any): string | null {
  const tz = row?._expedition_current_location?.timezone ?? row?._expedition_locations?.timezone
  return typeof tz === "string" && tz.trim() ? tz.trim() : null
}

/**
 * The timezone label in force on `date`: that day's location, else the most recent earlier
 * day with one (the boat stays where it last was), else the first scheduled day with one.
 */
export function timezoneLabelForDate(schedules: any[] | null | undefined, date: string): string | null {
  const rows = (schedules ?? [])
    .map((r) => ({ date: rowDate(r), tz: rowTimezone(r) }))
    .filter((r): r is { date: string; tz: string } => Boolean(r.date && r.tz))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  if (rows.length === 0) return null
  let before: string | null = null
  for (const r of rows) {
    if (r.date === date) return r.tz
    if (r.date < date) before = r.tz
    else break
  }
  return before ?? rows[0].tz
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

/** Local date and HHMM at a fixed UTC offset, using UTC getters so the browser's zone plays no part. */
export function dateAndTimeAtOffset(now: Date, offsetHours: number): { date: string; military: number } {
  const shifted = new Date(now.getTime() + offsetHours * 3_600_000)
  const date = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
  return { date, military: shifted.getUTCHours() * 100 + shifted.getUTCMinutes() }
}

function browserClock(now: Date): BoatClock {
  return {
    offsetHours: -now.getTimezoneOffset() / 60,
    timezoneLabel: null,
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    military: now.getHours() * 100 + now.getMinutes(),
    source: "browser",
  }
}

/**
 * The boat's clock right now, from the expedition's schedule rows. The day's offset depends on
 * the day, and the day depends on the offset, so it looks up the zone for the browser's date,
 * computes the boat's date, and re-checks once in case the boat is already on the next day.
 */
export function boatClock(schedules: any[] | null | undefined, now: Date = new Date()): BoatClock {
  const fallback = browserClock(now)
  let label = timezoneLabelForDate(schedules, fallback.date)
  let offset = parseUtcOffsetHours(label)
  if (offset === null) return fallback
  let local = dateAndTimeAtOffset(now, offset)
  if (local.date !== fallback.date) {
    const relabel = timezoneLabelForDate(schedules, local.date)
    const reoffset = parseUtcOffsetHours(relabel)
    if (reoffset !== null && reoffset !== offset) {
      label = relabel
      offset = reoffset
      local = dateAndTimeAtOffset(now, offset)
    }
  }
  return { offsetHours: offset, timezoneLabel: label, date: local.date, military: local.military, source: "location" }
}
