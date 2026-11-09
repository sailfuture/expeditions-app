"use client"

import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LoadErrorProps {
  /** The SWR error (or any thrown value); its message is shown when it has one. */
  error: unknown
  /** What failed to load, e.g. "the schedule"; completes "Could not load …". */
  what?: string
  onRetry?: () => void
  /** `card` is a bordered block for a page body; `inline` is a compact row for a column or sheet. */
  variant?: "card" | "inline"
  className?: string
}

/**
 * A fetch failure that says so, instead of collapsing into a page's empty
 * state (which on an offline planner offers "Add Template" over a day that
 * already has activities). Shown wherever a list or grid reads SWR `error`.
 */
export function LoadError({ error, what = "this", onRetry, variant = "card", className }: LoadErrorProps) {
  const message = (error as any)?.message ? String((error as any).message) : null

  if (variant === "inline") {
    return (
      <div className={cn("flex flex-col items-center gap-2 px-3 py-4 text-center", className)}>
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <p className="text-xs font-medium text-red-700">Could not load {what}</p>
        {message && <p className="line-clamp-2 text-[11px] text-gray-500">{message}</p>}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-1 h-8 cursor-pointer text-xs">
            <RotateCcw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50/60 px-6 py-8 text-center",
        className
      )}
    >
      <AlertTriangle className="h-8 w-8 text-red-500" />
      <div>
        <p className="text-sm font-semibold text-red-800">Could not load {what}</p>
        {message && <p className="mt-1 text-xs text-red-700/80">{message}</p>}
        <p className="mt-1 text-xs text-gray-600">Check the connection and try again. Nothing shown here is up to date.</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="h-10 cursor-pointer bg-white">
          <RotateCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  )
}
