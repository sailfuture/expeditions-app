"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

interface DateNavigationProps {
  date: Date
  onDateChange: (date: Date) => void
  isOffshore?: boolean
  isService?: boolean
  size?: "default" | "large"
  isLoading?: boolean
}

export function DateNavigation({ date, onDateChange, isOffshore = false, isService = false, size = "default", isLoading = false }: DateNavigationProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const goToPrevDay = () => {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() - 1)
    onDateChange(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() + 1)
    onDateChange(newDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const handleDateSelect = (selectedDate: Date) => {
    onDateChange(selectedDate)
    setCalendarOpen(false)
  }

  const buttonHeight = size === "large" ? "h-10" : "h-9"
  const buttonPadding = size === "large" ? "px-4" : "px-3"

  const getStatusInfo = () => {
    if (isService) {
      return {
        text: "Service Learning",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-700"
      }
    }
    if (isOffshore) {
      return {
        text: "Offshore",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-700"
      }
    }
    return {
      text: "Anchored",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700"
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="icon"
        onClick={goToPrevDay}
        className={`${buttonHeight} w-10 cursor-pointer`}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`${buttonHeight} ${buttonPadding} gap-2 min-w-[280px] cursor-pointer`}
          >
            <Calendar className="h-4 w-4" />
            <span className="font-medium">{formatDate(date)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              if (selectedDate) {
                handleDateSelect(selectedDate)
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
        onClick={goToNextDay}
        className={`${buttonHeight} w-10 cursor-pointer`}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        onClick={goToToday}
        className={`${buttonHeight} px-4 cursor-pointer`}
      >
        Today
      </Button>
      
      {!isLoading && (
        <>
          <div className="h-6 w-px bg-border" />
          <div className={`${buttonHeight} px-3 rounded border ${statusInfo.bgColor} ${statusInfo.borderColor} flex items-center justify-center`}>
            <span className={`text-sm font-medium ${statusInfo.textColor}`}>
              {statusInfo.text}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

