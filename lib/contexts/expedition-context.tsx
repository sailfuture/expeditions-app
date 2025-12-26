"use client"

import { createContext, useContext, ReactNode, useState, useEffect, useMemo } from "react"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "./user-context"
import { Expedition } from "@/lib/types"

interface ExpeditionContextType {
  selectedExpedition: Expedition | null
  selectedExpeditionId: number | null
  setSelectedExpeditionId: (id: number) => void
  userExpeditions: Expedition[]
  isLoading: boolean
}

const ExpeditionContext = createContext<ExpeditionContextType>({
  selectedExpedition: null,
  selectedExpeditionId: null,
  setSelectedExpeditionId: () => {},
  userExpeditions: [],
  isLoading: true,
})

export function ExpeditionProvider({ children }: { children: ReactNode }) {
  const { data: allExpeditions, isLoading: loadingExpeditions } = useExpeditions()
  const { currentUser, isLoading: loadingUser } = useCurrentUser()
  const [selectedExpeditionId, setSelectedExpeditionId] = useState<number | null>(null)

  // Filter expeditions assigned to current user
  const userExpeditions = useMemo(() => {
    if (!allExpeditions || !currentUser) return []
    return allExpeditions.filter((expedition: Expedition) =>
      currentUser.expeditions_id?.includes(expedition.id)
    )
  }, [allExpeditions, currentUser])

  // Sort by most recent (highest start date or ID)
  const sortedExpeditions = useMemo(() => {
    if (!userExpeditions.length) return []
    return [...userExpeditions].sort((a, b) => {
      // Try sorting by start date if available
      const dateA = a.startDate || a.start_date
      const dateB = b.startDate || b.start_date
      
      if (dateA && dateB) {
        const timeA = new Date(dateA).getTime()
        const timeB = new Date(dateB).getTime()
        // Most recent (latest date) first
        return timeB - timeA
      }
      // Fallback to ID (higher ID = more recent)
      return b.id - a.id
    })
  }, [userExpeditions])

  // Auto-select most recent expedition
  useEffect(() => {
    if (sortedExpeditions.length > 0 && !selectedExpeditionId) {
      setSelectedExpeditionId(sortedExpeditions[0].id)
    }
  }, [sortedExpeditions, selectedExpeditionId])

  const selectedExpedition = useMemo(() => {
    if (!selectedExpeditionId || !userExpeditions.length) return null
    return userExpeditions.find((e) => e.id === selectedExpeditionId) || null
  }, [selectedExpeditionId, userExpeditions])

  const isLoading = loadingExpeditions || loadingUser

  return (
    <ExpeditionContext.Provider
      value={{
        selectedExpedition,
        selectedExpeditionId,
        setSelectedExpeditionId,
        userExpeditions: sortedExpeditions,
        isLoading,
      }}
    >
      {children}
    </ExpeditionContext.Provider>
  )
}

export function useExpeditionContext() {
  return useContext(ExpeditionContext)
}

