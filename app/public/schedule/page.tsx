"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Clock, ChevronLeft, ChevronRight, MapPin, Briefcase, StickyNote, Users, X } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  useExpeditionSchedules,
  useExpeditionScheduleItemsByDate,
  useActiveExpedition,
} from "@/lib/hooks/use-expeditions"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

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
  return 'bg-slate-400'
}

// Get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function PublicScheduleTodayPage() {
  const router = useRouter()
  
  // Use today's date
  const currentDateStr = getTodayDateString()
  
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: activeExpedition, isLoading: loadingActiveExpedition } = useActiveExpedition()
  const expeditionId = activeExpedition?.id

  const { data: schedules, isLoading: loadingSchedules } = useExpeditionSchedules(expeditionId)
  const { data: scheduleItems, isLoading: loadingItems } = useExpeditionScheduleItemsByDate(currentDateStr, expeditionId, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })

  const currentDate = useMemo(() => {
    const [year, month, day] = currentDateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }, [currentDateStr])

  // Navigate to date-specific pages when arrows are clicked
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

  const schedule = useMemo(() => {
    if (!schedules) return null
    return schedules.find((s: any) => s.date === currentDateStr)
  }, [schedules, currentDateStr])

  const sortedItems = useMemo(() => {
    if (!scheduleItems || !Array.isArray(scheduleItems)) return []
    return [...scheduleItems].sort((a: any, b: any) => {
      if (a.time_in === 0 && b.time_in === 0) return 0
      if (a.time_in === 0) return 1
      if (b.time_in === 0) return -1
      return a.time_in - b.time_in
    })
  }, [scheduleItems])

  const formatDateDisplay = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
  }

  const getInitials = (name: string) => {
    if (!name) return "?"
    return name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
  }

  const isLoadingData = loadingActiveExpedition || loadingItems || loadingSchedules

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-3 py-3">
          <button
            onClick={goToPrevDay}
            className="h-9 w-9 rounded-full flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="flex-1 h-9 mx-3 text-base font-semibold text-gray-900 rounded-full border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer"
              >
                {formatDateDisplay(currentDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <CalendarComponent
                mode="single"
                selected={currentDate}
                defaultMonth={currentDate}
                onSelect={(selectedDate) => {
                  if (selectedDate) handleDateChange(selectedDate)
                }}
                initialFocus
                className="rounded-md border"
              />
            </PopoverContent>
          </Popover>

          <button
            onClick={goToNextDay}
            className="h-9 w-9 rounded-full flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4">
        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Spinner size="sm" />
            <p className="text-sm text-gray-500 mt-3">Loading schedule...</p>
          </div>
        ) : !schedule ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Clock className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-gray-500">No schedule for this date</p>
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Clock className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-gray-500">No activities scheduled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedItems.map((item: any) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedItem(item)
                  setDialogOpen(true)
                }}
                className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex gap-3">
                  {/* Color bar */}
                  <div className={`w-1 rounded-full ${getColorForType(item)} flex-shrink-0 self-stretch`} />
                  
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 text-base leading-snug">
                      {item.name}
                    </h3>
                    
                    {/* Time */}
                    {(item.time_in !== 0 || item.time_out !== 0) && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {item.time_in !== 0 ? formatMilitaryTime(item.time_in) : "TBD"} - {item.time_out !== 0 ? formatMilitaryTime(item.time_out) : "TBD"}
                      </p>
                    )}
                    
                    {/* Staff lead and participants */}
                    {(item._expedition_staff || (item.participants && item.participants.length > 0)) && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {item._expedition_staff && (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] font-medium bg-gray-200 text-gray-600">
                                {getInitials(item._expedition_staff.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-600">
                              {item._expedition_staff.name}
                            </span>
                          </div>
                        )}
                        {item.participants && item.participants.length > 0 && (
                          <div className="flex items-center gap-1">
                            {item._expedition_staff && <span className="text-gray-300 mx-1">•</span>}
                            <div className="flex -space-x-1.5">
                              {item.participants.slice(0, 4).map((p: any) => (
                                <Avatar key={p.id} className="h-6 w-6 border-2 border-white">
                                  <AvatarFallback className="text-[10px] font-medium bg-gray-200 text-gray-600">
                                    {getInitials(p.name)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            {item.participants.length > 4 && (
                              <span className="text-xs text-gray-500 ml-1">+{item.participants.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Location */}
                    {item.address && (
                      <div className="flex items-center gap-1.5 mt-2 text-gray-500">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-sm truncate">{item.address}</span>
                      </div>
                    )}

                    {/* Notes preview */}
                    {item.notes && (
                      <div className="flex items-start gap-1.5 mt-2 text-gray-500">
                        <StickyNote className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span className="text-sm line-clamp-2">{item.notes}</span>
                      </div>
                    )}

                    {/* Things to bring */}
                    {item.things_to_bring && (
                      <div className="flex items-center gap-1.5 mt-2 text-gray-500">
                        <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-sm truncate">{item.things_to_bring}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-md p-0 rounded-2xl overflow-hidden" showCloseButton={false}>
          {selectedItem && (
            <div className="relative">
              {/* Close Button */}
              <button
                onClick={() => setDialogOpen(false)}
                className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>

              {/* Dialog Header */}
              <DialogHeader className="p-5 pb-4 border-b border-gray-100">
                <DialogTitle className="text-xl font-bold text-gray-900 pr-14">
                  {selectedItem.name}
                </DialogTitle>
                {(selectedItem.time_in !== 0 || selectedItem.time_out !== 0) && (
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {selectedItem.time_in !== 0 ? formatMilitaryTime(selectedItem.time_in) : "TBD"} - {selectedItem.time_out !== 0 ? formatMilitaryTime(selectedItem.time_out) : "TBD"}
                    </span>
                  </div>
                )}
              </DialogHeader>

              {/* Dialog Content */}
              <div className="p-5 space-y-4">
                {/* Type */}
                {selectedItem._expedition_schedule_item_types && (
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getColorForType(selectedItem)}`} />
                    <span className="text-sm text-gray-700">
                      {selectedItem._expedition_schedule_item_types.name || "No Type"}
                    </span>
                  </div>
                )}

                {/* Led By */}
                {selectedItem._expedition_staff && (
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-gray-400" />
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] font-medium bg-gray-200 text-gray-600">
                          {getInitials(selectedItem._expedition_staff.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-700">
                        {selectedItem._expedition_staff.name}
                      </span>
                    </div>
                  </div>
                )}

                {/* Participants */}
                {selectedItem.participants && selectedItem.participants.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.participants.map((participant: any) => (
                        <div
                          key={participant.id}
                          className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] font-medium bg-gray-200 text-gray-600">
                              {getInitials(participant.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-700">{participant.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {selectedItem.address ? (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(selectedItem.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {selectedItem.address}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400 italic">No location</span>
                  )}
                </div>

                {/* Things to Bring */}
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  {selectedItem.things_to_bring ? (
                    <span className="text-sm text-gray-700">{selectedItem.things_to_bring}</span>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Nothing to bring</span>
                  )}
                </div>

                {/* Notes */}
                <div className="bg-gray-50 rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                  {selectedItem.notes ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedItem.notes}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No notes</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
