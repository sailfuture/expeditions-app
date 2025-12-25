"use client"

import { useState, useRef, useEffect } from "react"
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = options.find((opt) => opt.id === selectedId)
  const displayText = selectedOption?.name ?? placeholder

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
          <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-background border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = selectedId === option.id
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
                      isSelected ? "border-gray-500 bg-gray-500" : "border-gray-300",
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
