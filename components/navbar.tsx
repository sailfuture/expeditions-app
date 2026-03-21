"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useSearchParams } from "next/navigation"
import { useMemo, useState, useEffect } from "react"
import { signOut } from "next-auth/react"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, LogOut, Menu, Ship, Users, UserCog, ClipboardList, FileText, Tv, Calendar, BookOpen, ExternalLink, UtensilsCrossed, Boxes, ShoppingBag, ChefHat, MapPin } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import { useCurrentUser } from "@/lib/contexts/user-context"

export function Navbar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { selectedExpedition, selectedExpeditionId, setSelectedExpeditionId, userExpeditions, activeExpedition, isLoading } = useExpeditionContext()
  const { currentUser, isLoading: isUserLoading } = useCurrentUser()
  const { data: allExpeditionsData } = useExpeditions()
  
  // Track if component has mounted (to prevent hydration mismatch)
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Get expedition ID from URL - either from query param or path param
  const expeditionIdFromUrl = useMemo(() => {
    // Check query parameter first
    const queryExpId = searchParams.get('expedition')
    if (queryExpId) return parseInt(queryExpId)
    
    // Check if path matches /expedition/[id] pattern
    const expeditionPathMatch = pathname.match(/\/expedition\/(\d+)/)
    if (expeditionPathMatch) return parseInt(expeditionPathMatch[1])
    
    return null
  }, [searchParams, pathname])
  
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
  
  // Get local date string (not UTC) to avoid timezone issues
  const getLocalDateString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Get the appropriate default date based on expedition status
  // If active expedition, use today. If not active, use expedition start date
  const getDefaultDate = () => {
    if (!activeExpedition) return getLocalDateString()
    
    if (activeExpedition.isActive) {
      return getLocalDateString()
    }
    
    // For non-active expeditions, use the start date
    const startDate = activeExpedition.startDate || activeExpedition.start_date
    if (startDate) {
      return startDate
    }
    
    return getLocalDateString()
  }
  
  const defaultDate = getDefaultDate()

  // Hide navbar on public pages and login page - MUST be after all hooks
  if (pathname === "/intake" || pathname === "/apply" || pathname === "/login" || pathname.startsWith("/tv") || pathname.startsWith("/public")) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      {/* Main Navigation */}
      <div className="border-b">
        <div className="container mx-auto flex h-14 items-center px-4 gap-4 sm:gap-6">
          {/* Logo */}
          <Link href={hasMounted && currentUser?.role === "Admin" ? "/expeditions" : "/my-expeditions"} className="flex items-center gap-2 cursor-pointer flex-shrink-0">
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

          {/* Desktop Navigation */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList className="gap-2">
              {hasMounted && currentUser?.role === "Admin" ? (
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
              ) : (
                <NavigationMenuItem>
                  <Link
                    href="/my-expeditions"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "cursor-pointer",
                      pathname === "/my-expeditions" && "text-foreground",
                    )}
                  >
                    My Expeditions
                  </Link>
                </NavigationMenuItem>
              )}

              {hasMounted && currentUser?.role === "Admin" && (
                <>
                  <NavigationMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(
                        navigationMenuTriggerStyle(),
                        "cursor-pointer flex items-center gap-1",
                        (pathname === "/students" || pathname === "/intake-records" || pathname === "/staff") && "text-foreground",
                      )}>
                        Records
                        <ChevronDown className="h-3 w-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <Link href="/students">
                          <DropdownMenuItem className="cursor-pointer whitespace-nowrap">
                            Student Records
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/staff">
                          <DropdownMenuItem className="cursor-pointer whitespace-nowrap">
                            Staff Records
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/intake-records">
                          <DropdownMenuItem className="cursor-pointer whitespace-nowrap">
                            Intake Records
                          </DropdownMenuItem>
                        </Link>
                        <div className="h-px bg-gray-200 my-1" />
                        <Link href="/intake">
                          <DropdownMenuItem className="cursor-pointer whitespace-nowrap">
                            Intake Form
                          </DropdownMenuItem>
                        </Link>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(
                        navigationMenuTriggerStyle(),
                        "cursor-pointer flex items-center gap-1",
                        (pathname.startsWith("/public/passage-logs") || pathname === "/passage-logs") && "text-foreground",
                      )}>
                        Passage Planning
                        <ChevronDown className="h-3 w-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[180px]">
                        <Link href="/public/passage-logs" target="_blank">
                          <DropdownMenuItem className="cursor-pointer">
                            Passage Log Form
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/passage-logs">
                          <DropdownMenuItem className="cursor-pointer">
                            Log Dashboard
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/passage-logs/map">
                          <DropdownMenuItem className="cursor-pointer">
                            Map View
                          </DropdownMenuItem>
                        </Link>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(
                        navigationMenuTriggerStyle(),
                        "cursor-pointer flex items-center gap-1",
                        (pathname.startsWith("/meal-planning") || pathname === "/inventory" || pathname === "/store") && "text-foreground",
                      )}>
                        Ship Inventory
                        <ChevronDown className="h-3 w-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <Link href="/meal-planning">
                          <DropdownMenuItem className="cursor-pointer whitespace-nowrap">
                            Cookbook
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/store">
                          <DropdownMenuItem className="cursor-pointer whitespace-nowrap">
                            Store
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/inventory">
                          <DropdownMenuItem className="cursor-pointer whitespace-nowrap">
                            Inventory
                          </DropdownMenuItem>
                        </Link>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(
                        navigationMenuTriggerStyle(),
                        "cursor-pointer flex items-center gap-1",
                        (pathname.startsWith("/tv") || pathname === "/public/schedule") && "text-foreground",
                      )}>
                        Public Pages
                        <ChevronDown className="h-3 w-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <Link href="/tv" target="_blank">
                          <DropdownMenuItem className="cursor-pointer whitespace-nowrap">
                            TV Display
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/public/schedule" target="_blank">
                          <DropdownMenuItem className="cursor-pointer whitespace-nowrap">
                            Public Schedule
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/public/galley" target="_blank">
                          <DropdownMenuItem className="cursor-pointer whitespace-nowrap">
                            Galley
                          </DropdownMenuItem>
                        </Link>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>
                </>
              )}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Spacer */}
          <div className="flex-1" />

          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Expedition name - hidden on mobile */}
            {expeditionIdFromUrl && displayedExpedition && (
              <div className="hidden sm:flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                  {isLoading ? "Loading..." : activeExpeditionName}
                </span>
                <div className="h-4 w-px bg-border shrink-0" />
              </div>
            )}

            {/* Mobile Menu Button - before profile image */}
            {hasMounted && currentUser?.role === "Admin" && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 cursor-pointer">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <SheetHeader className="px-4 py-4 border-b">
                    <SheetTitle className="text-left">Navigation</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col py-2">
                    <Link
                      href="/expeditions"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                    >
                      <Ship className="h-4 w-4 text-muted-foreground" />
                      All Expeditions
                    </Link>
                    
                    <div className="px-4 py-2 mt-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Records</p>
                    </div>
                    <Link
                      href="/students"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Student Records
                    </Link>
                    <Link
                      href="/staff"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                      Staff Records
                    </Link>
                    <Link
                      href="/intake-records"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      Intake Records
                    </Link>
                    <Link
                      href="/intake"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Intake Form
                    </Link>
                    
                    <div className="px-4 py-2 mt-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Public Pages</p>
                    </div>
                    <Link
                      href="/tv"
                      target="_blank"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <Tv className="h-4 w-4 text-muted-foreground" />
                      TV Display
                      <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                    </Link>
                    <Link
                      href="/public/schedule"
                      target="_blank"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Public Schedule
                      <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                    </Link>
                    <Link
                      href="/public/galley"
                      target="_blank"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <ChefHat className="h-4 w-4 text-muted-foreground" />
                      Galley
                      <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                    </Link>

                    <div className="px-4 py-2 mt-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passage Planning</p>
                    </div>
                    <Link
                      href="/public/passage-logs"
                      target="_blank"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      Passage Log Form
                      <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                    </Link>
                    <Link
                      href="/passage-logs"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      Log Dashboard
                    </Link>
                    <Link
                      href="/passage-logs/map"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Map View
                    </Link>

                    <div className="px-4 py-2 mt-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ship Inventory</p>
                    </div>
                    <Link
                      href="/meal-planning"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                      Cookbook
                    </Link>
                    <Link
                      href="/store"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      Store
                    </Link>
                    <Link
                      href="/inventory"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <Boxes className="h-4 w-4 text-muted-foreground" />
                      Inventory
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>
            )}

            {/* User Menu */}
            {hasMounted && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity min-w-0">
                  <span className="hidden sm:block text-sm font-medium truncate max-w-[150px]">{currentUser?.name || "User"}</span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser?.photo_url || "/diverse-user-avatars.png"} />
                    <AvatarFallback>
                      {currentUser?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{currentUser?.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                    {currentUser?.role && (
                      <p className="text-xs text-muted-foreground mt-0.5">Role: {currentUser.role}</p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

    </header>
  )
}
