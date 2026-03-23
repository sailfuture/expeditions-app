"use client"

import { useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Clock, ChevronLeft, ChevronRight, MapPin, Briefcase, StickyNote, Users, X, ExternalLink, Wrench } from "lucide-react"
import useSWR from "swr"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  useExpeditionSchedules,
  useExpeditionScheduleItemsByDate,
  useTeachers,
  useActiveExpedition,
} from "@/lib/hooks/use-expeditions"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getPhotoUrl } from "@/lib/utils"

const formatMilitaryTime = (militaryTime: number) => {
  const hours = Math.floor(militaryTime / 100)
  const minutes = militaryTime % 100
  const displayHours = hours % 12 || 12
  const period = hours >= 12 ? 'PM' : 'AM'
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
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
  return 'bg-slate-400'
}

export default function PublicSchedulePage() {
  const router = useRouter()
  const params = useParams()
  
  const date = params.date as string
  
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  
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

  const { data: activeExpedition, isLoading: loadingActiveExpedition } = useActiveExpedition()
  const expeditionId = activeExpedition?.id

  const { data: schedules, isLoading: loadingSchedules } = useExpeditionSchedules(expeditionId)
  const { data: scheduleItemsData, isLoading: loadingItems } = useExpeditionScheduleItemsByDate(date, expeditionId, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })
  // Extract items from the new response format
  const scheduleItems = scheduleItemsData?.items || scheduleItemsData || []
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

  const schedule = useMemo(() => {
    // Prefer schedule from items response (has expanded dish/galley data)
    if (scheduleItemsData?.schedule) return scheduleItemsData.schedule
    // Fallback to schedules list
    if (!schedules) return null
    return schedules.find((s: any) => s.date === date)
  }, [schedules, date, scheduleItemsData])

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

          <div className="flex-1 mx-3 flex items-center justify-center">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full h-9 text-base font-semibold text-gray-900 rounded-full border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer"
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
            
          </div>

          <button
            onClick={goToNextDay}
            className="h-9 w-9 rounded-full flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Team Assignments Sub-Nav - Minimalist */}
      {schedule && (schedule._expedition_dish_days || schedule._expeditions_galley_team) && (
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            {/* Dish Team */}
            {schedule._expedition_dish_days && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-600">
                  Dish {schedule._expedition_dish_days.dishteam?.replace('Dish Team ', '') || schedule.dish_day?.replace('Dish Team ', '')}
                </span>
                <div className="flex items-center gap-2">
                  {/* Wash */}
                  {schedule._expedition_dish_days.wash?.filter((s: any) => s)?.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">W</span>
                            <div className="flex -space-x-1.5">
                              {schedule._expedition_dish_days.wash.filter((s: any) => s).map((s: any, idx: number) => (
                                <Avatar key={idx} className="h-7 w-7 border-2 border-white">
                                  <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">
                                    {s.firstName?.[0]}{s.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          <span className="font-medium">Wash:</span> {schedule._expedition_dish_days.wash.filter((s: any) => s).map((s: any) => `${s.firstName} ${s.lastName}`).join(', ')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {/* Dry */}
                  {schedule._expedition_dish_days.dry?.filter((s: any) => s)?.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">D</span>
                            <div className="flex -space-x-1.5">
                              {schedule._expedition_dish_days.dry.filter((s: any) => s).map((s: any, idx: number) => (
                                <Avatar key={idx} className="h-7 w-7 border-2 border-white">
                                  <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">
                                    {s.firstName?.[0]}{s.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          <span className="font-medium">Dry:</span> {schedule._expedition_dish_days.dry.filter((s: any) => s).map((s: any) => `${s.firstName} ${s.lastName}`).join(', ')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {/* Support */}
                  {schedule._expedition_dish_days.support_staff_dishes?.name && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">Sp</span>
                            <Avatar className="h-7 w-7 border-2 border-white">
                              <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">
                                {schedule._expedition_dish_days.support_staff_dishes.name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          <span className="font-medium">Support:</span> {schedule._expedition_dish_days.support_staff_dishes.name}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {/* Supervisor */}
                  {schedule._expedition_dish_days.supervisor_staff_dishes?.name && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">Sv</span>
                            <Avatar className="h-7 w-7 border-2 border-white">
                              <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">
                                {schedule._expedition_dish_days.supervisor_staff_dishes.name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          <span className="font-medium">Supervisor:</span> {schedule._expedition_dish_days.supervisor_staff_dishes.name}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            )}

            {schedule._expedition_dish_days && schedule._expeditions_galley_team && (
              <div className="h-5 w-px bg-gray-300" />
            )}

            {/* Galley Team */}
            {schedule._expeditions_galley_team && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-600">
                  Galley {schedule._expeditions_galley_team.name?.replace('Galley Team ', '')}
                </span>
                <div className="flex items-center gap-2">
                  {/* Students */}
                  {schedule._expeditions_galley_team.students_id?.filter((s: any) => s)?.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex -space-x-1.5">
                            {schedule._expeditions_galley_team.students_id.filter((s: any) => s).map((s: any, idx: number) => (
                              <Avatar key={idx} className="h-7 w-7 border-2 border-white">
                                <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">
                                  {s.firstName?.[0]}{s.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          <span className="font-medium">Students:</span> {schedule._expeditions_galley_team.students_id.filter((s: any) => s).map((s: any) => `${s.firstName} ${s.lastName}`).join(', ')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {/* Supervisor */}
                  {schedule._expeditions_galley_team._galley_supervisor?.name && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">Sv</span>
                            <Avatar className="h-7 w-7 border-2 border-white">
                              <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">
                                {schedule._expeditions_galley_team._galley_supervisor.name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          <span className="font-medium">Supervisor:</span> {schedule._expeditions_galley_team._galley_supervisor.name}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                              {item.participants.filter((p: any) => p?.name).slice(0, 4).map((p: any, idx: number) => (
                                <Avatar key={p.id || `participant-${idx}`} className="h-6 w-6 border-2 border-white">
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
                        {item.students_id && item.students_id.filter((s: any) => s != null).length > 0 && (
                          <div className="flex items-center gap-1">
                            {(item._expedition_staff || item.participants?.length > 0) && <span className="text-gray-300 mx-1">•</span>}
                            <div className="flex -space-x-1.5">
                              {item.students_id.filter((s: any) => s != null).slice(0, 4).map((s: any, idx: number) => (
                                <Avatar key={s.id || `student-${idx}`} className="h-6 w-6 border-2 border-white">
                                  <AvatarFallback className="text-[10px] font-medium bg-gray-200 text-gray-600">
                                    {s.firstName?.[0]}{s.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            {item.students_id.filter((s: any) => s != null).length > 4 && (
                              <span className="text-xs text-gray-500 ml-1">+{item.students_id.filter((s: any) => s != null).length - 4}</span>
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

                    {/* Resources */}
                    {item.resources && (
                      <div className="flex items-center gap-1.5 mt-2 text-blue-600">
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-sm truncate">{item.resources}</span>
                      </div>
                    )}

                    {/* Meal Plan (for meal types) */}
                    {isMealType(item) && (
                      <div className={`flex items-center gap-1.5 mt-2 ${!item._expedition_cookbook?.recipe_name && !item.expedition_cookbook_id ? 'text-gray-400 italic' : 'text-gray-600'}`}>
                        {getPhotoUrl(item._expedition_cookbook?.recipe_photo) && (
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={getPhotoUrl(item._expedition_cookbook.recipe_photo)!} alt={item._expedition_cookbook.recipe_name} />
                            <AvatarFallback className="text-[8px] bg-orange-100 text-orange-600">MP</AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-sm">{item._expedition_cookbook?.recipe_name || (item.expedition_cookbook_id > 0 ? `Meal Plan #${item.expedition_cookbook_id}` : 'No Meal Plan')}</span>
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

                {/* Participants (Staff) */}
                {selectedItem.participants && selectedItem.participants.filter((p: any) => p?.name).length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Staff</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.participants.filter((p: any) => p?.name).map((participant: any, idx: number) => (
                          <div
                            key={participant.id || `participant-${idx}`}
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
                  </div>
                )}

                {/* Participants (Students) */}
                {selectedItem.students_id && selectedItem.students_id.filter((s: any) => s != null).length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Students</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.students_id.filter((s: any) => s != null).map((student: any, idx: number) => (
                          <div
                            key={student.id || `student-${idx}`}
                            className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] font-medium bg-gray-200 text-gray-600">
                                {student.firstName?.[0]}{student.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-700">{student.firstName} {student.lastName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Resources */}
                {selectedItem.resources && (
                  <div className="flex items-start gap-3 min-w-0">
                    <ExternalLink className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <a
                      href={selectedItem.resources}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate min-w-0"
                    >
                      {selectedItem.resources}
                    </a>
                  </div>
                )}

                {/* Location */}
                {selectedItem.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
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

                {/* Things to Bring */}
                {selectedItem.things_to_bring && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{selectedItem.things_to_bring}</span>
                  </div>
                )}

                {/* Meal Plan (for meal types) */}
                {isMealType(selectedItem) && (
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
                            <AvatarFallback className="text-xs bg-orange-100 text-orange-600">MP</AvatarFallback>
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

                {/* Notes */}
                <div className="bg-gray-50 rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                  {selectedItem.notes ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{selectedItem.notes}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No notes</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
