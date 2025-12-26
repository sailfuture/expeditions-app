"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export interface TimePickerInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  picker: "hours" | "minutes"
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  onRightFocus?: () => void
  onLeftFocus?: () => void
}

const TimePickerInput = React.forwardRef<HTMLInputElement, TimePickerInputProps>(
  (
    { className, picker, date, setDate, onLeftFocus, onRightFocus, ...props },
    ref
  ) => {
    const [flag, setFlag] = React.useState<boolean>(false)

    const calculatedValue = React.useMemo(() => {
      if (!date) return "00"
      if (picker === "hours") {
        return date.getHours().toString().padStart(2, "0")
      }
      return date.getMinutes().toString().padStart(2, "0")
    }, [date, picker])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Tab") return
      e.preventDefault()
      if (e.key === "ArrowRight") onRightFocus?.()
      if (e.key === "ArrowLeft") onLeftFocus?.()
      if (["ArrowUp", "ArrowDown"].includes(e.key)) {
        const step = e.key === "ArrowUp" ? 1 : -1
        const newDate = date ? new Date(date) : new Date()
        if (picker === "hours") {
          newDate.setHours(newDate.getHours() + step)
        } else {
          newDate.setMinutes(newDate.getMinutes() + step)
        }
        setDate(newDate)
      }
      if (e.key >= "0" && e.key <= "9") {
        const newDate = date ? new Date(date) : new Date()
        const key = parseInt(e.key)
        
        if (picker === "hours") {
          const currentHours = flag ? parseInt(calculatedValue[1]) : 0
          const newHours = flag ? currentHours * 10 + key : key
          if (newHours >= 0 && newHours <= 23) {
            newDate.setHours(newHours)
            setDate(newDate)
          }
        } else {
          const currentMinutes = flag ? parseInt(calculatedValue[1]) : 0
          const newMinutes = flag ? currentMinutes * 10 + key : key
          if (newMinutes >= 0 && newMinutes <= 59) {
            newDate.setMinutes(newMinutes)
            setDate(newDate)
          }
        }
        setFlag((prev) => !prev)
      }
    }

    return (
      <Input
        ref={ref}
        className={cn(
          "w-[48px] text-center font-mono text-base tabular-nums",
          className
        )}
        value={calculatedValue}
        onChange={(e) => {
          if (e.target.value === "") return
          const newDate = date ? new Date(date) : new Date()
          const value = parseInt(e.target.value)
          if (isNaN(value)) return
          if (picker === "hours" && value >= 0 && value <= 23) {
            newDate.setHours(value)
            setDate(newDate)
          } else if (picker === "minutes" && value >= 0 && value <= 59) {
            newDate.setMinutes(value)
            setDate(newDate)
          }
        }}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)

TimePickerInput.displayName = "TimePickerInput"

export { TimePickerInput }

