"use client"

import { ReactNode } from "react"
import { UserProvider } from "@/lib/contexts/user-context"
import { ExpeditionProvider } from "@/lib/contexts/expedition-context"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <ExpeditionProvider>
        {children}
      </ExpeditionProvider>
    </UserProvider>
  )
}

