"use client"

import { SegmentedControl } from "./segmented-control"
import { JOURNAL_STATUS_OPTIONS, type JournalStatus } from "@/lib/journal-status"

interface JournalStatusControlProps {
  value: JournalStatus | null
  onChange: (value: JournalStatus | null) => void
  disabled?: boolean
  label?: string
}

const OPTIONS = JOURNAL_STATUS_OPTIONS.map((o) => ({
  value: o.key,
  label: o.label,
  selectedClass: o.selectedClass,
  ringClass: o.ringClass,
}))

// Same ring style as the score steppers on the student card. Clicking the
// selected state again clears it (no status for the day).
export function JournalStatusControl({ value, onChange, disabled = false, label = "JOURNALING" }: JournalStatusControlProps) {
  return (
    <SegmentedControl<JournalStatus | null>
      label={label}
      options={OPTIONS}
      value={value}
      onChange={onChange}
      disabled={disabled}
      clearable
    />
  )
}
