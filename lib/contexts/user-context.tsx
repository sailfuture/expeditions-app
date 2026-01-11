"use client"

import { createContext, useContext, ReactNode, useMemo } from "react"
import { useSession } from "next-auth/react"
import { ExpeditionStaff } from "@/lib/types"

interface UserContextType {
  currentUser: ExpeditionStaff | null
  isLoading: boolean
  isAuthenticated: boolean
}

const UserContext = createContext<UserContextType>({
  currentUser: null,
  isLoading: true,
  isAuthenticated: false,
})

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"

  // Convert session user to ExpeditionStaff format
  const currentUser = useMemo(() => {
    if (!session?.user || !session.user.staffId) return null
    
    return {
      id: session.user.staffId,
      name: session.user.staffName || session.user.name || "",
      email: session.user.email || "",
      isActive: session.user.isActive ?? true,
      expeditions_id: session.user.expeditions_id || [],
      photo_url: session.user.photo_url || session.user.image || undefined,
      role: session.user.role,
    } as ExpeditionStaff
  }, [session])

  return (
    <UserContext.Provider value={{ currentUser, isLoading, isAuthenticated }}>
      {children}
    </UserContext.Provider>
  )
}

export function useCurrentUser() {
  return useContext(UserContext)
}
