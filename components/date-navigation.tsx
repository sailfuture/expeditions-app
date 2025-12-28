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
  expeditionStartDate?: string
  expeditionEndDate?: string
}

export function DateNavigation({ 
  date, 
  onDateChange, 
  isOffshore = false, 
  isService = false, 
  size = "default", 
  isLoading = false,
  expeditionStartDate,
  expeditionEndDate,
}: DateNavigationProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
  
  // Parse expedition date range
  const minDate = expeditionStartDate ? (() => {
    const [y, m, d] = expeditionStartDate.split('-').map(Number)
    return new Date(y, m - 1, d)
  })() : undefined
  
  const maxDate = expeditionEndDate ? (() => {
    const [y, m, d] = expeditionEndDate.split('-').map(Number)
    return new Date(y, m - 1, d)
  })() : undefined

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
    const today = new Date()
    
    // If outside expedition range, default to first or last day
    if (minDate && today < minDate) {
      onDateChange(minDate)
    } else if (maxDate && today > maxDate) {
      onDateChange(maxDate)
    } else {
      onDateChange(today)
    }
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
    <div className="flex items-center gap-2 flex-nowrap flex-shrink min-w-0">
      <Button
        variant="outline"
        size="icon"
        onClick={goToPrevDay}
        className={`${buttonHeight} w-10 cursor-pointer flex-shrink-0`}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`${buttonHeight} ${buttonPadding} gap-2 cursor-pointer flex-shrink min-w-0`}
          >
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium truncate">{formatDate(date)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            key={calendarOpen ? date.toISOString() : 'closed'}
            mode="single"
            selected={date}
            defaultMonth={date}
            fromDate={minDate}
            toDate={maxDate}
            disabled={(date) => {
              if (minDate && date < minDate) return true
              if (maxDate && date > maxDate) return true
              return false
            }}
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
        className={`${buttonHeight} w-10 cursor-pointer flex-shrink-0`}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        onClick={goToToday}
        className={`${buttonHeight} px-4 cursor-pointer flex-shrink-0`}
      >
        Today
      </Button>
      
      {!isLoading && (
        <>
          <div className="h-6 w-px bg-border flex-shrink-0" />
          <div className={`${buttonHeight} px-3 rounded border ${statusInfo.bgColor} ${statusInfo.borderColor} flex items-center justify-center flex-shrink-0`}>
            <span className={`text-sm font-medium ${statusInfo.textColor} whitespace-nowrap`}>
              {statusInfo.text}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

