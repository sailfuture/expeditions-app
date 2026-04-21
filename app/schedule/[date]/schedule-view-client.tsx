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
import { Clock, User, MessageSquare, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Settings, MapPin, ClipboardList, Wrench, ExternalLink } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DateNavigation } from "@/components/date-navigation"
import { AddScheduleItemSheet } from "@/components/add-schedule-item-sheet"
import { DraggableScheduleItem } from "@/components/draggable-schedule-item"
import { ScheduleDragContext } from "@/components/schedule-drag-context"
import {
  useExpeditionSchedules,
  useExpeditionScheduleItemsByDate,
  useExpeditionScheduleTemplates,
  useTeachers,
  useStudentsByExpedition,
} from "@/lib/hooks/use-expeditions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { addExpeditionScheduleTemplate, deleteExpeditionScheduleItem, createExpeditionScheduleTemplate } from "@/lib/xano"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save } from "lucide-react"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import { isDateWithinExpeditionRange, getPhotoUrl } from "@/lib/utils"

interface ScheduleViewClientProps {
  date: string
  expeditionId?: number
}

// Full 24-hour range: 0 (12 AM) to 24 (12 AM next day)
const ALL_HOURS = Array.from({ length: 25 }, (_, i) => i) // 0 to 24 (12 AM to 12 AM)

