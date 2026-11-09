"use client"

import { useState, type MouseEvent } from "react"
import { Check, Copy, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

async function copyToClipboard(text: string, label: string, done: () => void) {
  try {
    await navigator.clipboard.writeText(text)
    done()
    toast.success(`${label} copied`)
  } catch {
    toast.error("Could not copy. Select the text and copy it instead.")
  }
}

/** A small copy-to-clipboard button; clicks never reach the row behind it. */
export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = (e: MouseEvent) => {
    e.stopPropagation()
    copyToClipboard(value, label, () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-6 w-6 shrink-0 text-gray-500 hover:text-gray-900", className)}
      onClick={copy}
      aria-label={`Copy ${label.toLowerCase()}`}
      title={`Copy ${label.toLowerCase()}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

/**
 * A login password shown masked until a staff member reveals it, with a copy button.
 * Used for the student's school email password on the student pages.
 */
export function LoginSecret({ value, label = "Password", className }: { value?: string | null; label?: string; className?: string }) {
  const [shown, setShown] = useState(false)
  if (!value) return <span className="text-gray-400">—</span>
  const toggle = (e: MouseEvent) => {
    e.stopPropagation()
    setShown((s) => !s)
  }
  return (
    <span className={cn("inline-flex items-center gap-1 min-w-0 max-w-full", className)}>
      <span className={cn("text-sm text-gray-900 truncate", shown ? "font-mono" : "tracking-widest")} title={shown ? value : undefined}>
        {shown ? value : "••••••••"}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-gray-500 hover:text-gray-900"
        onClick={toggle}
        aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        title={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
      >
        {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
      <CopyButton value={value} label={label} />
    </span>
  )
}
