"use client"

import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { Calendar, Plus, Check, X, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { useExpeditionSchedules, useExpeditionLocations } from "@/lib/hooks/use-expeditions"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addAllDatesForExpedition, updateExpeditionSchedule } from "@/lib/xano"
import { mutate } from "swr"
import { toast } from "sonner"

export default function DashboardPage() {
  const router = useRouter()

  const { selectedExpedition, selectedExpeditionId } = useExpeditionContext()
  const { data: schedules, isLoading: loadingSchedules } = useExpeditionSchedules()
  const { data: locations } = useExpeditionLocations(selectedExpeditionId || undefined)
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
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null)
  const [notesValues, setNotesValues] = useState<Record<number, string>>({})
  const [collapsedLocations, setCollapsedLocations] = useState<Set<string>>(new Set())
  
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

  // Filter and sort schedules by selected expedition (ascending order - oldest to newest)
  const allFilteredSchedules = useMemo(() => {
    if (!schedules || !selectedExpeditionId) return []
    return schedules
      .filter((s: any) => s.expeditions_id === selectedExpeditionId)
      .sort((a: any, b: any) => {
        // Parse dates without timezone issues
        const [aYear, aMonth, aDay] = a.date.split('-').map(Number)
        const [bYear, bMonth, bDay] = b.date.split('-').map(Number)
        const aDate = new Date(aYear, aMonth - 1, aDay)
        const bDate = new Date(bYear, bMonth - 1, bDay)
        return aDate.getTime() - bDate.getTime()
      })
  }, [schedules, selectedExpeditionId])

  // Filter out old dates if toggle is off
  const today = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  }, [])

  const filteredSchedules = useMemo(() => {
    if (showOldDates) return allFilteredSchedules
    return allFilteredSchedules.filter((s: any) => {
      // Parse date without timezone issues
      const [year, month, day] = s.date.split('-').map(Number)
      const scheduleDate = new Date(year, month - 1, day)
      scheduleDate.setHours(0, 0, 0, 0)
      return scheduleDate >= today
    })
  }, [allFilteredSchedules, showOldDates, today])

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
    // Use the date string directly - it's already in YYYY-MM-DD format
    router.push(`/evaluate/${schedule.date}`)
  }

  const handleGenerateAllDates = async () => {
    setGeneratingDates(true)
    try {
      await addAllDatesForExpedition()
      mutate("expedition_schedules")
      toast.success("All dates generated successfully")
    } catch (error) {
      console.error("Failed to generate dates:", error)
      toast.error("Failed to generate dates")
    } finally {
      setGeneratingDates(false)
    }
  }

  const handleLocationChange = async (schedule: any, locationId: number, isDestination: boolean) => {
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
      mutate("expedition_schedules")
      toast.success("Location updated")
    } catch (error) {
      console.error("Failed to update location:", error)
      toast.error("Failed to update location")
    }
  }

  const handleTypeChange = async (schedule: any, type: "anchored" | "service" | "offshore") => {
    const typeMap = {
      "anchored": { isOffshore: false, isService: false },
      "service": { isOffshore: false, isService: true },
      "offshore": { isOffshore: true, isService: false },
    }
    const { isOffshore, isService } = typeMap[type]
    
    setUpdatingTypeId(schedule.id)
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
      mutate("expedition_schedules")
      toast.success("Type updated")
    } catch (error) {
      console.error("Failed to update type:", error)
      toast.error("Failed to update type")
    } finally {
      setUpdatingTypeId(null)
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
      mutate("expedition_schedules")
    } catch (error) {
      console.error("Failed to update notes:", error)
      toast.error("Failed to update notes")
      // Revert on error
      mutate("expedition_schedules")
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
      {/* Header Section */}
      {selectedExpedition && (
        <div className="border-b bg-white">
          <div className="container mx-auto px-4 py-6">
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            
            <h1 className="text-3xl font-bold mb-2">{selectedExpedition.name}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatDate(selectedExpedition.startDate || selectedExpedition.start_date)} —{" "}
              {formatDate(selectedExpedition.endDate || selectedExpedition.end_date)}
              {" | "}
              {calculateTotalDays(
                selectedExpedition.startDate || selectedExpedition.start_date,
                selectedExpedition.endDate || selectedExpedition.end_date
              )} days
            </p>
          </div>
        </div>
      )}

      {/* Action Bar */}
      {selectedExpedition && (
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
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
                disabled={generatingDates}
                className="cursor-pointer"
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
                    <Table className="table-fixed w-full min-w-[1110px]">
                      <TableHeader>
                        <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "100px" }}>Date</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "230px" }}>Location</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "150px" }}>Type</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "230px" }}>Destination</TableHead>
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
                              className={`border-b last:border-0 transition-colors ${isPast ? 'bg-gray-50' : ''}`}
                            >
                              {/* Row content - reuse the same cells */}
                              <TableCell className="h-14 px-4" style={{ width: "100px" }}>
                                <span className="font-semibold text-sm text-gray-900">
                                  {formatDate(schedule.date)}
                                </span>
                              </TableCell>
                              <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()} style={{ width: "230px" }}>
                                <Select
                                  value={schedule.current_location?.toString() || "1"}
                                  onValueChange={(value) => handleLocationChange(schedule, Number(value), false)}
                                >
                                  <SelectTrigger className="w-full h-8 text-sm border-0 hover:bg-gray-100 cursor-pointer">
                                    <SelectValue>
                                      <span className="text-sm text-gray-700 truncate block max-w-[200px]" title={formatLocation(schedule._expedition_current_location)}>
                                        {formatLocation(schedule._expedition_current_location)}
                                      </span>
                                    </SelectValue>
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
                              </TableCell>
                              <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()} style={{ width: "150px" }}>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleTypeChange(schedule, "anchored")}
                                    disabled={updatingTypeId === schedule.id}
                                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                                      !(schedule.isOffshore || schedule.is_offshore) && !(schedule.isService || schedule.is_service)
                                        ? 'bg-green-50 text-green-700 border-2 border-green-200'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    } ${updatingTypeId === schedule.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Anchored"
                                  >
                                    {updatingTypeId === schedule.id && <Spinner size="sm" className="h-3 w-3" />}
                                    <span className="truncate max-w-[45px]">Anch</span>
                                  </button>
                                  <button
                                    onClick={() => handleTypeChange(schedule, "service")}
                                    disabled={updatingTypeId === schedule.id}
                                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                                      (schedule.isService || schedule.is_service)
                                        ? 'bg-red-50 text-red-700 border-2 border-red-200'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    } ${updatingTypeId === schedule.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Service"
                                  >
                                    {updatingTypeId === schedule.id && <Spinner size="sm" className="h-3 w-3" />}
                                    <span className="truncate max-w-[45px]">Serv</span>
                                  </button>
                                  <button
                                    onClick={() => handleTypeChange(schedule, "offshore")}
                                    disabled={updatingTypeId === schedule.id}
                                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                                      (schedule.isOffshore || schedule.is_offshore)
                                        ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    } ${updatingTypeId === schedule.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Offshore"
                                  >
                                    {updatingTypeId === schedule.id && <Spinner size="sm" className="h-3 w-3" />}
                                    <span className="truncate max-w-[45px]">Offs</span>
                                  </button>
                                </div>
                              </TableCell>
                              <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()} style={{ width: "230px" }}>
                                <Select
                                  value={schedule.destination?.toString() || "0"}
                                  onValueChange={(value) => handleLocationChange(schedule, Number(value), true)}
                                  disabled={!(schedule.isOffshore || schedule.is_offshore)}
                                >
                                  <SelectTrigger className={`w-full h-8 text-sm border-0 ${(schedule.isOffshore || schedule.is_offshore) ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-not-allowed'}`}>
                                    <SelectValue>
                                      {schedule._expedition_destination && schedule.destination !== 0 ? (
                                        <span className="text-sm text-gray-700 truncate block max-w-[200px]" title={formatLocation(schedule._expedition_destination)}>
                                          {formatLocation(schedule._expedition_destination)}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-gray-400">—</span>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="min-w-[280px]">
                                    <SelectItem value="0" className="cursor-pointer text-muted-foreground">No destination</SelectItem>
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
                                    className="text-sm text-gray-700 cursor-text hover:bg-gray-50 px-2 py-1 rounded min-h-[32px] flex items-center"
                                    onClick={() => {
                                      setEditingNotesId(schedule.id)
                                      setNotesValues((prev) => ({ ...prev, [schedule.id]: schedule.notes ?? "" }))
                                    }}
                                  >
                                    {schedule.notes || <span className="text-gray-300">Click to add notes...</span>}
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
                    <Table className="table-fixed w-full min-w-[1110px]">
                      <TableHeader>
                        <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "100px" }}>Date</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "230px" }}>Location</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "150px" }}>Type</TableHead>
                          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "230px" }}>Destination</TableHead>
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
                              className={`border-b last:border-0 transition-colors ${isPast ? 'bg-gray-50' : ''}`}
                            >
                              <TableCell className="h-14 px-4" style={{ width: "100px" }}>
                                <span className="font-semibold text-sm text-gray-900">
                                  {formatDate(schedule.date)}
                                </span>
                              </TableCell>
                              <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()} style={{ width: "230px" }}>
                                <Select
                                  value={schedule.current_location?.toString() || "1"}
                                  onValueChange={(value) => handleLocationChange(schedule, Number(value), false)}
                                >
                                  <SelectTrigger className="w-full h-8 text-sm border-0 hover:bg-gray-100 cursor-pointer">
                                    <SelectValue>
                                      <span className="text-sm text-gray-700 truncate block max-w-[200px]" title={formatLocation(schedule._expedition_current_location)}>
                                        {formatLocation(schedule._expedition_current_location)}
                                      </span>
                                    </SelectValue>
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
                              </TableCell>
                              <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()} style={{ width: "150px" }}>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleTypeChange(schedule, "anchored")}
                                    disabled={updatingTypeId === schedule.id}
                                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                                      !(schedule.isOffshore || schedule.is_offshore) && !(schedule.isService || schedule.is_service)
                                        ? 'bg-green-50 text-green-700 border-2 border-green-200'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    } ${updatingTypeId === schedule.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Anchored"
                                  >
                                    {updatingTypeId === schedule.id && <Spinner size="sm" className="h-3 w-3" />}
                                    <span className="truncate max-w-[45px]">Anch</span>
                                  </button>
                                  <button
                                    onClick={() => handleTypeChange(schedule, "service")}
                                    disabled={updatingTypeId === schedule.id}
                                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                                      (schedule.isService || schedule.is_service)
                                        ? 'bg-red-50 text-red-700 border-2 border-red-200'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    } ${updatingTypeId === schedule.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Service"
                                  >
                                    {updatingTypeId === schedule.id && <Spinner size="sm" className="h-3 w-3" />}
                                    <span className="truncate max-w-[45px]">Serv</span>
                                  </button>
                                  <button
                                    onClick={() => handleTypeChange(schedule, "offshore")}
                                    disabled={updatingTypeId === schedule.id}
                                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                                      (schedule.isOffshore || schedule.is_offshore)
                                        ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                    } ${updatingTypeId === schedule.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Offshore"
                                  >
                                    {updatingTypeId === schedule.id && <Spinner size="sm" className="h-3 w-3" />}
                                    <span className="truncate max-w-[45px]">Offs</span>
                                  </button>
                                </div>
                              </TableCell>
                              <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()} style={{ width: "230px" }}>
                                <Select
                                  value={schedule.destination?.toString() || "0"}
                                  onValueChange={(value) => handleLocationChange(schedule, Number(value), true)}
                                  disabled={!(schedule.isOffshore || schedule.is_offshore)}
                                >
                                  <SelectTrigger className={`w-full h-8 text-sm border-0 ${(schedule.isOffshore || schedule.is_offshore) ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-not-allowed'}`}>
                                    <SelectValue>
                                      {schedule._expedition_destination && schedule.destination !== 0 ? (
                                        <span className="text-sm text-gray-700 truncate block max-w-[200px]" title={formatLocation(schedule._expedition_destination)}>
                                          {formatLocation(schedule._expedition_destination)}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-gray-400">—</span>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="min-w-[280px]">
                                    <SelectItem value="0" className="cursor-pointer text-muted-foreground">No destination</SelectItem>
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
                                    className="text-sm text-gray-700 cursor-text hover:bg-gray-50 px-2 py-1 rounded min-h-[32px] flex items-center"
                                    onClick={() => {
                                      setEditingNotesId(schedule.id)
                                      setNotesValues((prev) => ({ ...prev, [schedule.id]: schedule.notes ?? "" }))
                                    }}
                                  >
                                    {schedule.notes || <span className="text-gray-300">Click to add notes...</span>}
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
    </div>
  )
}
