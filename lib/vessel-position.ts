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

  let position: VesselPosition | null = null
  if (latest && isUsableFix(latest.lat, latest.lng)) {
    position = {
      lat: num(latest.lat)!,
      lng: num(latest.lng)!,
      ts: num(latest.ts),
      speedKn: num(latest.sog_kn),
      courseDeg: num(latest.cog_deg),
      headingDeg: num(latest.heading_deg),
      state: latest.state ?? "unknown",
      source: "telemetry",
    }
  } else if (vessel && isUsableFix(vessel.last_lat, vessel.last_lng)) {
    position = {
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

  const track: Array<[number, number]> = []
  for (const row of [...(data?.track ?? [])].reverse()) {
    if (isUsableFix(row.lat, row.lng)) track.push([num(row.lng)!, num(row.lat)!])
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

/** "12.3456° N, 61.2345° W" */
export function formatCoordinates(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S"
  const ew = lng >= 0 ? "E" : "W"
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`
}
