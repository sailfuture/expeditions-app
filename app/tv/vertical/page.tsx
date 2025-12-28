"use client"

import { useMemo, useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { getActiveExpedition, getExpeditionScheduleItemsByDate } from "@/lib/xano"
import useSWR from "swr"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

// Timeline constants - 6 AM to 11 PM (17 hours)
const TIMELINE_START_HOUR = 6 // 6 AM
const TIMELINE_END_HOUR = 23 // 11 PM
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR // 17 hours

// Parse UTC offset string like "UTC-5" or "UTC+2" to get offset in hours
function parseUtcOffset(offsetString: string | undefined): number {
  if (!offsetString) return -5 // Default to UTC-5 (Eastern Time)
  const match = offsetString.match(/UTC([+-])(\d+)/)
  if (!match) return -5
  const sign = match[1] === "+" ? 1 : -1
  const hours = parseInt(match[2])
  return sign * hours
}

// Get today's date for a specific UTC offset
function getTodayForOffset(offsetHours: number): string {
  const now = new Date()
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000)
  const localTime = new Date(utcTime + (offsetHours * 3600000))
  return format(localTime, "yyyy-MM-dd")
}

// Get current time for a specific UTC offset
function getCurrentTimeForOffset(offsetHours: number): Date {
  const now = new Date()
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000)
  return new Date(utcTime + (offsetHours * 3600000))
}

// Color mapping for activity types
const getColorForType = (item: any): string => {
  const color = item._expedition_schedule_item_types?.color || ""
  const colorMap: Record<string, string> = {
    red: "bg-red-500",
    orange: "bg-orange-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    pink: "bg-pink-500",
    cyan: "bg-cyan-500",
    indigo: "bg-indigo-500",
    gray: "bg-gray-500",
  }
  return colorMap[color] || "bg-slate-400"
}

// Format military time to display format
const formatTime = (militaryTime: number): string => {
  if (!militaryTime && militaryTime !== 0) return ""
  const hours = Math.floor(militaryTime / 100)
  const minutes = militaryTime % 100
  const period = hours >= 12 ? "PM" : "AM"
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
}

