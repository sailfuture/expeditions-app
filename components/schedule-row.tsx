"use client"

import { forwardRef } from "react"
import { Clock } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { scheduleItemTitle } from "@/lib/schedule-item-title"

// Tailwind needs the full class names to exist in source, so map colours statically.
export const ITEM_TYPE_COLORS: Record<string, string> = {
  amber: "bg-amber-500", orange: "bg-orange-500", red: "bg-red-500", green: "bg-green-500",
  blue: "bg-blue-500", purple: "bg-purple-500", teal: "bg-teal-500", pink: "bg-pink-500",
  indigo: "bg-indigo-500", cyan: "bg-cyan-500", yellow: "bg-yellow-500", lime: "bg-lime-500",
  emerald: "bg-emerald-500", sky: "bg-sky-500", violet: "bg-violet-500", fuchsia: "bg-fuchsia-500",
  rose: "bg-rose-500", slate: "bg-slate-500", gray: "bg-gray-500", zinc: "bg-zinc-500",
  neutral: "bg-neutral-500", stone: "bg-stone-500",
}

/** Colour bar class for a schedule item, from its type's colour name. */
export function scheduleItemColor(item: any) {
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

function initials(name?: string) {
  return (name ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
}

interface ScheduleRowProps {
  item: any
  /** Formatted time range, or null for an "anytime" item. */
  time: string | null
  /** When given, the whole row is a button (phone lists open the detail dialog from it). */
  onClick?: () => void
  /** Dims a row whose item has already ended. */
  past?: boolean
  className?: string
}

/**
 * One schedule item as a list row: colour bar, title, time, then staff, student
 * count and the note on a second line. Shared by the Home card and the Daily
 * View's phone list so the two read the same.
 */
export function ScheduleRow({ item, time, onClick, past = false, className }: ScheduleRowProps) {
  // Type as the title, except "Other", where the item's own name is the title.
  const { title, subtitle } = scheduleItemTitle(item)
  const staff = item._expedition_staff
  const studentCount = Array.isArray(item.students_id) ? item.students_id.filter((s: any) => s != null).length : 0

  const body = (
    <>
      <span className={cn("w-1 flex-shrink-0 self-stretch rounded-full", scheduleItemColor(item))} />
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
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-gray-500">
            {staff && (
              <span className="flex flex-shrink-0 items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px] bg-gray-200 text-gray-700">{initials(staff.name)}</AvatarFallback>
                </Avatar>
                <span className="max-w-[140px] truncate">{staff.name}</span>
              </span>
            )}
            {studentCount > 0 && <span className="flex-shrink-0">{studentCount} student{studentCount === 1 ? "" : "s"}</span>}
            {item.notes && <span className="truncate">{item.notes}</span>}
          </div>
        )}
      </div>
    </>
  )

  if (onClick) {
    return (
      <li className={cn(past && "opacity-60", className)}>
        <button
          type="button"
          onClick={onClick}
          className="flex min-h-[56px] w-full items-stretch gap-3 px-4 py-2.5 text-left active:bg-gray-50"
        >
          {body}
        </button>
      </li>
    )
  }

  return <li className={cn("flex items-stretch gap-3 px-5 py-2.5", past && "opacity-60", className)}>{body}</li>
}

/**
 * Where the "Now" divider goes in a day's timed items (sorted by start time): just after the
 * last item that has ended, so nothing finished ever sits below it. An item still running from
 * earlier in the day (a watch that lasts until midnight, say) stays above the line, undimmed,
 * and does not hold the line back at its own start time. Returns -1 when there is no "now".
 */
export function nowDividerIndex(timedItems: { time_out: number }[], nowMilitary: number | null): number {
  if (nowMilitary === null) return -1
  let index = 0
  timedItems.forEach((item, i) => {
    if (item.time_out <= nowMilitary) index = i + 1
  })
  return index
}

/**
 * "Now" marker between the past and the upcoming rows of a day list. The
 * Daily View scrolls it into view on mount when the date is today.
 */
export const NowDivider = forwardRef<HTMLLIElement, { time?: string; className?: string }>(function NowDivider(
  { time, className },
  ref
) {
  return (
    <li ref={ref} aria-label="Now" className={cn("flex items-center gap-2 px-4 py-1", className)}>
      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
      <span className="h-px flex-1 bg-red-400" />
      <span className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-wide text-red-600 tabular-nums">
        Now{time ? ` · ${time}` : ""}
      </span>
    </li>
  )
})
