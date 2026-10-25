"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { ExpeditionRoute, RouteStop } from "@/lib/expedition-route"
import { formatDateRange } from "@/lib/expedition-route"
import type { VesselPosition } from "@/lib/vessel-position"
import { VESSEL_STATE_LABEL, formatCoordinates } from "@/lib/vessel-position"

interface ExpeditionRouteMapProps {
  token: string
  route: ExpeditionRoute
  /** Stop to fly to and open; changes are animated. */
  selectedStopId?: number | null
  onSelectStop?: (stop: RouteStop) => void
  /** Live position of the boat; null/undefined hides the boat marker. */
  vessel?: VesselPosition | null
  /** Recent fixes as [lng, lat] pairs, oldest → newest, drawn as a trail behind the boat. */
  vesselTrack?: Array<[number, number]>
  vesselName?: string
  className?: string
}

const ROUTE_SOURCE = "expedition-route"
const SAILED_LAYER = "expedition-route-sailed"
const ACTIVE_LAYER = "expedition-route-active"
const PLANNED_LAYER = "expedition-route-planned"
const TRACK_SOURCE = "vessel-track"
const TRACK_LAYER = "vessel-track-line"

// Custom dark SailFuture style; swap here if the style is republished.
export const MAP_STYLE = "mapbox://styles/hunterrthompson/cmvmvcpww007l01s68ouqhexa"

// White lines on the dark satellite basemap; the leg types differ by dash and
// opacity rather than colour. Only the current position is green.
const COLORS = {
  sailed: "#ffffff",
  active: "#ffffff",
  planned: "#ffffff",
  track: "#ffffff",
}

// The style imports Mapbox Standard Satellite with the "night" light preset,
// which shades added layers like the basemap. Full emissive strength keeps
// the route lines at their true colour instead of dimming them to navy.
const EMISSIVE = { "line-emissive-strength": 1 } as const

// Marker elements are <button>s for keyboard access; the app's global button
// hover background must not paint a square behind the round badge.
const MARKER_BUTTON_RESET = "bg-transparent hover:bg-transparent border-0 p-0"

// Shared popup options. The class hooks the round close button styles in
// app/globals.css; focusAfterOpen is off so opening a popup does not put a
// focus outline on its close button.
const POPUP_OPTIONS = { className: "expedition-map-popup", focusAfterOpen: false, maxWidth: "260px" } as const

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function popupHtml(stop: RouteStop, route: ExpeditionRoute): string {
  const isCurrent = stop.status === "current"
  const current = isCurrent ? route.current : null
  const title = isCurrent ? (current?.underway ? "Departed from here" : "You are here") : null
  const ranges = stop.dateRanges.length
    ? stop.dateRanges.map((r) => `<li>${escapeHtml(formatDateRange(r))}</li>`).join("")
    : "<li>Not on the itinerary yet</li>"
  const statusLabel: Record<RouteStop["status"], string> = {
    visited: "Visited",
    current: current?.underway ? "Underway" : "Current stop",
    upcoming: "Upcoming",
    unscheduled: "Unscheduled",
  }
  const nextLine =
    isCurrent && current?.next
      ? `<p class="mt-2 text-xs text-gray-600">Next: <strong>${escapeHtml(current.next.port)}</strong>${
          current.nextDate ? ` · ${escapeHtml(formatDateRange({ start: current.nextDate, end: current.nextDate }))}` : ""
        }</p>`
      : ""
  return `
    <div class="min-w-[180px] text-sm text-gray-900">
      ${title ? `<div class="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">${title}</div>` : ""}
      <div class="pr-5 font-semibold leading-tight">${escapeHtml(stop.port)}</div>
      <div class="text-xs text-gray-500">${escapeHtml(stop.country)}</div>
      <div class="mt-2 text-[11px] uppercase tracking-wide text-gray-400">${statusLabel[stop.status]}</div>
      <ul class="mt-0.5 text-xs text-gray-700 space-y-0.5">${ranges}</ul>
      ${nextLine}
    </div>
  `
}

