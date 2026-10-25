"use client"

import { cn } from "@/lib/utils"
import { JOURNAL_STATUS_OPTIONS, type JournalStatus } from "@/lib/journal-status"

interface JournalStatusControlProps {
  value: JournalStatus | null
  onChange: (value: JournalStatus | null) => void
  disabled?: boolean
  label?: string
}

// Same segmented look as the Fitness control on the student card.
// Clicking the selected state again clears it (no status for the day).
export function JournalStatusControl({ value, onChange, disabled = false, label = "JOURNALING" }: JournalStatusControlProps) {
  return (
    <div className="w-full">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <div
        role="radiogroup"
        aria-label="Journaling"
        className={cn(
          "mt-1 grid grid-cols-3 gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1",
          disabled && "opacity-50"
        )}
      >
        {JOURNAL_STATUS_OPTIONS.map((option) => {
          const selected = value === option.key
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              title={selected ? "Click again to clear" : option.label}
              onClick={() => onChange(selected ? null : option.key)}
              className={cn(
                "h-7 rounded-md text-xs font-medium transition-colors",
                disabled ? "cursor-not-allowed" : "cursor-pointer",
                selected ? option.selectedClass : "text-gray-500 hover:bg-white hover:text-gray-700"
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
