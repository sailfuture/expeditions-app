"use client"

import { createContext, useContext, ReactNode, useMemo } from "react"
import { useTeachers } from "@/lib/hooks/use-expeditions"
import { ExpeditionStaff } from "@/lib/types"

interface UserContextType {
  currentUser: ExpeditionStaff | null
  isLoading: boolean
}

const UserContext = createContext<UserContextType>({
  currentUser: null,
  isLoading: true,
})

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: teachers, isLoading } = useTeachers()

  // Find Brianna Joy
  const currentUser = useMemo(() => {
    if (!teachers) return null
    return teachers.find((teacher: ExpeditionStaff) => 
      teacher.name === "Brianna Joy"
    ) || null
  }, [teachers])

  return (
    <UserContext.Provider value={{ currentUser, isLoading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useCurrentUser() {
  return useContext(UserContext)
}

