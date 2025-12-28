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

// Timeline constants - Split into two rows
const ROW1_START = 6  // 6 AM
const ROW1_END = 16   // 4 PM (10 hours)
const ROW2_START = 16 // 4 PM
const ROW2_END = 23   // 11 PM (7 hours)
const ROW1_HOURS = ROW1_END - ROW1_START
const ROW2_HOURS = ROW2_END - ROW2_START

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

// Color mapping for activity types - returns Tailwind color classes
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

// Get duration string
const getDuration = (timeIn: number, timeOut: number): string => {
  const startMinutes = Math.floor(timeIn / 100) * 60 + (timeIn % 100)
  const endMinutes = Math.floor(timeOut / 100) * 60 + (timeOut % 100)
  const durationMinutes = endMinutes - startMinutes
  const hours = Math.floor(durationMinutes / 60)
  const mins = durationMinutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

function TVStaticContent() {
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
    activeExpedition ? `tv_static_schedule_${todayDate}_${activeExpedition.id}` : null,
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

  // Calculate overlapping items and assign columns (not rows - side by side)
  const itemsWithLayout = useMemo(() => {
    if (sortedItems.length === 0) return []

    const items = sortedItems.map((item, idx) => ({
      ...item,
      column: 0,
      totalColumns: 1,
      originalIndex: idx,
    }))

    // Sort by start time, then by duration (longer events first)
    const sorted = [...items].sort((a, b) => {
      if (a.time_in !== b.time_in) return a.time_in - b.time_in
      return (b.time_out - b.time_in) - (a.time_out - a.time_in)
    })

    // Assign each item to a column where it doesn't overlap
    const columns: any[][] = []

    sorted.forEach(item => {
      let placed = false
      
      // Try to place in an existing column
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const column = columns[colIdx]
        const canPlace = column.every(colItem => {
          // No overlap if one ends before the other starts
          return item.time_in >= colItem.time_out || item.time_out <= colItem.time_in
        })

        if (canPlace) {
          column.push(item)
          item.column = colIdx
          placed = true
          break
        }
      }

      // Create new column if couldn't place
      if (!placed) {
        columns.push([item])
        item.column = columns.length - 1
      }
    })

    // Update total columns for all items
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

  // Calculate position for an item in a specific row
  const getItemPositionForRow = (timeIn: number, timeOut: number, rowStart: number, rowEnd: number, rowHours: number) => {
    const startHour = Math.floor(timeIn / 100) + (timeIn % 100) / 60
    const endHour = Math.floor(timeOut / 100) + (timeOut % 100) / 60
    
    // Clamp to row range
    const clampedStart = Math.max(startHour, rowStart)
    const clampedEnd = Math.min(endHour, rowEnd)
    
    const startPercent = ((clampedStart - rowStart) / rowHours) * 100
    const endPercent = ((clampedEnd - rowStart) / rowHours) * 100
    
    return { 
      left: `${Math.max(0, startPercent)}%`, 
      width: `${Math.max(2, endPercent - startPercent)}%` 
    }
  }

  // Filter items for each row
  const row1Items = useMemo(() => {
    return itemsWithLayout.filter((item: any) => {
      const startHour = Math.floor(item.time_in / 100)
      const endHour = Math.floor(item.time_out / 100)
      // Item is in row 1 if it overlaps with 6am-4pm
      return startHour < ROW1_END && endHour > ROW1_START
    })
  }, [itemsWithLayout])

  const row2Items = useMemo(() => {
    return itemsWithLayout.filter((item: any) => {
      const startHour = Math.floor(item.time_in / 100)
      const endHour = Math.floor(item.time_out / 100)
      // Item is in row 2 if it overlaps with 4pm-11pm
      return startHour < ROW2_END && endHour > ROW2_START
    })
  }, [itemsWithLayout])

  // Current time position for each row
  const currentTimeRow1Position = useMemo(() => {
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    const decimalHour = hours + minutes / 60
    if (decimalHour < ROW1_START || decimalHour >= ROW1_END) return null
    const percent = ((decimalHour - ROW1_START) / ROW1_HOURS) * 100
    return `${percent}%`
  }, [currentTime])

  const currentTimeRow2Position = useMemo(() => {
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    const decimalHour = hours + minutes / 60
    if (decimalHour < ROW2_START || decimalHour >= ROW2_END) return null
    const percent = ((decimalHour - ROW2_START) / ROW2_HOURS) * 100
    return `${percent}%`
  }, [currentTime])

  // Hour markers for each row
  const row1HourMarkers = useMemo(() => {
    const markers = []
    for (let hour = ROW1_START; hour <= ROW1_END; hour++) {
      const percent = ((hour - ROW1_START) / ROW1_HOURS) * 100
      markers.push({ hour, percent })
    }
    return markers
  }, [])

  const row2HourMarkers = useMemo(() => {
    const markers = []
    for (let hour = ROW2_START; hour <= ROW2_END; hour++) {
      const percent = ((hour - ROW2_START) / ROW2_HOURS) * 100
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
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Header */}
      <div className="h-[10vh] bg-slate-900/80 border-b border-white/10 flex items-center justify-between px-8">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {format(displayDate, "EEEE, MMMM d, yyyy")}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-base text-white/70">{activeExpedition.name}</span>
              
              {/* Location info */}
              {currentLocationName && (
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/90 text-sm font-medium">
                  {currentLocationName}
                  {destinationName && (
                    <span className="text-white/50"> → {destinationName}</span>
                  )}
                </span>
              )}
              
              {/* Status badges */}
              {todaySchedule?.isOffshore && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-sm font-medium">
                  Offshore
                </span>
              )}
              {!todaySchedule?.isOffshore && todaySchedule && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-sm font-medium">
                  In Port
                </span>
              )}
              {todaySchedule?.isService && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-sm font-medium">
                  Service Day
                </span>
              )}
              {testDate && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-sm font-medium">
                  Test Mode
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-4xl font-light text-white tabular-nums">
            {format(currentTime, "h:mm")}
            <span className="text-xl text-white/50 ml-2">{format(currentTime, "a")}</span>
          </p>
          {!testDate && (
            <p className="text-base text-green-400 font-medium">Live</p>
          )}
        </div>
      </div>

      {/* Timeline Container - No scrolling, fits screen */}
      <div className="h-[90vh] relative px-6 py-4">
        {/* Hour markers */}
        <div className="absolute top-4 left-6 right-6 h-10">
          {hourMarkers.map(({ hour, percent }) => {
            const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
            const ampm = hour >= 12 ? "PM" : "AM"
            
            return (
              <div
                key={hour}
                className="absolute flex flex-col items-center"
                style={{ left: `${percent}%` }}
              >
                <div className="px-2 py-1 bg-white/10 backdrop-blur rounded-lg text-sm font-medium text-white">
                  {hour12}
                  <span className="text-xs text-white/60 ml-0.5">
                    {ampm}
                  </span>
                </div>
                <div className="w-px h-[78vh] bg-white/10 mt-2" />
              </div>
            )
          })}
        </div>

        {/* Current time indicator line */}
        {currentTimePosition && (
          <div
            className="absolute top-4 bottom-4 w-1 bg-red-500 z-50 shadow-lg shadow-red-500/50"
            style={{ left: `calc(1.5rem + ${currentTimePosition})` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-lg" />
            <div className="absolute top-0 left-3 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
              {format(currentTime, "h:mm a")}
            </div>
          </div>
        )}

        {/* Schedule items - cards are 1/3 height */}
        <div className="absolute top-16 left-6 right-6 h-[28vh]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-2xl text-white/50">Loading schedule...</div>
            </div>
          ) : itemsWithLayout.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-2xl text-white/50">No activities scheduled</div>
            </div>
          ) : (
            <div className="relative h-full">
              {itemsWithLayout.map((item: any) => {
                const position = getItemPosition(item.time_in, item.time_out)
                
                // Calculate vertical position based on columns (side by side when overlapping)
                const columnHeight = 100 / item.totalColumns
                const topOffset = item.column * columnHeight
                
                // Check if item is in the past
                const currentMilitaryTime = currentTime.getHours() * 100 + currentTime.getMinutes()
                const isPast = item.time_out < currentMilitaryTime && !testDate
                
                // Build staff display
                const staffNames: string[] = []
                if (item._expedition_staff?.name) staffNames.push(item._expedition_staff.name)
                if (item.participants?.length > 0) {
                  item.participants.slice(0, 1).forEach((p: any) => {
                    if (p.name && p.name !== item._expedition_staff?.name) {
                      staffNames.push(p.name.split(' ')[0])
                    }
                  })
                }
                
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "absolute bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 transition-opacity duration-300",
                      isPast && "opacity-40"
                    )}
                    style={{
                      left: position.left,
                      width: position.width,
                      top: `calc(${topOffset}% + 4px)`,
                      height: `calc(${columnHeight}% - 8px)`,
                      minWidth: "80px",
                    }}
                  >
                    <div className="flex flex-col h-full p-2">
                      {/* Color bar - horizontal at top with padding */}
                      <div className={cn("h-1 w-full flex-shrink-0 rounded-full", getColorForType(item))} />
                      
                      {/* Content */}
                      <div className="flex-1 overflow-hidden flex flex-col min-w-0 pt-1.5">
                        {/* Title - allows wrapping */}
                        <h3 className="font-bold text-base text-gray-900 leading-tight">
                          {item.name}
                        </h3>
                        
                        {/* Time */}
                        <p className="text-xs text-gray-500 mt-0.5">
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
                            <span className="text-xs text-gray-600 leading-tight">
                              {staffNames.join(" • ")}
                            </span>
                          </div>
                        )}

                        {/* Address or Notes - allows wrapping */}
                        {(item.address || item.notes) && (
                          <p className="text-xs text-gray-400 mt-1 leading-tight line-clamp-2">
                            {item.address || item.notes}
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

      {/* Footer with navigation */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
        <div className="text-xs text-white/30">
          Auto-refreshes every 30s
        </div>
        
        {/* TV Display Navigation */}
        <div className="flex items-center gap-2">
          <Link href="/tv?date=2026-01-11">
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-white/5 hover:bg-white/20 text-white/60 text-xs h-7"
            >
              Animated
            </Button>
          </Link>
          <Link href="/tv/static?date=2026-01-11">
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white text-xs h-7"
            >
              Static
            </Button>
          </Link>
          <Link href="/tv/vertical?date=2026-01-11">
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-white/5 hover:bg-white/20 text-white/60 text-xs h-7"
            >
              Vertical
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function TVStaticPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center">
        <div className="text-white/60 text-2xl">Loading display...</div>
      </div>
    }>
      <TVStaticContent />
    </Suspense>
  )
}

