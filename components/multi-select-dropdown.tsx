"use client"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { CARD_FIELD_BOX, CARD_FIELD_LABEL } from "./segmented-control"

interface Option {
  id: number
  name: string
  value?: number
}

interface MultiSelectDropdownProps {
  label: string
  placeholder: string
  options: Option[]
  selectedIds: number[]
  onChange: (selectedIds: number[]) => void
  disabled?: boolean
  variant?: "bonus" | "penalty"
}

export function MultiSelectDropdown({
  label,
  placeholder,
  options,
  selectedIds,
  onChange,
  disabled = false,
  variant = "bonus",
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id))
  const displayText = selectedOptions.length > 0 ? selectedOptions.map((opt) => opt.name).join(", ") : placeholder

  const isPenalty = variant === "penalty"
  const badgeColor = isPenalty ? "bg-red-500" : "bg-green-500"
  const checkboxSelectedColor = isPenalty ? "border-red-500 bg-red-500" : "border-green-500 bg-green-500"

  const toggleOption = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  // Same ring style as the score steppers: a 2px ring that takes the reason
  // colour (green above 3, red below) once reasons are picked.
  const ringColor = selectedOptions.length > 0 ? (isPenalty ? "border-red-500" : "border-green-500") : "border-gray-200"

  return (
    <div className="flex w-full flex-col gap-1.5" ref={dropdownRef}>
      <label className={CARD_FIELD_LABEL}>{label}</label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          CARD_FIELD_BOX,
          ringColor,
          "flex h-10 w-full cursor-pointer items-center justify-between gap-2 px-3 text-left",
          "outline-none hover:bg-gray-50",
          // Inset ring only: this field often sits inside an overflow-hidden
          // wrapper (the animated reason picker), which would clip an outer ring.
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-300",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "bg-gray-50",
          isOpen && selectedOptions.length === 0 && "border-gray-400",
        )}
      >
        <span className={cn("truncate text-sm font-medium", selectedOptions.length === 0 ? "text-muted-foreground font-normal" : "text-gray-900")}>
          {displayText}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {selectedOptions.length > 0 && (
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded px-1.5 text-xs font-semibold text-white",
                badgeColor,
              )}
            >
              {selectedOptions.length}
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-w-[calc(100%-3rem)] bg-background border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = selectedIds.includes(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleOption(option.id)}
                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? checkboxSelectedColor : "border-gray-300",
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
