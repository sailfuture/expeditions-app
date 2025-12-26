"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import { useCurrentUser } from "@/lib/contexts/user-context"

export function Navbar() {
  const pathname = usePathname()
  const { selectedExpedition, selectedExpeditionId, setSelectedExpeditionId, userExpeditions, isLoading } = useExpeditionContext()
  const { currentUser } = useCurrentUser()

  const selectedExpeditionName = selectedExpedition?.name || "Select Expedition"
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container mx-auto flex h-14 items-center px-4 gap-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
          <div className="h-9 w-9 rounded-full bg-[#1e3a5f] flex items-center justify-center">
            <span className="text-[10px] font-bold text-white leading-tight text-center">
              EXP
              <br />
              TRACK
            </span>
          </div>
        </Link>

        <NavigationMenu>
          <NavigationMenuList className="gap-2">
            <NavigationMenuItem>
              <Link
                href="/dashboard"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "cursor-pointer",
                  pathname === "/dashboard" && "text-foreground",
                )}
              >
                Expeditions
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link
                href="/students-staff"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "cursor-pointer",
                  pathname === "/students-staff" && "text-foreground",
                )}
              >
                Students & Staff
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link
                href={`/evaluate/${today}`}
                className={cn(
                  navigationMenuTriggerStyle(),
                  "cursor-pointer",
                  pathname.startsWith("/evaluate") && "text-foreground",
                )}
              >
                Record Scores
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link
                href={`/schedule/${today}`}
                className={cn(
                  navigationMenuTriggerStyle(),
                  "cursor-pointer",
                  pathname.startsWith("/schedule") && "text-foreground",
                )}
              >
                View Schedule
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link
                href="/planner"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "cursor-pointer",
                  pathname.startsWith("/planner") && "text-foreground",
                )}
              >
                Planner
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Spacer */}
        <div className="flex-1" />

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : selectedExpeditionName}
          </span>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-medium">{currentUser?.name || "Loading..."}</span>
          <Avatar className="h-8 w-8">
            <AvatarImage src="/diverse-user-avatars.png" />
            <AvatarFallback>
              {currentUser?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("") || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
