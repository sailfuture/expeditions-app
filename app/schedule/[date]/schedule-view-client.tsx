"use client"

import { useMemo, useState } from "react"
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { MapPin, Clock, User, MessageSquare, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DateNavigation } from "@/components/date-navigation"
import { AddScheduleItemSheet } from "@/components/add-schedule-item-sheet"
import {
  useExpeditionSchedules,
  useExpeditionScheduleItemsByDate,
  useExpeditionScheduleTemplates,
  useTeachers,
} from "@/lib/hooks/use-expeditions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addExpeditionScheduleTemplate } from "@/lib/xano"
import { mutate } from "swr"
import { toast } from "sonner"

interface ScheduleViewClientProps {
  date: string
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

const getColorForType = (typeName: string) => {
  const colorMap: Record<string, string> = {
    'Orientation': 'bg-green-400',
    'Breakfast': 'bg-orange-400',
    'Lunch': 'bg-blue-400',
    'Dinner': 'bg-yellow-400',
    'Shore Activity': 'bg-purple-400',
    'Performance Reviews': 'bg-pink-400',
  }
  return colorMap[typeName] || 'bg-gray-400'
}

export function ScheduleViewClient({ date }: ScheduleViewClientProps) {
  const router = useRouter()
  const { data: schedules, isLoading: loadingSchedules } = useExpeditionSchedules()
  const { data: scheduleItems, isLoading: loadingItems } = useExpeditionScheduleItemsByDate(date)
  const { data: templates, isLoading: loadingTemplates } = useExpeditionScheduleTemplates()
  const { data: staff } = useTeachers()
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [addingTemplate, setAddingTemplate] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)

  const handleItemClick = (item: any) => {
    setSelectedItem(item)
    setDialogOpen(true)
  }

  const currentDate = useMemo(() => {
    // Parse date string without timezone conversion
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day)
  }, [date])

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
    router.push(`/schedule/${dateStr}`)
  }

  // Find schedule by date
  const schedule = useMemo(() => {
    if (!schedules) return null
    const found = schedules.find((s: any) => {
      const scheduleDate = new Date(s.date).toISOString().split('T')[0]
      console.log('Comparing schedule date:', scheduleDate, 'with URL date:', date)
      return scheduleDate === date
    })
    if (!found) {
      console.log('No schedule found for date:', date)
      console.log('Available schedules:', schedules.map((s: any) => ({
        id: s.id,
        name: s.name,
        date: s.date,
        formatted: new Date(s.date).toISOString().split('T')[0]
      })))
    }
    return found
  }, [schedules, date])

  const sortedItems = useMemo(() => {
    if (!scheduleItems) return []
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
      await mutate(`expedition_schedule_items_date_${date}`)
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
    
    sorted.forEach((item, idx) => {
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
          const canPlace = column.every(colItem => 
            item.time_in >= colItem.time_out || item.time_out <= colItem.time_in
          )
          
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
      {/* Breadcrumb */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="cursor-pointer">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Daily Schedule</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-2">Daily Schedule</h1>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              View schedule details and activities for the day.
            </p>
            <Button 
              onClick={() => router.push(`/evaluate/${date}`)} 
              variant="outline"
              className="cursor-pointer h-10 px-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Professionalism Scores
            </Button>
          </div>
        </div>
      </div>

      {/* Date Navigation & Actions Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
            {/* Date Navigation */}
            <DateNavigation 
              date={currentDate} 
              onDateChange={handleDateChange}
              isOffshore={schedule?.isOffshore || schedule?.is_offshore || false}
              isService={schedule?.isService || schedule?.is_service || false}
              size="large"
              isLoading={isLoadingSchedules || !schedule}
            />

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {schedule && schedule._expedition_current_location && (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>{formatLocation(schedule._expedition_current_location)}</span>
                  </div>
                  <div className="h-6 w-px bg-border" />
                </>
              )}

              {scheduleItems && scheduleItems.length === 0 && (
                <>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="w-[220px] h-10 bg-white text-sm font-medium">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent className="min-h-[40px]">
                      {templates?.map((template: any) => (
                        <SelectItem key={template.id} value={template.id.toString()} className="cursor-pointer text-sm">
                          {template.template_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAddTemplate}
                    variant="outline"
                    className="cursor-pointer h-10 px-6"
                    disabled={!selectedTemplate || addingTemplate}
                  >
                    {addingTemplate ? (
                      <>
                        <Spinner size="sm" className="h-3 w-3 mr-2" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Template
                      </>
                    )}
                  </Button>
                  <div className="h-6 w-px bg-border" />
                </>
              )}
              <Button 
                onClick={() => setAddSheetOpen(true)} 
                className="cursor-pointer h-10 px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-4 py-6">
        {isLoadingSchedules || isLoadingData ? (
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
                          <div className={`w-1 rounded-full ${getColorForType(item._expedition_schedule_item_types?.name || item.name)} flex-shrink-0`} />
                          
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
              <div className="relative">
                <div className="flex">
                  <div className="w-16 md:w-20 flex-shrink-0" />
                  <div className="flex-1 relative" style={{ minHeight: "2400px" }}>
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
                        <div
                          key={item.id}
                          className="absolute mx-2 md:mx-4 rounded-2xl border-2 border-gray-100 p-3 cursor-pointer hover:shadow-lg transition-all bg-white overflow-hidden group"
                          style={{
                            top: position.top,
                            height: position.height,
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                          onClick={() => handleItemClick(item)}
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-gray-50/0 via-gray-50/20 to-gray-50/40 opacity-0 group-hover:opacity-100 transition-opacity" />

                          <div className="absolute top-3 right-3 text-xs text-gray-500 font-medium z-20">
                            {getDuration(item.time_in, item.time_out)}
                          </div>

                          {item.notes && (
                            <div className="absolute bottom-3 right-3 text-gray-400 z-20">
                              <MessageSquare className="h-4 w-4" />
                            </div>
                          )}

                          <div className="relative z-10 flex gap-3 h-full">
                            <div className={`w-1 rounded-full ${getColorForType(item._expedition_schedule_item_types?.name || item.name)} flex-shrink-0`} />
                            
                            <div className="flex-1 min-w-0 overflow-hidden pr-8">
                              <h3 className="font-semibold text-base text-gray-900 mb-1 line-clamp-1">
                                {item.name}
                              </h3>
                              <p className="text-xs text-gray-600 mb-1">
                                {formatMilitaryTime(item.time_in)} - {formatMilitaryTime(item.time_out)}
                              </p>
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
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedItem?.name}
            </DialogTitle>
            {selectedItem && selectedItem.time_in !== 0 && selectedItem.time_out !== 0 && (
              <DialogDescription className="text-base">
                {formatMilitaryTime(selectedItem.time_in)} - {formatMilitaryTime(selectedItem.time_out)}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-5 py-4">
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
        onOpenChange={setAddSheetOpen}
        scheduleId={schedule?.id || 0}
        date={date}
        staff={staff}
      />
    </div>
  )
}

