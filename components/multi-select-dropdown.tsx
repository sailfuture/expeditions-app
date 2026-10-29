"use client"

import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
    <div className="flex w-full flex-col gap-1.5">
      <label className={CARD_FIELD_LABEL}>{label}</label>
      <Popover open={isOpen && !disabled} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              CARD_FIELD_BOX,
              ringColor,
              // h-11 = the steppers' h-10 rows plus their 2px ring, so every field is the same height.
              "flex h-11 w-full cursor-pointer items-center justify-between gap-2 px-3 text-left",
              "outline-none hover:bg-gray-50",
              // Inset ring only: this field often sits inside an overflow-hidden
              // wrapper (the animated reason picker), which would clip an outer ring.
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-300",
              disabled && "opacity-50 cursor-not-allowed",
              isOpen && "bg-gray-50",
              isOpen && selectedOptions.length === 0 && "border-gray-400",
            )}
          >
            {/* Same size and weight as the segmented controls (Journaling); the placeholder takes their unselected grey. */}
            <span className={cn("truncate text-sm font-medium", selectedOptions.length === 0 ? "text-gray-500" : "text-gray-900")}>
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
        </PopoverTrigger>

        {/* Portaled and anchored to the trigger at its width; flips above when there's no room below.
            overscroll-contain keeps wheel scrolling inside the list from scrolling the page. */}
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg border-gray-200 bg-background p-0 shadow-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-[min(15rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain py-1">
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
                  <span className="text-sm font-medium text-gray-900">{option.name}</span>
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