function TVVerticalContent() {
  const searchParams = useSearchParams()
  const testDate = searchParams.get('date')

  // Fetch the active expedition
  const { data: activeExpedition, isLoading: loadingExpedition } = useSWR(
    'active_expedition',
    getActiveExpedition,
    { refreshInterval: 60000, revalidateOnFocus: false }
  )

  // Get timezone offset from expedition
  const timezoneOffset = useMemo(() => {
    if (!activeExpedition) return -5
    const timezoneString = activeExpedition.timezone || 
                           activeExpedition._expedition_location?.timezone ||
                           activeExpedition.location?.timezone
    return parseUtcOffset(timezoneString)
  }, [activeExpedition])

  // Calculate today's date based on expedition timezone
  const todayDate = useMemo(() => {
    if (testDate) return testDate
    return getTodayForOffset(timezoneOffset)
  }, [timezoneOffset, testDate])

  // Current time state
  const [currentTime, setCurrentTime] = useState(() => getCurrentTimeForOffset(timezoneOffset))

  // Fetch schedule items for today
  const { data: scheduleItems, isLoading: loadingItems } = useSWR(
    activeExpedition ? `tv_vertical_schedule_${todayDate}_${activeExpedition.id}` : null,
    activeExpedition ? () => getExpeditionScheduleItemsByDate(todayDate, activeExpedition.id) : null,
    { refreshInterval: 30000, revalidateOnFocus: false }
  )

  // Get schedule info from first item
  const todaySchedule = useMemo(() => {
    if (!scheduleItems || !Array.isArray(scheduleItems) || scheduleItems.length === 0) return null
    return scheduleItems[0]?._expedition_schedule || null
  }, [scheduleItems])

  // Sort items by time
  const sortedItems = useMemo(() => {
    if (!scheduleItems || !Array.isArray(scheduleItems)) return []
    return [...scheduleItems].sort((a, b) => a.time_in - b.time_in)
  }, [scheduleItems])

  // Calculate overlapping items and assign columns
  const itemsWithLayout = useMemo(() => {
    if (sortedItems.length === 0) return []

    const items = sortedItems.map((item, idx) => ({
      ...item,
      column: 0,
      totalColumns: 1,
      originalIndex: idx,
    }))

    // Sort by start time, then by duration
    const sorted = [...items].sort((a, b) => {
      if (a.time_in !== b.time_in) return a.time_in - b.time_in
      return (b.time_out - b.time_in) - (a.time_out - a.time_in)
    })

    // Assign each item to a column where it doesn't overlap
    const columns: any[][] = []

    sorted.forEach(item => {
      let placed = false
      
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const column = columns[colIdx]
        const canPlace = column.every(colItem => {
          return item.time_in >= colItem.time_out || item.time_out <= colItem.time_in
        })

        if (canPlace) {
          column.push(item)
          item.column = colIdx
          placed = true
          break
        }
      }

      if (!placed) {
        columns.push([item])
        item.column = columns.length - 1
      }
    })

    const totalColumns = columns.length
    items.forEach(item => {
      item.totalColumns = totalColumns
    })
    
    return items
  }, [sortedItems])

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeForOffset(timezoneOffset))
    }, 60000)
    return () => clearInterval(interval)
  }, [timezoneOffset])

  // Calculate vertical position for an item (top-based)
  const getItemPosition = (timeIn: number, timeOut: number) => {
    const startHour = Math.floor(timeIn / 100)
    const startMinutes = timeIn % 100
    const endHour = Math.floor(timeOut / 100)
    const endMinutes = timeOut % 100
    
    // Clamp to visible range
    const clampedStartHour = Math.max(startHour, TIMELINE_START_HOUR)
    const clampedEndHour = Math.min(endHour, TIMELINE_END_HOUR)
    
    const startPercent = ((clampedStartHour - TIMELINE_START_HOUR) * 60 + (startHour >= TIMELINE_START_HOUR ? startMinutes : 0)) / (TOTAL_HOURS * 60) * 100
    const endPercent = ((clampedEndHour - TIMELINE_START_HOUR) * 60 + (endHour <= TIMELINE_END_HOUR ? endMinutes : 0)) / (TOTAL_HOURS * 60) * 100
    
    return { 
      top: `${Math.max(0, Math.min(100, startPercent))}%`, 
      height: `${Math.max(2, Math.min(100 - startPercent, endPercent - startPercent))}%` 
    }
  }

  // Current time position (vertical)
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    if (hours < TIMELINE_START_HOUR || hours >= TIMELINE_END_HOUR) return null
    const percent = ((hours - TIMELINE_START_HOUR) * 60 + minutes) / (TOTAL_HOURS * 60) * 100
    return `${percent}%`
  }, [currentTime])

  // Hour markers
  const hourMarkers = useMemo(() => {
    const markers = []
    for (let hour = TIMELINE_START_HOUR; hour <= TIMELINE_END_HOUR; hour++) {
      const percent = ((hour - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100
      markers.push({ hour, percent })
    }
    return markers
  }, [])

  // Parse display date
  const displayDate = useMemo(() => {
    try {
      const [year, month, day] = todayDate.split('-').map(Number)
      return new Date(year, month - 1, day)
    } catch {
      return new Date()
    }
  }, [todayDate])

  if (loadingExpedition || !activeExpedition) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center">
        <div className="text-white/60 text-2xl">Loading expedition...</div>
      </div>
    )
  }

  const isLoading = loadingItems

  // Get location names from schedule
  const currentLocationName = todaySchedule?._expedition_current_location?.port || 
                               todaySchedule?._current_location?.port ||
                               (todaySchedule?.current_location > 0 ? `Location ${todaySchedule.current_location}` : null)
  const destinationName = todaySchedule?._expedition_destination?.port ||
                          todaySchedule?._destination?.port ||
                          (todaySchedule?.destination > 0 ? `Location ${todaySchedule.destination}` : null)

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex">
      {/* Left sidebar - Header info */}
      <div className="w-64 flex-shrink-0 bg-slate-900/80 border-r border-white/10 p-6 flex flex-col">
        <div>
          <h1 className="text-2xl font-bold text-white leading-tight">
            {format(displayDate, "EEEE")}
          </h1>
          <p className="text-3xl font-light text-white mt-1">
            {format(displayDate, "MMMM d")}
          </p>
          <p className="text-lg text-white/50">{format(displayDate, "yyyy")}</p>
        </div>
        
        <div className="mt-6">
          <p className="text-5xl font-light text-white tabular-nums">
            {format(currentTime, "h:mm")}
          </p>
          <p className="text-xl text-white/50">{format(currentTime, "a")}</p>
          {!testDate && (
            <p className="text-sm text-green-400 font-medium mt-2">Live</p>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <p className="text-sm text-white/70">{activeExpedition.name}</p>
          
          {/* Location info */}
          {currentLocationName && (
            <div className="px-3 py-2 rounded-lg bg-white/10 text-white/90 text-sm">
              <p className="font-medium">{currentLocationName}</p>
              {destinationName && (
                <p className="text-white/50 text-xs mt-1">→ {destinationName}</p>
              )}
            </div>
          )}
          
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            {todaySchedule?.isOffshore && (
              <span className="px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-300 text-xs font-medium">
                Offshore
              </span>
            )}
            {!todaySchedule?.isOffshore && todaySchedule && (
              <span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                In Port
              </span>
            )}
            {todaySchedule?.isService && (
              <span className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-300 text-xs font-medium">
                Service Day
              </span>
            )}
            {testDate && (
              <span className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 text-xs font-medium">
                Test Mode
              </span>
            )}
          </div>
        </div>

        <div className="mt-auto space-y-3">
          <div className="text-xs text-white/30">
            Auto-refreshes every 30s
          </div>
          
          {/* TV Display Navigation */}
          <div className="flex flex-col gap-1">
            <Link href="/tv?date=2026-01-11">
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full bg-white/5 hover:bg-white/20 text-white/60 text-xs h-7 justify-start"
              >
                Animated
              </Button>
            </Link>
            <Link href="/tv/static?date=2026-01-11">
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full bg-white/5 hover:bg-white/20 text-white/60 text-xs h-7 justify-start"
              >
                Static
              </Button>
            </Link>
            <Link href="/tv/vertical?date=2026-01-11">
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full bg-white/10 hover:bg-white/20 text-white text-xs h-7 justify-start"
              >
                Vertical
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main timeline area - Vertical */}
      <div className="flex-1 relative p-4">
        {/* Hour markers - horizontal lines */}
        <div className="absolute top-4 bottom-4 left-4 w-16">
          {hourMarkers.map(({ hour, percent }) => {
            const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
            const ampm = hour >= 12 ? "PM" : "AM"
            
            return (
              <div
                key={hour}
                className="absolute flex items-center"
                style={{ top: `${percent}%` }}
              >
                <div className="px-2 py-1 bg-white/10 backdrop-blur rounded text-xs font-medium text-white whitespace-nowrap">
                  {hour12}<span className="text-white/60 ml-0.5">{ampm}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Horizontal grid lines */}
        <div className="absolute top-4 bottom-4 left-20 right-4">
          {hourMarkers.map(({ hour, percent }) => (
            <div
              key={`line-${hour}`}
              className="absolute left-0 right-0 h-px bg-white/10"
              style={{ top: `${percent}%` }}
            />
          ))}
        </div>

        {/* Current time indicator - horizontal line */}
        {currentTimePosition && (
          <div
            className="absolute left-20 right-4 h-0.5 bg-red-500 z-50 shadow-lg shadow-red-500/50"
            style={{ top: `calc(1rem + ${currentTimePosition})` }}
          >
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-lg" />
          </div>
        )}

        {/* Schedule items */}
        <div className="absolute top-4 bottom-4 left-24 right-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-xl text-white/50">Loading schedule...</div>
            </div>
          ) : itemsWithLayout.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-xl text-white/50">No activities scheduled</div>
            </div>
          ) : (
            <div className="relative h-full">
              {itemsWithLayout.map((item: any) => {
                const position = getItemPosition(item.time_in, item.time_out)
                
                // Calculate horizontal position based on columns
                const columnWidth = 100 / item.totalColumns
                const leftOffset = item.column * columnWidth
                
                // Check if item is in the past
                const currentMilitaryTime = currentTime.getHours() * 100 + currentTime.getMinutes()
                const isPast = item.time_out < currentMilitaryTime && !testDate
                
                // Build staff display
                const staffNames: string[] = []
                if (item._expedition_staff?.name) staffNames.push(item._expedition_staff.name)
                
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "absolute bg-white rounded-xl shadow-lg overflow-hidden p-3 border-2 border-gray-200 transition-opacity duration-300",
                      isPast && "opacity-40"
                    )}
                    style={{
                      top: position.top,
                      height: position.height,
                      left: `calc(${leftOffset}% + 4px)`,
                      width: `calc(${columnWidth}% - 8px)`,
                      minHeight: "60px",
                    }}
                  >
                    <div className="flex h-full gap-2">
                      {/* Color bar - horizontal at top */}
                      <div className={cn("w-1 h-full flex-shrink-0 rounded-full", getColorForType(item))} />
                      
                      {/* Content */}
                      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                        {/* Title */}
                        <h3 className="font-bold text-sm text-gray-900 leading-tight">
                          {item.name}
                        </h3>
                        
                        {/* Time */}
                        <p className="text-xs text-gray-500">
                          {formatTime(item.time_in)} - {formatTime(item.time_out)}
                        </p>

                        {/* Staff */}
                        {staffNames.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Avatar className="h-4 w-4 flex-shrink-0">
                              <AvatarFallback className="text-[10px] bg-gray-100 text-gray-600">
                                {item._expedition_staff?.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-600">
                              {staffNames[0]}
                            </span>
                          </div>
                        )}

                        {/* Notes */}
                        {item.notes && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TVVerticalPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center">
        <div className="text-white/60 text-2xl">Loading display...</div>
      </div>
    }>
      <TVVerticalContent />
    </Suspense>
  )
}

