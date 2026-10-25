"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ExpeditionCalendar } from "@/components/expedition-calendar"
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

  // Nothing outside the expedition is valid; until its dates are known, nothing is.
  const isOutOfRange = (d: Date) => {
    if (!minDate || !maxDate) return true
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (day < minDate) return true
    if (day > maxDate) return true
    return false
  }

  const prevDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1)
  const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  const canGoPrev = !isOutOfRange(prevDay)
  const canGoNext = !isOutOfRange(nextDay)

  const goToPrevDay = () => {
    if (!canGoPrev) return
    onDateChange(prevDay)
  }

  const goToNextDay = () => {
    if (!canGoNext) return
    onDateChange(nextDay)
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
        text: "S",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-700"
      }
    }
    if (isOffshore) {
      return {
        text: "O",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-700"
      }
    }
    return {
      text: "A",
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
        disabled={!canGoPrev}
        title={!canGoPrev ? "Start of expedition" : "Previous day"}
        className={`hidden sm:flex ${buttonHeight} w-10 cursor-pointer flex-shrink-0`}
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
          <ExpeditionCalendar
            key={calendarOpen ? date.toISOString() : 'closed'}
            mode="single"
            selected={date}
            defaultMonth={date}
            expeditionStartDate={expeditionStartDate}
            expeditionEndDate={expeditionEndDate}
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
        disabled={!canGoNext}
        title={!canGoNext ? "End of expedition" : "Next day"}
        className={`hidden sm:flex ${buttonHeight} w-10 cursor-pointer flex-shrink-0`}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isLoading && (
        <>
          <div className="hidden sm:block h-6 w-px bg-border flex-shrink-0" />
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

