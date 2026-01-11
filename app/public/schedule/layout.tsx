import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Expeditions Daily Schedule",
  description: "View and manage the daily itinerary, activities, and staff assignments for each day of the expedition.",
  openGraph: {
    title: "Expeditions Daily Schedule",
    description: "View and manage the daily itinerary, activities, and staff assignments for each day of the expedition.",
    images: ["/sailfuture-square (8).webp"],
  },
}

export default function PublicScheduleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
