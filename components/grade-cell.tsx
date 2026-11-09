"use client"

import { TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { fmtPercent, letterFor } from "@/lib/grades"

/** Cell tint per letter, the same colours as the dashboard's Grades page. */
export const LETTER_TINT: Record<string, string> = {
  "A": "bg-green-100 text-green-900",
  "B+": "bg-green-50 text-green-800",
  "B": "bg-green-50 text-green-800",
  "C+": "bg-yellow-50 text-yellow-900",
  "C": "bg-yellow-50 text-yellow-900",
  "D+": "bg-orange-50 text-orange-900",
  "D": "bg-orange-50 text-orange-900",
  "F": "bg-red-100 text-red-900",
}

const LEGEND: { label: string; letter: string }[] = [
  { label: "A 90+", letter: "A" },
  { label: "B 80+", letter: "B" },
  { label: "C 70+", letter: "C" },
  { label: "D 60+", letter: "D" },
  { label: "F", letter: "F" },
]

export function tintFor(percent: number | null | undefined): string {
  const l = letterFor(percent)
  return l ? LETTER_TINT[l.letter] ?? "" : ""
}

export function GradeLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      {LEGEND.map((l) => (
        <span key={l.letter} className={cn("rounded px-2 py-0.5", LETTER_TINT[l.letter])}>{l.label}</span>
      ))}
    </div>
  )
}

/** A grade cell: "86.77% B+" tinted by letter, or a dash. */
export function GradeCell({ percent, className }: { percent: number | null | undefined; className?: string }) {
  if (percent == null || !Number.isFinite(percent)) {
    return <TableCell className={cn("text-center text-gray-300", className)}>—</TableCell>
  }
  const letter = letterFor(percent)?.letter ?? ""
  return (
    <TableCell className={cn("text-center tabular-nums whitespace-nowrap", tintFor(percent), className)}>
      <span className="font-medium">{fmtPercent(percent)}</span>
      <span className="ml-1 text-xs">{letter}</span>
    </TableCell>
  )
}
