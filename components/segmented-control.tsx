"use client"

import { cn } from "@/lib/utils"

/**
 * Shared look for every control on the student evaluation card: an uppercase
 * label, then a 2px ring box with h-10 rows and divider lines, like the score
 * stepper (components/score-control.tsx). The ring takes the colour of the
 * selected option.
 */
export const CARD_FIELD_LABEL = "text-xs font-medium uppercase tracking-wide text-muted-foreground"
export const CARD_FIELD_BOX = "rounded-md border-2 bg-white transition-colors"

export interface SegmentOption<V> {
  value: V
  label: string
  /** Fill + text colour of the selected segment, e.g. "bg-green-50 text-green-700". */
  selectedClass: string
  /** Ring colour while this option is selected, e.g. "border-green-500". */
  ringClass: string
}

export function SegmentedControl<V extends string | number | null>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  clearable = false,
}: {
  label: string
  options: ReadonlyArray<SegmentOption<V>>
  value: V
  onChange: (value: V | null) => void
  disabled?: boolean
  /** Clicking the selected segment again clears the value. */
  clearable?: boolean
}) {
  const selected = options.find((o) => o.value === value)
  return (
    <div className="flex flex-col gap-1.5">
      <span className={CARD_FIELD_LABEL}>{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          CARD_FIELD_BOX,
          "grid overflow-hidden",
          selected ? selected.ringClass : "border-gray-200",
          disabled && "opacity-50"
        )}
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option, i) => {
          const isSelected = option.value === value
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              title={isSelected && clearable ? "Click again to clear" : option.label}
              onClick={() => onChange(isSelected && clearable ? null : option.value)}
              className={cn(
                "flex h-10 min-w-0 items-center justify-center px-1 text-sm font-medium leading-tight transition-colors",
                i > 0 && "border-l border-gray-200",
                disabled ? "cursor-not-allowed" : "cursor-pointer",
                isSelected ? option.selectedClass : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              )}
            >
              {/* Long labels ("Incomplete/Late") truncate on narrow cards; the full text is in the title tooltip. */}
              <span className="truncate text-center">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
