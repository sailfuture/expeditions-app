import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a date string as local date to avoid UTC timezone shift
 * @param dateStr - Date string in "YYYY-MM-DD" format
 * @returns Date object at noon local time
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

/**
 * Check if a date is within an expedition's date range
 * @param date - The date to check (Date object or date string)
 * @param startDate - Expedition start date (Date object or date string)
 * @param endDate - Expedition end date (Date object or date string)
 * @returns true if date is within range, false otherwise
 */
export function isDateWithinExpeditionRange(
  date: Date | string,
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): boolean {
  if (!startDate || !endDate) return true // If no range defined, allow all dates
  
  // Parse dates as local to avoid timezone shift
  const checkDate = typeof date === 'string' ? parseLocalDate(date) : date
  const start = typeof startDate === 'string' ? parseLocalDate(startDate) : startDate
  const end = typeof endDate === 'string' ? parseLocalDate(endDate) : endDate
  
  // Normalize to midnight for comparison
  const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const normalizedCheck = normalizeDate(checkDate)
  const normalizedStart = normalizeDate(start)
  const normalizedEnd = normalizeDate(end)
  
  return normalizedCheck >= normalizedStart && normalizedCheck <= normalizedEnd
}

/**
 * Get the first date of an expedition (start date)
 * @param startDate - Expedition start date
 * @returns Date object of the first day, or today if no start date
 */
export function getExpeditionFirstDate(startDate: Date | string | null | undefined): Date {
  if (!startDate) return new Date()
  if (typeof startDate === 'string') {
    // Parse as local date to avoid timezone shift
    // "2026-01-11" -> create local date at noon to avoid any edge cases
    const [year, month, day] = startDate.split('-').map(Number)
    return new Date(year, month - 1, day, 12, 0, 0)
  }
  return startDate
}