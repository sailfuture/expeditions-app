"use client"

import React, { useMemo } from "react"
import { ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CategoryReasonChips } from "@/components/score-reasons"
import { getJournalStringColor } from "@/components/student-evaluations-table"
import { readStoredReasons, type ScoreKey } from "@/lib/evaluation-reasons"
import { cn } from "@/lib/utils"

/**
 * One row per scored day for a student on an expedition, as the
 * "All Evaluation Records" dialog shows it: every score category next to the
 * reasons given for it that day.
 *
 * Rows are raw expeditions_professionalism records (academics / crew / job /
 * citizenship / service plus their isXUsed flags and <category>_reason
 * columns). Older rows that still use the form's names (school,
 * service_learning) are read too.
 */

interface Category {
  label: string
  field: string
  legacyField?: string
  flag: string
  reasonKey: ScoreKey
}

const CATEGORIES: ReadonlyArray<Category> = [
  { label: "Citizenship", field: "citizenship", flag: "isCitizenshipUsed", reasonKey: "citizenship" },
  { label: "Crew", field: "crew", flag: "isCrewUsed", reasonKey: "crew" },
  { label: "Academics", field: "academics", legacyField: "school", flag: "isAcademicsUsed", reasonKey: "school" },
  { label: "Job", field: "job", flag: "isJobUsed", reasonKey: "job" },
  { label: "Service", field: "service", legacyField: "service_learning", flag: "isServiceUsed", reasonKey: "service_learning" },
]

const HEAD = "h-10 px-3 text-xs font-semibold text-gray-600 bg-gray-50 whitespace-nowrap"

function scoreOf(record: any, cat: Category): number | null {
  const raw = record?.[cat.field] ?? (cat.legacyField ? record?.[cat.legacyField] : null)
  return raw === null || raw === undefined ? null : Number(raw)
}

/** "N/A" when the category was disabled that day, "—" when nothing was entered, "Unexcused" for 0. */
function formatScore(value: number | null, blocked: boolean): string {
  if (blocked) return "N/A"
  if (value === null) return "—"
  if (value === 0) return "Unexcused"
  return value.toString()
}

// 4-5 = blue, 3 = green, 2 = yellow, 0-1 = red; N/A and blank stay plain.
function scoreTone(value: number | null, blocked: boolean): string {
  if (blocked) return "bg-gray-50 text-gray-400"
  if (value === null) return "text-gray-400"
  if (value >= 4) return "bg-blue-50 text-gray-700"
  if (value === 3) return "bg-green-50 text-gray-700"
  if (value === 2) return "bg-yellow-50 text-gray-700"
  return "bg-red-50 text-gray-700"
}

function formatDay(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const [year, month, day] = dateStr.split("-").map(Number)
  if (!year || !month || !day) return dateStr
  return format(new Date(year, month - 1, day), "MMM d, yyyy")
}

function DayTypeBadge({ schedule }: { schedule: any }) {
  const [letter, tone] = schedule?.isService
    ? ["S", "bg-red-50 text-red-700 border-red-200"]
    : schedule?.isOffshore
      ? ["O", "bg-blue-50 text-blue-700 border-blue-200"]
      : ["A", "bg-green-50 text-green-700 border-green-200"]
  return (
    <span className={cn("inline-flex items-center justify-center h-6 w-6 rounded text-xs font-bold border", tone)}>
      {letter}
    </span>
  )
}

export function recordDate(record: any): string | undefined {
  return record?.date || record?._expedition_schedule?.date || undefined
}

export function EvaluationRecordsTable({
  records,
  loading = false,
  onView,
}: {
  records: ReadonlyArray<any>
  loading?: boolean
  /** Open the scores screen for that day. */
  onView?: (date: string) => void
}) {
  // A reasons column only for the categories that were given a reason on at
  // least one of these days, so an anchored expedition isn't padded with
  // empty Crew / Service reason columns.
  const reasonKeys = useMemo(() => {
    const seen = new Set<ScoreKey>()
    for (const record of records) {
      const stored = readStoredReasons(record)
      for (const cat of CATEGORIES) if (stored[cat.reasonKey].length > 0) seen.add(cat.reasonKey)
    }
    return seen
  }, [records])

  const columnCount = 3 + CATEGORIES.length + reasonKeys.size + (onView ? 1 : 0)

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b bg-gray-50 hover:bg-gray-50 sticky top-0 z-10">
          <TableHead className={HEAD}>Date</TableHead>
          <TableHead className={cn(HEAD, "text-center")}>Type</TableHead>
          {CATEGORIES.map((cat) => (
            <React.Fragment key={cat.field}>
              <TableHead className={cn(HEAD, "text-center")}>{cat.label}</TableHead>
              {reasonKeys.has(cat.reasonKey) && (
                <TableHead className={cn(HEAD, "min-w-[11rem]")}>{cat.label} reasons</TableHead>
              )}
            </React.Fragment>
          ))}
          <TableHead className={cn(HEAD, "text-center")}>Journal</TableHead>
          {onView && <TableHead className={cn(HEAD, "text-right")}>View</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={columnCount} className="text-center py-8">
              <Spinner size="md" className="mx-auto" />
            </TableCell>
          </TableRow>
        ) : records.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columnCount} className="text-center py-8 text-gray-500">
              No records found
            </TableCell>
          </TableRow>
        ) : (
          records.map((record: any, index: number) => {
            const date = recordDate(record)
            const journal = record.journaling || record.note || ""
            return (
              <TableRow key={`${date}-${record.id ?? record._expedition_schedule?.id}-${index}`} className="border-b hover:bg-gray-50/50">
                <TableCell className="px-3 py-3 whitespace-nowrap align-top">
                  <span className="text-sm text-gray-700">{formatDay(date)}</span>
                </TableCell>
                <TableCell className="px-3 py-3 text-center align-top">
                  <DayTypeBadge schedule={record._expedition_schedule} />
                </TableCell>
                {CATEGORIES.map((cat) => {
                  const blocked = record[cat.flag] === true
                  const value = scoreOf(record, cat)
                  return (
                    <React.Fragment key={cat.field}>
                      <TableCell className={cn("px-3 py-3 text-center align-top text-sm", scoreTone(value, blocked))}>
                        {formatScore(value, blocked)}
                      </TableCell>
                      {reasonKeys.has(cat.reasonKey) && (
                        <TableCell className="px-3 py-2.5 align-top">
                          <CategoryReasonChips row={record} category={cat.reasonKey} />
                        </TableCell>
                      )}
                    </React.Fragment>
                  )
                })}
                <TableCell className={cn("px-3 py-3 text-center align-top", getJournalStringColor(journal))}>
                  <span className={cn("text-sm", journal ? "font-medium text-gray-700" : "text-gray-400")}>{journal || "—"}</span>
                </TableCell>
                {onView && (
                  <TableCell className="px-3 py-2 text-right align-top">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      onClick={() => date && onView(date)}
                      disabled={!date}
                      title="View evaluation for this date"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}
