import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Expedition Passage Log Entry",
  description: "Record vessel conditions, navigation data, weather, and safety checks at regular intervals during offshore passages.",
}

export default function PassageLogsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
