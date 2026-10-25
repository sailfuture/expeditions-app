"use client"

import { Printer } from "lucide-react"

/** Opens the browser print dialog; "Save as PDF" there produces the hand-out. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700"
    >
      <Printer className="h-4 w-4" />
      Print / Save as PDF
    </button>
  )
}