const formatTime = (hour: number) => {
  if (hour === 0 || hour === 24) return "12 AM"
  if (hour === 12) return "12 PM"
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

// Check if item is a meal type using the isMeal boolean from the item type record
const isMealType = (item: any) => {
  if (!item) return false
  return !!item?._expedition_schedule_item_types?.isMeal
}

const formatMilitaryTime = (militaryTime: number) => {
  // Handle special case: 2400 represents midnight at end of day
  if (militaryTime === 2400) {
    return "12:00 AM"
  }
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
  const { data: scheduleItemsData, isLoading: loadingItems } = useExpeditionScheduleItemsByDate(date, effectiveExpeditionId)
  // Extract items from the new response format
  const scheduleItems = scheduleItemsData?.items || scheduleItemsData || []
  const { data: templates, isLoading: loadingTemplates } = useExpeditionScheduleTemplates()
  const { data: staff } = useTeachers()
  const { data: students } = useStudentsByExpedition(effectiveExpeditionId || null)
  
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
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  
  // Meal Plan Sheet state
  const [mealPlanSheetOpen, setMealPlanSheetOpen] = useState(false)
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
  
  // Meal Plan data fetching (must be after state declaration)
  const XANO_COOKBOOK_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y"
  const recipeFetcher = (url: string) => fetch(url).then((res) => res.json())
  const { data: selectedRecipe, isLoading: loadingRecipe } = useSWR(
    selectedRecipeId ? `${XANO_COOKBOOK_URL}/expedition_cookbook/${selectedRecipeId}` : null,
    recipeFetcher
  )

  // Handle optimistic updates from drag/resize
  const handleItemUpdate = useCallback((itemId: number, timeIn: number, timeOut: number) => {
    setLocalItemUpdates(prev => ({
      ...prev,
      [itemId]: { time_in: timeIn, time_out: timeOut }
    }))
  }, [])

  // Clear local updates only when server data matches the local update
  // This prevents the flash when mutate() is called
  const localUpdatesRef = useRef(localItemUpdates)
  localUpdatesRef.current = localItemUpdates
  
  useEffect(() => {
    if (scheduleItems && Object.keys(localUpdatesRef.current).length > 0) {
      const updatesToRemove: number[] = []
      
      Object.entries(localUpdatesRef.current).forEach(([itemIdStr, localUpdate]) => {
        const itemId = parseInt(itemIdStr)
        const serverItem = scheduleItems.find((item: any) => item.id === itemId)
        
        // Only clear local update if server has the same values
        if (serverItem && 
            serverItem.time_in === localUpdate.time_in && 
            serverItem.time_out === localUpdate.time_out) {
          updatesToRemove.push(itemId)
        }
      })
      
      if (updatesToRemove.length > 0) {
        setLocalItemUpdates(prev => {
          const newUpdates = { ...prev }
          updatesToRemove.forEach(id => delete newUpdates[id])
          return newUpdates
        })
      }
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

  const handleMealPlanClick = (recipeId: number) => {
    setDialogOpen(false)
    setTimeout(() => {
      setSelectedRecipeId(recipeId)
      setMealPlanSheetOpen(true)
    }, 150)
  }

  const handleModalEdit = () => {
    if (selectedItem) {
      const item = selectedItem
      setDialogOpen(false)
      // Defer opening the sheet until after the Dialog has fully unmounted
      // to prevent Radix pointer-events: none from getting stuck on the body
      setTimeout(() => {
        handleEditItem(item)
      }, 150)
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

  // Find schedule by date - prefer scheduleItemsData.schedule (has expanded dish/galley data)
  const schedule = useMemo(() => {
    // First try the schedule from items response (has expanded _expedition_dish_days and _expeditions_galley_team)
    if (scheduleItemsData?.schedule) return scheduleItemsData.schedule
    // Fallback to schedules list
    if (!schedules) return null
    // Compare date strings directly (both in YYYY-MM-DD format)
    const found = schedules.find((s: any) => s.date === date)
    return found
  }, [schedules, date, scheduleItemsData])

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

  const handleDeleteAllActivities = async () => {
    if (!scheduleItems || scheduleItems.length === 0) return
    
    setDeletingAll(true)
    try {
      // Delete all items in parallel
      await Promise.all(
        scheduleItems.map((item: any) => deleteExpeditionScheduleItem(item.id))
      )
      await mutate(`expedition_schedule_items_date_${date}_${effectiveExpeditionId || 'all'}`)
      toast.success(`Deleted ${scheduleItems.length} activities`)
      setDeleteAllDialogOpen(false)
      setEditMode(false)
    } catch (error) {
      console.error("Failed to delete all activities:", error)
      toast.error("Failed to delete all activities")
    } finally {
      setDeletingAll(false)
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name")
      return
    }
    if (!scheduleItems || scheduleItems.length === 0) {
      toast.error("No activities to save as template")
      return
    }
    
    setSavingTemplate(true)
    try {
      const itemIds = scheduleItems.map((item: any) => item.id)
      await createExpeditionScheduleTemplate(templateName.trim(), itemIds)
      await mutate("expedition_schedule_templates")
      toast.success(`Template "${templateName}" created with ${scheduleItems.length} activities`)
      setSaveTemplateDialogOpen(false)
      setTemplateName("")
    } catch (error) {
      console.error("Failed to save template:", error)
      toast.error("Failed to save template")
    } finally {
      setSavingTemplate(false)
    }
  }

  // Calculate dynamic hours range based on activities (for view mode)
  const { displayHours, timelineStartHour, timelineHoursCount } = useMemo(() => {
    // In edit mode, always show full 24-hour range
    if (editMode) {
      return {
        displayHours: ALL_HOURS,
        timelineStartHour: 0,
        timelineHoursCount: 24,
      }
    }

    // In view mode, auto-adjust based on activities
    if (!scheduledItems || scheduledItems.length === 0) {
      // Default to reasonable daytime hours if no activities
      const defaultStart = 6
      const defaultEnd = 22
      return {
        displayHours: Array.from({ length: defaultEnd - defaultStart + 1 }, (_, i) => i + defaultStart),
        timelineStartHour: defaultStart,
        timelineHoursCount: defaultEnd - defaultStart,
      }
    }

    // Find earliest and latest activity times
    let earliestHour = 24
    let latestHour = 0

    scheduledItems.forEach((item: any) => {
      const startHour = Math.floor(item.time_in / 100)
      
      // Handle 12 AM edge case: time_out of 0 means midnight (end of day = 24)
      const effectiveTimeOut = item.time_out === 0 ? 2400 : item.time_out
      const endHour = Math.floor(effectiveTimeOut / 100)
      const endMinute = effectiveTimeOut % 100
      
      earliestHour = Math.min(earliestHour, startHour)
      // Round up if there are minutes
      latestHour = Math.max(latestHour, endMinute > 0 ? endHour + 1 : endHour)
    })

    // Add padding of 1 hour on each side, but clamp to 0-24
    const paddedStart = Math.max(0, earliestHour - 1)
    const paddedEnd = Math.min(24, latestHour + 1)

    // Generate hours array including both start and end for labels
    const hours = Array.from({ length: paddedEnd - paddedStart + 1 }, (_, i) => i + paddedStart)

    return {
      displayHours: hours,
      timelineStartHour: paddedStart,
      timelineHoursCount: paddedEnd - paddedStart,
    }
  }, [editMode, scheduledItems])

  const getItemPosition = (timeIn: number, timeOut: number) => {
    const startHour = Math.floor(timeIn / 100)
    const startMinute = timeIn % 100
    
    // Handle 12 AM edge case: if time_out is 0 (12:00 AM), treat it as 24:00 (end of day)
    // This ensures events ending at midnight appear at the bottom of the schedule
    const effectiveTimeOut = timeOut === 0 ? 2400 : timeOut
    const endHour = Math.floor(effectiveTimeOut / 100)
    const endMinute = effectiveTimeOut % 100
    
    const startMinutesFromStart = (startHour - timelineStartHour) * 60 + startMinute
    const endMinutesFromStart = (endHour - timelineStartHour) * 60 + endMinute
    
    const startPos = (startMinutesFromStart / (timelineHoursCount * 60)) * 100
    const endPos = (endMinutesFromStart / (timelineHoursCount * 60)) * 100
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
                  <div className="hidden lg:flex items-center gap-1.5 text-muted-foreground text-sm max-w-[100px]">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate" title={(schedule._expedition_locations || schedule._expedition_current_location) ? formatLocation(schedule._expedition_locations || schedule._expedition_current_location) : "No Location"}>
                      {(schedule._expedition_locations || schedule._expedition_current_location) ? formatLocation(schedule._expedition_locations || schedule._expedition_current_location) : "No Location"}
                    </span>
                  </div>
                  {schedule.staff_off && schedule.staff_off.length > 0 && staff && (
                    <div className="hidden sm:flex items-center gap-2">
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
                    </div>
                  )}
                  {(schedule.galley_team || schedule._expeditions_galley_team) && (
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:block h-6 w-px bg-border" />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span 
                              className="inline-flex items-center h-8 text-sm font-medium px-3 rounded bg-gray-50 border border-gray-200 text-gray-700 truncate max-w-[180px] cursor-help"
                            >
                              {(schedule.galley_team || schedule._expeditions_galley_team?.name || '').replace(/\s*Team\s*/gi, ' ').trim()}
                            </span>
                          </TooltipTrigger>
                          {schedule._expeditions_galley_team && (
                            <TooltipContent side="bottom" className="max-w-xs">
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
                    </div>
                  )}
                  {(schedule.dishday || schedule._expedition_dish_days) && (
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:block h-6 w-px bg-border" />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span 
                              className="inline-flex items-center h-8 text-sm font-medium px-3 rounded bg-gray-50 border border-gray-200 text-gray-700 truncate max-w-[180px] cursor-help"
                            >
                              {(schedule.dishday || schedule._expedition_dish_days?.dishteam || '').replace(/\s*Team\s*/gi, ' ').trim()}
                            </span>
                          </TooltipTrigger>
                          {schedule._expedition_dish_days && (
                            <TooltipContent side="bottom" className="max-w-xs">
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
                    </div>
                  )}
                  <div className="hidden sm:block h-6 w-px bg-border" />
                </>
              )}
              {Array.isArray(scheduleItems) && scheduleItems.length === 0 && schedule && isWithinExpeditionRange && (
                <div className="hidden sm:flex items-center gap-2">
                  <Select 
                    value={selectedTemplate} 
                    onValueChange={setSelectedTemplate}
                  >
                    <SelectTrigger 
                      className="w-[160px] bg-white text-sm font-medium cursor-pointer border border-input rounded-md px-3 hover:bg-accent hover:text-accent-foreground"
                      style={{ height: '40px' }}
                    >
                      <SelectValue placeholder="Select template" />
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
                </div>
              )}
              <Button 
                onClick={() => setAddSheetOpen(true)} 
                className="hidden sm:flex cursor-pointer h-10 w-10 p-0"
                disabled={!isWithinExpeditionRange}
                title={!isWithinExpeditionRange ? "Outside expedition date range" : "Add activity"}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push(`/evaluate/${date}${effectiveExpeditionId ? `?expedition=${effectiveExpeditionId}` : ''}`)} 
                className="hidden lg:flex cursor-pointer h-10 w-10 p-0"
                disabled={!isWithinExpeditionRange}
                title={!isWithinExpeditionRange ? "Outside expedition date range" : "Add scores for this day"}
              >
                <ClipboardList className="h-4 w-4" />
              </Button>
              
              {/* Edit Mode Toggle - Admin only, disabled if no activities, hidden on mobile/medium */}
              {isAdmin && (
                <div className="hidden lg:flex items-center gap-2">
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
                  {Array.isArray(scheduleItems) && scheduleItems.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setSaveTemplateDialogOpen(true)}
                        className="hidden lg:flex cursor-pointer h-10 w-10 p-0"
                        title="Save as template"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteAllDialogOpen(true)}
                        className="cursor-pointer h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete all activities"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
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
                timelineStartHour={timelineStartHour}
                timelineHoursCount={timelineHoursCount}
              >
                <div className="relative">
                  <div className="flex">
                    <div className="w-16 md:w-20 flex-shrink-0" />
                    <div ref={timelineRef} className="flex-1 relative" style={{ minHeight: `${timelineHoursCount * 120}px` }}>
                      {displayHours.map((hour, idx) => (
                        <div
                          key={`hour-${hour}`}
                          className="absolute left-0 right-0 border-t border-border"
                          style={{ top: `${(idx / timelineHoursCount) * 100}%` }}
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
                  Participants (Staff) {selectedItem.participants?.length > 0 && `(${selectedItem.participants.length})`}
                </div>
                {selectedItem.participants && selectedItem.participants.length > 0 ? (
                  <div className="space-y-2">
                    {selectedItem.participants.map((participant: any, idx: number) => (
                      <div key={participant.id || `participant-${idx}`} className="flex items-center gap-3">
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

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Participants (Students) {selectedItem.students_id?.filter((s: any) => s != null).length > 0 && `(${selectedItem.students_id.filter((s: any) => s != null).length})`}
                </div>
                {selectedItem.students_id && selectedItem.students_id.filter((s: any) => s != null).length > 0 ? (
                  <div className="space-y-2">
                    {selectedItem.students_id.filter((s: any) => s != null).map((student: any, idx: number) => (
                      <div key={student.id || `student-${idx}`} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {student.profileImage ? (
                            <AvatarImage src={student.profileImage} alt={`${student.firstName} ${student.lastName}`} />
                          ) : null}
                          <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                            {student.firstName?.[0]}{student.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-base font-medium">{student.firstName} {student.lastName}</p>
                          {student.studentEmail && (
                            <p className="text-sm text-muted-foreground">{student.studentEmail}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-base">—</p>
                )}
              </div>

              {selectedItem.resources && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Resources
                  </div>
                  <a
                    href={selectedItem.resources}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1.5"
                  >
                    {selectedItem.resources}
                  </a>
                </div>
              )}

              {/* Meal Plan - for meal types */}
              {isMealType(selectedItem) && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Meal Plan
                  </div>
                  {selectedItem._expedition_cookbook?.id || selectedItem.expedition_cookbook_id > 0 ? (
                    <button
                      onClick={() => handleMealPlanClick(selectedItem._expedition_cookbook?.id || selectedItem.expedition_cookbook_id)}
                      className="flex items-center gap-3 w-full text-left p-2 -m-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      {getPhotoUrl(selectedItem._expedition_cookbook?.recipe_photo) && (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getPhotoUrl(selectedItem._expedition_cookbook.recipe_photo)!} alt={selectedItem._expedition_cookbook.recipe_name} />
                          <AvatarFallback className="text-sm bg-orange-100 text-orange-600">🍽</AvatarFallback>
                        </Avatar>
                      )}
                      <p className="text-base font-medium text-gray-900">
                        {selectedItem._expedition_cookbook?.recipe_name || `Meal Plan #${selectedItem.expedition_cookbook_id}`}
                      </p>
                    </button>
                  ) : (
                    <p className="text-base text-gray-400 italic">No Meal Plan</p>
                  )}
                </div>
              )}
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

      {/* Delete All Activities Confirmation */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Activities</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {scheduleItems?.length || 0} activities for this day? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" disabled={deletingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAllActivities}
              className="bg-red-600 hover:bg-red-700 cursor-pointer"
              disabled={deletingAll}
            >
              {deletingAll ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save as Template Dialog */}
      <Dialog open={saveTemplateDialogOpen} onOpenChange={(open) => {
        setSaveTemplateDialogOpen(open)
        if (!open) setTemplateName("")
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save all {scheduleItems?.length || 0} activities from this day as a reusable template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                placeholder="e.g., Shore Day, Offshore Day, Port Day"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                disabled={savingTemplate}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSaveTemplateDialogOpen(false)
                setTemplateName("")
              }}
              disabled={savingTemplate}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAsTemplate}
              disabled={savingTemplate || !templateName.trim()}
              className="cursor-pointer"
            >
              {savingTemplate ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
        students={students?.filter((s: any) => !s.isArchived) || []}
        editItem={editingItem}
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
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {(Array.isArray(selectedRecipe.types) && selectedRecipe.types.length > 0 ? selectedRecipe.types : [selectedRecipe.type].filter(Boolean)).map((t: string) => (
                        <span key={t} className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                    {selectedRecipe.summary && (
                      <p className="text-sm text-gray-600">{selectedRecipe.summary}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3">
                      {selectedRecipe.duration_minutes && parseInt(selectedRecipe.duration_minutes) > 0 && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>
                            {(() => {
                              const total = parseInt(selectedRecipe.duration_minutes)
                              const h = Math.floor(total / 60)
                              const m = total % 60
                              return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
                            })()}
                          </span>
                        </div>
                      )}
                      {(() => {
                        const allEquipIds = new Set<number>()
                        selectedRecipe.instructions?.forEach((inst: any) => {
                          if (Array.isArray(inst.expedition_galley_equipment_id)) {
                            inst.expedition_galley_equipment_id.forEach((id: number) => allEquipIds.add(id))
                          }
                        })
                        // For now show count since we don't have equipment names loaded
                        return allEquipIds.size > 0 ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Wrench className="h-4 w-4 text-gray-400" />
                            <span>{allEquipIds.size} equipment items</span>
                          </div>
                        ) : null
                      })()}
                    </div>
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const id = selectedRecipe.id
                          setMealPlanSheetOpen(false)
                          router.push(`/meal-planning/${id}`)
                        }}
                        className="cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Edit in Cookbook
                      </Button>
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
                              {Array.isArray(instruction.expedition_galley_equipment_id) && instruction.expedition_galley_equipment_id.length > 0 && (
                                <div className="flex items-center gap-1 text-gray-600">
                                  <Wrench className="h-3 w-3 text-gray-400" />
                                  <span>{instruction.expedition_galley_equipment_id.length} items</span>
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
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Ingredients
                      {schedule?.crew_members && (
                        <span className="text-xs font-normal text-gray-500 ml-2">
                          ({schedule.crew_members} crew members)
                        </span>
                      )}
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/80">
                            <TableHead className="h-9 px-3 text-xs font-semibold text-gray-600">Ingredient</TableHead>
                            <TableHead className="h-9 px-3 text-xs font-semibold text-gray-600 w-20">Oz/Person</TableHead>
                            {schedule?.crew_members && (
                              <TableHead className="h-9 px-3 text-xs font-semibold text-gray-600 w-20">Total Oz</TableHead>
                            )}
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
                              {schedule?.crew_members && (
                                <TableCell className="h-10 px-3">
                                  <span className="text-sm font-medium text-gray-900">
                                    {(ingredient.oz_per_meal * schedule.crew_members).toFixed(1)}
                                  </span>
                                </TableCell>
                              )}
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
  )
}

