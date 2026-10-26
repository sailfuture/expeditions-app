"use client"

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  DISCIPLINE_REASONS,
  consequenceHasDays,
  consequenceOptionsFor,
  isCriticalReason,
  isRetiredConsequence,
  severityLabel,
} from "@/lib/discipline"

/** "Critical" (red) or "Non-critical" (amber) pill. */
export function DisciplineSeverityBadge({ critical, className }: { critical: boolean | null | undefined; className?: string }) {
  return critical ? (
    <Badge variant="destructive" className={cn("text-xs", className)}>{severityLabel(true)}</Badge>
  ) : (
    <Badge variant="outline" className={cn("text-xs bg-yellow-50 text-yellow-700 border-yellow-200", className)}>
      {severityLabel(false)}
    </Badge>
  )
}

function SeverityTag({ critical }: { critical: boolean }) {
  return (
    <span
      className={cn(
        "ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        critical ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"
      )}
    >
      {critical ? "Critical" : "Non-critical"}
    </span>
  )
}

/**
 * One list of reasons, grouped and tagged by severity. Picking a reason sets
 * the record's severity, so there's no separate referral/infraction switch.
 */
export function DisciplineReasonSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (reason: string, critical: boolean) => void
}) {
  const known = DISCIPLINE_REASONS.some((r) => r.value === value)
  const groups = [
    { label: "Critical", critical: true },
    { label: "Non-critical", critical: false },
  ]
  return (
    <Select value={value} onValueChange={(v) => onChange(v, isCriticalReason(v))}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select reason" />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g, i) => (
          <SelectGroup key={g.label}>
            {i > 0 && <SelectSeparator />}
            <SelectLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">{g.label}</SelectLabel>
            {DISCIPLINE_REASONS.filter((r) => r.critical === g.critical).map((r) => (
              <SelectItem key={r.value} value={r.value}>
                <span className="flex w-full items-center gap-2">
                  {r.value}
                  <SeverityTag critical={r.critical} />
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
        {value && !known && (
          <SelectGroup>
            <SelectSeparator />
            <SelectItem value={value}>{value} (no longer used)</SelectItem>
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}

/**
 * Consequence plus, for shore leave and activity suspensions, how many days it
 * lasts. Days are cleared (sent as 0) for consequences without a length.
 */
export function DisciplineConsequenceField({
  value,
  days,
  onChange,
}: {
  value: string
  days: string
  onChange: (consequence: string, days: string) => void
}) {
  const withDays = consequenceHasDays(value)
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <DisciplineConsequenceSelect value={value} onChange={(c) => onChange(c, consequenceHasDays(c) ? days || "1" : "")} />
      </div>
      {withDays && (
        <div className="flex w-[6.5rem] shrink-0 items-center gap-1.5">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            value={days}
            onChange={(e) => onChange(value, e.target.value)}
            aria-label="Number of days"
            className="w-16 text-center"
          />
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      )}
    </div>
  )
}

/** The three consequences, plus a retired one if this record already has it. */
export function DisciplineConsequenceSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select consequence" />
      </SelectTrigger>
      <SelectContent>
        {consequenceOptionsFor(value).map((c) => (
          <SelectItem key={c} value={c}>
            {c}
            {isRetiredConsequence(c) ? " (no longer used)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
