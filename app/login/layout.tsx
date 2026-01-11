import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login - SailFuture Academy Expeditions",
  description: "Sign in to access the Expeditions Staff Access Portal",
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Login page has its own layout without navbar
  return <>{children}</>
}
