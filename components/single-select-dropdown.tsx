"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Option {
  id: number
  name: string
}

interface SingleSelectDropdownProps {
  label: string
  placeholder: string
  options: Option[]
  selectedId: number | null
  onChange: (selectedId: number | null) => void
  disabled?: boolean
}

// Color mapping for journal status options
function getJournalStatusColor(name: string): { check: string; badge: string } {
  const lowerName = name.toLowerCase()
  if (lowerName.includes("complete") && !lowerName.includes("incomplete")) {
    return { check: "border-green-500 bg-green-500", badge: "bg-green-500" }
  }
  if (lowerName.includes("incomplete") || lowerName.includes("late")) {
    return { check: "border-yellow-500 bg-yellow-500", badge: "bg-yellow-500" }
  }
  if (lowerName.includes("not started") || lowerName.includes("missing")) {
    return { check: "border-red-500 bg-red-500", badge: "bg-red-500" }
  }
  if (lowerName.includes("excused")) {
    return { check: "border-blue-500 bg-blue-500", badge: "bg-blue-500" }
  }
  return { check: "border-gray-500 bg-gray-500", badge: "bg-gray-500" }
}

// Sort order for journal status options
function getJournalStatusSortOrder(name: string): number {
  const lowerName = name.toLowerCase()
  if (lowerName.includes("complete") && !lowerName.includes("incomplete")) return 1
  if (lowerName.includes("incomplete")) return 2
  if (lowerName.includes("late")) return 3
  if (lowerName.includes("not started") || lowerName.includes("missing")) return 4
  if (lowerName.includes("excused")) return 5
  return 6
}

export function SingleSelectDropdown({
  label,
  placeholder,
  options,
  selectedId,
  onChange,
  disabled = false,
}: SingleSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Check if this is the journaling dropdown
  const isJournalingDropdown = label.toLowerCase() === "journaling"

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Sort options for journaling dropdown
  const sortedOptions = useMemo(() => {
    if (!isJournalingDropdown) return options
    return [...options].sort((a, b) => getJournalStatusSortOrder(a.name) - getJournalStatusSortOrder(b.name))
  }, [options, isJournalingDropdown])

  const selectedOption = sortedOptions.find((opt) => opt.id === selectedId)
  const displayText = selectedOption?.name ?? placeholder
  const selectedColor = selectedOption && isJournalingDropdown ? getJournalStatusColor(selectedOption.name) : null

  const handleSelect = (id: number) => {
    if (selectedId === id) {
      onChange(null)
    } else {
      onChange(id)
    }
    setIsOpen(false)
  }

  return (
    <div className="w-full relative" ref={dropdownRef}>
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "mt-1.5 h-11 w-full rounded-lg border border-gray-200 bg-background px-3 flex items-center justify-between gap-2 text-left cursor-pointer",
          "hover:bg-gray-50 transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-ring ring-offset-2",
        )}
      >
        <span className={cn("truncate text-sm", !selectedOption && "text-muted-foreground")}>{displayText}</span>
        <div className="flex items-center gap-2 shrink-0">
          {selectedColor && (
            <span
              className={cn(
                "inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md text-white text-xs font-semibold",
                selectedColor.badge,
              )}
            >
              1
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-background border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto py-1">
            {sortedOptions.map((option) => {
              const isSelected = selectedId === option.id
              const optionColor = isJournalingDropdown ? getJournalStatusColor(option.name) : { check: "border-gray-500 bg-gray-500", badge: "bg-gray-500" }
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? optionColor.check : "border-gray-300",
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="text-sm">{option.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
