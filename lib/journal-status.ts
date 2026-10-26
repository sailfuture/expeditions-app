// Daily journaling status: a three-state control (Not Started, Incomplete/Late,
// Complete) that mirrors the Fitness control on the evaluation card.
//
// Storage stays the `journaling` text column on expeditions_professionalism,
// holding an expedition_journal_status name so the professionalism_averages
// function (weights by name) and the award calculator keep working:
//   Not Started      -> "Not Started" (weight 0)
//   Incomplete/Late  -> "Incomplete"  (weight 0.5)
//   Complete         -> "Completed"   (weight 1)
// Older rows that hold "Late Entry" read back as Incomplete/Late and "Excused"
// (or blank) as no selection.

export type JournalStatus = "not_started" | "incomplete" | "complete"

export interface JournalStatusOption {
  key: JournalStatus
  label: string
  /** expedition_journal_status.name written to the record. */
  storedName: string
  selectedClass: string
  /** Ring colour of the control while this status is selected. */
  ringClass: string
}

export const JOURNAL_STATUS_OPTIONS: ReadonlyArray<JournalStatusOption> = [
  { key: "not_started", label: "Not Started", storedName: "Not Started", selectedClass: "bg-red-50 text-red-700", ringClass: "border-red-500" },
  { key: "incomplete", label: "Incomplete/Late", storedName: "Incomplete", selectedClass: "bg-yellow-50 text-yellow-700", ringClass: "border-yellow-500" },
  { key: "complete", label: "Complete", storedName: "Completed", selectedClass: "bg-green-50 text-green-700", ringClass: "border-green-500" },
]

/** Map a stored journal status name (any casing, legacy names included) to the control's state. */
export function journalStatusFromName(name: string | null | undefined): JournalStatus | null {
  const value = (name ?? "").trim().toLowerCase()
  if (!value) return null
  if (value === "complete" || value === "completed") return "complete"
  if (value.includes("incomplete") || value.includes("late")) return "incomplete"
  if (value.includes("not started") || value.includes("missing")) return "not_started"
  // "Excused" and anything unknown: nothing selected
  return null
}

/** Name written to the `journaling` column; empty string when nothing is selected. */
export function journalNameFromStatus(status: JournalStatus | null | undefined): string {
  if (!status) return ""
  return JOURNAL_STATUS_OPTIONS.find((o) => o.key === status)?.storedName ?? ""
}
