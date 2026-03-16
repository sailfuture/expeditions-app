"use client"

import { useMemo, useState, useRef, useCallback, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format, addDays, subDays, isToday } from "date-fns"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ChevronLeft, ChevronRight, ExternalLink, Calendar, Plus, X, Pencil, Trash2, Clock, Wrench, ClipboardList } from "lucide-react"
import { useExpeditionScheduleItemsByDate, useExpeditionSchedules, useTeachers, useExpeditionScheduleTemplates, useStudentsByExpedition } from "@/lib/hooks/use-expeditions"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import { cn, isDateWithinExpeditionRange, getExpeditionFirstDate, getPhotoUrl } from "@/lib/utils"
import { AddScheduleItemSheet } from "@/components/add-schedule-item-sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { deleteExpeditionScheduleItem, addExpeditionScheduleTemplate, getExpeditionDishDays, getExpeditionsGalleyTeam, updateExpeditionSchedule } from "@/lib/xano"
import useSWR from "swr"
import { mutate } from "swr"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { ExpeditionHeader } from "@/components/expedition-header"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
  
  // Meal Plan Sheet state
  const [mealPlanSheetOpen, setMealPlanSheetOpen] = useState(false)
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
  
  // Meal Plan data fetching
  const XANO_COOKBOOK_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y"
  const recipeFetcher = (url: string) => fetch(url).then((res) => res.json())
  const { data: selectedRecipe, isLoading: loadingRecipe } = useSWR(
    selectedRecipeId ? `${XANO_COOKBOOK_URL}/expedition_cookbook/${selectedRecipeId}` : null,
    recipeFetcher
  )
  
  const handleMealPlanClick = (recipeId: number) => {
    setSelectedRecipeId(recipeId)
    setMealPlanSheetOpen(true)
  }
  
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
  
  // Fetch students for the add/edit sheet
  const { data: students } = useStudentsByExpedition(effectiveExpeditionId || null)
  
  // Fetch templates for empty day states
  const { data: templates } = useExpeditionScheduleTemplates()
  
  // Fetch dish days and galley teams
  const { data: dishDays } = useSWR(
    effectiveExpeditionId ? `expedition_dish_days_${effectiveExpeditionId}` : null,
    () => getExpeditionDishDays(effectiveExpeditionId!)
  )
  const { data: galleyTeams } = useSWR(
    effectiveExpeditionId ? `expeditions_galley_team_${effectiveExpeditionId}` : null,
    () => getExpeditionsGalleyTeam(effectiveExpeditionId!)
  )
  
  // State for tracking updates and optimistic values
  const [updatingScheduleField, setUpdatingScheduleField] = useState<string | null>(null)
  const [optimisticValues, setOptimisticValues] = useState<Record<string, string>>({})
  
  // Handler for updating schedule dish day or galley team (using IDs)
  const handleScheduleFieldChange = async (scheduleId: number, field: string, value: string) => {
    const updateKey = `${scheduleId}-${field}`
    
    // Set optimistic value immediately
    setOptimisticValues(prev => ({ ...prev, [updateKey]: value }))
    setUpdatingScheduleField(updateKey)
    
    try {
      const updateData: Record<string, any> = {}
      // Use the ID fields instead of string names
      if (field === 'expedition_dish_days_id') {
        updateData.expedition_dish_days_id = value === "none" ? 0 : parseInt(value)
      } else if (field === 'expeditions_galley_team_id') {
        updateData.expeditions_galley_team_id = value === "none" ? 0 : parseInt(value)
      } else {
        updateData[field] = value === "none" ? "" : value
      }
      
      await updateExpeditionSchedule(scheduleId, updateData)
      
      // Refresh only the specific schedule data that was updated (not all schedule items)
      await mutate(`expedition_schedules_${effectiveExpeditionId}`)
      // Also refresh the specific day's items since they include schedule info
      const scheduleDate = allSchedules?.find((s: any) => s.id === scheduleId)?.date
      if (scheduleDate) {
        await mutate(`expedition_schedule_items_date_${scheduleDate}_${effectiveExpeditionId || 'all'}`)
      }
      
      toast.success(`${field === 'expedition_dish_days_id' ? 'Dish Team' : 'Galley Team'} updated`)
    } catch (error) {
      console.error(`Failed to update ${field}:`, error)
      toast.error(`Failed to update ${field}`)
    } finally {
      // Clear optimistic value and spinner together after mutate completes
      setUpdatingScheduleField(null)
      setOptimisticValues(prev => {
        const newValues = { ...prev }
        delete newValues[updateKey]
        return newValues
      })
    }
  }
  
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
  
  // Get schedule info for each day (fallback to allSchedules if no schedule in items response)
  const getScheduleForDate = (dateString: string, itemsData?: any) => {
    // First try to use the schedule from the items response (has expanded dish/galley data)
    if (itemsData?.schedule) return itemsData.schedule
    // Fallback to allSchedules
    if (!allSchedules) return null
    return allSchedules.find((s: any) => s.date === dateString)
  }
  
  // Fetch items for each day - now returns { items, schedule }
  const { data: data0, isLoading: loading0 } = useExpeditionScheduleItemsByDate(dateStrings[0], effectiveExpeditionId)
  const { data: data1, isLoading: loading1 } = useExpeditionScheduleItemsByDate(dateStrings[1], effectiveExpeditionId)
  const { data: data2, isLoading: loading2 } = useExpeditionScheduleItemsByDate(dateStrings[2], effectiveExpeditionId)
  const { data: data3, isLoading: loading3 } = useExpeditionScheduleItemsByDate(dateStrings[3], effectiveExpeditionId)
  const { data: data4, isLoading: loading4 } = useExpeditionScheduleItemsByDate(dateStrings[4], effectiveExpeditionId)
  
  // Extract items arrays for backward compatibility
  const allData = [data0, data1, data2, data3, data4]
  const allItems = allData.map(d => d?.items || d || [])
  const allLoading = [loading0, loading1, loading2, loading3, loading4]
  
  const formatMilitaryTime = (time: number) => {
    if (!time && time !== 0) return ""
    const hours = Math.floor(time / 100)
    const minutes = time % 100
    const period = hours >= 12 ? "PM" : "AM"
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
  }
  
  // Check if item is a meal type using the isMeal boolean from the item type record
  const isMealType = (item: any) => {
    if (!item) return false
    return !!item?._expedition_schedule_item_types?.isMeal
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
    const loc = schedule._expedition_locations || schedule._expedition_current_location || schedule._current_location
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

  const getDishDay = (schedule: any) => {
    if (!schedule?.dish_day) return null
    return schedule.dish_day
  }

  const getGalleyTeam = (schedule: any) => {
    if (!schedule?.galley_team) return null
    return schedule.galley_team
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
      {/* Expedition Header with Navigation - Always visible */}
      <ExpeditionHeader expedition={displayExpedition} isLoading={!displayExpedition} currentPage="weekly-planner" />

      {/* Mobile blocking message */}
      <div className="sm:hidden flex flex-col items-center justify-center flex-1 bg-gray-50 p-6 text-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-sm shadow-sm">
          <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Desktop Required</h2>
          <p className="text-sm text-gray-500">
            The Weekly Planner requires a larger screen. Please use a tablet or desktop device to access this page.
          </p>
        </div>
      </div>

      {/* Desktop content */}
      <div className="hidden sm:flex flex-col flex-1 overflow-hidden">
      {/* Date Navigation Controls */}
      <div className="bg-gray-50 border-b flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                className="h-10 w-10 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 px-4 gap-2 cursor-pointer"
                  >
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">{format(centerDate, "EEE, MMM d, yyyy")}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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
                className="h-10 w-10 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {displayExpedition?.isActive && (
                <Button
                  variant="outline"
                  onClick={handleToday}
                  className="h-10 px-4 cursor-pointer"
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
            const schedule = getScheduleForDate(dateStrings[index], allData[index])
            const dayType = getDayType(schedule)
            const location = getLocation(schedule)
            const destination = getDestination(schedule)
            const staffOff = getStaffOff(schedule)
            const dishDay = getDishDay(schedule)
            const galleyTeam = getGalleyTeam(schedule)
            
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
                  <div className="flex items-start justify-between mb-0.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                          {format(day, "EEE")}
                        </p>
                        {location && (
                          <>
                            <span className="text-[8px] text-gray-300">•</span>
                            <span className="text-[9px] text-gray-400 truncate max-w-[60px]" title={destination && destination !== location ? `${location} → ${destination}` : location}>
                              {destination && destination !== location ? `→ ${destination}` : location}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-base font-bold text-gray-900">
                        {format(day, "MMM d")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
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
                  {/* Tags row - full width */}
                  <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0 h-5 rounded bg-white border-gray-200 text-gray-600 flex-shrink-0">
                          {dayType.label}
                        </Badge>
                        {/* Dish Team Select - inline with day type */}
                        {schedule && isWithinRange && (() => {
                          const dishUpdateKey = `${schedule.id}-expedition_dish_days_id`
                          const dishValue = optimisticValues[dishUpdateKey] ?? (schedule.expedition_dish_days_id ? String(schedule.expedition_dish_days_id) : "none")
                          const isUpdatingDish = updatingScheduleField === dishUpdateKey
                          return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center relative">
                                  <Select
                                    value={dishValue}
                                    onValueChange={(value) => handleScheduleFieldChange(schedule.id, "expedition_dish_days_id", value)}
                                    disabled={isUpdatingDish}
                                  >
                                    <SelectTrigger className={cn("h-5 w-auto min-w-[55px] text-[9px] px-1.5 py-0 border-blue-200 bg-blue-50 text-blue-700 cursor-pointer", isUpdatingDish && "pr-5")}>
                                      <SelectValue placeholder="Dish" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none" className="text-xs text-gray-500">None</SelectItem>
                                      {dishDays?.sort((a: any, b: any) => {
                                        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                                        return dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week)
                                      }).map((dish: any) => (
                                        <SelectItem key={dish.id} value={String(dish.id)} className="text-xs">
                                          {dish.dishteam?.replace('Dish Team ', 'Dish ') || `Dish ${dish.id}`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {isUpdatingDish && (
                                    <Spinner className="h-3 w-3 absolute right-1 top-1/2 -translate-y-1/2" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              {schedule._expedition_dish_days && (
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="text-xs space-y-1">
                                    <p className="font-semibold">{schedule._expedition_dish_days.dishteam?.replace('Dish Team ', 'Dish ')}</p>
                                    <p>
                                      <span className="text-gray-500">Wash:</span>{' '}
                                      {schedule._expedition_dish_days.wash?.filter((s: any) => s)?.length > 0 
                                        ? schedule._expedition_dish_days.wash.filter((s: any) => s).map((s: any) => `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown').join(', ')
                                        : <span className="text-gray-400">Not Assigned</span>}
                                    </p>
                                    <p>
                                      <span className="text-gray-500">Dry:</span>{' '}
                                      {schedule._expedition_dish_days.dry?.filter((s: any) => s)?.length > 0 
                                        ? schedule._expedition_dish_days.dry.filter((s: any) => s).map((s: any) => `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown').join(', ')
                                        : <span className="text-gray-400">Not Assigned</span>}
                                    </p>
                                    {schedule._expedition_dish_days.support_staff_dishes?.name && (
                                      <p>
                                        <span className="text-gray-500">Support:</span>{' '}
                                        {schedule._expedition_dish_days.support_staff_dishes.name}
                                      </p>
                                    )}
                                    {schedule._expedition_dish_days.supervisor_staff_dishes?.name && (
                                      <p>
                                        <span className="text-gray-500">Supervisor:</span>{' '}
                                        {schedule._expedition_dish_days.supervisor_staff_dishes.name}
                                      </p>
                                    )}
                                  </div>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )})()}
                        {/* Galley Team Select - inline with day type */}
                        {schedule && isWithinRange && (() => {
                          const galleyUpdateKey = `${schedule.id}-expeditions_galley_team_id`
                          const galleyValue = optimisticValues[galleyUpdateKey] ?? (schedule.expeditions_galley_team_id ? String(schedule.expeditions_galley_team_id) : "none")
                          const isUpdatingGalley = updatingScheduleField === galleyUpdateKey
                          return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center relative">
                                  <Select
                                    value={galleyValue}
                                    onValueChange={(value) => handleScheduleFieldChange(schedule.id, "expeditions_galley_team_id", value)}
                                    disabled={isUpdatingGalley}
                                  >
                                    <SelectTrigger className={cn("h-5 w-auto min-w-[60px] text-[9px] px-1.5 py-0 border-green-200 bg-green-50 text-green-700 cursor-pointer", isUpdatingGalley && "pr-5")}>
                                      <SelectValue placeholder="Galley" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none" className="text-xs text-gray-500">None</SelectItem>
                                      {galleyTeams?.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")).map((team: any) => (
                                        <SelectItem key={team.id} value={String(team.id)} className="text-xs">
                                          {team.name?.replace('Galley Team ', 'Galley ') || `Galley ${team.id}`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {isUpdatingGalley && (
                                    <Spinner className="h-3 w-3 absolute right-1 top-1/2 -translate-y-1/2" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              {schedule._expeditions_galley_team && (
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="text-xs space-y-1">
                                    <p className="font-semibold">{schedule._expeditions_galley_team.name?.replace('Galley Team ', 'Galley ')}</p>
                                    <p>
                                      <span className="text-gray-500">Students:</span>{' '}
                                      {schedule._expeditions_galley_team.students_id?.filter((s: any) => s)?.length > 0 
                                        ? schedule._expeditions_galley_team.students_id.filter((s: any) => s).map((s: any) => `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown').join(', ')
                                        : <span className="text-gray-400">Not Assigned</span>}
                                    </p>
                                    {schedule._expeditions_galley_team._galley_supervisor?.name && (
                                      <p>
                                        <span className="text-gray-500">Supervisor:</span>{' '}
                                        {schedule._expeditions_galley_team._galley_supervisor.name}
                                      </p>
                                    )}
                                  </div>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )})()}
                        {staffOff && (
                          <div className="flex items-center -space-x-1.5">
                            {staffOff.split(', ').slice(0, 3).map((name: string, idx: number) => (
                              <TooltipProvider key={idx}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div 
                                      className="h-5 w-5 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-[8px] font-medium text-orange-700 cursor-default"
                                    >
                                      {name.split(' ').map((n: string) => n[0]).join('')}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {name} (Off)
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                            {staffOff.split(', ').length > 3 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="h-5 w-5 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-[8px] font-medium text-orange-700 cursor-default">
                                      +{staffOff.split(', ').length - 3}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {staffOff.split(', ').slice(3).join(', ')} (Off)
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )}
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
                                {item.participants && item.participants.filter((p: any) => p?.name).length > 0 && (
                                  <>
                                    {item._expedition_staff && <span className="text-gray-300 text-xs">•</span>}
                                    <div className="flex -space-x-1">
                                      {item.participants.filter((p: any) => p?.name).slice(0, 3).map((p: any, idx: number) => (
                                        <Avatar key={p.id || `participant-${idx}`} className="h-4 w-4 border border-white">
                                          <AvatarFallback className="text-[7px] bg-gray-300 text-gray-700">
                                            {p.name.split(" ").map((n: string) => n[0]).join("")}
                                          </AvatarFallback>
                                        </Avatar>
                                      ))}
                                      {item.participants.filter((p: any) => p?.name).length > 3 && (
                                        <Avatar className="h-4 w-4 border border-white">
                                          <AvatarFallback className="text-[7px] bg-gray-400 text-white">
                                            +{item.participants.filter((p: any) => p?.name).length - 3}
                                          </AvatarFallback>
                                        </Avatar>
                                      )}
                                    </div>
                                  </>
                                )}
                                {item.students_id && item.students_id.filter((s: any) => s != null).length > 0 && (
                                  <>
                                    {(item._expedition_staff || item.participants?.length > 0) && <span className="text-gray-300 text-xs">•</span>}
                                    <div className="flex -space-x-1">
                                      {item.students_id.filter((s: any) => s != null).slice(0, 3).map((s: any, idx: number) => (
                                        <Avatar key={s.id || `student-${idx}`} className="h-4 w-4 border border-white">
                                          {s.profileImage ? (
                                            <AvatarImage src={s.profileImage} alt={`${s.firstName} ${s.lastName}`} />
                                          ) : null}
                                          <AvatarFallback className="text-[7px] bg-gray-300 text-gray-700">
                                            {s.firstName?.[0]}{s.lastName?.[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                      ))}
                                      {item.students_id.filter((s: any) => s != null).length > 3 && (
                                        <Avatar className="h-4 w-4 border border-white">
                                          <AvatarFallback className="text-[7px] bg-gray-400 text-white">
                                            +{item.students_id.filter((s: any) => s != null).length - 3}
                                          </AvatarFallback>
                                        </Avatar>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            {/* Meal Plan - for meal type items */}
                            {isMealType(item) && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {getPhotoUrl(item._expedition_cookbook?.recipe_photo) && (
                                  <Avatar className="h-3.5 w-3.5">
                                    <AvatarImage src={getPhotoUrl(item._expedition_cookbook.recipe_photo)!} alt={item._expedition_cookbook.recipe_name} />
                                    <AvatarFallback className="text-[6px] bg-orange-100 text-orange-600">🍽</AvatarFallback>
                                  </Avatar>
                                )}
                                <p className={`text-[10px] truncate ${
                                  item._expedition_cookbook?.recipe_name || item.expedition_cookbook_id > 0 
                                    ? 'text-gray-600' 
                                    : 'text-gray-400 italic'
                                }`}>
                                  {item._expedition_cookbook?.recipe_name || (item.expedition_cookbook_id > 0 ? `Meal Plan #${item.expedition_cookbook_id}` : 'No Meal Plan')}
                                </p>
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
                <DialogDescription className="text-base">
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
            <div>
              <p className="text-xs text-gray-400 mb-1">Type</p>
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full shrink-0", selectedItem ? getColorForType(selectedItem) : "bg-gray-300")} />
                <span className="text-sm text-gray-700">
                  {selectedItem?._expedition_schedule_item_types?.name || "No Type"}
                </span>
              </div>
            </div>
            
            {/* Led By */}
            <div>
              <p className="text-xs text-gray-400 mb-1">Led By</p>
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
            
            {/* Participants (Staff) */}
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Staff</p>
              {selectedItem?.participants && selectedItem.participants.filter((p: any) => p?.name).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedItem.participants.filter((p: any) => p?.name).map((p: any, idx: number) => (
                    <div key={p.id || `participant-${idx}`} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2 py-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px] bg-gray-300 text-gray-700">
                            {p.name.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-700">{p.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">No staff participants</span>
                )}
            </div>

            {/* Participants (Students) */}
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Students</p>
              {selectedItem?.students_id && selectedItem.students_id.filter((s: any) => s != null).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedItem.students_id.filter((s: any) => s != null).map((s: any, idx: number) => (
                    <div key={s.id || `student-${idx}`} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2 py-1">
                      <Avatar className="h-5 w-5">
                        {s.profileImage ? (
                          <AvatarImage src={s.profileImage} alt={`${s.firstName} ${s.lastName}`} />
                        ) : null}
                        <AvatarFallback className="text-[10px] bg-gray-300 text-gray-700">
                          {s.firstName?.[0]}{s.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-700">{s.firstName} {s.lastName}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-400">No student participants</span>
              )}
            </div>

            {/* Resources */}
            {selectedItem?.resources && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Resources</p>
                <a
                  href={selectedItem.resources}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                >
                  {selectedItem.resources}
                </a>
              </div>
            )}

            {/* Meal Plan - for meal types */}
            {selectedItem && isMealType(selectedItem) && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Meal Plan</p>
                {selectedItem._expedition_cookbook?.id || selectedItem.expedition_cookbook_id > 0 ? (
                  <button
                    onClick={() => handleMealPlanClick(selectedItem._expedition_cookbook?.id || selectedItem.expedition_cookbook_id)}
                    className="flex items-center gap-2 w-full text-left p-2 -m-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    {getPhotoUrl(selectedItem._expedition_cookbook?.recipe_photo) && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={getPhotoUrl(selectedItem._expedition_cookbook.recipe_photo)!} alt={selectedItem._expedition_cookbook.recipe_name} />
                        <AvatarFallback className="text-xs bg-orange-100 text-orange-600">🍽</AvatarFallback>
                      </Avatar>
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {selectedItem._expedition_cookbook?.recipe_name || `Meal Plan #${selectedItem.expedition_cookbook_id}`}
                    </span>
                  </button>
                ) : (
                  <span className="text-sm text-gray-400 italic">No Meal Plan</span>
                )}
              </div>
            )}
            
            <div className="h-px bg-gray-200" />
            
            {/* Address */}
            <div>
              <p className="text-xs text-gray-400 mb-1">Address</p>
              <p className="text-sm text-gray-700">
                {selectedItem?.address || <span className="text-gray-400">No address</span>}
              </p>
            </div>
            
            {/* Things to Bring */}
            <div>
              <p className="text-xs text-gray-400 mb-1">Things to Bring</p>
              <p className="text-sm text-gray-700">
                {selectedItem?.things_to_bring || <span className="text-gray-400">Nothing to bring</span>}
              </p>
            </div>
            
            <div className="h-px bg-gray-200" />
            
            {/* Notes */}
            <div className="bg-gray-100 rounded-lg p-4 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
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
        students={students?.filter((s: any) => !s.isArchived) || []}
        expeditionsId={effectiveExpeditionId}
      />

      {/* Meal Plan Detail Sheet */}
      <Sheet open={mealPlanSheetOpen} onOpenChange={setMealPlanSheetOpen}>
        <SheetContent className="w-full sm:w-[600px] sm:max-w-[90vw] p-0 flex flex-col h-full overflow-hidden">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl">
                {loadingRecipe ? "Loading..." : (selectedRecipe?.recipe_name || "Recipe Details")}
              </SheetTitle>
              <button
                onClick={() => setMealPlanSheetOpen(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-6">
            {loadingRecipe ? (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : selectedRecipe ? (
              <div className="space-y-6">
                {/* Recipe Header */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {getPhotoUrl(selectedRecipe.recipe_photo) && (
                    <div className="w-full sm:w-40 h-40 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      <img
                        src={getPhotoUrl(selectedRecipe.recipe_photo)!}
                        alt={selectedRecipe.recipe_name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">{selectedRecipe.type}</span>
                    </div>
                    {selectedRecipe.summary && (
                      <p className="text-sm text-gray-600">{selectedRecipe.summary}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3">
                      {selectedRecipe.duration_minutes && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{selectedRecipe.duration_minutes}</span>
                        </div>
                      )}
                      {selectedRecipe.equipment_required && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Wrench className="h-4 w-4 text-gray-400" />
                          <span>{selectedRecipe.equipment_required}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Instructions</h3>
                    <div className="space-y-3">
                      {[...selectedRecipe.instructions]
                        .sort((a: any, b: any) => a.step - b.step)
                        .map((instruction: any) => (
                          <div
                            key={instruction.id}
                            className="border rounded-lg p-3 bg-white"
                          >
                            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                              Step {instruction.step}
                            </div>
                            <p className="text-sm text-gray-900 mb-2">{instruction.instructions}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              {instruction.duration && (
                                <div className="flex items-center gap-1 text-gray-600">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  <span>{instruction.duration} min</span>
                                </div>
                              )}
                              {instruction.equipment && (
                                <div className="flex items-center gap-1 text-gray-600">
                                  <Wrench className="h-3 w-3 text-gray-400" />
                                  <span>{instruction.equipment}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Ingredients */}
                {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Ingredients</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/80">
                            <TableHead className="h-9 px-3 text-xs font-semibold text-gray-600">Ingredient</TableHead>
                            <TableHead className="h-9 px-3 text-xs font-semibold text-gray-600 w-20">Oz/Meal</TableHead>
                            <TableHead className="h-9 px-3 text-xs font-semibold text-gray-600">Prep</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRecipe.ingredients.map((ingredient: any) => (
                            <TableRow key={ingredient.id}>
                              <TableCell className="h-10 px-3">
                                <span className="text-sm font-medium text-gray-900">{ingredient.ingredient}</span>
                              </TableCell>
                              <TableCell className="h-10 px-3">
                                <span className="text-sm text-gray-600">{ingredient.oz_per_meal}</span>
                              </TableCell>
                              <TableCell className="h-10 px-3">
                                <span className="text-sm text-gray-500">{ingredient.prep_notes || "—"}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Empty states */}
                {(!selectedRecipe.instructions || selectedRecipe.instructions.length === 0) && 
                 (!selectedRecipe.ingredients || selectedRecipe.ingredients.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No detailed recipe information available.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Recipe not found.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      </div>
    </div>
  )
}
