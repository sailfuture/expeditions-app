import type React from "react"
import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { Providers } from "@/components/providers"
import { AppToaster } from "@/components/app-toaster"
import { PointerEventsFix } from "@/components/pointer-events-fix"
import { Analytics } from "@vercel/analytics/next"

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "SailFuture Academy: Expeditions Staff Access Portal",
  description: "A staff dashboard for recording and managing daily operations during sailing expeditions.",
  icons: {
    icon: "/sailfuture-square (8).webp",
    shortcut: "/sailfuture-square (8).webp",
    apple: "/sailfuture-square (8).webp",
  },
  openGraph: {
    title: "SailFuture Academy: Expeditions Staff Access Portal",
    description: "A staff dashboard for recording and managing daily operations during sailing expeditions.",
    images: ["/sailfuture-square (8).webp"],
    type: "website",
  },
  appleWebApp: {
    title: "SailFuture Expeditions",
    statusBarStyle: "default",
  },
}

// viewport-fit=cover is what makes env(safe-area-inset-*) non-zero on iPhones,
// so the fixed bottom bars can pad above the home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // Browser extensions add attributes to <html> before React hydrates
    // (e.g. data-brext-fragno); ignore attribute mismatches on this one element.
    <html lang="en" className={fontSans.variable} suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <Suspense fallback={<div className="h-16 bg-white border-b" />}>
            <Navbar />
          </Suspense>
          {children}
          <AppToaster />
          <PointerEventsFix />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
