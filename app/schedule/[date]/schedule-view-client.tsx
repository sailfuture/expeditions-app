"use client"

import { useMemo, useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ExpeditionHeader } from "@/components/expedition-header"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Clock, User, MessageSquare, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Settings, MapPin, ClipboardList } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DateNavigation } from "@/components/date-navigation"
import { AddScheduleItemSheet } from "@/components/add-schedule-item-sheet"
import { DraggableScheduleItem } from "@/components/draggable-schedule-item"
import { ScheduleDragContext } from "@/components/schedule-drag-context"
import {
  useExpeditionSchedules,
  useExpeditionScheduleItemsByDate,
  useExpeditionScheduleTemplates,
  useTeachers,
} from "@/lib/hooks/use-expeditions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addExpeditionScheduleTemplate, deleteExpeditionScheduleItem } from "@/lib/xano"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import { mutate } from "swr"
import { toast } from "sonner"
import { isDateWithinExpeditionRange } from "@/lib/utils"

interface ScheduleViewClientProps {
  date: string
  expeditionId?: number
}

const HOURS = Array.from({ length: 20 }, (_, i) => i + 4) // 4 AM to 11 PM

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
  // Map color names to Tailwind classes (Tailwind needs static class names)
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

export function ScheduleViewClient({ date, expeditionId }: ScheduleViewClientProps) {
  const router = useRouter()
  const timelineRef = useRef<HTMLDivElement>(null)
  const { currentUser } = useCurrentUser()
  const { activeExpedition, userExpeditions } = useExpeditionContext()
  const { data: allExpeditionsData } = useExpeditions()
  
  // Use expedition ID from URL if provided, otherwise fall back to active expedition
  const effectiveExpeditionId = expeditionId || activeExpedition?.id
  
  // Find the expedition to display - prioritize URL parameter, fetch full data with term info
  const displayExpedition = useMemo(() => {
    if (expeditionId && allExpeditionsData) {
      const expeditionFromUrl = allExpeditionsData.find((e: any) => e.id === expeditionId)
      if (expeditionFromUrl) return expeditionFromUrl
    }
    if (expeditionId && userExpeditions) {
      const expeditionFromUrl = userExpeditions.find((e: any) => e.id === expeditionId)
      if (expeditionFromUrl) return expeditionFromUrl
    }
    return activeExpedition
  }, [expeditionId, allExpeditionsData, userExpeditions, activeExpedition])
  
  const { data: schedules, isLoading: loadingSchedules } = useExpeditionSchedules(effectiveExpeditionId)
  const { data: scheduleItems, isLoading: loadingItems } = useExpeditionScheduleItemsByDate(date, effectiveExpeditionId)
  const { data: templates, isLoading: loadingTemplates } = useExpeditionScheduleTemplates()
  const { data: staff } = useTeachers()
  
  // Edit mode - only admins can enable this
  const isAdmin = currentUser?.role === "Admin"
  const [editMode, setEditMode] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [addingTemplate, setAddingTemplate] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [showModalDeleteConfirm, setShowModalDeleteConfirm] = useState(false)
  const [deletingFromModal, setDeletingFromModal] = useState(false)
  const [resizingItemId, setResizingItemId] = useState<number | null>(null)
  const [localItemUpdates, setLocalItemUpdates] = useState<Record<number, { time_in: number; time_out: number }>>({})

  // Handle optimistic updates from drag/resize
  const handleItemUpdate = useCallback((itemId: number, timeIn: number, timeOut: number) => {
    setLocalItemUpdates(prev => ({
      ...prev,
      [itemId]: { time_in: timeIn, time_out: timeOut }
    }))
  }, [])

  // Clear local updates when data refreshes from server
  // This ensures optimistic updates don't persist after API sync
  useEffect(() => {
    if (scheduleItems) {
      setLocalItemUpdates({})
    }
  }, [scheduleItems])

  const handleItemClick = (item: any) => {
    setSelectedItem(item)
    setDialogOpen(true)
  }

  const handleEditItem = (item: any) => {
    setEditingItem(item)
    setAddSheetOpen(true)
  }

  const handleSheetClose = (open: boolean) => {
    setAddSheetOpen(open)
    if (!open) {
      setEditingItem(null)
    }
  }

  const handleModalEdit = () => {
    if (selectedItem) {
      setDialogOpen(false)
      handleEditItem(selectedItem)
    }
  }

  const handleModalDeleteConfirm = async () => {
    if (!selectedItem) return

    setDeletingFromModal(true)
    setShowModalDeleteConfirm(false)
    try {
      await deleteExpeditionScheduleItem(selectedItem.id)
      await mutate(`expedition_schedule_items_date_${date}_${effectiveExpeditionId || 'all'}`)
      toast.success("Activity deleted")
      setDialogOpen(false)
      setSelectedItem(null)
    } catch (error) {
      console.error("Failed to delete activity:", error)
      toast.error("Failed to delete activity")
    } finally {
      setDeletingFromModal(false)
    }
  }

  const currentDate = useMemo(() => {
    // Parse date string without timezone conversion
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day)
  }, [date])
  
  // Check if current date is within expedition range
  const isWithinExpeditionRange = useMemo(() => {
    return isDateWithinExpeditionRange(
      currentDate,
      displayExpedition?.startDate || displayExpedition?.start_date,
      displayExpedition?.endDate || displayExpedition?.end_date
    )
  }, [currentDate, displayExpedition])

  const goToPrevDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 1)
    const dateStr = newDate.toISOString().split('T')[0]
    router.push(`/schedule/${dateStr}`)
  }

  const goToNextDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    const dateStr = newDate.toISOString().split('T')[0]
    router.push(`/schedule/${dateStr}`)
  }

  const handleDateChange = (newDate: Date) => {
    const dateStr = newDate.toISOString().split('T')[0]
    const url = effectiveExpeditionId ? `/schedule/${dateStr}?expedition=${effectiveExpeditionId}` : `/schedule/${dateStr}`
    router.push(url)
  }

  // Find schedule by date
  const schedule = useMemo(() => {
    if (!schedules) return null
    // Compare date strings directly (both in YYYY-MM-DD format)
    const found = schedules.find((s: any) => s.date === date)
    return found
  }, [schedules, date])

  // Merge local updates with schedule items for optimistic UI
  // But keep original items for layout calculation to prevent column jumping during drag
  const itemsWithLocalUpdates = useMemo(() => {
    if (!Array.isArray(scheduleItems)) return []
    return scheduleItems.map((item: any) => {
      const localUpdate = localItemUpdates[item.id]
      if (localUpdate) {
        return { 
          ...item, 
          time_in: localUpdate.time_in, 
          time_out: localUpdate.time_out,
          // Store original times for layout calculation
          _original_time_in: item.time_in,
          _original_time_out: item.time_out,
        }
      }
      return item
    })
  }, [scheduleItems, localItemUpdates])

  const sortedItems = useMemo(() => {
    if (!itemsWithLocalUpdates) return []
    return [...itemsWithLocalUpdates].sort((a: any, b: any) => {
      if (a.time_in === 0 && b.time_in === 0) return 0
      if (a.time_in === 0) return 1
      if (b.time_in === 0) return -1
      return a.time_in - b.time_in
    })
  }, [itemsWithLocalUpdates])

  const scheduledItems = useMemo(() => {
    return sortedItems.filter((item: any) => item.time_in !== 0 && item.time_out !== 0)
  }, [sortedItems])

  const unscheduledItems = useMemo(() => {
    return sortedItems.filter((item: any) => item.time_in === 0 || item.time_out === 0)
  }, [sortedItems])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatLocation = (location: any) => {
    if (!location) return "—"
    return `${location.port}, ${location.country}`
  }

  const handleAddTemplate = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template")
      return
    }
    
    setAddingTemplate(true)
    try {
      await addExpeditionScheduleTemplate(date, Number(selectedTemplate))
      await mutate(`expedition_schedule_items_date_${date}_${effectiveExpeditionId || 'all'}`)
      toast.success("Template activities added successfully")
      setSelectedTemplate("")
    } catch (error) {
      console.error("Failed to add template:", error)
      toast.error("Failed to add template activities")
    } finally {
      setAddingTemplate(false)
    }
  }

  const getItemPosition = (timeIn: number, timeOut: number) => {
    const startHour = Math.floor(timeIn / 100)
    const startMinute = timeIn % 100
    const endHour = Math.floor(timeOut / 100)
    const endMinute = timeOut % 100
    
    const startMinutesFromStart = (startHour - 4) * 60 + startMinute
    const endMinutesFromStart = (endHour - 4) * 60 + endMinute
    
    const startPos = (startMinutesFromStart / (20 * 60)) * 100
    const endPos = (endMinutesFromStart / (20 * 60)) * 100
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

  const getItemsWithLayout = (items: any[]) => {
    if (items.length === 0) return []
    
    // Helper to get layout times (use original if being dragged/resized, otherwise current)
    const getLayoutTimeIn = (item: any) => item._original_time_in ?? item.time_in
    const getLayoutTimeOut = (item: any) => item._original_time_out ?? item.time_out
    
    const itemsWithLayout = items.map((item, idx) => ({ 
      ...item, 
      column: 0, 
      totalColumns: 1,
      originalIndex: idx 
    }))
    
    // Use original times for sorting and overlap detection to prevent column jumping during drag
    const sorted = [...itemsWithLayout].sort((a, b) => {
      const aTimeIn = getLayoutTimeIn(a)
      const bTimeIn = getLayoutTimeIn(b)
      if (aTimeIn !== bTimeIn) return aTimeIn - bTimeIn
      const aTimeOut = getLayoutTimeOut(a)
      const bTimeOut = getLayoutTimeOut(b)
      return (bTimeOut - bTimeIn) - (aTimeOut - aTimeIn)
    })
    
    const groups: any[][] = []
    let currentGroup: any[] = []
    
    sorted.forEach((item, idx) => {
      const itemTimeIn = getLayoutTimeIn(item)
      const itemTimeOut = getLayoutTimeOut(item)
      
      if (currentGroup.length === 0) {
        currentGroup.push(item)
      } else {
        const overlapsWithGroup = currentGroup.some(groupItem => {
          const groupTimeIn = getLayoutTimeIn(groupItem)
          const groupTimeOut = getLayoutTimeOut(groupItem)
          const startsBeforeOtherEnds = itemTimeIn < groupTimeOut
          const endsAfterOtherStarts = itemTimeOut > groupTimeIn
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
        const itemTimeIn = getLayoutTimeIn(item)
        const itemTimeOut = getLayoutTimeOut(item)
        
        let placed = false
        for (let colIdx = 0; colIdx < columns.length; colIdx++) {
          const column = columns[colIdx]
          const canPlace = column.every(colItem => {
            const colTimeIn = getLayoutTimeIn(colItem)
            const colTimeOut = getLayoutTimeOut(colItem)
            return itemTimeIn >= colTimeOut || itemTimeOut <= colTimeIn
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

  const isLoadingData = loadingItems
  const isLoadingSchedules = loadingSchedules

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Expedition Header with Navigation */}
      <ExpeditionHeader expedition={displayExpedition} isLoading={!displayExpedition} currentPage="daily-view" />

      {/* Date Navigation & Actions Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-row items-center gap-4 justify-between flex-nowrap">
            {/* Date Navigation */}
            <DateNavigation 
              date={currentDate} 
              onDateChange={handleDateChange}
              isOffshore={schedule?.isOffshore || schedule?.is_offshore || false}
              isService={schedule?.isService || schedule?.is_service || false}
              size="large"
              isLoading={isLoadingSchedules || !schedule}
              expeditionStartDate={schedule?._expeditions?.startDate}
              expeditionEndDate={schedule?._expeditions?.endDate}
            />

            {/* Actions */}
            <div className="flex items-center gap-2 flex-nowrap flex-shrink-0">
              {schedule && (
                <>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm max-w-[100px]">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate" title={schedule._expedition_current_location ? formatLocation(schedule._expedition_current_location) : "No Location"}>
                      {schedule._expedition_current_location ? formatLocation(schedule._expedition_current_location) : "No Location"}
                    </span>
                  </div>
                  {schedule.staff_off && schedule.staff_off.length > 0 && staff && (
                    <>
                      <div className="h-6 w-px bg-border" />
                      <span 
                        className="inline-flex items-center h-8 text-sm font-medium px-3 rounded bg-orange-50 border border-orange-200 text-orange-700 truncate max-w-[180px]" 
                        title={`Staff Off: ${schedule.staff_off.map((id: number) => staff?.find((s: any) => s.id === id)?.name || 'Unknown').join(', ')}`}
                      >
                        Off: {schedule.staff_off.map((id: number) => {
                          const staffMember = staff?.find((s: any) => s.id === id)
                          return staffMember?.name?.split(' ')[0] || 'Unknown'
                        }).join(', ')}
                      </span>
                    </>
                  )}
                  <div className="h-6 w-px bg-border" />
                </>
              )}
              {Array.isArray(scheduleItems) && scheduleItems.length === 0 && schedule && isWithinExpeditionRange && (
                <>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger 
                      className="w-[160px] bg-white text-sm font-medium cursor-pointer border border-input rounded-md px-3 hover:bg-accent hover:text-accent-foreground"
                      style={{ height: '40px' }}
                    >
                      <SelectValue placeholder="Select template">
                        {selectedTemplate ? (
                          <span className="truncate">
                            {templates?.find((t: any) => t.id.toString() === selectedTemplate)?.template_name || "Template"}
                          </span>
                        ) : (
                          "Select template"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="min-w-[200px]">
                      {templates?.map((template: any) => (
                        <SelectItem key={template.id} value={template.id.toString()} className="cursor-pointer text-sm py-2">
                          {template.template_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAddTemplate}
                    variant="outline"
                    className="cursor-pointer h-10 px-4"
                    disabled={!selectedTemplate || addingTemplate}
                  >
                    {addingTemplate ? (
                      <Spinner size="sm" className="h-4 w-4" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                  <div className="h-6 w-px bg-border" />
                </>
              )}
              <Button 
                onClick={() => setAddSheetOpen(true)} 
                className="cursor-pointer h-10 w-10 p-0"
                disabled={!isWithinExpeditionRange}
                title={!isWithinExpeditionRange ? "Outside expedition date range" : "Add activity"}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push(`/evaluate/${date}${effectiveExpeditionId ? `?expedition=${effectiveExpeditionId}` : ''}`)} 
                className="cursor-pointer h-10 w-10 p-0"
                disabled={!isWithinExpeditionRange}
                title={!isWithinExpeditionRange ? "Outside expedition date range" : "Add scores for this day"}
              >
                <ClipboardList className="h-4 w-4" />
              </Button>
              
              {/* Edit Mode Toggle - Admin only, disabled if no activities */}
              {isAdmin && (
                <>
                  <div className="h-6 w-px bg-border" />
                  <Button
                    variant={editMode ? "default" : "outline"}
                    onClick={() => setEditMode(!editMode)}
                    className="cursor-pointer h-10 w-10 p-0"
                    disabled={!Array.isArray(scheduleItems) || scheduleItems.length === 0}
                    title={editMode ? "Done editing" : "Edit schedule"}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-4 py-6">
        {!isWithinExpeditionRange ? (
          <Empty className="bg-white border-gray-200">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Clock />
              </EmptyMedia>
              <EmptyTitle>Outside of Expedition Range</EmptyTitle>
              <EmptyDescription>
                This date is outside the expedition's scheduled date range.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : isLoadingSchedules || isLoadingData ? (
          <div className="text-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Spinner size="sm" />
              <p className="text-xs text-muted-foreground">Loading schedule...</p>
            </div>
          </div>
        ) : !schedule ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No schedule found for this date</p>
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No activities for this day</p>
          </div>
        ) : (
          <>
            {/* Unscheduled Items */}
            {unscheduledItems.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Unscheduled Activities
                </h2>
                <div className="grid gap-3">
                  {unscheduledItems.map((item: any, index: number) => {
                    return (
                      <div
                        key={item.id}
                        className="relative rounded-2xl border-2 border-gray-100 p-4 cursor-pointer hover:shadow-md transition-all bg-white overflow-hidden group"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-gray-50/0 via-gray-50/20 to-gray-50/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {item.notes && (
                          <div className="absolute bottom-3 right-3 text-gray-400 z-20">
                            <MessageSquare className="h-4 w-4" />
                          </div>
                        )}
                        
                        <div className="relative z-10 flex gap-3">
                          <div className={`w-1 rounded-full ${getColorForType(item)} flex-shrink-0`} />
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base text-gray-900 mb-1 line-clamp-1">
                              {item._expedition_schedule_item_types?.name || item.name}
                            </h3>
                            {item._expedition_staff && (
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarFallback className="text-[9px] bg-gray-200 text-gray-700">
                                    {item._expedition_staff.name?.split(" ").map((n: string) => n[0]).join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-gray-500 truncate">
                                  {item._expedition_staff.name}
                                  {item.participants && item.participants.length > 0 && (
                                    <span> • {item.participants.map((p: any) => p.name).join(", ")}</span>
                                  )}
                                </span>
                              </div>
                            )}
                            {item.notes && (
                              <p className="text-xs text-gray-600 line-clamp-1">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {scheduledItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No timed activities scheduled</p>
              </div>
            ) : (
              <ScheduleDragContext
                date={date}
                timelineRef={timelineRef}
                items={itemsWithLocalUpdates}
                onItemUpdate={handleItemUpdate}
                onResizingChange={setResizingItemId}
                formatMilitaryTime={formatMilitaryTime}
                getDuration={getDuration}
                getColorForType={getColorForType}
                expeditionsId={effectiveExpeditionId}
              >
                <div className="relative">
                  <div className="flex">
                    <div className="w-16 md:w-20 flex-shrink-0" />
                    <div ref={timelineRef} className="flex-1 relative" style={{ minHeight: "2400px" }}>
                      {HOURS.map((hour, idx) => (
                        <div
                          key={hour}
                          className="absolute left-0 right-0 border-t border-border"
                          style={{ top: `${(idx / 20) * 100}%` }}
                        >
                          <div className="absolute -left-16 md:-left-20 w-16 md:w-20 pr-3 text-right -mt-3">
                            <div className="inline-block px-2 py-1 bg-gray-100 rounded text-xs md:text-sm font-medium text-gray-900">
                              {formatTime(hour)}
                            </div>
                          </div>
                        </div>
                      ))}

                      {getItemsWithLayout(scheduledItems).map((item: any, index: number) => {
                        const position = getItemPosition(item.time_in, item.time_out)
                        const widthPercent = 100 / item.totalColumns
                        const leftPercent = item.column * widthPercent
                        
                        return (
                          <DraggableScheduleItem
                            key={item.id}
                            item={item}
                            position={position}
                            widthPercent={widthPercent}
                            leftPercent={leftPercent}
                            onClick={() => handleItemClick(item)}
                            onEdit={() => handleEditItem(item)}
                            formatMilitaryTime={formatMilitaryTime}
                            getDuration={getDuration}
                            getColorForType={getColorForType}
                            isResizing={resizingItemId === item.id}
                            editMode={editMode}
                            isAdmin={isAdmin}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              </ScheduleDragContext>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg p-0 border-2 border-gray-100 bg-gray-50 overflow-hidden gap-0 max-h-[85vh] flex flex-col" showCloseButton={false}>
          {/* Header section with white background */}
          <div className="bg-white px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <DialogHeader className="gap-1">
                <DialogTitle className="text-2xl">
                  {selectedItem?.name}
                </DialogTitle>
                {selectedItem && selectedItem.time_in !== 0 && selectedItem.time_out !== 0 && (
                  <DialogDescription className="text-base">
                    {formatMilitaryTime(selectedItem.time_in)} - {formatMilitaryTime(selectedItem.time_out)}
                  </DialogDescription>
                )}
              </DialogHeader>
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-gray-200" />
          
          {/* Scrollable content section with gray background */}
          {selectedItem && (
            <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-5 min-h-0">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Led By
                </div>
                {selectedItem._expedition_staff ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
                        {selectedItem._expedition_staff.name?.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-base font-medium">{selectedItem._expedition_staff.name}</p>
                      {selectedItem._expedition_staff.email && (
                        <p className="text-sm text-muted-foreground">{selectedItem._expedition_staff.email}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-base">—</p>
                )}
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Location
                </div>
                {selectedItem.address ? (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(selectedItem.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {selectedItem.address}
                  </a>
                ) : (
                  <p className="text-base">—</p>
                )}
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Notes
                </div>
                <p className="text-base leading-relaxed">{selectedItem.notes || "—"}</p>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Things to Bring
                </div>
                <p className="text-base leading-relaxed">{selectedItem.things_to_bring || "—"}</p>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Participants {selectedItem.participants?.length > 0 && `(${selectedItem.participants.length})`}
                </div>
                {selectedItem.participants && selectedItem.participants.length > 0 ? (
                  <div className="space-y-2">
                    {selectedItem.participants.map((participant: any) => (
                      <div key={participant.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                            {participant.name?.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-base font-medium">{participant.name}</p>
                          {participant.email && (
                            <p className="text-sm text-muted-foreground">{participant.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-base">—</p>
                )}
              </div>
            </div>
          )}
          
          {/* Divider - only show if admin (for action buttons) */}
          {isAdmin && <div className="h-px bg-gray-200" />}
          
          {/* Fixed footer with action buttons - Admin only */}
          {selectedItem && isAdmin && (
            <div className="bg-white px-6 py-4 flex justify-end gap-2">
              <button
                className="bg-white rounded-full h-10 w-10 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer flex items-center justify-center"
                onClick={() => setShowModalDeleteConfirm(true)}
                disabled={deletingFromModal}
              >
                <Trash2 className="h-4 w-4 text-gray-500" />
              </button>
              <button
                className="bg-white rounded-full h-10 w-10 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer flex items-center justify-center"
                onClick={handleModalEdit}
              >
                <Pencil className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Delete Confirmation */}
      <AlertDialog open={showModalDeleteConfirm} onOpenChange={setShowModalDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleModalDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 cursor-pointer"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden z-50 shadow-lg">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevDay}
            className="h-12 w-12 rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <Button
            size="icon"
            onClick={() => setAddSheetOpen(true)}
            className="h-14 w-14 rounded-full cursor-pointer"
          >
            <Plus className="h-7 w-7" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={goToNextDay}
            className="h-12 w-12 rounded-full"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <div className="h-20 md:hidden" />

      <AddScheduleItemSheet
        open={addSheetOpen}
        onOpenChange={handleSheetClose}
        scheduleId={schedule?.id || 0}
        date={date}
        staff={staff}
        editItem={editingItem}
        expeditionsId={effectiveExpeditionId}
      />
    </div>
  )
}

