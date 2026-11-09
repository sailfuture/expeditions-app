"use client"

import { Toaster } from "sonner"
import { useIsPhone } from "@/hooks/use-is-phone"

// On phones the Daily View and Add Scores pages keep a fixed action bar along
// the bottom edge, so toasts (often the only explanation of a failed submit)
// move to the top instead of covering the button that was just pressed.
export function AppToaster() {
  const isPhone = useIsPhone()
  return <Toaster position={isPhone ? "top-center" : "bottom-right"} />
}
