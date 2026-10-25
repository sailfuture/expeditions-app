"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Anchor, ArrowRight, CalendarDays, Compass, MapPinOff, Navigation, RefreshCw, Ship, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { ExpeditionTypeBadge } from "@/components/expedition-type-badge"
import { ExpeditionHeader } from "@/components/expedition-header"
import { ExpeditionStatsCards } from "@/components/expedition-stats-cards"
import { StudentEvaluationsTable, StudentEvaluationsTableSkeleton } from "@/components/student-evaluations-table"
import { TodaySchedule } from "@/components/today-schedule"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import { useCurrentUser } from "@/lib/contexts/user-context"
import {
  useExpeditionLocations,
  useExpeditionSchedules,
  useStudentsByExpedition,
  useVesselPosition,
} from "@/lib/hooks/use-expeditions"
import { useRecalculateEvaluations } from "@/lib/hooks/use-recalculate-evaluations"
import { buildExpeditionRoute, formatDate, todayLocalDateString } from "@/lib/expedition-route"
import { VESSEL_STATE_LABEL, formatCoordinates, resolveVesselStatus } from "@/lib/vessel-position"
import { clampDateToExpeditionRange, cn } from "@/lib/utils"

// mapbox-gl touches `window` at import time, so it must never render on the server.
const ExpeditionRouteMap = dynamic(() => import("@/components/expedition-route-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
})

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

/** "2026-2027" → "'26-'27 School Year" */
function schoolYearLabel(name?: string | null): string | null {
  if (!name) return null
  const match = name.match(/^(\d{4})\s*[-–/]\s*(\d{4})$/)
  if (match) return `'${match[1].slice(2)}-'${match[2].slice(2)} School Year`
  return `${name} School Year`
}

function parseLocal(date: string): Date {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** "Oct 26 – Dec 11, 2026" (year shown once when both dates share it). */
function formatRange(start?: string | null, end?: string | null): string | null {
  if (!start || !end) return null
  const s = parseLocal(start)
  const e = parseLocal(end)
  const sameYear = s.getFullYear() === e.getFullYear()
  const startLabel = s.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) })
  const endLabel = e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return `${startLabel} – ${endLabel}`
}

/** Day number within the expedition for today, or null when today is outside it. */
function dayOfExpedition(start?: string | null, end?: string | null, today = todayLocalDateString()) {
  if (!start || !end || today < start || today > end) return null
  const dayMs = 24 * 60 * 60 * 1000
  const n = Math.round((parseLocal(today).getTime() - parseLocal(start).getTime()) / dayMs) + 1
  const total = Math.round((parseLocal(end).getTime() - parseLocal(start).getTime()) / dayMs) + 1
  return { n, total }
}

function MissingTokenPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 px-6 text-center">
      <MapPinOff className="h-8 w-8 text-slate-400" />
      <p className="text-sm font-medium text-slate-800">Map unavailable: no Mapbox token configured</p>
      <p className="max-w-sm text-xs text-slate-600">
        Add <code className="rounded bg-slate-200 px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> to{" "}
        <code className="rounded bg-slate-200 px-1">.env.local</code> and restart the dev server.
      </p>
    </div>
  )
}

