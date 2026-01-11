import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login - Expedition Tracker",
  description: "Sign in to access Expedition Tracker",
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Login page has its own layout without navbar
  return <>{children}</>
}
