"use client"

import { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { SWRConfig } from "swr"
import { UserProvider } from "@/lib/contexts/user-context"
import { ExpeditionProvider } from "@/lib/contexts/expedition-context"

// Every Xano read goes through SWR. SWR's defaults re-fetch every mounted key each time the
// window regains focus (throttled to 5s) and dedupe identical requests for only 2s, so a staff
// member tabbing back to the app re-ran ten or more calls at once. Mutations still revalidate
// their own keys, and pages that poll (vessel position, the public screens) set their own options.
const SWR_DEFAULTS = {
  dedupingInterval: 15_000,
  focusThrottleInterval: 5 * 60_000,
  errorRetryCount: 2,
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      // Disable automatic session polling to reduce server requests
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <SWRConfig value={SWR_DEFAULTS}>
        <UserProvider>
          <ExpeditionProvider>
            {children}
          </ExpeditionProvider>
        </UserProvider>
      </SWRConfig>
    </SessionProvider>
  )
}
