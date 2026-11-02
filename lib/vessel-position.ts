/**
 * Shapes returned by GET /vessel_position (Expedition App API group) and a
 * helper that turns them into one "where is the boat" answer.
 *
 * The boat's SignalK feed writes to `vessel_telemetry` (one row per fix) and
 * mirrors the newest values onto `vessels.last_*`. Either can be missing:
 * the vessel row exists before the first fix, with 0/0 coordinates, so a
 * 0/0 pair is treated as "no position yet" rather than a point off Africa.
 */

export type VesselState = "underway" | "anchored" | "docked" | "unknown"

export interface VesselRecord {
  id: number
  name?: string
  is_active?: boolean
  last_seen_at?: number | null
  last_lat?: number | null
  last_lng?: number | null
  last_sog_kn?: number | null
  last_cog_deg?: number | null
  last_heading_deg?: number | null
  last_state?: VesselState | null
  last_telemetry_ts?: number | null
}

export interface VesselTelemetryRow {
  id: number
  vessels_id: number
  ts: number
  lat: number
  lng: number
  sog_kn?: number | null
  cog_deg?: number | null
  heading_deg?: number | null
  wind_speed_true_kn?: number | null
  wind_angle_true_deg?: number | null
  depth_m?: number | null
  water_temp_c?: number | null
  state?: VesselState | null
}

export interface VesselPositionResponse {
  expedition: { id: number; name?: string; vessels_id?: number | null } | null
  vessel: VesselRecord | null
  latest: VesselTelemetryRow | null
  /** Most recent fixes, newest first. */
  track: VesselTelemetryRow[]
}

export interface VesselPosition {
  lat: number
  lng: number
  /** Epoch milliseconds of the fix. */
  ts: number | null
  speedKn: number | null
  courseDeg: number | null
  headingDeg: number | null
  state: VesselState
  source: "telemetry" | "vessel"
}

export interface VesselStatus {
  vessel: VesselRecord | null
  position: VesselPosition | null
  /** Epoch milliseconds the boat last reported anything, even without a fix. */
  lastSeenAt: number | null
  /** [lng, lat] pairs oldest → newest, for a track line on the map. */
  track: Array<[number, number]>
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

/** A fix is usable when both coordinates are finite and not the 0/0 placeholder. */
export function isUsableFix(lat: unknown, lng: unknown): boolean {
  const la = num(lat)
  const ln = num(lng)
  if (la === null || ln === null) return false
  if (la === 0 && ln === 0) return false
  return la >= -90 && la <= 90 && ln >= -180 && ln <= 180
}

export function resolveVesselStatus(data: VesselPositionResponse | null | undefined): VesselStatus {
  const vessel = data?.vessel ?? null
  const latest = data?.latest ?? null

  // The newest telemetry row and the vessel's mirrored last_* fields can
  // disagree: the heartbeat keeps last_* current even when no new row is
  // written, so whichever fix is newer wins (the vessel row on a tie).
  let fromTelemetry: VesselPosition | null = null
  if (latest && isUsableFix(latest.lat, latest.lng)) {
    fromTelemetry = {
      lat: num(latest.lat)!,
      lng: num(latest.lng)!,
      ts: num(latest.ts),
      speedKn: num(latest.sog_kn),
      courseDeg: num(latest.cog_deg),
      headingDeg: num(latest.heading_deg),
      state: latest.state ?? "unknown",
      source: "telemetry",
    }
  }
  let fromVessel: VesselPosition | null = null
  if (vessel && isUsableFix(vessel.last_lat, vessel.last_lng)) {
    fromVessel = {
      lat: num(vessel.last_lat)!,
      lng: num(vessel.last_lng)!,
      ts: num(vessel.last_telemetry_ts) ?? num(vessel.last_seen_at),
      speedKn: num(vessel.last_sog_kn),
      courseDeg: num(vessel.last_cog_deg),
      headingDeg: num(vessel.last_heading_deg),
      state: vessel.last_state ?? "unknown",
      source: "vessel",
    }
  }
  let position: VesselPosition | null = fromTelemetry ?? fromVessel
  if (fromTelemetry && fromVessel && (fromVessel.ts ?? 0) >= (fromTelemetry.ts ?? 0)) {
    position = fromVessel
  }

  const track: Array<[number, number]> = []
  for (const row of [...(data?.track ?? [])].reverse()) {
    if (isUsableFix(row.lat, row.lng)) track.push([num(row.lng)!, num(row.lat)!])
  }

  // End the trail at the boat itself when the newest fix is not a track row yet.
  if (position) {
    const end = track[track.length - 1]
    if (!end || end[0] !== position.lng || end[1] !== position.lat) track.push([position.lng, position.lat])
  }

  const lastSeenAt = num(vessel?.last_seen_at) ?? num(latest?.ts) ?? null

  return { vessel, position, lastSeenAt, track }
}

export const VESSEL_STATE_LABEL: Record<VesselState, string> = {
  underway: "Underway",
  anchored: "Anchored",
  docked: "Docked",
  unknown: "Status unknown",
}

/** The boat reports at least every 10 minutes, so an hour of silence means the feed has dropped. */
export const VESSEL_STALE_AFTER_MS = 60 * 60 * 1000

export function isFixStale(position: VesselPosition, now: number = Date.now()): boolean {
  return position.ts === null || now - position.ts > VESSEL_STALE_AFTER_MS
}

/**
 * Wording for the stop marked current. Without a fix that stop is only what
 * the itinerary says, so it must not claim the boat is there.
 */
export function currentStopLabel(position: VesselPosition | null | undefined): string {
  if (!position) return "Scheduled here"
  return isFixStale(position) ? "Last seen here" : "You are here"
}

/** "12.3456° N, 61.2345° W" */
export function formatCoordinates(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S"
  const ew = lng >= 0 ? "E" : "W"
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`
}
