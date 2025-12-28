"use client"

import { useMemo, useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { getActiveExpedition, getExpeditionScheduleItemsByDate } from "@/lib/xano"
import useSWR from "swr"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// Timeline constants - 24 hour display from 5 AM to 5 AM next day
const TIMELINE_START_HOUR = 5 // 5 AM
const TIMELINE_END_HOUR = 29 // 5 AM next day (24 + 5)
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR // 24 hours

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

function TVDisplayContent() {
  const searchParams = useSearchParams()
  const testDate = searchParams.get('date')
  
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

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

  // Current time
  const [currentTime, setCurrentTime] = useState(() => getCurrentTimeForOffset(timezoneOffset))

  // Fetch schedule items
  const { data: scheduleItems, isLoading: loadingItems } = useSWR(
    activeExpedition ? `tv_schedule_${todayDate}_${activeExpedition.id}` : null,
    activeExpedition ? () => getExpeditionScheduleItemsByDate(todayDate, activeExpedition.id) : null,
    { refreshInterval: 30000, revalidateOnFocus: false }
  )

  // Get schedule info from first item
  const todaySchedule = useMemo(() => {
    if (!scheduleItems || !Array.isArray(scheduleItems) || scheduleItems.length === 0) return null
    return scheduleItems[0]?._expedition_schedule || null
  }, [scheduleItems])

  // Calculate layout for overlapping items
  const itemsWithLayout = useMemo(() => {
    if (!scheduleItems || !Array.isArray(scheduleItems)) return []
    
    const filtered = scheduleItems
      .filter((item: any) => item.time_in !== 0 && item.time_out !== 0)
      .sort((a: any, b: any) => a.time_in - b.time_in)
    
    if (filtered.length === 0) return []
    
    // Add layout properties
    const items = filtered.map((item: any) => ({ ...item, row: 0, totalRows: 1 }))
    
    // Find overlapping groups and assign rows
    const groups: any[][] = []
    let currentGroup: any[] = []
    
    items.forEach((item: any) => {
      if (currentGroup.length === 0) {
        currentGroup.push(item)
      } else {
        const overlapsWithGroup = currentGroup.some((groupItem: any) => {
          return item.time_in < groupItem.time_out && item.time_out > groupItem.time_in
        })
        
        if (overlapsWithGroup) {
          currentGroup.push(item)
        } else {
          groups.push(currentGroup)
          currentGroup = [item]
        }
      }
    })
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup)
    }
    
    // Assign rows within each group
    groups.forEach(group => {
      if (group.length === 1) {
        group[0].row = 0
        group[0].totalRows = 1
        return
      }
      
      const rows: any[][] = []
      
      group.forEach((item: any) => {
        let placed = false
        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
          const row = rows[rowIdx]
          const canPlace = row.every((rowItem: any) => 
            item.time_in >= rowItem.time_out || item.time_out <= rowItem.time_in
          )
          
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
      
      group.forEach((item: any) => {
        item.totalRows = rows.length
      })
    })
    
    return items
  }, [scheduleItems])

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeForOffset(timezoneOffset))
    }, 60000)
    return () => clearInterval(interval)
  }, [timezoneOffset])

  // Auto-scroll - seamless infinite treadmill scrolling
  // We render the timeline twice and when we reach the end of the first copy, we reset to 0
  useEffect(() => {
    if (isPaused || itemsWithLayout.length === 0) return
    
    const scrollInterval = setInterval(() => {
      if (containerRef.current) {
        const container = containerRef.current
        // Each copy is exactly 250vw, get the actual pixel width of one copy
        const singleCopyWidth = container.scrollWidth / 2
        
        if (singleCopyWidth <= 0) return
        
        // Read actual scroll position to stay in sync
        const currentScroll = container.scrollLeft
        
        // When we've scrolled past the first copy, instantly reset to start
        // This creates the seamless treadmill effect
        if (currentScroll >= singleCopyWidth) {
          container.scrollLeft = 0
          setScrollPosition(0)
        } else {
          const newPosition = currentScroll + 1 // Scroll speed (1px per frame)
          container.scrollLeft = newPosition
          setScrollPosition(newPosition)
        }
      }
    }, 16) // ~60fps for smooth animation
    
    return () => clearInterval(scrollInterval)
  }, [isPaused, itemsWithLayout.length])

  // Calculate position for an item
  const getItemPosition = (timeIn: number, timeOut: number) => {
    const startHour = Math.floor(timeIn / 100)
    const startMinutes = timeIn % 100
    const endHour = Math.floor(timeOut / 100)
    const endMinutes = timeOut % 100
    const startPercent = ((startHour - TIMELINE_START_HOUR) * 60 + startMinutes) / (TOTAL_HOURS * 60) * 100
    const endPercent = ((endHour - TIMELINE_START_HOUR) * 60 + endMinutes) / (TOTAL_HOURS * 60) * 100
    return { left: `${Math.max(0, startPercent)}%`, width: `${Math.max(3, endPercent - startPercent)}%` }
  }

  // Current time position - handles wrap-around for times past midnight
  const currentTimePosition = useMemo(() => {
    let hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    
    // If it's early morning (before timeline start), treat as next day hours
    if (hours < TIMELINE_START_HOUR) {
      hours = hours + 24
    }
    
    // Check if within visible range
    if (hours < TIMELINE_START_HOUR || hours >= TIMELINE_END_HOUR) return null
    
    const percent = ((hours - TIMELINE_START_HOUR) * 60 + minutes) / (TOTAL_HOURS * 60) * 100
    return `${percent}%`
  }, [currentTime])

  // Hour markers - don't include end hour to avoid duplicate at loop point
  const hourMarkers = useMemo(() => {
    const markers = []
    for (let hour = TIMELINE_START_HOUR; hour < TIMELINE_END_HOUR; hour++) {
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
    <div 
      className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden"
      onClick={() => setIsPaused(!isPaused)}
    >
      {/* Header - dark navy style */}
      <div className="h-[12vh] bg-slate-900/80 border-b border-white/10 flex items-center justify-between px-10">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-4xl font-bold text-white">
              {format(displayDate, "EEEE, MMMM d, yyyy")}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-lg text-white/70">{activeExpedition.name}</span>
              
              {/* Location info */}
              {currentLocationName && (
                <span className="px-3 py-1 rounded-md bg-white/10 text-white/90 text-sm font-medium">
                  {currentLocationName}
                  {destinationName && (
                    <span className="text-white/50"> → {destinationName}</span>
                  )}
                </span>
              )}
              
              {/* Status badges - inline, rounded, no emojis */}
              {todaySchedule?.isOffshore && (
                <span className="px-3 py-1 rounded-md bg-cyan-500/20 text-cyan-300 text-sm font-medium">
                  Offshore
                </span>
              )}
              {!todaySchedule?.isOffshore && todaySchedule && (
                <span className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-sm font-medium">
                  In Port
                </span>
              )}
              {todaySchedule?.isService && (
                <span className="px-3 py-1 rounded-md bg-purple-500/20 text-purple-300 text-sm font-medium">
                  Service Day
                </span>
              )}
              {todaySchedule?.nautical_miles > 0 && (
                <span className="px-3 py-1 rounded-md bg-blue-500/20 text-blue-300 text-sm font-medium">
                  {todaySchedule.nautical_miles} NM
                </span>
              )}
              {testDate && (
                <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-300 text-sm font-medium">
                  Test Mode
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-5xl font-light text-white tabular-nums">
            {format(currentTime, "h:mm")}
            <span className="text-2xl text-white/50 ml-2">{format(currentTime, "a")}</span>
          </p>
          {!testDate && (
            <p className="text-lg text-green-400 font-medium">Live</p>
          )}
        </div>
      </div>

      {/* Timeline Container - infinite scroll with duplicated content */}
      <div 
        ref={containerRef}
        className="h-[88vh] overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ scrollBehavior: "auto" }}
      >
        {/* Two copies of the timeline for seamless looping */}
        <div className="h-full flex" style={{ width: "500vw" }}>
          {[0, 1].map((copyIndex) => (
            <div key={copyIndex} className="h-full relative py-6 flex-shrink-0" style={{ width: "250vw" }}>
              {/* Hour markers */}
              <div className="absolute top-6 left-0 right-0 h-12 px-10">
                {hourMarkers.map(({ hour, percent }) => {
                  // Handle hours that wrap past midnight (24+)
                  const displayHour = hour >= 24 ? hour - 24 : hour
                  const hour12 = displayHour > 12 ? displayHour - 12 : displayHour === 0 ? 12 : displayHour
                  const ampm = displayHour >= 12 && displayHour < 24 ? "PM" : "AM"
                  
                  return (
                    <div
                      key={`${copyIndex}-${hour}`}
                      className="absolute flex flex-col items-center"
                      style={{ left: `${percent}%` }}
                    >
                      <div className="px-3 py-1.5 bg-white/10 backdrop-blur rounded-lg text-lg font-medium text-white">
                        {hour12}
                        <span className="text-sm text-white/60 ml-1">
                          {ampm}
                        </span>
                      </div>
                      <div className="w-px h-[70vh] bg-white/10 mt-3" />
                    </div>
                  )
                })}
              </div>

              {/* Current time indicator line - only show on first copy */}
              {copyIndex === 0 && currentTimePosition && (
                <div
                  className="absolute top-6 bottom-6 w-1 bg-red-500 z-50 shadow-lg shadow-red-500/50"
                  style={{ left: `calc(2.5rem + ${currentTimePosition})` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg" />
                  <div className="absolute top-0 left-4 bg-red-500 text-white text-sm font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    {format(currentTime, "h:mm a")}
                  </div>
                </div>
              )}

              {/* Schedule items - card style with dark theme */}
              <div className="absolute top-24 left-0 right-0 bottom-6 px-10">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-3xl text-white/50">Loading schedule...</div>
              </div>
            ) : itemsWithLayout.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-3xl text-white/50">No activities scheduled</div>
              </div>
            ) : (
              <div className="relative h-full">
                {itemsWithLayout.map((item: any) => {
                  const position = getItemPosition(item.time_in, item.time_out)
                  const rowHeight = 100 / item.totalRows
                  const topOffset = item.row * rowHeight
                  
                  // Check if item is in the past (ended before current time)
                  const currentMilitaryTime = currentTime.getHours() * 100 + currentTime.getMinutes()
                  const isPast = item.time_out < currentMilitaryTime && !testDate
                  
                  // Truncate notes to max 120 characters
                  const truncatedNotes = item.notes && item.notes.length > 120 
                    ? item.notes.substring(0, 120) + "..." 
                    : item.notes
                  
                  // Truncate things to bring to max 60 characters
                  const truncatedThings = item.things_to_bring && item.things_to_bring.length > 60
                    ? item.things_to_bring.substring(0, 60) + "..."
                    : item.things_to_bring
                  
                  // Build staff display with participants
                  const staffNames: string[] = []
                  if (item._expedition_staff?.name) staffNames.push(item._expedition_staff.name)
                  if (item.participants?.length > 0) {
                    item.participants.slice(0, 2).forEach((p: any) => {
                      if (p.name && p.name !== item._expedition_staff?.name) {
                        staffNames.push(p.name.split(' ')[0]) // First name only
                      }
                    })
                  }
                  
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "absolute bg-white rounded-2xl shadow-xl overflow-hidden p-4 border-4 border-gray-200 transition-opacity duration-300",
                        isPast && "opacity-40"
                      )}
                      style={{
                        left: position.left,
                        width: position.width,
                        top: `calc(${topOffset}% + 8px)`,
                        height: `calc(${rowHeight}% - 16px)`,
                        minWidth: "280px",
                      }}
                    >
                      <div className="flex h-full gap-4">
                        {/* Color bar - padded inside with rounded corners */}
                        <div className={cn("w-1.5 flex-shrink-0 rounded-full", getColorForType(item))} />
                        
                        {/* Content */}
                        <div className="flex-1 py-2 pr-2 overflow-hidden flex flex-col">
                          {/* Title */}
                          <h3 className="font-bold text-3xl text-gray-900 truncate mb-1">
                            {item.name}
                          </h3>
                          
                          {/* Time */}
                          <p className="text-2xl text-gray-500 mb-3">
                            {formatTime(item.time_in)} - {formatTime(item.time_out)}
                          </p>

                          {/* Staff with avatar */}
                          {staffNames.length > 0 && (
                            <div className="flex items-center gap-3 mb-5">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="text-base bg-gray-100 text-gray-600 font-medium">
                                  {item._expedition_staff?.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xl text-gray-700 truncate">
                                {staffNames.join(" • ")}
                              </span>
                            </div>
                          )}

                          {/* Address */}
                          {item.address && (
                            <p className="text-xl text-gray-600 mb-4 line-clamp-1 truncate">
                              {item.address}
                            </p>
                          )}

                          {/* Things to bring */}
                          {truncatedThings && (
                            <p className="text-xl text-gray-600 mb-4 truncate">
                              {truncatedThings}
                            </p>
                          )}

                          {/* Notes */}
                          {truncatedNotes && (
                            <p className="text-lg text-gray-500 line-clamp-2 flex-1">
                              {truncatedNotes}
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
          ))}
        </div>
      </div>

      {/* Pause indicator */}
      {isPaused && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-white/20 backdrop-blur text-white text-lg font-medium">
          Paused - Click to resume
        </div>
      )}

      {/* Refresh indicator */}
      <div className="absolute bottom-4 right-6 text-sm text-white/30">
        Auto-refreshes every 30s
      </div>
    </div>
  )
}

export default function TVDisplayPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[100] bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-2xl">Loading display...</div>
      </div>
    }>
      <TVDisplayContent />
    </Suspense>
  )
}
