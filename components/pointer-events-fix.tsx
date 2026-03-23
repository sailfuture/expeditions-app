"use client"

import { useEffect } from "react"

/**
 * Global fix for Radix UI's pointer-events: none stuck on document.body.
 * When Radix modals/sheets open, they set pointer-events: none on body.
 * Sometimes (especially on Escape key close), this isn't cleaned up.
 * This component watches for that and removes it when no modals are open.
 */
export function PointerEventsFix() {
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === "none") {
        // Check if any Radix dialog/sheet overlay is actually open
        const openOverlays = document.querySelectorAll(
          '[data-state="open"][data-slot="dialog-overlay"], [data-state="open"][data-slot="sheet-overlay"]'
        )
        if (openOverlays.length === 0) {
          document.body.style.removeProperty("pointer-events")
        }
      }
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    })

    // Also run a periodic cleanup as a fallback
    const interval = setInterval(() => {
      if (document.body.style.pointerEvents === "none") {
        const openOverlays = document.querySelectorAll(
          '[data-state="open"][data-slot="dialog-overlay"], [data-state="open"][data-slot="sheet-overlay"]'
        )
        if (openOverlays.length === 0) {
          document.body.style.removeProperty("pointer-events")
        }
      }
    }, 500)

    return () => {
      observer.disconnect()
      clearInterval(interval)
    }
  }, [])

  return null
}
