"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  label?: string
  maxHour?: number // Maximum hour allowed (e.g., 24 for end time to allow midnight)
}

export function TimePicker({ date, setDate, label, maxHour }: TimePickerProps) {
  const hourRef = React.useRef<HTMLInputElement>(null)
  const minuteRef = React.useRef<HTMLInputElement>(null)
  
  // Track if user is currently editing (to prevent external sync)
  const [isEditingHour, setIsEditingHour] = React.useState(false)
  const [isEditingMinute, setIsEditingMinute] = React.useState(false)
  
  // Local state for input values to allow typing
  const [hourInput, setHourInput] = React.useState("")
  const [minuteInput, setMinuteInput] = React.useState("")

  const hours = date ? date.getHours() : 0
  const minutes = date ? date.getMinutes() : 0
  const isPM = hours >= 12
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours

  // Sync local state with date when date changes externally (but not while editing)
  React.useEffect(() => {
    if (!isEditingHour) {
      setHourInput(displayHours.toString().padStart(2, "0"))
    }
  }, [displayHours, isEditingHour])

  React.useEffect(() => {
    if (!isEditingMinute) {
      setMinuteInput(minutes.toString().padStart(2, "0"))
    }
  }, [minutes, isEditingMinute])

  const updateTime = (newHours: number, newMinutes: number) => {
    // If maxHour is 24 (end time limit), enforce strict midnight limit
    // Only allow exactly 0:00 (12:00 AM), not 0:01, 0:26, etc.
    if (maxHour === 24) {
      // 12:00 AM is hour 0 - only allow with 0 minutes
      if (newHours === 0 && newMinutes > 0) {
        // Force to exactly midnight (0:00)
        newMinutes = 0
      }
    }
    
    const newDate = date ? new Date(date) : new Date()
    newDate.setHours(newHours, newMinutes, 0, 0)
    setDate(newDate)
  }

  const commitHourValue = () => {
    const value = hourInput.replace(/\D/g, '')
    if (value === '') {
      // Reset to current value
      setHourInput(displayHours.toString().padStart(2, "0"))
      return
    }
    
    let parsed = parseInt(value)
    if (isNaN(parsed)) {
      setHourInput(displayHours.toString().padStart(2, "0"))
      return
    }
    
    // Clamp to 1-12 range
    parsed = Math.max(1, Math.min(12, parsed))
    
    // Convert to 24-hour format
    let newHours = parsed
    if (isPM && parsed !== 12) newHours = parsed + 12
    if (!isPM && parsed === 12) newHours = 0
    
    // For end time (maxHour=24), if setting to 12 AM, force minutes to 0
    let newMinutes = minutes
    if (maxHour === 24 && newHours === 0) {
      newMinutes = 0
      setMinuteInput("00")
    }
    
    updateTime(newHours, newMinutes)
    setHourInput(parsed.toString().padStart(2, "0"))
  }

  const commitMinuteValue = () => {
    const value = minuteInput.replace(/\D/g, '')
    
    // For end time at 12 AM (hour 0), force minutes to 0
    if (maxHour === 24 && hours === 0) {
      updateTime(hours, 0)
      setMinuteInput("00")
      return
    }
    
    if (value === '') {
      updateTime(hours, 0)
      setMinuteInput("00")
      return
    }
    
    let parsed = parseInt(value)
    if (isNaN(parsed)) {
      setMinuteInput(minutes.toString().padStart(2, "0"))
      return
    }
    
    // Clamp to 0-59 range
    parsed = Math.max(0, Math.min(59, parsed))
    
    updateTime(hours, parsed)
    setMinuteInput(parsed.toString().padStart(2, "0"))
  }

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '') // Only keep digits
    if (value.length <= 2) {
      setHourInput(value)
    }
  }

  const handleHourFocus = () => {
    setIsEditingHour(true)
    hourRef.current?.select()
  }

  const handleHourBlur = () => {
    setIsEditingHour(false)
    commitHourValue()
  }

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // For end time at 12 AM, don't allow changing minutes
    if (maxHour === 24 && hours === 0) {
      return
    }
    
    const value = e.target.value.replace(/\D/g, '') // Only keep digits
    if (value.length <= 2) {
      setMinuteInput(value)
    }
  }

  const handleMinuteFocus = () => {
    setIsEditingMinute(true)
    minuteRef.current?.select()
  }

  const handleMinuteBlur = () => {
    setIsEditingMinute(false)
    commitMinuteValue()
  }

  const togglePeriod = () => {
    let newHours: number
    if (isPM) {
      // PM to AM: subtract 12
      newHours = hours - 12
      if (newHours < 0) newHours = 0
    } else {
      // AM to PM: add 12
      newHours = hours + 12
      if (newHours >= 24) newHours = 12
    }
    
    // For end time, if switching to AM and it's 12 AM, force minutes to 0
    let newMinutes = minutes
    if (maxHour === 24 && newHours === 0) {
      newMinutes = 0
      setMinuteInput("00")
    }
    
    updateTime(newHours, newMinutes)
  }

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commitHourValue()
      minuteRef.current?.focus()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const newHours = (hours + 1) % 24
      updateTime(newHours, minutes)
      setIsEditingHour(false)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      const newHours = hours === 0 ? 23 : hours - 1
      updateTime(newHours, minutes)
      setIsEditingHour(false)
    } else if (e.key === ":" || (e.key === "Tab" && !e.shiftKey)) {
      if (e.key === ":") e.preventDefault()
      commitHourValue()
      minuteRef.current?.focus()
    }
  }

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commitMinuteValue()
      minuteRef.current?.blur()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      // For end time at 12 AM, don't allow incrementing minutes
      if (maxHour === 24 && hours === 0) return
      const newMinutes = (minutes + 1) % 60
      updateTime(hours, newMinutes)
      setIsEditingMinute(false)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      // For end time at 12 AM, don't allow decrementing minutes
      if (maxHour === 24 && hours === 0) return
      const newMinutes = minutes === 0 ? 59 : minutes - 1
      updateTime(hours, newMinutes)
      setIsEditingMinute(false)
    } else if (e.key === "Tab" && e.shiftKey) {
      commitMinuteValue()
    }
  }

  // Check if minutes should be disabled (end time at 12 AM)
  const minutesDisabled = maxHour === 24 && hours === 0

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex items-center gap-1">
        {/* Hour input */}
        <input
          ref={hourRef}
          type="text"
          inputMode="numeric"
          value={hourInput}
          onChange={handleHourChange}
          onFocus={handleHourFocus}
          onBlur={handleHourBlur}
          onKeyDown={handleHourKeyDown}
          className={cn(
            "w-14 h-12 text-center text-xl font-semibold tabular-nums",
            "border border-gray-200 rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent",
            "bg-white"
          )}
          maxLength={2}
        />

        <span className="text-2xl font-bold text-gray-300">:</span>

        {/* Minute input */}
        <input
          ref={minuteRef}
          type="text"
          inputMode="numeric"
          value={minuteInput}
          onChange={handleMinuteChange}
          onFocus={handleMinuteFocus}
          onBlur={handleMinuteBlur}
          onKeyDown={handleMinuteKeyDown}
          disabled={minutesDisabled}
          className={cn(
            "w-14 h-12 text-center text-xl font-semibold tabular-nums",
            "border border-gray-200 rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent",
            minutesDisabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white"
          )}
          maxLength={2}
        />

        {/* AM/PM Toggle - height matches inputs (h-12 = 48px) */}
        <div className="flex flex-col ml-2 h-12">
          <button
            type="button"
            onClick={togglePeriod}
            className={cn(
              "flex-1 px-3 text-sm font-semibold rounded-t-lg border border-b-0 transition-colors cursor-pointer",
              !isPM
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
            )}
          >
            AM
          </button>
          <button
            type="button"
            onClick={togglePeriod}
            className={cn(
              "flex-1 px-3 text-sm font-semibold rounded-b-lg border border-t-0 transition-colors cursor-pointer",
              isPM
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
            )}
          >
            PM
          </button>
        </div>

        <Clock className="ml-2 h-5 w-5 text-gray-300" />
      </div>
    </div>
  )
}
