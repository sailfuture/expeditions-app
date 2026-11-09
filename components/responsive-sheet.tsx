"use client"

import type { ComponentProps, ReactNode } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useIsPhone } from "@/hooks/use-is-phone"
import { cn } from "@/lib/utils"

/**
 * A Sheet that slides in from the right on tablets and laptops and up from the
 * bottom on phones (92dvh tall, rounded top, a grab handle), so its footer is
 * always within thumb reach. Compose the inside as with Sheet: a header, a
 * scrolling body (`flex-1 overflow-y-auto`) and a ResponsiveSheetFooter.
 */
export const ResponsiveSheet = Sheet

interface ResponsiveSheetContentProps extends Omit<ComponentProps<typeof SheetContent>, "side"> {
  /** Side used from md up; phones always open from the bottom. */
  side?: "right" | "left"
  /** Hide the grab handle drawn at the top on phones. */
  hideHandle?: boolean
}

export function ResponsiveSheetContent({ className, children, side = "right", hideHandle = false, ...props }: ResponsiveSheetContentProps) {
  const isPhone = useIsPhone()
  const phone = isPhone === true

  return (
    <SheetContent
      side={phone ? "bottom" : side}
      className={cn(
        "flex flex-col gap-0 overflow-hidden p-0",
        phone && "inset-x-0 bottom-0 h-[92dvh] w-full max-w-none rounded-t-2xl border-t",
        className
      )}
      {...props}
    >
      {phone && !hideHandle && (
        <div className="flex shrink-0 justify-center pt-2" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-gray-300" />
        </div>
      )}
      {children}
    </SheetContent>
  )
}

/** Sticky footer that clears the phone home indicator. */
export function ResponsiveSheetFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
        className
      )}
    >
      {children}
    </div>
  )
}
