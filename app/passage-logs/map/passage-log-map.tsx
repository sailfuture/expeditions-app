"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface MapPoint {
  id: number
  lat: number
  lng: number
  date?: string
  hrs?: number
  min?: number
  departure_location_name?: string
  destination_location_name?: string
  expeditions_id?: number
  [key: string]: any
}

interface PassageLogMapProps {
  points: MapPoint[]
  onMarkerClick: (point: MapPoint) => void
}

export default function PassageLogMap({ points, onMarkerClick }: PassageLogMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const polylinesRef = useRef<L.Polyline[]>([])

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [25.0, -77.0], // Default to Caribbean area
      zoom: 6,
      zoomControl: true,
    })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    markersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update markers when points change
  useEffect(() => {
    const map = mapRef.current
    const markers = markersRef.current
    if (!map || !markers) return

    // Clear existing
    markers.clearLayers()
    polylinesRef.current.forEach(pl => pl.remove())
    polylinesRef.current = []

    if (points.length === 0) return

    // Create custom icon
    const createIcon = (index: number, total: number) => {
      const isFirst = index === 0
      const isLast = index === total - 1
      const color = isFirst ? "#22c55e" : isLast ? "#ef4444" : "#1e3a5f"
      const size = isFirst || isLast ? 14 : 10

      return L.divIcon({
        className: "custom-marker",
        html: `<div style="
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
          cursor: pointer;
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
    }

    // Add markers
    points.forEach((point, index) => {
      const marker = L.marker([point.lat, point.lng], {
        icon: createIcon(index, points.length),
      })

      const dateStr = point.date || "No date"
      const timeStr = point.hrs !== undefined
        ? `${String(point.hrs).padStart(2, "0")}:${String(point.min).padStart(2, "0")}`
        : ""

      marker.bindTooltip(
        `<div style="font-size: 12px; line-height: 1.4;">
          <strong>Log #${point.id}</strong><br/>
          ${dateStr}${timeStr ? ` at ${timeStr}` : ""}<br/>
          ${point.departure_location_name ? `From: ${point.departure_location_name}` : ""}
          ${point.destination_location_name ? `<br/>To: ${point.destination_location_name}` : ""}
        </div>`,
        { direction: "top", offset: [0, -8] }
      )

      marker.on("click", () => onMarkerClick(point))
      markers.addLayer(marker)
    })

    // Draw route lines per expedition (so lines don't jump between expeditions)
    if (points.length > 1) {
      const expeditionGroups = new Map<number | string, MapPoint[]>()
      points.forEach(p => {
        const key = p.expeditions_id || "unknown"
        if (!expeditionGroups.has(key)) expeditionGroups.set(key, [])
        expeditionGroups.get(key)!.push(p)
      })

      const colors = ["#1e3a5f", "#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"]
      let colorIdx = 0

      expeditionGroups.forEach((groupPoints) => {
        if (groupPoints.length > 1) {
          const coords: L.LatLngExpression[] = groupPoints.map(p => [p.lat, p.lng])
          const polyline = L.polyline(coords, {
            color: colors[colorIdx % colors.length],
            weight: 2.5,
            opacity: 0.7,
          }).addTo(map)
          polylinesRef.current.push(polyline)
          colorIdx++
        }
      })
    }

    // Fit bounds to show all points
    const group = L.featureGroup(
      points.map(p => L.marker([p.lat, p.lng]))
    )
    map.fitBounds(group.getBounds().pad(0.15), { maxZoom: 12 })
  }, [points, onMarkerClick])

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full min-h-[calc(100vh-80px)]"
      style={{ zIndex: 0 }}
    />
  )
}
