"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Anchor, ArrowRight, Calendar, CalendarX, Clock, MapPin, Ship, Users, Wrench, X } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useExpeditionScheduleItemsByDate, useTeachers } from "@/lib/hooks/use-expeditions"
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
  const [sheetOpen, setSheetOpen] = useState(false)

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
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex flex-shrink-0 cursor-pointer items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Daily view
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {date && dailyViewHref && (
        <DayScheduleSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          date={date}
          schedule={schedule}
          items={[...timed, ...untimed]}
          isLoading={isLoading && !data}
          dayKind={dayKind}
          location={location}
          dailyViewHref={dailyViewHref}
          evaluateHref={`/evaluate/${date}?expedition=${expeditionId}`}
        />
      )}

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
            <DayKindBadge dayKind={dayKind} />
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
            // The card has a max height on large screens, so the list scrolls inside it;
            // overscroll-contain keeps the page from scrolling once the list hits its end.
            <ul className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
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

function DayKindBadge({ dayKind }: { dayKind: string | null }) {
  if (dayKind === "offshore") {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 gap-1">
        <Ship className="h-3 w-3" /> Offshore
      </Badge>
    )
  }
  if (dayKind === "service") {
    return (
      <Badge variant="outline" className="bg-violet-50 text-violet-800 border-violet-200 gap-1">
        <Wrench className="h-3 w-3" /> Service day
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-200 gap-1">
      <Anchor className="h-3 w-3" /> Anchored
    </Badge>
  )
}

/**
 * The day's schedule in a side sheet, laid out like the Schedule tab's day preview:
 * every activity with its time and staff, who's off, and the day's notes.
 */
function DayScheduleSheet({
  open,
  onOpenChange,
  date,
  schedule,
  items,
  isLoading,
  dayKind,
  location,
  dailyViewHref,
  evaluateHref,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  schedule: any
  items: any[]
  isLoading: boolean
  dayKind: string | null
  location: any
  dailyViewHref: string
  evaluateHref: string
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[640px] sm:max-w-[90vw] p-0 flex flex-col h-full overflow-hidden gap-0">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <SheetTitle className="text-xl truncate">{formatScheduleDate(date)}</SheetTitle>
              {schedule && <DayKindBadge dayKind={dayKind} />}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <SheetDescription className="flex items-center gap-2 pt-1">
            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{location ? `${location.port}, ${location.country}` : "No location set"}</span>
            {schedule?.isOffshore && schedule._expedition_destination_location?.port && (
              <>
                <Ship className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-1" />
                <span className="truncate">{schedule._expedition_destination_location.port}</span>
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-6 pt-5 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Schedule</div>
              {!isLoading && items.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "activity" : "activities"}
                </span>
              )}
            </div>
            <div className="rounded-lg border overflow-hidden">
              {isLoading ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <Clock className="h-6 w-6 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {schedule ? "No activities scheduled for this day" : "No schedule has been created for this day yet"}
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/50 text-left text-xs font-medium text-muted-foreground">
                      <th className="h-9 px-3 w-[120px]">Time</th>
                      <th className="h-9 px-3">Activity</th>
                      <th className="h-9 px-3 w-[150px]">Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item) => {
                      const { title, subtitle } = scheduleItemTitle(item)
                      const staff = item._expedition_staff
                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-2.5 align-top whitespace-nowrap">
                            {!item.time_in || !item.time_out ? (
                              <span className="text-xs text-gray-400 italic">Anytime</span>
                            ) : (
                              <div className="text-xs leading-tight">
                                <div className="font-medium text-gray-900">{formatMilitaryTime(item.time_in)}</div>
                                <div className="text-gray-400">{formatMilitaryTime(item.time_out)}</div>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <div className="flex gap-2.5">
                              <span className={cn("w-1 rounded-full shrink-0 self-stretch", itemColor(item))} />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 leading-tight">{title}</div>
                                {subtitle && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{subtitle}</div>}
                                {item.notes && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.notes}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            {staff ? (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Avatar className="h-5 w-5 shrink-0">
                                  <AvatarFallback className="text-[8px] bg-gray-200 text-gray-600">{initials(staff.name)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-gray-700 truncate">{staff.name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {schedule && <DayStaffOffAndNotes schedule={schedule} />}
        </div>

        <div className="flex gap-2 p-4 border-t shrink-0">
          <Button asChild variant="outline" className="flex-1 cursor-pointer">
            <Link href={dailyViewHref}>
              <Calendar className="h-4 w-4 mr-2" />
              Open full schedule
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 cursor-pointer">
            <Link href={evaluateHref}>
              <Users className="h-4 w-4 mr-2" />
              Evaluate students
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Staff off and the day's notes. Only mounted while the sheet is open, so staff load on demand. */
function DayStaffOffAndNotes({ schedule }: { schedule: any }) {
  const { data: staff } = useTeachers()
  const staffOff: number[] = Array.isArray(schedule.staff_off) ? schedule.staff_off : []
  return (
    <div className="px-6 py-5 space-y-5">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Staff Off</div>
        {staffOff.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {staffOff.map((staffId) => {
              const member = (staff as any[] | undefined)?.find((s: any) => s.id === staffId)
              return (
                <div key={staffId} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[8px] bg-gray-200 text-gray-600">{initials(member?.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-700">{member?.name || "Unknown"}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <span className="text-sm text-gray-400">No staff off</span>
        )}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Notes</div>
        {schedule.notes ? (
          <p className="whitespace-pre-wrap text-sm text-gray-700">{schedule.notes}</p>
        ) : (
          <span className="text-sm text-gray-400">No notes for this day</span>
        )}
      </div>
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
