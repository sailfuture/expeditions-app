"use client"

import { useMemo, useState, useEffect, Suspense } from "react"
import { useSearchParams, usePathname } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { getActiveExpedition, getExpeditionScheduleItemsByDate } from "@/lib/xano"
import useSWR from "swr"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

// Timeline constants - Split into two even rows
const ROW1_START = 5  // 5 AM
const ROW1_END = 14   // 2 PM (9 hours)
const ROW2_START = 14 // 2 PM
const ROW2_END = 23   // 11 PM (9 hours)
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

function TVDisplayContent() {
  const searchParams = useSearchParams()
  const testDate = searchParams.get('date')
  const testTime = searchParams.get('time') // Optional: test specific time like "1430" for 2:30 PM

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

  // Calculate date
  const todayDate = useMemo(() => {
    if (testDate) return testDate
    return getTodayForOffset(timezoneOffset)
  }, [timezoneOffset, testDate])

  // Current time - updates every minute for smooth animation
  const [currentTime, setCurrentTime] = useState(() => {
    if (testTime) {
      const hours = Math.floor(parseInt(testTime) / 100)
      const minutes = parseInt(testTime) % 100
      const date = new Date()
      date.setHours(hours, minutes, 0, 0)
      return date
    }
    return getCurrentTimeForOffset(timezoneOffset)
  })

  // Fetch schedule items
  const { data: scheduleData, isLoading: loadingItems } = useSWR(
    activeExpedition ? `tv_schedule_${todayDate}_${activeExpedition.id}` : null,
    activeExpedition ? () => getExpeditionScheduleItemsByDate(todayDate, activeExpedition.id) : null,
    { refreshInterval: 30000, revalidateOnFocus: false }
  )

  // Extract items and schedule from the response
  const scheduleItems = scheduleData?.items || []
  const todaySchedule = scheduleData?.schedule || null

  // Calculate layout for overlapping items
  const itemsWithLayout = useMemo(() => {
    if (!scheduleItems || scheduleItems.length === 0) return []
    
    const items = scheduleItems.map((item: any, idx: number) => ({
      ...item,
      row: 0,
      totalRows: 1,
      originalIndex: idx,
    }))

    // Sort by start time, then by duration
    const sorted = [...items].sort((a, b) => {
      if (a.time_in !== b.time_in) return a.time_in - b.time_in
      return (b.time_out - b.time_in) - (a.time_out - a.time_in)
    })

    // Assign each item to a row where it doesn't overlap
    const rows: any[][] = []

    sorted.forEach(item => {
      let placed = false
      
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx]
        const canPlace = row.every(rowItem => {
          return item.time_in >= rowItem.time_out || item.time_out <= rowItem.time_in
        })

        if (canPlace) {
          row.push(item)
          item.row = rowIdx
          placed = true
          break
        }
      }

      if (!placed) {
        rows.push([item])
        item.row = rows.length - 1
      }
    })

    const totalRows = rows.length
    items.forEach(item => {
      item.totalRows = totalRows
    })
    
    return items
  }, [scheduleData])

  // Filter items for each row
  const row1Items = useMemo(() => {
    return itemsWithLayout.filter((item: any) => {
      const startHour = Math.floor(item.time_in / 100)
      const endHour = Math.floor(item.time_out / 100)
      return startHour < ROW1_END && endHour > ROW1_START
    })
  }, [itemsWithLayout])

  const row2Items = useMemo(() => {
    return itemsWithLayout.filter((item: any) => {
      const startHour = Math.floor(item.time_in / 100)
      const endHour = Math.floor(item.time_out / 100)
      return startHour < ROW2_END && endHour > ROW2_START
    })
  }, [itemsWithLayout])

  // Calculate position for an item in a specific row
  const getItemPositionForRow = (timeIn: number, timeOut: number, rowStart: number, rowEnd: number, rowHours: number) => {
    const startHour = Math.floor(timeIn / 100) + (timeIn % 100) / 60
    const endHour = Math.floor(timeOut / 100) + (timeOut % 100) / 60
    
    const clampedStart = Math.max(startHour, rowStart)
    const clampedEnd = Math.min(endHour, rowEnd)
    
    const startPercent = ((clampedStart - rowStart) / rowHours) * 100
    const endPercent = ((clampedEnd - rowStart) / rowHours) * 100
    
    return { 
      left: `${Math.max(0, startPercent)}%`, 
      width: `${Math.max(2, endPercent - startPercent)}%` 
    }
  }

  // Update current time every minute
  useEffect(() => {
    if (testTime) return
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeForOffset(timezoneOffset))
    }, 60000)
    return () => clearInterval(interval)
  }, [timezoneOffset, testTime])

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

  // Get location names from schedule - try multiple field names
  // API returns _expedition_locations for current location
  const currentLocationName = todaySchedule?._expedition_locations?.port ||
                               todaySchedule?._expedition_current_location?.port || 
                               todaySchedule?._current_location?.port ||
                               (todaySchedule?.current_location > 0 ? `Location ${todaySchedule.current_location}` : null)
  const destinationName = todaySchedule?._expedition_destination?.port ||
                          todaySchedule?._destination?.port ||
                          (todaySchedule?.destination > 0 ? `Destination ${todaySchedule.destination}` : null)

  // Get dish and galley team info from schedule
  const dishTeam = todaySchedule?._expedition_dish_days
  const galleyTeam = todaySchedule?._expeditions_galley_team

  // Helper to get student initials
  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?'
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-auto flex-shrink-0 bg-slate-900/80 border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-semibold text-white">
                {format(displayDate, "EEEE, MMMM d, yyyy")}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-white/60">{activeExpedition.name}</span>
                
                {/* Location info */}
                {currentLocationName && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white/80 text-xs font-medium">
                    {currentLocationName}
                    {destinationName && (
                      <span className="text-white/40"> → {destinationName}</span>
                    )}
                  </span>
                )}
                
                {/* Day Type Badge - A (Anchored/green), O (Offshore/blue), S (Service/red) */}
                {todaySchedule && (
                  <>
                    {(todaySchedule.isOffshore || todaySchedule.is_offshore) ? (
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-medium">
                        O — Offshore
                      </span>
                    ) : (todaySchedule.isService || todaySchedule.is_service) ? (
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs font-medium">
                        S — Service
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                        A — Anchored
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-3xl font-light text-white tabular-nums">
              {format(currentTime, "h:mm")}
              <span className="text-lg text-white/50 ml-1">{format(currentTime, "a")}</span>
            </p>
            {!testDate && !testTime && (
              <p className="text-xs text-green-400 font-medium">Live</p>
            )}
          </div>
        </div>
        
        {/* Sub-navigation: Dish & Galley Teams */}
        {(dishTeam || galleyTeam) && (
          <div className="flex items-start justify-between mt-3 pt-3 border-t border-white/10">
            {/* Dish Team - Left */}
            {dishTeam && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/90 font-medium">Dish Team:</span>
                  <span className="px-2 py-0.5 rounded bg-white/20 text-white text-sm font-semibold">
                    {dishTeam.dishteam?.replace('Dish Team ', '') || dishTeam.name?.replace('Dish Team ', '') || '—'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {/* Wash students */}
                  {dishTeam.wash && dishTeam.wash.filter((s: any) => s).length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-white/50 font-medium">Wash:</span>
                      <span className="text-white/80">
                        {dishTeam.wash.filter((s: any) => s).map((student: any) => 
                          `${student?.firstName || ''} ${student?.lastName?.[0] || ''}.`
                        ).join(', ')}
                      </span>
                    </div>
                  )}
                  {/* Dry students */}
                  {dishTeam.dry && dishTeam.dry.filter((s: any) => s).length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-white/50 font-medium">Dry:</span>
                      <span className="text-white/80">
                        {dishTeam.dry.filter((s: any) => s).map((student: any) => 
                          `${student?.firstName || ''} ${student?.lastName?.[0] || ''}.`
                        ).join(', ')}
                      </span>
                    </div>
                  )}
                  {/* Support staff */}
                  {dishTeam.support_staff_dishes?.name && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-white/50 font-medium">Support:</span>
                      <span className="text-white/80">{dishTeam.support_staff_dishes.name}</span>
                    </div>
                  )}
                  {/* Supervisor staff */}
                  {dishTeam.supervisor_staff_dishes?.name && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-white/50 font-medium">Supervisor:</span>
                      <span className="text-white/80">{dishTeam.supervisor_staff_dishes.name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Galley Team - Right */}
            {galleyTeam && (
              <div className="flex flex-col gap-1 items-end text-right">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/90 font-medium">Galley Team:</span>
                  <span className="px-2 py-0.5 rounded bg-white/20 text-white text-sm font-semibold">
                    {galleyTeam.name?.replace('Galley Team ', '') || '—'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
                  {/* Galley students */}
                  {galleyTeam.students_id && galleyTeam.students_id.filter((s: any) => s).length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-white/50 font-medium">Students:</span>
                      <span className="text-white/80">
                        {galleyTeam.students_id.filter((s: any) => s).map((student: any) => 
                          `${student?.firstName || ''} ${student?.lastName?.[0] || ''}.`
                        ).join(', ')}
                      </span>
                    </div>
                  )}
                  {/* Supervisor */}
                  {(galleyTeam._galley_supervisor?.name || galleyTeam.expedition_staff?.name) && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-white/50 font-medium">Supervisor:</span>
                      <span className="text-white/80">{galleyTeam._galley_supervisor?.name || galleyTeam.expedition_staff?.name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline Container - Two rows */}
      <div className="flex-1 flex flex-col pl-12 pr-6 py-2 gap-3 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-2xl text-white/50">Loading schedule...</div>
          </div>
        ) : itemsWithLayout.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-2xl text-white/50">No activities scheduled</div>
          </div>
        ) : (
          <>
            {/* Row 1: 5 AM - 2 PM */}
            <div className="flex-1 relative min-h-0">
              {/* Row label */}
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 -rotate-90 text-white/30 text-xs font-medium whitespace-nowrap">
                5AM - 2PM
              </div>
              {/* Hour markers for row 1 */}
              <div className="absolute top-0 left-0 right-0 h-6">
                {row1HourMarkers.map(({ hour, percent }) => {
                  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                  const ampm = hour >= 12 ? "PM" : "AM"
                  
                  return (
                    <div
                      key={hour}
                      className="absolute flex flex-col items-center"
                      style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
                    >
                      <div className="px-1.5 py-0.5 bg-white/10 backdrop-blur rounded text-xs font-medium text-white">
                        {hour12}
                        <span className="text-[10px] text-white/60 ml-0.5">{ampm}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Vertical grid lines for row 1 */}
              <div className="absolute top-6 left-0 right-0 bottom-0">
                {row1HourMarkers.map(({ hour, percent }) => (
                  <div
                    key={hour}
                    className="absolute w-px bg-white/10 h-full"
                    style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
                  />
                ))}
              </div>

              {/* Current time indicator for row 1 */}
              {currentTimeRow1Position && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 shadow-lg shadow-red-500/50"
                  style={{ left: currentTimeRow1Position, transform: 'translateX(-50%)' }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 border border-white" />
                </div>
              )}

              {/* Schedule items for row 1 */}
              <div className="absolute top-7 left-0 right-0 bottom-1">
                {row1Items.map((item: any) => {
                  const position = getItemPositionForRow(item.time_in, item.time_out, ROW1_START, ROW1_END, ROW1_HOURS)
                  const columnHeight = 100 / item.totalRows
                  const topOffset = item.row * columnHeight
                  const currentMilitaryTime = currentTime.getHours() * 100 + currentTime.getMinutes()
                  const isPast = item.time_out < currentMilitaryTime && !testDate
                  
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
                        "absolute bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200",
                        isPast && "opacity-40"
                      )}
                      style={{
                        left: position.left,
                        width: position.width,
                        top: `${topOffset}%`,
                        height: `${columnHeight}%`,
                      }}
                    >
                      <div className="flex flex-col h-full p-1.5">
                        <div className={cn("h-1 w-full flex-shrink-0 rounded-full", getColorForType(item))} />
                        <div className="flex-1 overflow-hidden flex flex-col min-w-0 pt-1">
                          <h3 className="font-bold text-sm text-gray-900 leading-tight truncate">{item.name}</h3>
                          <p className="text-[10px] text-gray-500">{formatTime(item.time_in)} - {formatTime(item.time_out)}</p>
                          {staffNames.length > 0 && (
                            <span className="text-[10px] text-gray-600 truncate">{staffNames.join(" • ")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Row 2: 2 PM - 11 PM */}
            <div className="flex-1 relative min-h-0">
              {/* Row label */}
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 -rotate-90 text-white/30 text-xs font-medium whitespace-nowrap">
                2PM - 11PM
              </div>
              {/* Hour markers for row 2 */}
              <div className="absolute top-0 left-0 right-0 h-6">
                {row2HourMarkers.map(({ hour, percent }) => {
                  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                  const ampm = hour >= 12 ? "PM" : "AM"
                  
                  return (
                    <div
                      key={hour}
                      className="absolute flex flex-col items-center"
                      style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
                    >
                      <div className="px-1.5 py-0.5 bg-white/10 backdrop-blur rounded text-xs font-medium text-white">
                        {hour12}
                        <span className="text-[10px] text-white/60 ml-0.5">{ampm}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Vertical grid lines for row 2 */}
              <div className="absolute top-6 left-0 right-0 bottom-0">
                {row2HourMarkers.map(({ hour, percent }) => (
                  <div
                    key={hour}
                    className="absolute w-px bg-white/10 h-full"
                    style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
                  />
                ))}
              </div>

              {/* Current time indicator for row 2 */}
              {currentTimeRow2Position && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 shadow-lg shadow-red-500/50"
                  style={{ left: currentTimeRow2Position, transform: 'translateX(-50%)' }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 border border-white" />
                </div>
              )}

              {/* Schedule items for row 2 */}
              <div className="absolute top-7 left-0 right-0 bottom-1">
                {row2Items.map((item: any) => {
                  const position = getItemPositionForRow(item.time_in, item.time_out, ROW2_START, ROW2_END, ROW2_HOURS)
                  const columnHeight = 100 / item.totalRows
                  const topOffset = item.row * columnHeight
                  const currentMilitaryTime = currentTime.getHours() * 100 + currentTime.getMinutes()
                  const isPast = item.time_out < currentMilitaryTime && !testDate
                  
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
                        "absolute bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200",
                        isPast && "opacity-40"
                      )}
                      style={{
                        left: position.left,
                        width: position.width,
                        top: `${topOffset}%`,
                        height: `${columnHeight}%`,
                      }}
                    >
                      <div className="flex flex-col h-full p-1.5">
                        <div className={cn("h-1 w-full flex-shrink-0 rounded-full", getColorForType(item))} />
                        <div className="flex-1 overflow-hidden flex flex-col min-w-0 pt-1">
                          <h3 className="font-bold text-sm text-gray-900 leading-tight truncate">{item.name}</h3>
                          <p className="text-[10px] text-gray-500">{formatTime(item.time_in)} - {formatTime(item.time_out)}</p>
                          {staffNames.length > 0 && (
                            <span className="text-[10px] text-gray-600 truncate">{staffNames.join(" • ")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer with navigation */}
      <div className="h-10 flex-shrink-0 px-6 flex items-center justify-between">
        <div className="text-xs text-white/30">
          Auto-refreshes every 30s
        </div>
        
        {/* TV Display Navigation - commented out for now
        <div className="flex items-center gap-2">
          <Link href="/tv?date=2026-01-11">
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white text-xs"
            >
              Animated
            </Button>
          </Link>
          <Link href="/tv/static?date=2026-01-11">
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-white/5 hover:bg-white/20 text-white/60 text-xs"
            >
              Static
            </Button>
          </Link>
          <Link href="/tv/vertical?date=2026-01-11">
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-white/5 hover:bg-white/20 text-white/60 text-xs"
            >
              Vertical
            </Button>
          </Link>
        </div>
        */}
      </div>
    </div>
  )
}

export default function TVDisplayPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center">
        <div className="text-white/60 text-2xl">Loading display...</div>
      </div>
    }>
      <TVDisplayContent />
    </Suspense>
  )
}
