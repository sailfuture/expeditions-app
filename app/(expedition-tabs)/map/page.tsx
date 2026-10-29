"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { MapPinOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useExpeditions, useExpeditionLocations, useExpeditionSchedules } from "@/lib/hooks/use-expeditions"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import { buildExpeditionRoute, formatDate, formatDateRange, type RouteStop } from "@/lib/expedition-route"
import { cn } from "@/lib/utils"

// mapbox-gl touches `window` at import time, so it must never render on the server.
const ExpeditionRouteMap = dynamic(() => import("@/components/expedition-route-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
})

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

const STATUS_BADGE: Record<RouteStop["status"], { label: string; className: string }> = {
  visited: { label: "Visited", className: "bg-gray-100 text-gray-700 border-gray-200" },
  current: { label: "You are here", className: "bg-emerald-600 text-white border-emerald-600" },
  upcoming: { label: "Upcoming", className: "bg-white text-slate-700 border-slate-300" },
  unscheduled: { label: "Not scheduled", className: "bg-gray-50 text-gray-500 border-gray-200" },
}

function MissingTokenPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
      <MapPinOff className="h-10 w-10 text-slate-400" />
      <div>
        <p className="font-medium text-slate-800">Map unavailable: no Mapbox token configured</p>
        <p className="mt-1 max-w-md text-sm text-slate-600">
          Add a public Mapbox token to <code className="rounded bg-slate-200 px-1">.env.local</code> as{" "}
          <code className="rounded bg-slate-200 px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> and restart the dev server.
          Tokens are created at{" "}
          <a
            className="underline"
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noreferrer"
          >
            account.mapbox.com
          </a>
          .
        </p>
      </div>
    </div>
  )
}

