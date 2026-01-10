"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Clock, MessageSquare, ChevronLeft, ChevronRight, MapPin, X, Calendar } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  useExpeditionSchedules,
  useExpeditionScheduleItemsByDate,
  useTeachers,
  useActiveExpedition,
} from "@/lib/hooks/use-expeditions"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

// Dynamic hours will be calculated based on scheduled items

const formatTime = (hour: number) => {
  if (hour === 0) return "12 AM"
  if (hour === 12) return "12 PM"
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

const formatMilitaryTime = (militaryTime: number) => {
  const hours = Math.floor(militaryTime / 100)
  const minutes = militaryTime % 100
  const displayHours = hours % 12 || 12
  const period = hours >= 12 ? 'PM' : 'AM'
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

const getColorForType = (item: any) => {
  const colorMap: Record<string, string> = {
    "amber": "bg-amber-500",
    "orange": "bg-orange-500",
    "red": "bg-red-500",
    "green": "bg-green-500",
    "blue": "bg-blue-500",
    "purple": "bg-purple-500",
    "teal": "bg-teal-500",
    "pink": "bg-pink-500",
    "indigo": "bg-indigo-500",
    "cyan": "bg-cyan-500",
    "yellow": "bg-yellow-500",
    "lime": "bg-lime-500",
    "emerald": "bg-emerald-500",
    "sky": "bg-sky-500",
    "violet": "bg-violet-500",
    "fuchsia": "bg-fuchsia-500",
    "rose": "bg-rose-500",
    "slate": "bg-slate-500",
    "gray": "bg-gray-500",
    "zinc": "bg-zinc-500",
    "neutral": "bg-neutral-500",
    "stone": "bg-stone-500",
  }
  const color = item?._expedition_schedule_item_types?.color
  if (color && colorMap[color]) {
    return colorMap[color]
  }
  return 'bg-gray-400'
}

export default function PublicSchedulePage() {
  const router = useRouter()
  const params = useParams()
  
  const date = params.date as string
  
  const timelineRef = useRef<HTMLDivElement>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Fetch active expedition
  const { data: activeExpedition, isLoading: loadingActiveExpedition } = useActiveExpedition()
  const expeditionId = activeExpedition?.id

  const { data: schedules, isLoading: loadingSchedules } = useExpeditionSchedules(expeditionId)
  const { data: scheduleItems, isLoading: loadingItems } = useExpeditionScheduleItemsByDate(date, expeditionId, {
    refreshInterval: 30000, // Auto-refresh every 30 seconds
    revalidateOnFocus: true,
  })
  const { data: staff } = useTeachers()

  const currentDate = useMemo(() => {
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day)
  }, [date])

  const goToPrevDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 1)
    const dateStr = newDate.toISOString().split('T')[0]
    router.push(`/public/schedule/${dateStr}`)
  }

  const goToNextDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    const dateStr = newDate.toISOString().split('T')[0]
    router.push(`/public/schedule/${dateStr}`)
  }

  const handleDateChange = (newDate: Date) => {
    const dateStr = newDate.toISOString().split('T')[0]
    router.push(`/public/schedule/${dateStr}`)
    setCalendarOpen(false)
  }

  const goToToday = () => {
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const day = String(now.getUTCDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    router.push(`/public/schedule/${dateStr}`)
  }

  // Find schedule by date
  const schedule = useMemo(() => {
    if (!schedules) return null
    return schedules.find((s: any) => s.date === date)
  }, [schedules, date])

  const sortedItems = useMemo(() => {
    if (!scheduleItems || !Array.isArray(scheduleItems)) return []
    return [...scheduleItems].sort((a: any, b: any) => {
      if (a.time_in === 0 && b.time_in === 0) return 0
      if (a.time_in === 0) return 1
      if (b.time_in === 0) return -1
      return a.time_in - b.time_in
    })
  }, [scheduleItems])

  const scheduledItems = useMemo(() => {
    return sortedItems.filter((item: any) => item.time_in !== 0 && item.time_out !== 0)
  }, [sortedItems])

  const unscheduledItems = useMemo(() => {
    return sortedItems.filter((item: any) => item.time_in === 0 || item.time_out === 0)
  }, [sortedItems])

  // Calculate dynamic hour range based on scheduled items
  const { dynamicHours, startHourOffset, totalHours } = useMemo(() => {
    if (scheduledItems.length === 0) {
      // Default range if no items
      return {
        dynamicHours: Array.from({ length: 16 }, (_, i) => i + 6), // 6 AM to 9 PM
        startHourOffset: 6,
        totalHours: 16
      }
    }

    // Find earliest start time and latest end time
    let earliestStart = 2400
    let latestEnd = 0

    scheduledItems.forEach((item: any) => {
      if (item.time_in < earliestStart) earliestStart = item.time_in
      if (item.time_out > latestEnd) latestEnd = item.time_out
    })

    // Convert to hours (floor for start, ceil for end)
    const startHour = Math.floor(earliestStart / 100)
    const endHour = Math.ceil(latestEnd / 100)

    // Add padding: 1 hour before and after
    const paddedStart = Math.max(0, startHour)
    const paddedEnd = Math.min(24, endHour + 1)

    const hours = Array.from(
      { length: paddedEnd - paddedStart },
      (_, i) => paddedStart + i
    )

    return {
      dynamicHours: hours,
      startHourOffset: paddedStart,
      totalHours: paddedEnd - paddedStart
    }
  }, [scheduledItems])

  const formatLocation = (location: any) => {
    if (!location) return "—"
    return `${location.port}, ${location.country}`
  }

  const formatDateDisplay = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const getItemPosition = (timeIn: number, timeOut: number) => {
    const itemStartHour = Math.floor(timeIn / 100)
    const startMinute = timeIn % 100
    const itemEndHour = Math.floor(timeOut / 100)
    const endMinute = timeOut % 100
    
    const startMinutesFromStart = (itemStartHour - startHourOffset) * 60 + startMinute
    const endMinutesFromStart = (itemEndHour - startHourOffset) * 60 + endMinute
    
    const totalMinutes = totalHours * 60
    const startPos = (startMinutesFromStart / totalMinutes) * 100
    const endPos = (endMinutesFromStart / totalMinutes) * 100
    const height = endPos - startPos
    
    return {
      top: `${startPos}%`,
      height: `${height}%`,
    }
  }

  const getDuration = (timeIn: number, timeOut: number) => {
    const startMinutes = Math.floor(timeIn / 100) * 60 + (timeIn % 100)
    const endMinutes = Math.floor(timeOut / 100) * 60 + (timeOut % 100)
    const totalMinutes = endMinutes - startMinutes
    
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h`
    return `${minutes}m`
  }

  const getDurationMinutes = (timeIn: number, timeOut: number) => {
    const startMinutes = Math.floor(timeIn / 100) * 60 + (timeIn % 100)
    const endMinutes = Math.floor(timeOut / 100) * 60 + (timeOut % 100)
    return endMinutes - startMinutes
  }

  const getItemsWithLayout = (items: any[]) => {
    if (items.length === 0) return []
    
    const itemsWithLayout = items.map((item, idx) => ({ 
      ...item, 
      column: 0, 
      totalColumns: 1,
      originalIndex: idx 
    }))
    
    const sorted = [...itemsWithLayout].sort((a, b) => {
      if (a.time_in !== b.time_in) return a.time_in - b.time_in
      return (b.time_out - b.time_in) - (a.time_out - a.time_in)
    })
    
    const groups: any[][] = []
    let currentGroup: any[] = []
    
    sorted.forEach((item) => {
      if (currentGroup.length === 0) {
        currentGroup.push(item)
      } else {
        const overlapsWithGroup = currentGroup.some(groupItem => {
          const startsBeforeOtherEnds = item.time_in < groupItem.time_out
          const endsAfterOtherStarts = item.time_out > groupItem.time_in
          return startsBeforeOtherEnds && endsAfterOtherStarts
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
    
    groups.forEach(group => {
      if (group.length === 1) {
        group[0].column = 0
        group[0].totalColumns = 1
        return
      }
      
      const columns: any[][] = []
      
      group.forEach(item => {
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
      group.forEach(item => {
        item.totalColumns = totalColumns
      })
    })
    
    return itemsWithLayout.sort((a, b) => a.originalIndex - b.originalIndex)
  }

  const getStatusInfo = () => {
    if (schedule?.isService || schedule?.is_service) {
      return {
        text: "S",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-700"
      }
    }
    if (schedule?.isOffshore || schedule?.is_offshore) {
      return {
        text: "O",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-700"
      }
    }
    return {
      text: "A",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700"
    }
  }

  const statusInfo = getStatusInfo()
  
  // Get staff off names
  const getStaffOffNames = () => {
    if (!schedule?.staff_off || schedule.staff_off.length === 0) return null
    // staff_off contains staff IDs, we need to look them up
    // For now, just return the count if we can't resolve names
    return schedule.staff_off
  }

  const isLoadingData = loadingActiveExpedition || loadingItems || loadingSchedules

  // Check if currently viewing today
  const isToday = useMemo(() => {
    const now = new Date()
    const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
    return date === todayStr
  }, [date])

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Compact Header with Date Navigation */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          {/* Date row */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={goToPrevDay}
              className="h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-auto py-2 px-5 gap-2 flex-1 min-w-0 cursor-pointer border border-gray-300 rounded-full hover:bg-gray-50"
                >
                  <span className="text-lg font-semibold text-gray-900">
                    {formatDateDisplay(currentDate)}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <CalendarComponent
                  mode="single"
                  selected={currentDate}
                  defaultMonth={currentDate}
                  onSelect={(selectedDate) => {
                    if (selectedDate) {
                      handleDateChange(selectedDate)
                    }
                  }}
                  initialFocus
                  className="rounded-md border shadow-md"
                />
              </PopoverContent>
            </Popover>

            <button
              onClick={goToNextDay}
              className="h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Status pills row */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {schedule && (
              <>
                <span className={`inline-flex items-center justify-center h-7 w-7 text-xs font-bold rounded-full ${statusInfo.bgColor} ${statusInfo.borderColor} border ${statusInfo.textColor} flex-shrink-0`}>
                  {statusInfo.text}
                </span>
                {schedule._expedition_current_location && (
                  <span className="inline-flex items-center gap-1 h-7 text-xs font-medium px-3 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 flex-shrink-0">
                    <MapPin className="h-3 w-3" />
                    {formatLocation(schedule._expedition_current_location)}
                  </span>
                )}
                {schedule.staff_off && schedule.staff_off.length > 0 && staff && (
                  <div 
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-orange-50 border border-orange-200"
                    title={`Off: ${schedule.staff_off.map((id: number) => staff?.find((s: any) => s.id === id)?.name || 'Unknown').join(', ')}`}
                  >
                    <span className="text-xs font-medium text-orange-700">Off:</span>
                    <div className="flex -space-x-1.5">
                      {schedule.staff_off.slice(0, 4).map((id: number) => {
                        const staffMember = staff?.find((s: any) => s.id === id)
                        const initials = staffMember?.name?.split(' ').map((n: string) => n[0]).join('') || '?'
                        return (
                          <Avatar key={id} className="h-5 w-5 border-2 border-orange-50">
                            <AvatarFallback className="bg-orange-200 text-orange-800 text-[9px] font-medium">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        )
                      })}
                      {schedule.staff_off.length > 4 && (
                        <Avatar className="h-5 w-5 border-2 border-orange-50">
                          <AvatarFallback className="bg-orange-200 text-orange-800 text-[9px] font-medium">
                            +{schedule.staff_off.length - 4}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 py-4">
        {isLoadingData ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Spinner size="sm" />
              <p className="text-sm text-gray-500">Loading schedule...</p>
            </div>
          </div>
        ) : !schedule ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No schedule found for this date</p>
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No activities scheduled</p>
          </div>
        ) : (
          <>
            {/* Unscheduled Items */}
            {unscheduledItems.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Unscheduled
                </h2>
                <div className="space-y-2">
                  {unscheduledItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="relative rounded-lg border border-gray-200 p-3 bg-white cursor-pointer active:bg-gray-50 transition-colors"
                      onClick={() => {
                        setSelectedItem(item)
                        setDialogOpen(true)
                      }}
                    >
                      {item.notes && (
                        <div className="absolute top-3 right-3 text-gray-400">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </div>
                      )}
                      
                      <div className="flex gap-2.5">
                        <div className={`w-1 rounded-full ${getColorForType(item)} flex-shrink-0`} />
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-gray-900 line-clamp-1">
                            {item._expedition_schedule_item_types?.name || item.name}
                          </h3>
                          {item._expedition_staff && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {item._expedition_staff.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {scheduledItems.length > 0 && (
              <div className="relative">
                <div className="flex">
                  <div className="w-14 flex-shrink-0" />
                  <div ref={timelineRef} className="flex-1 relative" style={{ minHeight: `${totalHours * 90}px` }}>
                    {/* Hour lines */}
                    {dynamicHours.map((hour, idx) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-gray-200"
                        style={{ top: `${(idx / totalHours) * 100}%` }}
                      >
                        <div className="absolute -left-14 w-14 pr-2 text-right -mt-2.5">
                          <span className="text-xs font-medium text-gray-400">
                            {formatTime(hour)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Schedule items */}
                    {getItemsWithLayout(scheduledItems).map((item: any) => {
                      const position = getItemPosition(item.time_in, item.time_out)
                      const widthPercent = 100 / item.totalColumns
                      const leftPercent = item.column * widthPercent
                      
                      // Calculate duration in minutes for responsive styling
                      const durationMins = getDurationMinutes(item.time_in, item.time_out)
                      const isCompact = durationMins <= 30
                      const isVeryCompact = durationMins <= 15
                      // Check if card is narrow (3+ columns)
                      const isNarrow = item.totalColumns >= 3
                      const isVeryNarrow = item.totalColumns >= 4
                      
                      return (
                        <div
                          key={item.id}
                          className="absolute px-0.5"
                          style={{
                            top: position.top,
                            height: position.height,
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                        >
                          <div
                            className={`h-full rounded-lg border border-gray-200 bg-white overflow-hidden cursor-pointer hover:shadow-lg active:bg-gray-50 transition-all group ${isCompact || isNarrow ? 'p-1.5' : 'p-3'}`}
                            onClick={() => {
                              setSelectedItem(item)
                              setDialogOpen(true)
                            }}
                            title={item.name}
                          >
                            {/* Duration + Staff initials - top right (hide staff on very narrow) */}
                            <div className={`absolute ${isCompact || isNarrow ? 'top-1 right-1.5' : 'top-2 right-4'} flex items-center gap-1`}>
                              {/* Participating staff initials - hide on very narrow */}
                              {!isVeryNarrow && item.participants && item.participants.length > 0 && (
                                <div className="flex -space-x-1">
                                  {item.participants.slice(0, isNarrow ? 1 : 3).map((p: any, idx: number) => (
                                    <div
                                      key={p.id || idx}
                                      className={`${isCompact || isNarrow ? 'h-3.5 w-3.5 text-[6px]' : 'h-5 w-5 text-[8px]'} rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-medium border border-white`}
                                      title={p.name}
                                    >
                                      {p.name?.split(" ").map((n: string) => n[0]).join("")}
                                    </div>
                                  ))}
                                  {!isNarrow && item.participants.length > 3 && (
                                    <div className="h-5 w-5 text-[8px] rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-medium border border-white">
                                      +{item.participants.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Led by staff initial - hide on very narrow */}
                              {!isVeryNarrow && item._expedition_staff && !item.participants?.length && (
                                <div
                                  className={`${isCompact || isNarrow ? 'h-3.5 w-3.5 text-[6px]' : 'h-5 w-5 text-[8px]'} rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-medium`}
                                  title={item._expedition_staff.name}
                                >
                                  {item._expedition_staff.name?.split(" ").map((n: string) => n[0]).join("")}
                                </div>
                              )}
                              <span className={`${isNarrow ? 'text-[8px]' : 'text-[10px]'} text-gray-500 font-medium`}>
                                {getDuration(item.time_in, item.time_out)}
                              </span>
                            </div>

                            {/* Notes icon - bottom right (hide on compact/narrow) */}
                            {item.notes && !isVeryCompact && !isNarrow && (
                              <div className={`absolute ${isCompact ? 'bottom-1.5 right-2' : 'bottom-3 right-3'} text-gray-400 z-20`}>
                                <MessageSquare className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'}`} />
                              </div>
                            )}

                            <div className="relative z-10 flex gap-1.5 h-full overflow-hidden">
                              <div className={`w-1 rounded-full ${getColorForType(item)} flex-shrink-0`} />
                              
                              <div className={`flex-1 min-w-0 overflow-hidden ${isVeryNarrow ? 'pr-6' : isNarrow ? 'pr-8' : 'pr-16'}`}>
                                {isVeryCompact || isVeryNarrow ? (
                                  // Very compact or very narrow: just title, smaller text
                                  <h3 className={`font-semibold ${isVeryNarrow ? 'text-[9px]' : 'text-xs'} text-gray-900 truncate leading-tight`}>
                                    {item.name}
                                  </h3>
                                ) : isCompact || isNarrow ? (
                                  // Compact or narrow: title + time
                                  <>
                                    <h3 className={`font-semibold ${isNarrow ? 'text-[10px]' : 'text-xs'} text-gray-900 truncate`}>
                                      {item.name}
                                    </h3>
                                    {!isNarrow && (
                                      <p className="text-[10px] text-gray-600 truncate">
                                        {formatMilitaryTime(item.time_in)} - {formatMilitaryTime(item.time_out)}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  // Full: all details
                                  <>
                                    <h3 className="font-semibold text-xs text-gray-900 mb-0.5 truncate">
                                      {item.name}
                                    </h3>
                                    <p className="text-[10px] text-gray-600 mb-1">
                                      {formatMilitaryTime(item.time_in)} - {formatMilitaryTime(item.time_out)}
                                    </p>
                                    {item._expedition_staff && (
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Avatar className="h-4 w-4">
                                          <AvatarFallback className="text-[7px] bg-gray-200 text-gray-700">
                                            {item._expedition_staff.name?.split(" ").map((n: string) => n[0]).join("")}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[10px] text-gray-500 truncate">
                                          {item._expedition_staff.name}
                                        </span>
                                      </div>
                                    )}
                                    {item.address && (
                                      <p className="text-[10px] text-gray-500 truncate">
                                        {item.address}
                                      </p>
                                    )}
                                    {item.notes && (
                                      <p className="text-[10px] text-gray-600 truncate mt-1">
                                        {item.notes}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Activity Detail Modal - Mobile Optimized */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-md p-0 border-0 bg-white overflow-hidden gap-0 max-h-[80vh] flex flex-col rounded-xl" showCloseButton={false}>
          {selectedItem && (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg font-semibold text-gray-900 leading-tight">
                      {selectedItem.name}
                    </DialogTitle>
                    {selectedItem.time_in !== 0 && selectedItem.time_out !== 0 && (
                      <DialogDescription className="text-sm text-gray-500 mt-0.5">
                        {formatMilitaryTime(selectedItem.time_in)} – {formatMilitaryTime(selectedItem.time_out)} · {getDuration(selectedItem.time_in, selectedItem.time_out)}
                      </DialogDescription>
                    )}
                  </div>
                  <button
                    onClick={() => setDialogOpen(false)}
                    className="rounded-full p-2.5 -mr-1 -mt-1 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer flex-shrink-0"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Led By */}
                {selectedItem._expedition_staff && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                      Led By
                    </p>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
                          {selectedItem._expedition_staff.name?.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-900 block truncate">
                          {selectedItem._expedition_staff.name}
                        </span>
                        {selectedItem._expedition_staff.email && (
                          <p className="text-xs text-gray-500 truncate">{selectedItem._expedition_staff.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Participants */}
                {selectedItem.participants && selectedItem.participants.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                      Participants ({selectedItem.participants.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.participants.map((participant: any) => (
                        <span
                          key={participant.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-700"
                        >
                          <span className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[9px] text-gray-600 flex-shrink-0">
                            {participant.name?.split(" ").map((n: string) => n[0]).join("")}
                          </span>
                          {participant.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location */}
                {selectedItem.address && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                      Location
                    </p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(selectedItem.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {selectedItem.address}
                    </a>
                  </div>
                )}

                {/* Notes */}
                {selectedItem.notes && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                      Notes
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedItem.notes}
                    </p>
                  </div>
                )}

                {/* Things to Bring */}
                {selectedItem.things_to_bring && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                      Things to Bring
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedItem.things_to_bring}
                    </p>
                  </div>
                )}

                {/* Empty state when no additional details */}
                {!selectedItem._expedition_staff && 
                 !selectedItem.address && 
                 !selectedItem.notes && 
                 !selectedItem.things_to_bring && 
                 (!selectedItem.participants || selectedItem.participants.length === 0) && (
                  <p className="text-sm text-gray-400 italic">No additional details available.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