function NoActiveExpedition({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <Compass className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h1 className="text-xl font-semibold">No active expedition</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This dashboard follows whichever expedition is marked active. Once one is, today&apos;s schedule, the boat&apos;s
          position and student scores will show up here.
        </p>
        <Button asChild className="mt-6 cursor-pointer">
          <Link href={isAdmin ? "/expeditions" : "/my-expeditions"}>
            {isAdmin ? "Go to All Expeditions" : "Go to My Expeditions"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function HomeDashboard() {
  const { currentUser, isLoading: userLoading } = useCurrentUser()
  const { activeExpedition, isLoading: expeditionsLoading } = useExpeditionContext()
  const isAdmin = currentUser?.role === "Admin"

  const expedition = activeExpedition as any
  const expeditionId: number | null = expedition?.id ?? null
  const startDate: string | undefined = expedition?.startDate || expedition?.start_date
  const endDate: string | undefined = expedition?.endDate || expedition?.end_date

  // Today when it falls inside the expedition, otherwise the nearest expedition day.
  const today = todayLocalDateString()
  const scheduleDate = useMemo(() => {
    if (!expedition) return null
    return clampDateToExpeditionRange(today, startDate, endDate) || startDate || today
  }, [expedition, startDate, endDate, today])
  const isToday = scheduleDate === today
  const dayCounter = dayOfExpedition(startDate, endDate, today)

  // Students + scores, recalculated once per page load.
  const { data: students, isLoading: studentsLoading, error: studentsError } = useStudentsByExpedition(expeditionId)
  const activeStudents = useMemo(() => (students ?? []).filter((s: any) => !s.isArchived), [students])
  const recalculation = useRecalculateEvaluations(expeditionId, students)

  // Route + live position for the map.
  const { data: schedules } = useExpeditionSchedules(expeditionId || undefined)
  const { data: locations } = useExpeditionLocations(expeditionId || undefined)
  const { data: positionData, error: positionError, isLoading: positionLoading } = useVesselPosition(expeditionId)
  const route = useMemo(() => {
    if (!expeditionId) return buildExpeditionRoute([], [])
    const belongs = (r: any) => r?.expeditions_id == null || r.expeditions_id === expeditionId
    return buildExpeditionRoute((locations ?? []).filter(belongs), (schedules ?? []).filter(belongs), today)
  }, [locations, schedules, expeditionId, today])
  const vesselStatus = useMemo(() => resolveVesselStatus(positionData), [positionData])
  const { vessel, position, lastSeenAt, track } = vesselStatus
  const [selectedStopId, setSelectedStopId] = useState<number | null>(null)

  const hasToken = MAPBOX_TOKEN.length > 0
  const nothingToPlot = route.mappable.length === 0 && !position

  if (!userLoading && !expeditionsLoading && !expedition) {
    return <NoActiveExpedition isAdmin={isAdmin} />
  }

  const loadingHeader = userLoading || expeditionsLoading || !expedition

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb + expedition tab bar, the same one the expedition tabs use */}
      <ExpeditionHeader expedition={expedition} isLoading={loadingHeader} currentPage="dashboard" />

      {/* Expedition header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          {loadingHeader ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-80 max-w-full" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Active expedition
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{expedition.name}</h1>
                  <ExpeditionTypeBadge expedition={expedition} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[schoolYearLabel(expedition._schoolyears?.name), expedition._schoolterms?.short_name]
                    .filter(Boolean)
                    .join(" · ")}
                  {(expedition._schoolyears?.name || expedition._schoolterms?.short_name) && formatRange(startDate, endDate) && " · "}
                  {formatRange(startDate, endDate)}
                </p>
              </div>
              {dayCounter && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700">
                    <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
                    Day {dayCounter.n} of {dayCounter.total}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* The six stat cards, shared with the overview page */}
        <ExpeditionStatsCards expeditionId={expeditionId} isLoading={loadingHeader} />

        {/* Today's schedule + live map */}
        <div className="grid gap-6 lg:grid-cols-5">
          <TodaySchedule
            expeditionId={expeditionId}
            date={scheduleDate}
            isToday={isToday}
            className="lg:col-span-2 lg:max-h-[600px]"
          />

          <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b bg-gray-50/50 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold leading-tight">Ship Location</h2>
                <p className="text-sm text-muted-foreground truncate">
                  {vessel?.name ?? (positionLoading ? "Checking the tracker…" : "No vessel linked to this expedition")}
                </p>
              </div>
              {expeditionId && (
                <Link
                  href={`/map?expedition=${expeditionId}`}
                  className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Route map
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {/* Position status strip */}
            <div
              className={cn(
                "px-5 py-3 border-b text-sm flex items-start gap-3",
                position ? "bg-sky-50/70" : "bg-white"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white",
                  position ? "bg-sky-600" : "bg-gray-300"
                )}
              >
                {position?.state === "underway" ? (
                  <Navigation className="h-4 w-4" />
                ) : position ? (
                  <Anchor className="h-4 w-4" />
                ) : (
                  <Ship className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0">
                {positionError ? (
                  <p className="text-red-700">Could not reach the vessel tracker: {String((positionError as any)?.message ?? positionError)}</p>
                ) : positionLoading && !positionData ? (
                  <Skeleton className="h-4 w-56" />
                ) : position ? (
                  <>
                    <p className="font-medium text-sky-950">
                      {VESSEL_STATE_LABEL[position.state]}
                      {position.speedKn !== null && <span className="font-normal text-sky-800"> · {position.speedKn.toFixed(1)} kn</span>}
                      {position.courseDeg !== null && <span className="font-normal text-sky-800"> · COG {Math.round(position.courseDeg)}°</span>}
                    </p>
                    <p className="text-xs text-sky-800">
                      {formatCoordinates(position.lat, position.lng)}
                      {position.ts && <> · reported {formatDistanceToNow(new Date(position.ts), { addSuffix: true })}</>}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-gray-800">No position yet</p>
                    <p className="text-xs text-muted-foreground">
                      {vessel
                        ? lastSeenAt
                          ? `${vessel.name ?? "The vessel"} checked in ${formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true })} but has not sent a GPS fix.`
                          : `${vessel.name ?? "The vessel"} has not reported a position yet.`
                        : "Link a vessel to this expedition to see its live position here."}
                      {route.current && (
                        <> Itinerary says {route.current.underway ? "underway from" : "at"} {route.current.stop.port}.</>
                      )}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="relative h-[420px] flex-1">
              {!hasToken ? (
                <MissingTokenPlaceholder />
              ) : nothingToPlot ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                  <MapPinOff className="h-8 w-8 text-slate-400" />
                  <p>Nothing to plot yet: no live position and no destinations with coordinates.</p>
                </div>
              ) : (
                <ExpeditionRouteMap
                  token={MAPBOX_TOKEN}
                  route={route}
                  selectedStopId={selectedStopId}
                  onSelectStop={(stop) => setSelectedStopId(stop.id)}
                  vessel={position}
                  vesselTrack={track}
                  vesselName={vessel?.name}
                  className="absolute inset-0"
                />
              )}
            </div>
          </div>
        </div>

        {/* Student evaluations, recalculated on load */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Student Evaluations</h2>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                {recalculation.status === "running" ? (
                  <>
                    <Spinner size="sm" className="h-3 w-3" /> Updating scores for {activeStudents.length} students…
                  </>
                ) : recalculation.status === "error" ? (
                  <span className="text-red-700">Score update failed; showing the last saved scores.</span>
                ) : recalculation.updatedAt ? (
                  <>
                    Scores updated {formatDistanceToNow(recalculation.updatedAt, { addSuffix: true })}
                    {recalculation.failed > 0 && <span className="text-amber-700"> · {recalculation.failed} failed</span>}
                  </>
                ) : (
                  "Scores are recalculated each time this page loads."
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={recalculation.rerun}
              disabled={recalculation.status === "running" || activeStudents.length === 0}
              className="cursor-pointer"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", recalculation.status === "running" && "animate-spin")} />
              {recalculation.status === "running" ? "Updating…" : "Update Scores"}
            </Button>
          </div>
          {studentsError ? (
            <div className="p-6 text-sm text-red-700">Could not load students: {String((studentsError as any)?.message ?? studentsError)}</div>
          ) : studentsLoading || !expeditionId ? (
            <StudentEvaluationsTableSkeleton />
          ) : activeStudents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p>No active students in this expedition</p>
            </div>
          ) : (
            <StudentEvaluationsTable students={activeStudents} expeditionId={expeditionId} />
          )}
        </div>

        {route.lastDate && expeditionId && (
          <p className="text-xs text-muted-foreground">
            Itinerary {formatDate(route.firstDate)} – {formatDate(route.lastDate)} ·{" "}
            <Link className="underline" href={`/dashboard?expedition=${expeditionId}`}>
              Trip planner
            </Link>
          </p>
        )}
      </main>
    </div>
  )
}