function RouteMapContent() {
  const searchParams = useSearchParams()
  const expeditionIdFromUrl = searchParams.get("expedition") ? parseInt(searchParams.get("expedition")!, 10) : null

  const { selectedExpedition, selectedExpeditionId, activeExpedition, userExpeditions } = useExpeditionContext()
  const expeditionId = expeditionIdFromUrl || activeExpedition?.id || selectedExpeditionId || null
  const { data: allExpeditions } = useExpeditions()

  const expedition = useMemo(() => {
    if (expeditionIdFromUrl) {
      return (
        allExpeditions?.find((e: any) => e.id === expeditionIdFromUrl) ??
        userExpeditions?.find((e: any) => e.id === expeditionIdFromUrl) ??
        null
      )
    }
    return activeExpedition || selectedExpedition || null
  }, [expeditionIdFromUrl, allExpeditions, userExpeditions, activeExpedition, selectedExpedition])

  const { data: schedules, isLoading: loadingSchedules, error: schedulesError } = useExpeditionSchedules(
    expeditionId || undefined
  )
  const { data: locations, isLoading: loadingLocations, error: locationsError } = useExpeditionLocations(
    expeditionId || undefined
  )

  // Strictly one expedition: without a resolved id nothing is plotted, and
  // records are filtered by expeditions_id in case the endpoint returns more.
  const route = useMemo(() => {
    if (!expeditionId) return buildExpeditionRoute([], [])
    const belongs = (r: any) => r?.expeditions_id == null || r.expeditions_id === expeditionId
    return buildExpeditionRoute((locations ?? []).filter(belongs), (schedules ?? []).filter(belongs))
  }, [locations, schedules, expeditionId])

  const [selectedStopId, setSelectedStopId] = useState<number | null>(null)
  // Switching expeditions drops the selection so the map refits to the new route.
  useEffect(() => {
    setSelectedStopId(null)
  }, [expeditionId])

  const isLoading = Boolean(expeditionId) && (loadingSchedules || loadingLocations) && !schedules && !locations
  const error = schedulesError || locationsError
  const hasToken = MAPBOX_TOKEN.length > 0
  const unmapped = route.stops.filter((s) => s.lng === null && s.status !== "unscheduled")

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Route Map</h1>
        <p className="text-sm text-muted-foreground">
          {expedition?.name ?? (isLoading ? "Loading expedition…" : "No expedition selected")}
          {route.firstDate && route.lastDate && (
            <> · {formatDate(route.firstDate)} – {formatDate(route.lastDate)}</>
          )}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load the itinerary: {String((error as any)?.message ?? error)}
        </div>
      )}

      {/* Map */}
      <div className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {!hasToken ? (
          <MissingTokenPlaceholder />
        ) : isLoading ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : route.mappable.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
            <MapPinOff className="h-8 w-8 text-slate-400" />
            <p>No destinations with coordinates to plot yet.</p>
            {expedition && (
              <p>
                Add destinations and set each day&apos;s location in the{" "}
                <Link className="underline" href={`/dashboard?expedition=${expedition.id}`}>
                  Trip Planner
                </Link>
                .
              </p>
            )}
          </div>
        ) : (
          <ExpeditionRouteMap
            token={MAPBOX_TOKEN}
            route={route}
            selectedStopId={selectedStopId}
            onSelectStop={(stop) => setSelectedStopId(stop.id)}
            className="relative h-full w-full"
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {/* Route lines are white on the dark map, so their swatches sit on a dark chip. */}
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-3 w-8 items-center justify-center rounded-sm bg-slate-800">
            <span className="inline-block h-0.5 w-6 rounded bg-white" />
          </span>
          Sailed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-3 w-8 items-center justify-center rounded-sm bg-slate-800">
            <span className="inline-block w-6 border-t-2 border-dashed border-white" />
          </span>
          Underway
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-3 w-8 items-center justify-center rounded-sm bg-slate-800">
            <span className="inline-block w-6 border-t-2 border-dashed border-white/55" />
          </span>
          Planned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-600 ring-2 ring-emerald-200" /> Current position
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-slate-500" /> Visited
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-400 bg-white" /> Upcoming
        </span>
      </div>

      {/* Stops */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b bg-gray-50/50 px-4 py-2.5">
          <h2 className="text-sm font-semibold">Destinations in route order</h2>
          <span className="text-xs text-muted-foreground">{route.stops.length} stops</span>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : route.stops.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No destinations yet.</p>
        ) : (
          <ul className="divide-y">
            {route.stops.map((stop) => {
              const badge = STATUS_BADGE[stop.status]
              const mappable = stop.lng !== null && stop.status !== "unscheduled"
              const isSelected = stop.id === selectedStopId
              return (
                <li key={stop.id}>
                  <button
                    type="button"
                    onClick={() => mappable && setSelectedStopId(stop.id)}
                    disabled={!mappable}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                      mappable ? "cursor-pointer hover:bg-gray-50" : "cursor-default",
                      isSelected && "bg-gray-100/80"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                        stop.status === "current" && "border-emerald-600 bg-emerald-600 text-white",
                        stop.status === "visited" && "border-slate-500 bg-slate-500 text-white",
                        stop.status === "upcoming" && "border-slate-400 bg-white text-slate-700",
                        stop.status === "unscheduled" && "border-gray-200 bg-gray-50 text-gray-400"
                      )}
                    >
                      {stop.index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {stop.port}
                        <span className="font-normal text-muted-foreground"> · {stop.country}</span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {stop.dateRanges.length > 0
                          ? stop.dateRanges.map(formatDateRange).join(", ")
                          : "Not on the itinerary"}
                        {stop.lng === null && stop.status !== "unscheduled" && " · no coordinates"}
                      </span>
                    </span>
                    <Badge variant="outline" className={cn("flex-shrink-0 text-[11px]", badge.className)}>
                      {badge.label}
                    </Badge>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {unmapped.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {unmapped.length === 1 ? "One destination has" : `${unmapped.length} destinations have`} no coordinates and
          {unmapped.length === 1 ? " is" : " are"} left off the map. Edit the destination in the Trip Planner to add
          latitude and longitude.
        </p>
      )}
    </div>
  )
}

export default function RouteMapPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[60vh] min-h-[420px] w-full rounded-xl" />
        </div>
      }
    >
      <RouteMapContent />
    </Suspense>
  )
}
