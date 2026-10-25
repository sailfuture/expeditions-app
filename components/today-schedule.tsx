"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Anchor, ArrowRight, CalendarX, Clock, Ship, Wrench } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useExpeditionScheduleItemsByDate } from "@/lib/hooks/use-expeditions"
import { cn } from "@/lib/utils"
import { scheduleItemTitle } from "@/lib/schedule-item-title"

interface TodayScheduleProps {
  expeditionId: number | null | undefined
  /** "YYYY-MM-DD" day to show; already clamped into the expedition's range. */
  date: string | null
  /** True when `date` is actually today (as opposed to the nearest expedition day). */
  isToday: boolean
  className?: string
}

// Tailwind needs the full class names to exist in source, so map colours statically.
const ITEM_TYPE_COLORS: Record<string, string> = {
  amber: "bg-amber-500", orange: "bg-orange-500", red: "bg-red-500", green: "bg-green-500",
  blue: "bg-blue-500", purple: "bg-purple-500", teal: "bg-teal-500", pink: "bg-pink-500",
  indigo: "bg-indigo-500", cyan: "bg-cyan-500", yellow: "bg-yellow-500", lime: "bg-lime-500",
  emerald: "bg-emerald-500", sky: "bg-sky-500", violet: "bg-violet-500", fuchsia: "bg-fuchsia-500",
  rose: "bg-rose-500", slate: "bg-slate-500", gray: "bg-gray-500", zinc: "bg-zinc-500",
  neutral: "bg-neutral-500", stone: "bg-stone-500",
}

function itemColor(item: any) {
  const color = item?._expedition_schedule_item_types?.color
  return (color && ITEM_TYPE_COLORS[color]) || "bg-gray-400"
}

export function formatMilitaryTime(militaryTime: number) {
  if (militaryTime === 2400) return "12:00 AM"
  const hours = Math.floor(militaryTime / 100)
  const minutes = militaryTime % 100
  const displayHours = hours % 12 || 12
  const period = hours >= 12 ? "PM" : "AM"
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
}

export function formatScheduleDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function initials(name?: string) {
  return (name ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
}

/**
 * Compact list of the day's schedule items, using the same per-date endpoint
 * as the Daily View tab. Timed items come first in start-time order; items
 * without a time are grouped under "Anytime".
 */
export function TodaySchedule({ expeditionId, date, isToday, className }: TodayScheduleProps) {
  const { data, isLoading, error } = useExpeditionScheduleItemsByDate(date, expeditionId || undefined)

  const { schedule, timed, untimed } = useMemo(() => {
    const items: any[] = data?.items ?? []
    const sorted = [...items].sort((a, b) => {
      const aUnscheduled = !a.time_in || !a.time_out
      const bUnscheduled = !b.time_in || !b.time_out
      if (aUnscheduled && bUnscheduled) return 0
      if (aUnscheduled) return 1
      if (bUnscheduled) return -1
      return a.time_in - b.time_in
    })
    return {
      schedule: data?.schedule ?? null,
      timed: sorted.filter((i) => i.time_in && i.time_out),
      untimed: sorted.filter((i) => !i.time_in || !i.time_out),
    }
  }, [data])

  const location = schedule?._expedition_locations || schedule?._expedition_current_location
  const dayKind = schedule?.isOffshore ? "offshore" : schedule?.isService ? "service" : schedule ? "anchored" : null
  const dailyViewHref = expeditionId && date ? `/schedule/${date}?expedition=${expeditionId}` : null

  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col", className)}>
      <div className="px-5 py-4 border-b bg-gray-50/50 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">{isToday ? "Today's Schedule" : "Schedule"}</h2>
          <p className="text-sm text-muted-foreground truncate">
            {date ? formatScheduleDate(date) : "No date"}
            {!isToday && date && <span className="text-gray-400"> · nearest expedition day</span>}
          </p>
        </div>
        {dailyViewHref && (
          <Link
            href={dailyViewHref}
            className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Daily view
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {isLoading && !data ? (
        <div className="p-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 text-sm text-red-700">Could not load the schedule: {String((error as any)?.message ?? error)}</div>
      ) : !schedule ? (
        <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-muted-foreground">
          <CalendarX className="h-8 w-8 text-gray-300" />
          <p className="text-sm">No schedule has been created for this day yet.</p>
        </div>
      ) : (
        <>
          {/* Day summary: where the boat is and what kind of day it is */}
          <div className="px-5 py-3 border-b flex flex-wrap items-center gap-2 text-sm">
            {dayKind === "offshore" ? (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 gap-1">
                <Ship className="h-3 w-3" /> Offshore
              </Badge>
            ) : dayKind === "service" ? (
              <Badge variant="outline" className="bg-violet-50 text-violet-800 border-violet-200 gap-1">
                <Wrench className="h-3 w-3" /> Service day
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-200 gap-1">
                <Anchor className="h-3 w-3" /> Anchored
              </Badge>
            )}
            <span className="text-gray-700 truncate">
              {location ? `${location.port}, ${location.country}` : "No location set"}
              {schedule.isOffshore && schedule._expedition_destination_location?.port && (
                <span className="text-muted-foreground"> → {schedule._expedition_destination_location.port}</span>
              )}
            </span>
          </div>

          {timed.length === 0 && untimed.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No activities scheduled for this day.</div>
          ) : (
            <ul className="divide-y">
              {timed.map((item) => (
                <ScheduleRow key={item.id} item={item} time={`${formatMilitaryTime(item.time_in)} – ${formatMilitaryTime(item.time_out)}`} />
              ))}
              {untimed.length > 0 && (
                <li className="px-5 py-1.5 bg-gray-50/60 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Anytime
                </li>
              )}
              {untimed.map((item) => (
                <ScheduleRow key={item.id} item={item} time={null} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function ScheduleRow({ item, time }: { item: any; time: string | null }) {
  // Type as the title, except "Other", where the item's own name is the title.
  const { title, subtitle } = scheduleItemTitle(item)
  const staff = item._expedition_staff
  const studentCount = Array.isArray(item.students_id) ? item.students_id.filter((s: any) => s != null).length : 0
  return (
    <li className="flex items-stretch gap-3 px-5 py-2.5">
      <span className={cn("w-1 flex-shrink-0 rounded-full", itemColor(item))} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-medium text-gray-900" title={title}>
            {title}
          </p>
          {time && (
            <span className="flex flex-shrink-0 items-center gap-1 text-xs text-gray-500 tabular-nums">
              <Clock className="h-3 w-3" />
              {time}
            </span>
          )}
        </div>
        {subtitle && <p className="truncate text-xs text-gray-600">{subtitle}</p>}
        {(staff || studentCount > 0 || item.notes) && (
          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 min-w-0">
            {staff && (
              <span className="flex items-center gap-1 flex-shrink-0">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px] bg-gray-200 text-gray-700">{initials(staff.name)}</AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[140px]">{staff.name}</span>
              </span>
            )}
            {studentCount > 0 && <span className="flex-shrink-0">{studentCount} student{studentCount === 1 ? "" : "s"}</span>}
            {item.notes && <span className="truncate">{item.notes}</span>}
          </div>
        )}
      </div>
    </li>
  )
}
