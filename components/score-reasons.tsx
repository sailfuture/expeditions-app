import { cn } from "@/lib/utils"
import {
  reasonGroupsForRow,
  summarizeReasons,
  type CategoryReasonSummary,
  type ReasonTally,
} from "@/lib/evaluation-reasons"

const CHIP = "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4"
const CHIP_TONE = {
  bonus: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-200",
  penalty: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
} as const

/**
 * The reasons given on one day, grouped by category: "School · Actively
 * Engaged, Positive Attitude". Renders nothing when no reasons were given.
 */
export function DayReasons({
  row,
  className,
  empty = null,
}: {
  row: Record<string, unknown> | null | undefined
  className?: string
  empty?: React.ReactNode
}) {
  const groups = reasonGroupsForRow(row)
  if (groups.length === 0) return <>{empty}</>
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {groups.map((group) => (
        <div key={group.key} className="flex flex-wrap items-center gap-1">
          <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{group.label}</span>
          {group.reasons.map((reason) => (
            <span key={`${reason.type}-${reason.id}`} className={cn(CHIP, CHIP_TONE[reason.type])}>
              {reason.name}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function TallyChips({ tallies }: { tallies: ReasonTally[] }) {
  return (
    <>
      {tallies.map((t) => (
        <span key={`${t.type}-${t.id}`} className={cn(CHIP, CHIP_TONE[t.type])}>
          {t.name}
          {t.count > 1 && <span className="tabular-nums opacity-70">×{t.count}</span>}
        </span>
      ))}
    </>
  )
}

/**
 * How often each reason was given per category across a set of days, bonuses
 * first, most frequent first. Shows an empty note when there are none.
 */
export function ReasonsSummary({
  rows,
  title = "Reasons by category",
  className,
}: {
  rows: ReadonlyArray<Record<string, unknown>>
  title?: string
  className?: string
}) {
  const summary: CategoryReasonSummary[] = summarizeReasons(rows)
  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white", className)}>
      <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2">
        <h4 className="text-xs font-semibold text-gray-700">{title}</h4>
        <span className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-green-400" />Above 3</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-400" />Below 3</span>
        </span>
      </div>
      {summary.length === 0 ? (
        <p className="px-3 py-3 text-sm text-gray-500">No reasons recorded for these days.</p>
      ) : (
        <dl className="divide-y">
          {summary.map((cat) => (
            <div key={cat.key} className="grid grid-cols-[6.5rem_1fr] gap-2 px-3 py-2">
              <dt className="pt-0.5 text-xs font-semibold text-gray-700">{cat.label}</dt>
              <dd className="flex flex-wrap gap-1">
                <TallyChips tallies={cat.bonus} />
                <TallyChips tallies={cat.penalty} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
