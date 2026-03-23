"use client"

import { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { UserProvider } from "@/lib/contexts/user-context"
import { ExpeditionProvider } from "@/lib/contexts/expedition-context"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      // Disable automatic session polling to reduce server requests
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <UserProvider>
        <ExpeditionProvider>
          {children}
        </ExpeditionProvider>
      </UserProvider>
    </SessionProvider>
  )
}