function vesselPopupHtml(vessel: VesselPosition, name?: string): string {
  const when = vessel.ts ? new Date(vessel.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null
  const facts: string[] = []
  if (vessel.speedKn !== null) facts.push(`${vessel.speedKn.toFixed(1)} kn`)
  if (vessel.courseDeg !== null) facts.push(`COG ${Math.round(vessel.courseDeg)}°`)
  else if (vessel.headingDeg !== null) facts.push(`HDG ${Math.round(vessel.headingDeg)}°`)
  return `
    <div class="min-w-[180px] text-sm text-gray-900">
      <div class="mb-1 inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white">Live position</div>
      <div class="pr-5 font-semibold leading-tight">${escapeHtml(name ?? "Vessel")}</div>
      <div class="text-xs text-gray-500">${escapeHtml(VESSEL_STATE_LABEL[vessel.state])}${facts.length ? ` · ${escapeHtml(facts.join(" · "))}` : ""}</div>
      <div class="mt-1 text-xs text-gray-700">${escapeHtml(formatCoordinates(vessel.lat, vessel.lng))}</div>
      ${when ? `<div class="mt-0.5 text-[11px] text-gray-400">Reported ${escapeHtml(when)}</div>` : ""}
    </div>
  `
}

function markerElement(stop: RouteStop): HTMLElement {
  const el = document.createElement("button")
  el.type = "button"
  el.setAttribute("aria-label", `${stop.index + 1}. ${stop.port}, ${stop.country}`)
  el.className = `relative flex items-center justify-center cursor-pointer focus:outline-none ${MARKER_BUTTON_RESET}`

  const badge = document.createElement("span")
  badge.textContent = String(stop.index + 1)
  const base =
    "flex items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-md transition-transform hover:scale-110"

  if (stop.status === "current") {
    el.className += " h-10 w-10"
    const ring = document.createElement("span")
    ring.className = "absolute inset-0 rounded-full bg-emerald-400/60 animate-ping"
    el.appendChild(ring)
    badge.className = `${base} relative h-9 w-9 border-white bg-emerald-600 text-white text-xs`
  } else if (stop.status === "visited") {
    el.className += " h-7 w-7"
    badge.className = `${base} h-7 w-7 border-slate-400 bg-slate-200 text-slate-800`
  } else {
    el.className += " h-7 w-7"
    badge.className = `${base} h-7 w-7 border-slate-500 bg-slate-800 text-slate-200`
  }
  el.appendChild(badge)
  return el
}

/**
 * Boat icon for the live position: a pulsing halo around a sky-blue disc
 * with a bow-shaped arrow that the marker rotates to the boat's heading.
 */
function vesselElement(name: string): HTMLElement {
  const el = document.createElement("button")
  el.type = "button"
  el.setAttribute("aria-label", `${name}: live position`)
  el.className = `relative flex h-12 w-12 items-center justify-center cursor-pointer focus:outline-none ${MARKER_BUTTON_RESET}`

  const ring = document.createElement("span")
  ring.className = "absolute inset-1 rounded-full bg-sky-400/50 animate-ping"
  el.appendChild(ring)

  const disc = document.createElement("span")
  disc.className = "relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-sky-600 shadow-lg"
  disc.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="white" aria-hidden="true">' +
    '<path d="M12 2.5c1.6 2.3 3.2 5.6 3.2 9.4 0 2.6-.5 4.9-1.2 6.6h-4c-.7-1.7-1.2-4-1.2-6.6 0-3.8 1.6-7.1 3.2-9.4z"/>' +
    '<path d="M7.2 19.5h9.6l-1 2.2H8.2z" opacity="0.9"/>' +
    "</svg>"
  el.appendChild(disc)
  return el
}

function routeGeoJson(route: ExpeditionRoute): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: route.segments.map((segment) => ({
      type: "Feature",
      properties: { status: segment.status },
      geometry: {
        type: "LineString",
        coordinates: [
          [segment.from.lng!, segment.from.lat!],
          [segment.to.lng!, segment.to.lat!],
        ],
      },
    })),
  }
}

function trackGeoJson(track: Array<[number, number]>): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features:
      track.length >= 2
        ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: track } }]
        : [],
  }
}

