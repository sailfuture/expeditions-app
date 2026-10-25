import type { Metadata } from "next"
import { HomeDashboard } from "./home-dashboard"

export const metadata: Metadata = {
  title: "Dashboard · SailFuture Expeditions",
}

/**
 * Post-login landing page: the active expedition at a glance (stats, today's
 * schedule, the boat's live position and freshly recalculated student scores).
 */
export default function HomePage() {
  return <HomeDashboard />
}
