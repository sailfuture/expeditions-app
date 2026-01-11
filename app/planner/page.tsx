"use client"

import { useMemo, useState, useRef, useCallback, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format, addDays, subDays, isToday } from "date-fns"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronLeft, ChevronRight, ExternalLink, Calendar, Plus, X, Clock, User, MapPin, Backpack, Pencil, Trash2 } from "lucide-react"
import { useExpeditionScheduleItemsByDate, useExpeditionSchedules, useTeachers, useExpeditionScheduleTemplates } from "@/lib/hooks/use-expeditions"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import { cn, isDateWithinExpeditionRange, getExpeditionFirstDate } from "@/lib/utils"
import { AddScheduleItemSheet } from "@/components/add-schedule-item-sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { deleteExpeditionScheduleItem, addExpeditionScheduleTemplate } from "@/lib/xano"
import { mutate } from "swr"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { ExpeditionHeader } from "@/components/expedition-header"
import { useExpeditions } from "@/lib/hooks/use-expeditions"

export default function PlannerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Skeleton className="h-8 w-32" /></div>}>
      <PlannerPageContent />
    </Suspense>
  )
}

function PlannerPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const expeditionIdFromUrl = searchParams.get('expedition') ? parseInt(searchParams.get('expedition')!) : null
  const { activeExpedition, userExpeditions } = useExpeditionContext()
  const { data: allExpeditionsData } = useExpeditions()
  
  // Use expedition ID from URL if provided, otherwise fall back to active expedition
  const effectiveExpeditionId = expeditionIdFromUrl || activeExpedition?.id
  
  // Find the expedition to display - prioritize URL parameter, fetch full data with term info
  const displayExpedition = useMemo(() => {
    if (expeditionIdFromUrl && allExpeditionsData) {
      const expeditionFromUrl = allExpeditionsData.find((e: any) => e.id === expeditionIdFromUrl)
      if (expeditionFromUrl) return expeditionFromUrl
    }
    if (expeditionIdFromUrl && userExpeditions) {
      const expeditionFromUrl = userExpeditions.find((e: any) => e.id === expeditionIdFromUrl)
      if (expeditionFromUrl) return expeditionFromUrl
    }
    return activeExpedition
  }, [expeditionIdFromUrl, allExpeditionsData, userExpeditions, activeExpedition])
  
  // Default to expedition first date if expedition is not active, otherwise today
  const getDefaultDate = () => {
    if (displayExpedition?.isActive) {
      return new Date()
    }
    return getExpeditionFirstDate(displayExpedition?.startDate || displayExpedition?.start_date)
  }
  
  const [centerDate, setCenterDate] = useState(getDefaultDate())
  
  // Update center date when display expedition changes (especially on reload)
  useEffect(() => {
    if (displayExpedition) {
      const defaultDate = displayExpedition.isActive 
        ? new Date()
        : getExpeditionFirstDate(displayExpedition.startDate || displayExpedition.start_date)
      setCenterDate(defaultDate)
    }
  }, [displayExpedition?.id, displayExpedition?.isActive])
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, number>>({})
  const [addingTemplate, setAddingTemplate] = useState<string | null>(null)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [addSheetDate, setAddSheetDate] = useState<string>("")
  const [addSheetScheduleId, setAddSheetScheduleId] = useState<number | null>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Scroll gradient tracking for each day column
  const [scrollGradients, setScrollGradients] = useState<Record<number, boolean>>({})
  
  const handleScroll = useCallback((index: number, element: HTMLDivElement | null) => {
    if (!element) return
    const { scrollTop, scrollHeight, clientHeight } = element
    const canScrollMore = scrollTop < scrollHeight - clientHeight - 5
    setScrollGradients(prev => {
      if (prev[index] === canScrollMore) return prev
      return { ...prev, [index]: canScrollMore }
    })
  }, [])
  
  // Fetch all schedules to get day types
  const { data: allSchedules } = useExpeditionSchedules(effectiveExpeditionId)
  
  // Fetch staff for the add/edit sheet
  const { data: staff } = useTeachers()
  
  // Fetch templates for empty day states
  const { data: templates } = useExpeditionScheduleTemplates()
  
  // Generate the 5 days to display
  const days = useMemo(() => {
    return [
      subDays(centerDate, 1),
      centerDate,
      addDays(centerDate, 1),
      addDays(centerDate, 2),
      addDays(centerDate, 3),
    ]
  }, [centerDate])
  
  // Format dates for API calls
  const dateStrings = useMemo(() => {
    return days.map(d => format(d, "yyyy-MM-dd"))
  }, [days])
  
  // Get schedule info for each day
  const getScheduleForDate = (dateString: string) => {
    if (!allSchedules) return null
    return allSchedules.find((s: any) => s.date === dateString)
  }
  
  // Fetch items for each day
  const { data: items0, isLoading: loading0 } = useExpeditionScheduleItemsByDate(dateStrings[0], effectiveExpeditionId)
  const { data: items1, isLoading: loading1 } = useExpeditionScheduleItemsByDate(dateStrings[1], effectiveExpeditionId)
  const { data: items2, isLoading: loading2 } = useExpeditionScheduleItemsByDate(dateStrings[2], effectiveExpeditionId)
  const { data: items3, isLoading: loading3 } = useExpeditionScheduleItemsByDate(dateStrings[3], effectiveExpeditionId)
  const { data: items4, isLoading: loading4 } = useExpeditionScheduleItemsByDate(dateStrings[4], effectiveExpeditionId)
  
  const allItems = [items0, items1, items2, items3, items4]
  const allLoading = [loading0, loading1, loading2, loading3, loading4]
  
  const formatMilitaryTime = (time: number) => {
    if (!time && time !== 0) return ""
    const hours = Math.floor(time / 100)
    const minutes = time % 100
    const period = hours >= 12 ? "PM" : "AM"
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
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
    return "bg-gray-500"
  }
  
  const getDayType = (schedule: any) => {
    if (!schedule) return { label: "-" }
    if (schedule.isOffshore || schedule.is_offshore) return { label: "O" }
    if (schedule.isService || schedule.is_service) return { label: "S" }
    return { label: "A" }
  }
  
  const getLocation = (schedule: any) => {
    if (!schedule) return "No Location"
    // Try multiple possible field names for current location
    const loc = schedule._expedition_current_location || schedule._current_location
    if (loc?.port) {
      return loc.port
    }
    // Fallback to ID if expanded object not available
    if (schedule.current_location && schedule.current_location > 0) {
      return `Location ${schedule.current_location}`
    }
    return "No Location"
  }
  
  const getDestination = (schedule: any) => {
    if (!schedule) return null
    // Try multiple possible field names for destination
    const dest = schedule._expedition_destination || schedule._destination
    if (dest?.port) {
      return dest.port
    }
    // Fallback to ID if expanded object not available
    if (schedule.destination && schedule.destination > 0) {
      return `Location ${schedule.destination}`
    }
    return null
  }
  
  const getStaffOff = (schedule: any) => {
    if (!schedule?.staff_off || schedule.staff_off.length === 0 || !staff) return null
    const staffOffNames = schedule.staff_off.map((id: number) => {
      const staffMember = staff?.find((s: any) => s.id === id)
      return staffMember?.name?.split(' ')[0] || 'Unknown'
    })
    return staffOffNames.join(', ')
  }
  
  const handlePrevious = () => {
    setCenterDate(prev => {
      const newDate = subDays(prev, 1)
      // Create at noon to avoid timezone issues
      return new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 12, 0, 0)
    })
  }
  
  const handleNext = () => {
    setCenterDate(prev => {
      const newDate = addDays(prev, 1)
      // Create at noon to avoid timezone issues
      return new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 12, 0, 0)
    })
  }
  
  const handleToday = () => {
    setCenterDate(new Date())
  }
  
  const handleDayClick = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    const url = expeditionIdFromUrl ? `/schedule/${dateStr}?expedition=${expeditionIdFromUrl}` : `/schedule/${dateStr}`
    router.push(url)
  }
  
  const handleItemClick = (item: any) => {
    setSelectedItem(item)
    setDialogOpen(true)
  }
  
  const handleAddActivity = (dateString: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const schedule = getScheduleForDate(dateString)
    if (schedule) {
      setAddSheetDate(dateString)
      setAddSheetScheduleId(schedule.id)
      setEditingItem(null)
      setAddSheetOpen(true)
    }
  }
  
  const handleEditItem = (item: any, dateString: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const schedule = getScheduleForDate(dateString)
    if (schedule) {
      setAddSheetDate(dateString)
      setAddSheetScheduleId(schedule.id)
      setEditingItem(item)
      setAddSheetOpen(true)
    }
  }
  
  const handleDeleteClick = (item: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setItemToDelete(item)
    setDeleteConfirmOpen(true)
  }
  
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    setDeleting(true)
    try {
      await deleteExpeditionScheduleItem(itemToDelete.id)
      dateStrings.forEach(date => {
        mutate(`expedition_schedule_items_date_${date}_${effectiveExpeditionId || 'all'}`)
      })
      toast.success("Activity deleted")
      setDeleteConfirmOpen(false)
      setDialogOpen(false)
      setItemToDelete(null)
    } catch (error) {
      console.error("Failed to delete:", error)
      toast.error("Failed to delete activity")
    } finally {
      setDeleting(false)
    }
  }
  
  const handleAddTemplate = async (dateString: string) => {
    const templateId = selectedTemplates[dateString]
    if (!templateId) {
      toast.error("Please select a template")
      return
    }
    
    setAddingTemplate(dateString)
    try {
      await addExpeditionScheduleTemplate(dateString, templateId)
      mutate(`expedition_schedule_items_date_${dateString}_${effectiveExpeditionId || 'all'}`)
      toast.success("Template added successfully")
      setSelectedTemplates(prev => {
        const newState = { ...prev }
        delete newState[dateString]
        return newState
      })
    } catch (error) {
      console.error("Failed to add template:", error)
      toast.error("Failed to add template")
    } finally {
      setAddingTemplate(null)
    }
  }

  return (
    <div className="flex flex-col bg-gray-50 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Expedition Header with Navigation */}
      <ExpeditionHeader expedition={displayExpedition} isLoading={!displayExpedition} currentPage="weekly-planner" />
      
      {/* Date Navigation Controls */}
      <div className="bg-gray-50 border-b flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Weekly Planner</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                className="h-9 w-9 cursor-pointer bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 px-4 cursor-pointer bg-white"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(centerDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="center">
                  <CalendarComponent
                    mode="single"
                    selected={centerDate}
                    defaultMonth={centerDate}
                    onSelect={(selectedDate) => {
                      if (selectedDate) {
                        // Create a new date at noon local time to avoid timezone issues
                        const localDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 12, 0, 0)
                        setCenterDate(localDate)
                        setCalendarOpen(false)
                      }
                    }}
                    initialFocus
                    className="rounded-md border shadow-md"
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="h-9 w-9 cursor-pointer bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {displayExpedition?.isActive && (
                <Button
                  variant="outline"
                  onClick={handleToday}
                  className="h-9 px-4 cursor-pointer bg-white"
                >
                  Today
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Planner Grid - fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4 pt-4">
        <div className="h-full container w-full mx-auto">
          <div className="grid grid-cols-5 gap-2 h-full">
          {days.map((day, index) => {
            const items = Array.isArray(allItems[index]) ? allItems[index] : []
            const isLoadingDay = allLoading[index]
            const isTodayColumn = isToday(day)
            const sortedItems = [...items].sort((a: any, b: any) => a.time_in - b.time_in)
            const schedule = getScheduleForDate(dateStrings[index])
            const dayType = getDayType(schedule)
            const location = getLocation(schedule)
            const destination = getDestination(schedule)
            const staffOff = getStaffOff(schedule)
            
            // Check if date is within expedition range
            const isWithinRange = isDateWithinExpeditionRange(
              day,
              displayExpedition?.startDate || displayExpedition?.start_date,
              displayExpedition?.endDate || displayExpedition?.end_date
            )
            const hasSchedule = !!schedule
            
            return (
              <div 
                key={dateStrings[index]} 
                className={cn(
                  "bg-white rounded-xl border-2 overflow-hidden flex flex-col h-full",
                  isTodayColumn && isWithinRange ? "border-green-500 shadow-lg" : "border-gray-200",
                  !isWithinRange && "opacity-50 bg-gray-50"
                )}
              >
                {/* Day Header - fixed height */}
                <div className="px-3 py-2.5 border-b bg-white flex-shrink-0 h-[88px]">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                        {format(day, "EEE")}
                      </p>
                      <p className="text-base font-bold text-gray-900">
                        {format(day, "MMM d")}
                      </p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0 h-5 rounded bg-white border-gray-200 text-gray-600 flex-shrink-0">
                          {dayType.label}
                        </Badge>
                        {staffOff && (
                          <span 
                            className="inline-flex items-center text-[9px] font-medium px-1.5 py-0 h-5 rounded bg-orange-50 border border-orange-200 text-orange-700 flex-shrink-0" 
                            title={`Staff Off: ${staffOff}`}
                          >
                            Off: {staffOff}
                          </span>
                        )}
                        <span className="text-[9px] text-gray-400 truncate min-w-0 max-w-[120px]" title={destination && destination !== location ? `${location} → ${destination}` : location}>
                          {destination && destination !== location ? `${location} → ${destination}` : location}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 cursor-pointer hover:bg-gray-200"
                        onClick={(e) => handleAddActivity(dateStrings[index], e)}
                        disabled={!schedule || !isWithinRange}
                        title={!isWithinRange ? "Outside expedition date range" : !schedule ? "No schedule for this date" : "Add activity"}
                      >
                        <Plus className="h-3.5 w-3.5 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 cursor-pointer hover:bg-gray-200"
                        onClick={() => handleDayClick(day)}
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Events List - scrollable with subtle scrollbar */}
                <div className="flex-1 min-h-0 relative bg-gray-50">
                  <div 
                    className="h-full overflow-y-auto p-2 space-y-1.5 scrollbar-thin"
                    ref={(el) => {
                      if (el) {
                        handleScroll(index, el)
                        el.onscroll = () => handleScroll(index, el)
                      }
                    }}
                  >
                  {!isWithinRange ? (
                    <div className="text-center py-6 px-3">
                      <p className="text-gray-400 text-xs font-medium">Outside of expedition range</p>
                    </div>
                  ) : isLoadingDay ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-14 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : sortedItems.length === 0 ? (
                    <div className="text-center py-4 px-3 space-y-3">
                      <p className="text-gray-400 text-xs mb-3">No activities</p>
                      {hasSchedule && (
                        <div className="space-y-2">
                          <Select
                            value={selectedTemplates[dateStrings[index]]?.toString() || ""}
                            onValueChange={(value) => {
                              setSelectedTemplates(prev => ({
                                ...prev,
                                [dateStrings[index]]: parseInt(value)
                              }))
                            }}
                          >
                            <SelectTrigger className="w-full h-8 text-xs cursor-pointer bg-white">
                              <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                              {templates?.map((template: any) => (
                                <SelectItem key={template.id} value={template.id.toString()}>
                                  {template.template_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-xs cursor-pointer"
                            onClick={() => handleAddTemplate(dateStrings[index])}
                            disabled={!selectedTemplates[dateStrings[index]] || addingTemplate === dateStrings[index]}
                          >
                            {addingTemplate === dateStrings[index] ? (
                              <>
                                <Spinner size="sm" className="h-3 w-3 mr-1" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3 mr-1" />
                                Add Template
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sortedItems.map((item: any) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-gray-100 p-2 hover:shadow-md hover:border-gray-200 transition-all duration-300 ease-in-out bg-white cursor-pointer group animate-in fade-in slide-in-from-top-2"
                          onClick={() => handleItemClick(item)}
                        >
                        <div className="flex gap-2">
                          <div className={cn(
                            "w-1 rounded-full flex-shrink-0",
                            getColorForType(item)
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-medium text-sm text-gray-900 truncate flex-1">
                                {item.name}
                              </h4>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                  className="h-5 w-5 rounded hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                                  onClick={(e) => handleEditItem(item, dateStrings[index], e)}
                                >
                                  <Pencil className="h-3 w-3 text-gray-400" />
                                </button>
                                <button
                                  className="h-5 w-5 rounded hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                                  onClick={(e) => handleDeleteClick(item, e)}
                                >
                                  <Trash2 className="h-3 w-3 text-gray-400" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              {formatMilitaryTime(item.time_in)} - {formatMilitaryTime(item.time_out)}
                            </p>
                            {(item._expedition_staff || (item.participants && item.participants.length > 0)) && (
                              <div className="flex items-center gap-1.5 mt-1">
                                {item._expedition_staff && (
                                  <>
                                    <Avatar className="h-4 w-4">
                                      <AvatarFallback className="text-[8px] bg-gray-200 text-gray-600">
                                        {item._expedition_staff.name?.split(" ").map((n: string) => n[0]).join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-gray-500 truncate max-w-[80px]">
                                      {item._expedition_staff.name}
                                    </span>
                                  </>
                                )}
                                {item.participants && item.participants.length > 0 && (
                                  <>
                                    {item._expedition_staff && <span className="text-gray-300 text-xs">•</span>}
                                    <div className="flex -space-x-1">
                                      {item.participants.slice(0, 3).map((p: any) => (
                                        <Avatar key={p.id} className="h-4 w-4 border border-white">
                                          <AvatarFallback className="text-[7px] bg-gray-300 text-gray-700">
                                            {p.name?.split(" ").map((n: string) => n[0]).join("")}
                                          </AvatarFallback>
                                        </Avatar>
                                      ))}
                                      {item.participants.length > 3 && (
                                        <Avatar className="h-4 w-4 border border-white">
                                          <AvatarFallback className="text-[7px] bg-gray-400 text-white">
                                            +{item.participants.length - 3}
                                          </AvatarFallback>
                                        </Avatar>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      ))}
                    </div>
                  )}
                  </div>
                  {/* Bottom gradient when more content to scroll */}
                  <div 
                    className={`absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none transition-opacity ${
                      scrollGradients[index] !== false && sortedItems.length > 3 ? 'opacity-100' : 'opacity-0'
                    }`} 
                  />
                </div>
                
                {/* Day Footer - Event Count */}
                <div className="px-3 py-1.5 border-t bg-white text-[10px] text-gray-400 flex-shrink-0">
                  {isLoadingDay ? (
                    <Skeleton className="h-3 w-12" />
                  ) : (
                    `${sortedItems.length} ${sortedItems.length === 1 ? 'activity' : 'activities'}`
                  )}
                </div>
              </div>
            )
          })}
          </div>
        </div>
      </div>
      
      {/* Event Details Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg p-0 border-2 border-gray-100 bg-gray-50 flex flex-col overflow-hidden gap-0" showCloseButton={false}>
          {/* Header section with white background */}
          <div className="bg-white px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <DialogHeader className="gap-1">
                <DialogTitle className="text-2xl">
                  {selectedItem?.name || "Activity"}
                </DialogTitle>
                <DialogDescription className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {selectedItem?.time_in || selectedItem?.time_out 
                    ? `${formatMilitaryTime(selectedItem.time_in)} - ${formatMilitaryTime(selectedItem.time_out)}`
                    : "No time set"
                  }
                </DialogDescription>
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

          {/* Content section */}
          <div className="p-6 pt-4 space-y-4 flex-1 min-h-0 overflow-y-auto max-h-[60vh]">
            {/* Activity Type */}
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center text-gray-400">
                <div className={cn("w-3 h-3 rounded-full", selectedItem ? getColorForType(selectedItem) : "bg-gray-300")} />
              </div>
              <span className="text-sm text-gray-700">
                {selectedItem?._expedition_schedule_item_types?.name || "No Type"}
              </span>
            </div>
            
            {/* Led By */}
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              {selectedItem?._expedition_staff ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                      {selectedItem._expedition_staff.name?.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-700">{selectedItem._expedition_staff.name}</span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">No leader assigned</span>
              )}
            </div>
            
            {/* Participants */}
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              {selectedItem?.participants && selectedItem.participants.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedItem.participants.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2 py-1">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px] bg-gray-300 text-gray-700">
                          {p.name?.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-700">{p.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-400">No participants</span>
              )}
            </div>
            
            <div className="h-px bg-gray-200" />
            
            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <p className="text-sm text-gray-700">
                {selectedItem?.address || <span className="text-gray-400">No address</span>}
              </p>
            </div>
            
            {/* Things to Bring */}
            <div className="flex items-start gap-3">
              <Backpack className="h-5 w-5 text-gray-400 mt-0.5" />
              <p className="text-sm text-gray-700">
                {selectedItem?.things_to_bring || <span className="text-gray-400">Nothing to bring</span>}
              </p>
            </div>
            
            <div className="h-px bg-gray-200" />
            
            {/* Notes */}
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {selectedItem?.notes || <span className="text-gray-400">No notes</span>}
              </p>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-gray-200" />
          
          {/* Footer */}
          <div className="bg-white px-6 py-4 flex justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer text-gray-500 hover:text-gray-700"
                onClick={() => {
                  if (selectedItem) {
                    setItemToDelete(selectedItem)
                    setDeleteConfirmOpen(true)
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer text-gray-500 hover:text-gray-700"
                onClick={() => {
                  if (selectedItem) {
                    // Find the schedule for this item's date
                    const itemDate = selectedItem.expedition_schedule_id
                    const schedule = allSchedules?.find((s: any) => s.id === selectedItem.expedition_schedule_id)
                    if (schedule) {
                      setAddSheetDate(schedule.date)
                      setAddSheetScheduleId(schedule.id)
                      setEditingItem(selectedItem)
                      setDialogOpen(false)
                      setAddSheetOpen(true)
                    }
                  }
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              disabled={deleting}
            >
              {deleting ? <Spinner size="sm" className="mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Add/Edit Activity Sheet */}
      <AddScheduleItemSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        scheduleId={addSheetScheduleId || 0}
        date={addSheetDate}
        editItem={editingItem}
        staff={staff || []}
        expeditionsId={effectiveExpeditionId}
      />
    </div>
  )
}
