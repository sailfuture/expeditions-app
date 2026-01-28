"use client"

import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Calendar, Plus, Check, X, ChevronDown, ChevronRight, ExternalLink, MapPin, Users, Ship } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useExpeditionSchedules, useExpeditionLocations, useTeachers } from "@/lib/hooks/use-expeditions"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addAllDatesForExpedition, updateExpeditionSchedule } from "@/lib/xano"
import { mutate } from "swr"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ExpeditionHeader } from "@/components/expedition-header"
import { useExpeditions } from "@/lib/hooks/use-expeditions"

// Multi-select component for Staff Off
function StaffOffMultiSelect({
  staff,
  selectedIds,
  onUpdate,
  disabled = false,
}: {
  staff: any[]
  selectedIds: number[]
  onUpdate: (ids: number[]) => Promise<void>
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedStaff = staff?.filter((s) => selectedIds?.includes(s.id)) || []

  const toggleStaff = async (id: number) => {
    setUpdatingId(id)
    setIsUpdating(true)
    try {
      const newIds = selectedIds?.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...(selectedIds || []), id]
      await onUpdate(newIds)
    } finally {
      setIsUpdating(false)
      setUpdatingId(null)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full h-8 px-2 text-left text-sm rounded hover:bg-gray-100 flex items-center justify-between ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        {isUpdating && !isOpen ? (
          <span className="flex items-center gap-2 text-gray-500">
            <Spinner size="sm" className="h-3 w-3" />
            <span>Updating...</span>
          </span>
        ) : selectedStaff.length === 0 ? (
          <span className="text-gray-400">—</span>
        ) : (
          <span className="truncate text-gray-700">
            {selectedStaff.length === 1 
              ? selectedStaff[0].name 
              : `${selectedStaff.length} staff`}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto py-1">
            {staff?.length === 0 && (
              <div className="px-3 py-2 text-gray-500 text-sm">No staff available</div>
            )}
            {staff?.map((member) => {
              const isSelected = selectedIds?.includes(member.id)
              const isThisUpdating = updatingId === member.id
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleStaff(member.id)}
                  disabled={isUpdating}
                  className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 cursor-pointer ${
                    isSelected ? "bg-gray-100" : ""
                  } ${isUpdating ? "opacity-50" : ""}`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isSelected ? "bg-gray-800 border-gray-800" : "border-gray-300"
                  }`}>
                    {isThisUpdating ? (
                      <Spinner size="sm" className="h-2.5 w-2.5 text-white" />
                    ) : isSelected ? (
                      <Check className="h-3 w-3 text-white" />
                    ) : null}
                  </div>
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[8px] bg-gray-200 text-gray-600">
                      {member.name?.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{member.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const expeditionIdFromUrl = searchParams.get('expedition') ? parseInt(searchParams.get('expedition')!) : null

  const { selectedExpedition, selectedExpeditionId, activeExpedition, userExpeditions } = useExpeditionContext()
  const activeExpeditionId = expeditionIdFromUrl || activeExpedition?.id || selectedExpeditionId
  const { data: allExpeditionsData } = useExpeditions()
  
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
    return activeExpedition || selectedExpedition
  }, [expeditionIdFromUrl, allExpeditionsData, userExpeditions, activeExpedition, selectedExpedition])
  
  const { data: schedules, isLoading: loadingSchedules } = useExpeditionSchedules(activeExpeditionId || undefined)
  const { data: locations } = useExpeditionLocations(activeExpeditionId || undefined)
  const { data: staff } = useTeachers()
  const [showOldDates, setShowOldDates] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showOldDates')
      return saved === 'true'
    }
    return false
  })
  const [groupByLocation, setGroupByLocation] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('groupByLocation')
      return saved === 'true'
    }
    return false
  })
  const [generatingDates, setGeneratingDates] = useState(false)
  const [updatingTypeId, setUpdatingTypeId] = useState<number | null>(null)
  const [updatingLocationId, setUpdatingLocationId] = useState<string | null>(null) // "scheduleId-location" or "scheduleId-destination"
  const [updatingStaffOffId, setUpdatingStaffOffId] = useState<number | null>(null)
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null)
  const [notesValues, setNotesValues] = useState<Record<number, string>>({})
  const [collapsedLocations, setCollapsedLocations] = useState<Set<string>>(new Set())
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [detailNotes, setDetailNotes] = useState("")
  const [savingDetailNotes, setSavingDetailNotes] = useState(false)
  
  // Scroll tracking for gradient indicators
  const [scrollState, setScrollState] = useState<Record<string, { left: boolean; right: boolean }>>({})
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({})
  
  const updateScrollState = useCallback((key: string, element: HTMLDivElement | null) => {
    if (!element) return
    const { scrollLeft, scrollWidth, clientWidth } = element
    const canScrollLeft = scrollLeft > 0
    const canScrollRight = scrollLeft < scrollWidth - clientWidth - 1
    setScrollState(prev => {
      if (prev[key]?.left === canScrollLeft && prev[key]?.right === canScrollRight) return prev
      return { ...prev, [key]: { left: canScrollLeft, right: canScrollRight } }
    })
  }, [])
  
  const handleScrollRef = useCallback((key: string) => (el: HTMLDivElement | null) => {
    scrollRefs.current[key] = el
    if (el) {
      updateScrollState(key, el)
      el.onscroll = () => updateScrollState(key, el)
    }
  }, [updateScrollState])
  
  // Update scroll state on window resize
  useEffect(() => {
    const handleResize = () => {
      Object.entries(scrollRefs.current).forEach(([key, el]) => {
        updateScrollState(key, el)
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateScrollState])

  const formatLocation = (location: any) => {
    if (!location) return "No Location"
    return `${location.port}, ${location.country}`
  }

  const formatDate = (dateString: string) => {
    // Parse date without timezone issues by splitting the date string
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day) // month is 0-indexed
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const calculateTotalDays = (startDate: string, endDate: string) => {
    // Parse dates without timezone issues
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number)
    const start = new Date(startYear, startMonth - 1, startDay)
    const end = new Date(endYear, endMonth - 1, endDay)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays + 1 // Include both start and end days
  }

  // Filter and sort schedules by active expedition (ascending order - oldest to newest)
  const allFilteredSchedules = useMemo(() => {
    if (!schedules || !activeExpeditionId) return []
    return schedules
      .filter((s: any) => s.expeditions_id === activeExpeditionId)
      .sort((a: any, b: any) => {
        // Parse dates without timezone issues
        const [aYear, aMonth, aDay] = a.date.split('-').map(Number)
        const [bYear, bMonth, bDay] = b.date.split('-').map(Number)
        const aDate = new Date(aYear, aMonth - 1, aDay)
        const bDate = new Date(bYear, bMonth - 1, bDay)
        return aDate.getTime() - bDate.getTime()
      })
  }, [schedules, activeExpeditionId])

  // Filter out old dates if toggle is off
  const today = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  }, [])

  const filteredSchedules = useMemo(() => {
    // For non-active expeditions, always show all dates (past and future)
    if (!displayExpedition?.isActive) return allFilteredSchedules
    
    // For active expeditions, respect the toggle
    if (showOldDates) return allFilteredSchedules
    return allFilteredSchedules.filter((s: any) => {
      // Parse date without timezone issues
      const [year, month, day] = s.date.split('-').map(Number)
      const scheduleDate = new Date(year, month - 1, day)
      scheduleDate.setHours(0, 0, 0, 0)
      return scheduleDate >= today
    })
  }, [allFilteredSchedules, showOldDates, today, displayExpedition?.isActive])

  // Calculate day type counts
  const dayTypeCounts = useMemo(() => {
    if (!schedules) return { anchored: 0, service: 0, offshore: 0 }
    
    let anchored = 0
    let service = 0
    let offshore = 0
    
    schedules.forEach((s: any) => {
      if (s.isOffshore || s.is_offshore) {
        offshore++
      } else if (s.isService || s.is_service) {
        service++
      } else {
        anchored++
      }
    })
    
    return { anchored, service, offshore }
  }, [schedules])

  // Group schedules by location if enabled
  const schedulesByLocation = useMemo(() => {
    if (!groupByLocation) return {}
    
    const groups: Record<string, any[]> = {}
    
    filteredSchedules.forEach((schedule: any) => {
      const locationKey = schedule._expedition_current_location 
        ? formatLocation(schedule._expedition_current_location)
        : "No Location Set"
      if (!groups[locationKey]) {
        groups[locationKey] = []
      }
      groups[locationKey].push(schedule)
    })
    
    return groups
  }, [filteredSchedules, groupByLocation])

  const toggleLocation = (locationKey: string) => {
    setCollapsedLocations((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(locationKey)) {
        newSet.delete(locationKey)
      } else {
        newSet.add(locationKey)
      }
      return newSet
    })
  }

  const handleShowOldDatesChange = (checked: boolean) => {
    setShowOldDates(checked)
    if (typeof window !== 'undefined') {
      localStorage.setItem('showOldDates', checked.toString())
    }
  }

  const handleGroupByLocationChange = (checked: boolean) => {
    setGroupByLocation(checked)
    if (typeof window !== 'undefined') {
      localStorage.setItem('groupByLocation', checked.toString())
    }
  }

  const isOldDate = (dateString: string) => {
    // Parse date without timezone issues
    const [year, month, day] = dateString.split('-').map(Number)
    const scheduleDate = new Date(year, month - 1, day)
    scheduleDate.setHours(0, 0, 0, 0)
    return scheduleDate < today
  }

  const handleViewSchedule = (schedule: any, e?: React.MouseEvent) => {
    e?.stopPropagation()
    // Use the date string directly - it's already in YYYY-MM-DD format
    router.push(`/schedule/${schedule.date}`)
  }

  const handleRowClick = (schedule: any) => {
    setSelectedSchedule(schedule)
    setDetailNotes(schedule.notes || "")
    setDetailModalOpen(true)
  }

  const handleDetailNotesUpdate = async () => {
    if (!selectedSchedule) return
    
    setSavingDetailNotes(true)
    try {
      await updateExpeditionSchedule(selectedSchedule.id, {
        expedition_schedule_id: selectedSchedule.id,
        name: selectedSchedule.name,
        date: selectedSchedule.date,
        isOffshore: selectedSchedule.isOffshore,
        isService: selectedSchedule.isService,
        current_location: selectedSchedule.current_location,
        destination: selectedSchedule.destination,
        expeditions_id: selectedSchedule.expeditions_id,
        notes: detailNotes || "",
      })
      mutate(`expedition_schedules_${selectedSchedule.expeditions_id}`)
      toast.success("Notes updated")
      // Update the selected schedule with new notes
      setSelectedSchedule({ ...selectedSchedule, notes: detailNotes })
    } catch (error) {
      console.error("Failed to update notes:", error)
      toast.error("Failed to update notes")
    } finally {
      setSavingDetailNotes(false)
    }
  }

  const getScheduleTypeName = (schedule: any) => {
    if (schedule.isOffshore || schedule.is_offshore) return "Offshore"
    if (schedule.isService || schedule.is_service) return "Service"
    return "Anchored"
  }

  const getScheduleTypeColor = (schedule: any) => {
    if (schedule.isOffshore || schedule.is_offshore) return "bg-blue-100 text-blue-800"
    if (schedule.isService || schedule.is_service) return "bg-red-100 text-red-800"
    return "bg-green-100 text-green-800"
  }

  const handleGenerateAllDates = async () => {
    if (!activeExpeditionId) {
      toast.error("No active expedition selected")
      return
    }
    
    setGeneratingDates(true)
    try {
      await addAllDatesForExpedition(activeExpeditionId)
      mutate(`expedition_schedules_${activeExpeditionId}`)
      toast.success("All dates generated successfully")
    } catch (error) {
      console.error("Failed to generate dates:", error)
      toast.error("Failed to generate dates")
    } finally {
      setGeneratingDates(false)
    }
  }

  const handleLocationChange = async (schedule: any, locationId: number, isDestination: boolean) => {
    const updateKey = `${schedule.id}-${isDestination ? 'destination' : 'location'}`
    setUpdatingLocationId(updateKey)
    try {
      await updateExpeditionSchedule(schedule.id, {
        expedition_schedule_id: schedule.id,
        name: schedule.name,
        date: schedule.date,
        isOffshore: schedule.isOffshore,
        isService: schedule.isService,
        current_location: isDestination ? schedule.current_location : locationId,
        destination: isDestination ? locationId : schedule.destination,
        expeditions_id: schedule.expeditions_id,
      })
      mutate(`expedition_schedules_${schedule.expeditions_id}`)
      toast.success("Location updated")
    } catch (error) {
      console.error("Failed to update location:", error)
      toast.error("Failed to update location")
    } finally {
      setUpdatingLocationId(null)
    }
  }

  const handleTypeChange = async (schedule: any, type: "anchored" | "service" | "offshore") => {
    const typeMap = {
      "anchored": { isOffshore: false, isService: false },
      "service": { isOffshore: false, isService: true },
      "offshore": { isOffshore: true, isService: false },
    }
    const { isOffshore, isService } = typeMap[type]
    
    // Optimistically update the local data immediately
    const swrKey = `expedition_schedules_${schedule.expeditions_id}`
    mutate(swrKey, (currentData: any[] | undefined) => {
      if (!currentData) return currentData
      return currentData.map((s: any) => 
        s.id === schedule.id 
          ? { ...s, isOffshore, isService, is_offshore: isOffshore, is_service: isService }
          : s
      )
    }, { revalidate: false })
    
    try {
      await updateExpeditionSchedule(schedule.id, {
        expedition_schedule_id: schedule.id,
        name: schedule.name,
        date: schedule.date,
        isOffshore: isOffshore,
        isService: isService,
        current_location: schedule.current_location,
        destination: isOffshore ? schedule.destination : 0, // Clear destination if not offshore
        expeditions_id: schedule.expeditions_id,
      })
      toast.success("Type updated")
    } catch (error) {
      console.error("Failed to update type:", error)
      toast.error("Failed to update type")
      // Revert on error by refetching
      mutate(swrKey)
    }
  }

  const handleNotesUpdate = async (schedule: any) => {
    // Get the notes value from local state if editing, otherwise use current value
    const newNotes = notesValues.hasOwnProperty(schedule.id) ? notesValues[schedule.id] : schedule.notes
    
    console.log('Saving notes:', { scheduleId: schedule.id, newNotes: `"${newNotes}"`, length: newNotes?.length })
    
    // Optimistically update the UI immediately
    const optimisticData = schedules?.map((s: any) => 
      s.id === schedule.id ? { ...s, notes: newNotes } : s
    )
    
    // Update UI immediately (optimistic)
    mutate("expedition_schedules", optimisticData, false)
    setEditingNotesId(null)
    setNotesValues((prev) => {
      const newState = { ...prev }
      delete newState[schedule.id]
      return newState
    })
    
    try {
      const updateData = {
        expedition_schedule_id: schedule.id,
        name: schedule.name,
        date: schedule.date,
        isOffshore: schedule.isOffshore,
        isService: schedule.isService,
        current_location: schedule.current_location,
        destination: schedule.destination,
        expeditions_id: schedule.expeditions_id,
        notes: newNotes || "",
      }
      
      console.log('Update payload:', JSON.stringify(updateData, null, 2))
      
      const result = await updateExpeditionSchedule(schedule.id, updateData)
      console.log('Update result:', result)
      
      // Check if backend actually updated
      if (result.notes !== newNotes && result.notes !== (newNotes || "")) {
        console.warn('Backend did not update notes field. This may be a Xano API configuration issue.')
        console.warn('Expected:', newNotes, 'Got:', result.notes)
        toast.error("Notes may not have saved - check Xano API configuration")
      } else {
        toast.success(newNotes && newNotes.length > 0 ? "Notes updated" : "Notes cleared")
      }
      
      // Revalidate to get fresh data
      mutate(`expedition_schedules_${schedule.expeditions_id}`)
    } catch (error) {
      console.error("Failed to update notes:", error)
      toast.error("Failed to update notes")
      // Revert on error
      mutate(`expedition_schedules_${schedule.expeditions_id}`)
    }
  }

  const handleNotesChange = (scheduleId: number, value: string) => {
    // Always update the value, even if it's empty string
    setNotesValues((prev) => ({ ...prev, [scheduleId]: value }))
  }

  const handleNotesCancel = (scheduleId: number) => {
    setEditingNotesId(null)
    setNotesValues((prev) => {
      const newState = { ...prev }
      delete newState[scheduleId]
      return newState
    })
  }

  const isLoading = loadingSchedules

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Expedition Header with Navigation */}
      <ExpeditionHeader expedition={displayExpedition} isLoading={!displayExpedition} currentPage="trip-planner" />

      {/* Action Bar */}
      {displayExpedition && (
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Only show this toggle for active expeditions */}
                {displayExpedition?.isActive && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-old"
                      checked={showOldDates}
                      onCheckedChange={handleShowOldDatesChange}
                    />
                    <Label htmlFor="show-old" className="text-sm cursor-pointer">
                      Show past dates
                    </Label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch
                    id="group-location"
                    checked={groupByLocation}
                    onCheckedChange={handleGroupByLocationChange}
                  />
                  <Label htmlFor="group-location" className="text-sm cursor-pointer">
                    Group by location
                  </Label>
                </div>
              </div>
              <Button 
                onClick={handleGenerateAllDates} 
                variant="outline"
                disabled={generatingDates || !activeExpeditionId}
                className="cursor-pointer"
                title={!activeExpeditionId ? "No active expedition selected" : "Generate all dates for the expedition"}
              >
                <Plus className="h-4 w-4 mr-2" />
                {generatingDates ? "Generating..." : "Generate All Dates"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Schedule Table */}
        <div className={groupByLocation ? "space-y-4" : ""}>
          {isLoading ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="h-12 px-6 text-sm font-semibold text-gray-700">Date</TableHead>
                    <TableHead className="h-12 px-6 text-sm font-semibold text-gray-700">Location</TableHead>
                    <TableHead className="h-12 px-6 text-sm font-semibold text-gray-700">Destination</TableHead>
                    <TableHead className="h-12 px-6 text-sm font-semibold text-gray-700">Type</TableHead>
                    <TableHead className="h-12 px-6 text-right text-sm font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="h-16 px-6">
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-9 w-16" />
                          <Skeleton className="h-9 w-20" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-12 text-center text-muted-foreground">
              No schedules found for this expedition
            </div>
          ) : groupByLocation ? (
            Object.entries(schedulesByLocation).map(([locationKey, locationSchedules]) => {
              const isCollapsed = collapsedLocations.has(locationKey)
              
              return (
                <div key={locationKey} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  {/* Location Header - Collapsible */}
                  <button
                    onClick={() => toggleLocation(locationKey)}
                    className="w-full flex items-center justify-between px-6 py-4 bg-gray-50/50 hover:bg-gray-100/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                      <h3 className="text-base font-semibold text-gray-900">{locationKey}</h3>
                      <Badge variant="outline" className="ml-2">
                        {locationSchedules.length}
                      </Badge>
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="relative">
                      {/* Left scroll gradient indicator */}
                      <div className={`absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 transition-opacity ${scrollState[locationKey]?.left ? 'opacity-100' : 'opacity-0'}`} />
                      {/* Right scroll gradient indicator */}
                      <div className={`absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 transition-opacity ${scrollState[locationKey]?.right !== false ? 'opacity-100' : 'opacity-0'}`} />
                      <div className="overflow-x-auto" ref={handleScrollRef(locationKey)}>
                    <Table className="table-fixed w-full min-w-[1310px]">
                      <TableHeader>
                        <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "100px" }}>Date</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "230px" }}>Location</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "150px" }}>Type</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "230px" }}>Destination</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "200px" }}>Time Off</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "300px" }}>Notes</TableHead>
                          <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600" style={{ width: "100px" }}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {locationSchedules.map((schedule: any) => {
                          const isPast = isOldDate(schedule.date)
                          
                          return (
                            <TableRow 
                              key={schedule.id}
                              className="border-b last:border-0 transition-colors hover:bg-gray-50/50 cursor-pointer"
                              onClick={() => handleRowClick(schedule)}
                            >
                              {/* Row content - reuse the same cells */}
                              <TableCell className="h-14 px-4" style={{ width: "100px" }}>
                                <span className="font-semibold text-sm text-gray-900">
                                  {formatDate(schedule.date)}
                                </span>
                              </TableCell>
                              <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()} style={{ width: "230px" }}>
                                <div className="relative">
                                  <Select
                                    value={schedule.current_location?.toString() || "1"}
                                    onValueChange={(value) => handleLocationChange(schedule, Number(value), false)}
                                    disabled={updatingLocationId === `${schedule.id}-location`}
                                  >
                                    <SelectTrigger className={`w-full h-8 text-sm border-0 hover:bg-gray-100 cursor-pointer ${updatingLocationId === `${schedule.id}-location` ? 'opacity-50' : ''} [&>span]:truncate [&>span]:max-w-[180px]`}>
                                      <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                    <SelectContent className="min-w-[280px]">
                                      {locations?.map((location: any) => (
                                        <SelectItem 
                                          key={location.id} 
                                          value={location.id.toString()}
                                          className="cursor-pointer"
                                        >
                                          <span className="font-medium">{location.port}</span>
                                          <span className="text-muted-foreground ml-1">· {location.country}</span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {updatingLocationId === `${schedule.id}-location` && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                      <Spinner size="sm" className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()} style={{ width: "100px" }}>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleTypeChange(schedule, "anchored")}
                                    disabled={updatingTypeId === schedule.id}
                                    className={`relative px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer min-w-[28px] flex items-center justify-center ${
                                      !(schedule.isOffshore || schedule.is_offshore) && !(schedule.isService || schedule.is_service)
                                        ? 'bg-green-50 text-green-700 border-2 border-green-200'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    } ${updatingTypeId === schedule.id ? 'cursor-not-allowed' : ''}`}
                                    title="Anchored"
                                  >
                                    <span className={updatingTypeId === schedule.id ? 'invisible' : ''}>A</span>
                                    {updatingTypeId === schedule.id && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Spinner size="sm" className="h-3 w-3" />
                                      </div>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleTypeChange(schedule, "service")}
                                    disabled={updatingTypeId === schedule.id}
                                    className={`relative px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer min-w-[28px] flex items-center justify-center ${
                                      (schedule.isService || schedule.is_service)
                                        ? 'bg-red-50 text-red-700 border-2 border-red-200'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    } ${updatingTypeId === schedule.id ? 'cursor-not-allowed' : ''}`}
                                    title="Service"
                                  >
                                    <span className={updatingTypeId === schedule.id ? 'invisible' : ''}>S</span>
                                    {updatingTypeId === schedule.id && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Spinner size="sm" className="h-3 w-3" />
                                      </div>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleTypeChange(schedule, "offshore")}
                                    disabled={updatingTypeId === schedule.id}
                                    className={`relative px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer min-w-[28px] flex items-center justify-center ${
                                      (schedule.isOffshore || schedule.is_offshore)
                                        ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    } ${updatingTypeId === schedule.id ? 'cursor-not-allowed' : ''}`}
                                    title="Offshore"
                                  >
                                    <span className={updatingTypeId === schedule.id ? 'invisible' : ''}>O</span>
                                    {updatingTypeId === schedule.id && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Spinner size="sm" className="h-3 w-3" />
                                      </div>
                                    )}
                                  </button>
                                </div>
                              </TableCell>
                              <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()} style={{ width: "230px" }}>
                                <div className="relative">
                                  <Select
                                    value={schedule.destination?.toString() || "0"}
                                    onValueChange={(value) => handleLocationChange(schedule, Number(value), true)}
                                    disabled={!(schedule.isOffshore || schedule.is_offshore) || updatingLocationId === `${schedule.id}-destination`}
                                  >
                                    <SelectTrigger className={`w-full h-8 text-sm border-0 ${(schedule.isOffshore || schedule.is_offshore) ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-not-allowed'} ${updatingLocationId === `${schedule.id}-destination` ? 'opacity-50' : ''} [&>span]:truncate [&>span]:max-w-[180px]`}>
                                      <SelectValue placeholder="—" />
                                    </SelectTrigger>
                                    <SelectContent className="min-w-[280px]">
                                      <SelectItem value="0" className="cursor-pointer text-muted-foreground">—</SelectItem>
                                      {locations?.map((location: any) => (
                                        <SelectItem 
                                          key={location.id} 
                                          value={location.id.toString()}
                                          className="cursor-pointer"
                                        >
                                          <span className="font-medium">{location.port}</span>
                                          <span className="text-muted-foreground ml-1">· {location.country}</span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {updatingLocationId === `${schedule.id}-destination` && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                      <Spinner size="sm" className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="h-14 px-4" style={{ width: "200px" }} onClick={(e) => e.stopPropagation()}>
                                <div className="relative">
                                  <StaffOffMultiSelect
                                    staff={staff || []}
                                    selectedIds={schedule.staff_off || []}
                                    disabled={updatingStaffOffId === schedule.id}
                                    onUpdate={async (ids) => {
                                      setUpdatingStaffOffId(schedule.id)
                                      try {
                                        await updateExpeditionSchedule(schedule.id, {
                                          ...schedule,
                                          expedition_schedule_id: schedule.id,
                                          staff_off: ids
                                        })
                                        mutate(`expedition_schedules_${schedule.expeditions_id}`)
                                        toast.success("Staff off updated")
                                      } catch (error) {
                                        toast.error("Failed to update")
                                      } finally {
                                        setUpdatingStaffOffId(null)
                                      }
                                    }}
                                  />
                                  {updatingStaffOffId === schedule.id && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                      <Spinner size="sm" className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="h-14 px-4" style={{ width: "300px" }} onClick={(e) => e.stopPropagation()}>
                                {editingNotesId === schedule.id ? (
                                  <div className="flex items-center gap-1" style={{ maxWidth: "280px" }}>
                                    <Input
                                      value={notesValues.hasOwnProperty(schedule.id) ? notesValues[schedule.id] : (schedule.notes ?? "")}
                                      onChange={(e) => handleNotesChange(schedule.id, e.target.value)}
                                      placeholder="Add notes..."
                                      className="h-7 text-sm flex-1 min-w-0"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleNotesUpdate(schedule)
                                        } else if (e.key === 'Escape') {
                                          handleNotesCancel(schedule.id)
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 cursor-pointer shrink-0"
                                      onClick={() => handleNotesUpdate(schedule)}
                                    >
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 cursor-pointer shrink-0"
                                      onClick={() => handleNotesCancel(schedule.id)}
                                    >
                                      <X className="h-3 w-3 text-gray-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className="text-sm text-gray-700 cursor-text hover:bg-gray-50 px-2 py-1 rounded min-h-[32px] flex items-center max-w-[280px]"
                                    onClick={() => {
                                      setEditingNotesId(schedule.id)
                                      setNotesValues((prev) => ({ ...prev, [schedule.id]: schedule.notes ?? "" }))
                                    }}
                                    title={schedule.notes || undefined}
                                  >
                                    <span className="truncate">{schedule.notes || <span className="text-gray-300">Click to add notes...</span>}</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="h-14 px-4" style={{ width: "100px" }}>
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    variant="outline"
                                    size="icon"
                                    onClick={(e) => handleViewSchedule(schedule, e)}
                                    className="h-8 w-8 text-gray-500 hover:text-gray-900 cursor-pointer border-gray-300"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden relative">
              {/* Left scroll gradient indicator */}
              <div className={`absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 transition-opacity ${scrollState['main']?.left ? 'opacity-100' : 'opacity-0'}`} />
              {/* Right scroll gradient indicator */}
              <div className={`absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 transition-opacity ${scrollState['main']?.right !== false ? 'opacity-100' : 'opacity-0'}`} />
              <div className="overflow-x-auto" ref={handleScrollRef('main')}>
                    <Table className="table-fixed w-full min-w-[1310px]">
                      <TableHeader>
                        <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "100px" }}>Date</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "230px" }}>Location</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "150px" }}>Type</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "230px" }}>Destination</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "200px" }}>Time Off</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "300px" }}>Notes</TableHead>
                          <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600" style={{ width: "100px" }}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSchedules.map((schedule: any) => {
                          const isPast = isOldDate(schedule.date)
                          
                          return (
                            <TableRow 
                              key={schedule.id}
                              className="border-b last:border-0 transition-colors hover:bg-gray-50/50 cursor-pointer"
                              onClick={() => handleRowClick(schedule)}
                            >
                              <TableCell className="h-14 px-4" style={{ width: "100px" }}>
                                <span className="font-semibold text-sm text-gray-900">
                                  {formatDate(schedule.date)}
                                </span>
                              </TableCell>
                              <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()} style={{ width: "230px" }}>
                                <div className="relative">
                                  <Select
                                    value={schedule.current_location?.toString() || "1"}
                                    onValueChange={(value) => handleLocationChange(schedule, Number(value), false)}
                                    disabled={updatingLocationId === `${schedule.id}-location`}
                                  >
                                    <SelectTrigger className={`w-full h-8 text-sm border-0 hover:bg-gray-100 cursor-pointer ${updatingLocationId === `${schedule.id}-location` ? 'opacity-50' : ''} [&>span]:truncate [&>span]:max-w-[180px]`}>
                                      <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                    <SelectContent className="min-w-[280px]">
                                      {locations?.map((location: any) => (
                                        <SelectItem 
                                          key={location.id} 
                                          value={location.id.toString()}
                                          className="cursor-pointer"
                                        >
                                          <span className="font-medium">{location.port}</span>
                                          <span className="text-muted-foreground ml-1">· {location.country}</span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {updatingLocationId === `${schedule.id}-location` && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                      <Spinner size="sm" className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()} style={{ width: "100px" }}>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleTypeChange(schedule, "anchored")}
                                    disabled={updatingTypeId === schedule.id}
                                    className={`relative px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer min-w-[28px] flex items-center justify-center ${
                                      !(schedule.isOffshore || schedule.is_offshore) && !(schedule.isService || schedule.is_service)
                                        ? 'bg-green-50 text-green-700 border-2 border-green-200'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    } ${updatingTypeId === schedule.id ? 'cursor-not-allowed' : ''}`}
                                    title="Anchored"
                                  >
                                    <span className={updatingTypeId === schedule.id ? 'invisible' : ''}>A</span>
                                    {updatingTypeId === schedule.id && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Spinner size="sm" className="h-3 w-3" />
                                      </div>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleTypeChange(schedule, "service")}
                                    disabled={updatingTypeId === schedule.id}
                                    className={`relative px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer min-w-[28px] flex items-center justify-center ${
                                      (schedule.isService || schedule.is_service)
                                        ? 'bg-red-50 text-red-700 border-2 border-red-200'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    } ${updatingTypeId === schedule.id ? 'cursor-not-allowed' : ''}`}
                                    title="Service"
                                  >
                                    <span className={updatingTypeId === schedule.id ? 'invisible' : ''}>S</span>
                                    {updatingTypeId === schedule.id && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Spinner size="sm" className="h-3 w-3" />
                                      </div>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleTypeChange(schedule, "offshore")}
                                    disabled={updatingTypeId === schedule.id}
                                    className={`relative px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer min-w-[28px] flex items-center justify-center ${
                                      (schedule.isOffshore || schedule.is_offshore)
                                        ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    } ${updatingTypeId === schedule.id ? 'cursor-not-allowed' : ''}`}
                                    title="Offshore"
                                  >
                                    <span className={updatingTypeId === schedule.id ? 'invisible' : ''}>O</span>
                                    {updatingTypeId === schedule.id && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Spinner size="sm" className="h-3 w-3" />
                                      </div>
                                    )}
                                  </button>
                                </div>
                              </TableCell>
                              <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()} style={{ width: "230px" }}>
                                <div className="relative">
                                  <Select
                                    value={schedule.destination?.toString() || "0"}
                                    onValueChange={(value) => handleLocationChange(schedule, Number(value), true)}
                                    disabled={!(schedule.isOffshore || schedule.is_offshore) || updatingLocationId === `${schedule.id}-destination`}
                                  >
                                    <SelectTrigger className={`w-full h-8 text-sm border-0 ${(schedule.isOffshore || schedule.is_offshore) ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-not-allowed'} ${updatingLocationId === `${schedule.id}-destination` ? 'opacity-50' : ''} [&>span]:truncate [&>span]:max-w-[180px]`}>
                                      <SelectValue placeholder="—" />
                                    </SelectTrigger>
                                    <SelectContent className="min-w-[280px]">
                                      <SelectItem value="0" className="cursor-pointer text-muted-foreground">—</SelectItem>
                                      {locations?.map((location: any) => (
                                        <SelectItem 
                                          key={location.id} 
                                          value={location.id.toString()}
                                          className="cursor-pointer"
                                        >
                                          <span className="font-medium">{location.port}</span>
                                          <span className="text-muted-foreground ml-1">· {location.country}</span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {updatingLocationId === `${schedule.id}-destination` && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                      <Spinner size="sm" className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="h-14 px-4" style={{ width: "200px" }} onClick={(e) => e.stopPropagation()}>
                                <div className="relative">
                                  <StaffOffMultiSelect
                                    staff={staff || []}
                                    selectedIds={schedule.staff_off || []}
                                    disabled={updatingStaffOffId === schedule.id}
                                    onUpdate={async (ids) => {
                                      setUpdatingStaffOffId(schedule.id)
                                      try {
                                        await updateExpeditionSchedule(schedule.id, {
                                          ...schedule,
                                          expedition_schedule_id: schedule.id,
                                          staff_off: ids
                                        })
                                        mutate(`expedition_schedules_${schedule.expeditions_id}`)
                                        toast.success("Staff off updated")
                                      } catch (error) {
                                        toast.error("Failed to update")
                                      } finally {
                                        setUpdatingStaffOffId(null)
                                      }
                                    }}
                                  />
                                  {updatingStaffOffId === schedule.id && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                      <Spinner size="sm" className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="h-14 px-4" style={{ width: "300px" }} onClick={(e) => e.stopPropagation()}>
                                {editingNotesId === schedule.id ? (
                                  <div className="flex items-center gap-1" style={{ maxWidth: "280px" }}>
                                    <Input
                                      value={notesValues.hasOwnProperty(schedule.id) ? notesValues[schedule.id] : (schedule.notes ?? "")}
                                      onChange={(e) => handleNotesChange(schedule.id, e.target.value)}
                                      placeholder="Add notes..."
                                      className="h-7 text-sm flex-1 min-w-0"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleNotesUpdate(schedule)
                                        } else if (e.key === 'Escape') {
                                          handleNotesCancel(schedule.id)
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 cursor-pointer shrink-0"
                                      onClick={() => handleNotesUpdate(schedule)}
                                    >
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 cursor-pointer shrink-0"
                                      onClick={() => handleNotesCancel(schedule.id)}
                                    >
                                      <X className="h-3 w-3 text-gray-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    className="text-sm text-gray-700 cursor-text hover:bg-gray-50 px-2 py-1 rounded min-h-[32px] flex items-center max-w-[280px]"
                                    onClick={() => {
                                      setEditingNotesId(schedule.id)
                                      setNotesValues((prev) => ({ ...prev, [schedule.id]: schedule.notes ?? "" }))
                                    }}
                                    title={schedule.notes || undefined}
                                  >
                                    <span className="truncate">{schedule.notes || <span className="text-gray-300">Click to add notes...</span>}</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="h-14 px-4" style={{ width: "100px" }}>
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    variant="outline"
                                    size="icon"
                                    onClick={(e) => handleViewSchedule(schedule, e)}
                                    className="h-8 w-8 text-gray-500 hover:text-gray-900 cursor-pointer border-gray-300"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Schedule Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedSchedule && formatDate(selectedSchedule.date)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSchedule && (
            <div className="space-y-6 mt-4">
              {/* Type Badge */}
              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getScheduleTypeColor(selectedSchedule)}`}>
                  {getScheduleTypeName(selectedSchedule)}
                </div>
              </div>

              {/* Location */}
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                  Current Location
                </div>
                <div className="flex items-center gap-2 text-gray-900">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">
                    {selectedSchedule._expedition_current_location 
                      ? formatLocation(selectedSchedule._expedition_current_location)
                      : "No location set"}
                  </span>
                </div>
              </div>

              {/* Destination - only show for offshore */}
              {(selectedSchedule.isOffshore || selectedSchedule.is_offshore) && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                    Destination
                  </div>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Ship className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">
                      {selectedSchedule._expedition_destination_location 
                        ? formatLocation(selectedSchedule._expedition_destination_location)
                        : locations?.find((l: any) => l.id === selectedSchedule.destination)
                          ? formatLocation(locations.find((l: any) => l.id === selectedSchedule.destination))
                          : "No destination set"}
                    </span>
                  </div>
                </div>
              )}

              {/* Staff Off */}
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                  Staff Off
                </div>
                {selectedSchedule.staff_off && selectedSchedule.staff_off.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedSchedule.staff_off.map((staffId: number) => {
                      const staffMember = staff?.find((s: any) => s.id === staffId)
                      return (
                        <div key={staffId} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px] bg-gray-200 text-gray-600">
                              {staffMember?.name?.split(" ").map((n: string) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-700">{staffMember?.name || "Unknown"}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <span className="text-gray-400">No staff off</span>
                )}
              </div>

              {/* Notes */}
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                  Notes
                </div>
                <Textarea
                  value={detailNotes}
                  onChange={(e) => setDetailNotes(e.target.value)}
                  placeholder="Add notes for this day..."
                  className="min-h-[100px] resize-none"
                />
                {detailNotes !== (selectedSchedule.notes || "") && (
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      onClick={handleDetailNotesUpdate}
                      disabled={savingDetailNotes}
                      className="cursor-pointer"
                    >
                      {savingDetailNotes ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    setDetailModalOpen(false)
                    router.push(`/schedule/${selectedSchedule.date}`)
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View Daily Schedule
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    setDetailModalOpen(false)
                    router.push(`/evaluate/${selectedSchedule.date}`)
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Evaluate Students
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
