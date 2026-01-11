import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Expeditions Daily Schedule",
  description: "View and manage the daily itinerary, activities, and staff assignments for each day of the expedition.",
}

export default function PublicScheduleDateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
