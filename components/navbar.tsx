"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import { useCurrentUser } from "@/lib/contexts/user-context"

export function Navbar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { selectedExpedition, selectedExpeditionId, setSelectedExpeditionId, userExpeditions, activeExpedition, isLoading } = useExpeditionContext()
  const { currentUser } = useCurrentUser()
  const { data: allExpeditionsData } = useExpeditions()

  // Get expedition ID from URL if present
  const expeditionIdFromUrl = searchParams.get('expedition') ? parseInt(searchParams.get('expedition')!) : null
  
  // Find the expedition to display in the navbar - prioritize URL parameter
  const displayedExpedition = useMemo(() => {
    if (expeditionIdFromUrl && allExpeditionsData) {
      const expeditionFromUrl = allExpeditionsData.find((e: any) => e.id === expeditionIdFromUrl)
      if (expeditionFromUrl) return expeditionFromUrl
    }
    if (expeditionIdFromUrl && userExpeditions) {
      const expeditionFromUrl = userExpeditions.find((e: any) => e.id === expeditionIdFromUrl)
      if (expeditionFromUrl) return expeditionFromUrl
    }
    return activeExpedition
  }, [expeditionIdFromUrl, allExpeditionsData, userExpeditions, activeExpedition])
  
  const activeExpeditionName = displayedExpedition?.name || "No Active Expedition"
  
  // Get the appropriate default date based on expedition status
  // If active expedition, use today. If not active, use expedition start date
  const getDefaultDate = () => {
    if (!activeExpedition) return new Date().toISOString().split('T')[0]
    
    if (activeExpedition.isActive) {
      return new Date().toISOString().split('T')[0]
    }
    
    // For non-active expeditions, use the start date
    const startDate = activeExpedition.startDate || activeExpedition.start_date
    if (startDate) {
      return startDate
    }
    
    return new Date().toISOString().split('T')[0]
  }
  
  const defaultDate = getDefaultDate()

  // Hide navbar on public pages - MUST be after all hooks
  if (pathname === "/intake" || pathname === "/apply" || pathname.startsWith("/tv") || pathname.startsWith("/public")) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      {/* Main Navigation */}
      <div className="border-b">
        <div className="container mx-auto flex h-14 items-center px-4 gap-6">
          {/* Logo */}
          <Link href="/expeditions" className="flex items-center gap-2 cursor-pointer">
            <div className="h-9 w-9 rounded-full overflow-hidden">
              <Image
                src="/sailfuture-square (8).webp"
                alt="SailFuture Logo"
                width={36}
                height={36}
                className="object-cover"
              />
            </div>
          </Link>

          <NavigationMenu>
            <NavigationMenuList className="gap-2">
              {currentUser?.role === "Admin" && (
                <NavigationMenuItem>
                  <Link
                    href="/expeditions"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "cursor-pointer",
                      pathname === "/expeditions" && "text-foreground",
                    )}
                  >
                    All Expeditions
                  </Link>
                </NavigationMenuItem>
              )}

              {currentUser?.role === "Admin" && (
                <>
                  <NavigationMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(
                        navigationMenuTriggerStyle(),
                        "cursor-pointer flex items-center gap-1",
                        (pathname === "/students" || pathname === "/intake-records") && "text-foreground",
                      )}>
                        Student Records
                        <ChevronDown className="h-3 w-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <Link href="/students">
                          <DropdownMenuItem className="cursor-pointer">
                            Student Records
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/intake-records">
                          <DropdownMenuItem className="cursor-pointer">
                            Intake Records
                          </DropdownMenuItem>
                        </Link>
                        <div className="h-px bg-gray-200 my-1" />
                        <Link href="/intake">
                          <DropdownMenuItem className="cursor-pointer">
                            Intake Form
                          </DropdownMenuItem>
                        </Link>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <Link
                      href="/staff"
                      className={cn(
                        navigationMenuTriggerStyle(),
                        "cursor-pointer",
                        pathname === "/staff" && "text-foreground",
                      )}
                    >
                      Staff Records
                    </Link>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <Link
                      href="/tv"
                      className={cn(
                        navigationMenuTriggerStyle(),
                        "cursor-pointer",
                        pathname.startsWith("/tv") && "text-foreground",
                      )}
                      target="_blank"
                    >
                      Display
                    </Link>
                  </NavigationMenuItem>
                </>
              )}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Spacer */}
          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{currentUser?.name || "Loading..."}</span>
            {expeditionIdFromUrl && displayedExpedition && (
              <>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {isLoading ? "Loading..." : activeExpeditionName}
                  </span>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    displayedExpedition.isActive 
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-gray-100 text-gray-600 border border-gray-200"
                  )}>
                    {displayedExpedition.isActive ? "Active" : "Past"}
                  </span>
                </div>
              </>
            )}
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
      </div>

    </header>
  )
}
