"use client"

import { Minus, Plus, Ban } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScoreControlProps {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  disabled?: boolean
}

function getScoreBorderColor(value: number | null): string {
  if (value === null) return "border-gray-200"
  switch (value) {
    case 0:
      return "border-red-500"
    case 1:
      return "border-orange-500"
    case 2:
      return "border-yellow-500"
    case 3:
      return "border-gray-300"
    case 4:
      return "border-green-500"
    case 5:
      return "border-blue-500"
    default:
      return "border-gray-300"
  }
}

export function ScoreControl({ label, value, onChange, min = 0, max = 5, disabled = false }: ScoreControlProps) {
  const isBlocked = value === null
  const isAtMin = value === min
  const isAtMax = value === max

  const handleDecrement = () => {
    if (isBlocked || value === min) return
    onChange(value - 1)
  }

  const handleIncrement = () => {
    if (isBlocked || value === max) return
    onChange(value + 1)
  }

  const handleBlockToggle = () => {
    if (isBlocked) {
      onChange(3)
    } else {
      onChange(null)
    }
  }

  const borderColor = getScoreBorderColor(value)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <button
          type="button"
          onClick={handleBlockToggle}
          disabled={disabled}
          className={cn(
            "p-0.5 rounded transition-colors cursor-pointer",
            isBlocked ? "text-gray-500 hover:text-gray-600" : "text-gray-300 hover:text-gray-400",
          )}
          title={isBlocked ? "Unblock this category" : "Block this category (N/A)"}
        >
          <Ban className="h-3.5 w-3.5" />
        </button>
      </div>
      <div
        className={cn(
          "grid grid-cols-3 border rounded-md overflow-hidden transition-colors",
          borderColor,
          (disabled || isBlocked) && "opacity-50",
          isBlocked && "bg-gray-100",
        )}
      >
        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-10 border-r border-gray-200 transition-colors",
            disabled || isBlocked || isAtMin
              ? "cursor-not-allowed text-gray-300"
              : "cursor-pointer hover:bg-gray-50 text-gray-600",
          )}
          onClick={handleDecrement}
          disabled={disabled || isBlocked}
        >
          <Minus className="h-4 w-4" />
        </button>
        <div
          className={cn(
            "flex items-center justify-center h-10 text-base",
            isBlocked ? "text-gray-400 font-normal" : "font-semibold",
          )}
        >
          {isBlocked ? "N/A" : value}
        </div>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-10 border-l border-gray-200 transition-colors",
            disabled || isBlocked || isAtMax
              ? "cursor-not-allowed text-gray-300"
              : "cursor-pointer hover:bg-gray-50 text-gray-600",
          )}
          onClick={handleIncrement}
          disabled={disabled || isBlocked}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
