"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PublicScheduleRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Get current date in UTC
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const day = String(now.getUTCDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    // Redirect to today's schedule
    router.replace(`/public/schedule/${dateStr}`)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse text-gray-500">Loading schedule...</div>
    </div>
  )
}
