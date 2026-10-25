"use client"

import type * as React from "react"
import type { Matcher } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

// A calendar that can only ever select a day inside an expedition's date
// range. Every expedition-related date picker in the app goes through this so
// the rule lives in one place: days outside the range are disabled, month
// navigation stops at the first and last month, the opening month is clamped
// into the range, and while the range is still unknown (expedition not loaded
// yet) nothing is selectable at all.

type DateLike = string | Date | null | undefined

/** Parse "YYYY-MM-DD" (or a Date / ISO string) as a local midnight date. */
export function toLocalDate(value: DateLike): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  if (!match) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export interface ExpeditionDateBounds {
  min?: Date
  max?: Date
}

export function expeditionDateBounds(startDate: DateLike, endDate: DateLike): ExpeditionDateBounds {
  return { min: toLocalDate(startDate), max: toLocalDate(endDate) }
}

/** True when the day falls outside the bounds (or when the bounds are unknown). */
export function isOutsideExpedition(date: Date, bounds: ExpeditionDateBounds): boolean {
  if (!bounds.min || !bounds.max) return true
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return day < bounds.min || day > bounds.max
}

/** Clamp a date into the bounds; returns the date itself when it already fits. */
export function clampToExpedition(date: Date, bounds: ExpeditionDateBounds): Date {
  if (bounds.min && date < bounds.min) return bounds.min
  if (bounds.max && date > bounds.max) return bounds.max
  return date
}

type CalendarProps = React.ComponentProps<typeof Calendar>

export type ExpeditionCalendarProps = CalendarProps & {
  /** Expedition start, "YYYY-MM-DD" or Date. */
  expeditionStartDate: DateLike
  /** Expedition end, "YYYY-MM-DD" or Date. */
  expeditionEndDate: DateLike
  /** Shown instead of the calendar while the range is unknown. */
  unavailableMessage?: string
}

export function ExpeditionCalendar({
  expeditionStartDate,
  expeditionEndDate,
  unavailableMessage = "Expedition dates are not available yet.",
  ...calendarProps
}: ExpeditionCalendarProps) {
  const bounds = expeditionDateBounds(expeditionStartDate, expeditionEndDate)

  if (!bounds.min || !bounds.max) {
    return (
      <div className={cn("w-64 p-4 text-center text-sm text-muted-foreground", calendarProps.className)}>
        {unavailableMessage}
      </div>
    )
  }

  const { disabled, defaultMonth } = calendarProps
  const outside: Matcher[] = [{ before: bounds.min }, { after: bounds.max }]
  const extra: Matcher[] =
    disabled === undefined || disabled === false ? [] : Array.isArray(disabled) ? disabled : [disabled as Matcher]

  const selected = (calendarProps as { selected?: unknown }).selected
  const fallbackMonth = selected instanceof Date ? selected : bounds.min
  const month = clampToExpedition(defaultMonth ?? fallbackMonth, bounds)

  const rangeProps = {
    defaultMonth: month,
    startMonth: bounds.min,
    endMonth: bounds.max,
    disabled: [...outside, ...extra],
  }

  return <Calendar {...(calendarProps as CalendarProps)} {...rangeProps} />
}
