"use client"

import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface RowCardProps {
  /** Avatar, colour bar or badge shown before the text. */
  leading?: ReactNode
  title: ReactNode
  /** Up to a few short secondary lines; each truncates on its own line. */
  lines?: ReactNode[]
  /** Badge or short value at the right edge, before the chevron. */
  trailing?: ReactNode
  /** When given the whole card is a button; the chevron shows only then. */
  onClick?: () => void
  /** Dims the row (a past day, an archived record). */
  muted?: boolean
  className?: string
}

/**
 * One list row for the lists phones use on deck or at a dock (discipline
 * records, day cards, awards). 64px minimum height, whole card tappable,
 * nothing hidden behind hover. Hand-map each list onto it; this is not a
 * table-to-card transformer.
 */
export function RowCard({ leading, title, lines = [], trailing, onClick, muted = false, className }: RowCardProps) {
  const body = (
    <>
      {leading && <div className="flex shrink-0 items-center self-start pt-0.5">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-gray-900">{title}</div>
        {lines.filter(Boolean).map((line, i) => (
          <div key={i} className={cn("truncate text-xs", i === 0 ? "text-gray-600" : "text-gray-500")}>
            {line}
          </div>
        ))}
      </div>
      {trailing && <div className="shrink-0 text-right text-xs text-gray-600">{trailing}</div>}
      {onClick && <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />}
    </>
  )

  const base = cn("flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left", muted && "opacity-60", className)

  if (onClick) {
    return (
      <li>
        <button type="button" onClick={onClick} className={cn(base, "active:bg-gray-50")}>
          {body}
        </button>
      </li>
    )
  }
  return <li className={base}>{body}</li>
}

/** Bordered white list that RowCards sit in. */
export function RowCardList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul className={cn("divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm", className)}>
      {children}
    </ul>
  )
}