export default function ExpeditionRouteMap({
  token,
  route,
  selectedStopId,
  onSelectStop,
  vessel,
  vesselTrack,
  vesselName,
  className,
}: ExpeditionRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map())
  const vesselMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const fittedKeyRef = useRef<string>("")
  const onSelectRef = useRef(onSelectStop)
  const routeRef = useRef(route)
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    onSelectRef.current = onSelectStop
  }, [onSelectStop])

  useEffect(() => {
    routeRef.current = route
  }, [route])

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-64.5, 16.5],
      zoom: 5,
      attributionControl: true,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right")
    map.addControl(new mapboxgl.FullscreenControl(), "top-right")

    map.on("load", () => {
      map.addSource(ROUTE_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })
      map.addLayer({
        id: PLANNED_LAYER,
        type: "line",
        source: ROUTE_SOURCE,
        filter: ["==", ["get", "status"], "planned"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { ...EMISSIVE, "line-color": COLORS.planned, "line-width": 2.5, "line-dasharray": [2, 2], "line-opacity": 0.55 },
      })
      map.addLayer({
        id: SAILED_LAYER,
        type: "line",
        source: ROUTE_SOURCE,
        filter: ["==", ["get", "status"], "sailed"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { ...EMISSIVE, "line-color": COLORS.sailed, "line-width": 3.5 },
      })
      map.addLayer({
        id: ACTIVE_LAYER,
        type: "line",
        source: ROUTE_SOURCE,
        filter: ["==", ["get", "status"], "active"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { ...EMISSIVE, "line-color": COLORS.active, "line-width": 4, "line-dasharray": [1, 1.5] },
      })
      map.addSource(TRACK_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })
      map.addLayer({
        id: TRACK_LAYER,
        type: "line",
        source: TRACK_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { ...EMISSIVE, "line-color": COLORS.track, "line-width": 2.5, "line-opacity": 0.7 },
      })
      setIsReady(true)
    })
    map.on("error", (event) => {
      const status = (event.error as { status?: number } | undefined)?.status
      if (status === 401 || status === 403) {
        setLoadError("Mapbox rejected the token. Check NEXT_PUBLIC_MAPBOX_TOKEN and its URL restrictions.")
      }
    })

    mapRef.current = map

    // This mapbox-gl build only resizes on window resize. Cards that stretch
    // after first paint (e.g. next to a taller schedule card) would leave the
    // canvas at its initial height, so follow the container's size instead.
    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      markersRef.current.forEach((m) => m.remove())
      markersRef.current.clear()
      vesselMarkerRef.current?.remove()
      vesselMarkerRef.current = null
      map.remove()
      mapRef.current = null
      setIsReady(false)
    }
    // The token is read once; changing it requires a remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync the route line and the markers whenever the route changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady) return

    const source = map.getSource(ROUTE_SOURCE) as mapboxgl.GeoJSONSource | undefined
    source?.setData(routeGeoJson(route))

    markersRef.current.forEach((m) => m.remove())
    markersRef.current.clear()

    for (const stop of route.mappable) {
      const popup = new mapboxgl.Popup({ ...POPUP_OPTIONS, offset: stop.status === "current" ? 22 : 16 })
        .setHTML(popupHtml(stop, route))
      const element = markerElement(stop)
      element.addEventListener("click", () => onSelectRef.current?.(stop))
      const marker = new mapboxgl.Marker({ element, anchor: "center" })
        .setLngLat([stop.lng!, stop.lat!])
        .setPopup(popup)
        .addTo(map)
      markersRef.current.set(stop.id, marker)
    }

    // Keep the current stop's popup open so "You are here" reads at a glance,
    // unless the live boat marker already answers that question.
    const currentId = route.current?.stop.id
    if (!vessel && currentId && markersRef.current.has(currentId)) {
      const marker = markersRef.current.get(currentId)!
      if (!marker.getPopup()?.isOpen()) marker.togglePopup()
    }

    // Fit to the route (and the boat) the first time this set of points shows up.
    const key = route.mappable.map((s) => s.id).join(",") + (vessel ? "|vessel" : "")
    if (key && key !== fittedKeyRef.current) {
      fittedKeyRef.current = key
      const points: Array<[number, number]> = route.mappable.map((s) => [s.lng!, s.lat!])
      if (vessel) points.push([vessel.lng, vessel.lat])
      if (points.length === 1) {
        map.jumpTo({ center: points[0], zoom: 8 })
      } else if (points.length > 1) {
        const bounds = new mapboxgl.LngLatBounds()
        for (const p of points) bounds.extend(p)
        map.fitBounds(bounds, { padding: { top: 80, bottom: 60, left: 60, right: 60 }, maxZoom: 9, duration: 0 })
      }
    }
    // `vessel` only matters here for the initial fit and the popup default.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, isReady])

  // Sync the live boat marker and its trail.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady) return

    const trackSource = map.getSource(TRACK_SOURCE) as mapboxgl.GeoJSONSource | undefined
    trackSource?.setData(trackGeoJson(vesselTrack ?? []))

    if (!vessel) {
      vesselMarkerRef.current?.remove()
      vesselMarkerRef.current = null
      return
    }

    const name = vesselName ?? "Vessel"
    const rotation = vessel.headingDeg ?? vessel.courseDeg ?? 0
    let marker = vesselMarkerRef.current
    if (!marker) {
      marker = new mapboxgl.Marker({
        element: vesselElement(name),
        anchor: "center",
        rotationAlignment: "map",
        pitchAlignment: "map",
      })
        .setLngLat([vessel.lng, vessel.lat])
        .setPopup(new mapboxgl.Popup({ ...POPUP_OPTIONS, offset: 24 }).setHTML(vesselPopupHtml(vessel, name)))
        .addTo(map)
      vesselMarkerRef.current = marker
      if (!marker.getPopup()?.isOpen()) marker.togglePopup()
      // First fix: bring the boat into view alongside the route.
      const bounds = new mapboxgl.LngLatBounds([vessel.lng, vessel.lat], [vessel.lng, vessel.lat])
      for (const stop of routeRef.current.mappable) bounds.extend([stop.lng!, stop.lat!])
      map.fitBounds(bounds, { padding: { top: 80, bottom: 60, left: 60, right: 60 }, maxZoom: 9, duration: 600 })
    } else {
      marker.setLngLat([vessel.lng, vessel.lat])
      marker.getPopup()?.setHTML(vesselPopupHtml(vessel, name))
    }
    marker.setRotation(rotation)
  }, [vessel, vesselTrack, vesselName, isReady])

  // Fly to a stop picked from the list.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady || !selectedStopId) return
    const marker = markersRef.current.get(selectedStopId)
    if (!marker) return
    map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), 8), duration: 900 })
    markersRef.current.forEach((m, id) => {
      const open = m.getPopup()?.isOpen() ?? false
      if (id === selectedStopId ? !open : open) m.togglePopup()
    })
  }, [selectedStopId, isReady])

  return (
    <div className={className}>
      <div ref={containerRef} className="h-full w-full" />
      {loadError && (
        <div className="absolute inset-x-0 top-0 m-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow">
          {loadError}
        </div>
      )}
    </div>
  )
}
