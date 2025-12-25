"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import { useState, useEffect } from "react"

export function Navbar() {
  const pathname = usePathname()
  const { expeditions, isLoading } = useExpeditions()
  const [selectedExpedition, setSelectedExpedition] = useState<number | null>(null)

  useEffect(() => {
    if (expeditions && expeditions.length > 0 && !selectedExpedition) {
      const sorted = [...expeditions].sort((a, b) => b.id - a.id)
      setSelectedExpedition(sorted[0].id)
    }
  }, [expeditions, selectedExpedition])

  const selectedExpeditionName = expeditions?.find((e) => e.id === selectedExpedition)?.name || "Select Expedition"

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="flex h-14 items-center px-4 gap-4">
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

        {/* Home icon */}
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Home className="h-5 w-5" />
        </Link>

        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link
                href="/dashboard"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "cursor-pointer",
                  pathname === "/dashboard" && "text-foreground",
                )}
              >
                Dashboard
              </Link>
            </NavigationMenuItem>

            {/* Scores - dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="cursor-pointer">Scores</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[200px] gap-1 p-2">
                  <li>
                    <Link
                      href="/evaluate/1"
                      className={cn(
                        "block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer",
                        pathname.startsWith("/evaluate") && "bg-accent",
                      )}
                    >
                      <div className="text-sm font-medium">Evaluate Students</div>
                      <p className="text-xs text-muted-foreground mt-1">Record professionalism scores</p>
                    </Link>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Schedules - dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="cursor-pointer">Schedules</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[200px] gap-1 p-2">
                  <li>
                    <Link
                      href="/dashboard"
                      className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer"
                    >
                      <div className="text-sm font-medium">View Schedules</div>
                      <p className="text-xs text-muted-foreground mt-1">Browse expedition schedules</p>
                    </Link>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Spacer */}
        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md cursor-pointer hover:bg-accent transition-colors">
            {isLoading ? "Loading..." : selectedExpeditionName}
            <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {expeditions
              ?.sort((a, b) => b.id - a.id)
              .map((expedition) => (
                <DropdownMenuItem
                  key={expedition.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedExpedition(expedition.id)}
                >
                  {expedition.name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm font-medium">Brianna Joy</span>
          <Avatar className="h-8 w-8">
            <AvatarImage src="/diverse-user-avatars.png" />
            <AvatarFallback>BJ</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
