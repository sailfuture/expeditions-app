"use client"

import { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { UserProvider } from "@/lib/contexts/user-context"
import { ExpeditionProvider } from "@/lib/contexts/expedition-context"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <UserProvider>
        <ExpeditionProvider>
          {children}
        </ExpeditionProvider>
      </UserProvider>
    </SessionProvider>
  )
}
