"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Home, Map, Route, ClipboardList, Users, Eye, PlusCircle, FileText, AlertTriangle, ClipboardCheck, IdCard, Trophy, BookMarked, ChevronLeft,
  type LucideIcon,
} from "lucide-react"
import { cn, clampDateToExpeditionRange } from "@/lib/utils"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { ExpeditionTypeBadge } from "@/components/expedition-type-badge"
import { isResidentialExpedition } from "@/lib/expedition-type"

export type ExpeditionPage =
  | "overview"
  | "trip-planner"
  | "route-map"
  | "weekly-planner"
  | "students"
  | "daily-view"
  | "add-scores"
  | "performance-reviews"
  | "discipline"
  | "applications"
  | "passport-manifest"
  | "awards"
  | "grades"
  // The post-login home dashboard (/home): shows the header for the active
  // expedition but is not one of the tabs, so no tab is highlighted.
  | "dashboard"

interface ExpeditionHeaderProps {
  expedition: any
  isLoading?: boolean
  currentPage?: ExpeditionPage
}

const PAGE_TITLES: Record<ExpeditionPage, string> = {
  "overview": "Overview",
  "trip-planner": "Trip Planner",
  "route-map": "Route Map",
  "weekly-planner": "Weekly Planner",
  "students": "Assignments",
  "daily-view": "Daily View",
  "add-scores": "Add Scores",
  "performance-reviews": "Performance Reviews",
  "discipline": "Discipline",
  "applications": "Applications",
  "passport-manifest": "Manifest",
  "awards": "Awards",
  "grades": "Grades",
  "dashboard": "Dashboard",
}

interface TabDef {
  page: ExpeditionPage
  label: string
  icon: LucideIcon
  href: (expeditionId: number, defaultDate: string) => string
}

const TABS: TabDef[] = [
  { page: "overview", label: "Overview", icon: Home, href: (id) => `/expedition/${id}` },
  { page: "trip-planner", label: "Planner", icon: Route, href: (id) => `/dashboard?expedition=${id}` },
  { page: "route-map", label: "Map", icon: Map, href: (id) => `/map?expedition=${id}` },
  { page: "weekly-planner", label: "Weekly", icon: ClipboardList, href: (id) => `/planner?expedition=${id}` },
  { page: "daily-view", label: "Daily", icon: Eye, href: (id, date) => `/schedule/${date}?expedition=${id}` },
  { page: "students", label: "Assign", icon: Users, href: (id) => `/expedition/${id}/assignments` },
  { page: "add-scores", label: "Scores", icon: PlusCircle, href: (id, date) => `/evaluate/${date}?expedition=${id}` },
  { page: "performance-reviews", label: "Reviews", icon: FileText, href: (id) => `/performance-reviews?expedition=${id}` },
  { page: "discipline", label: "Discipline", icon: AlertTriangle, href: (id) => `/discipline?expedition=${id}` },
  { page: "applications", label: "Apps", icon: ClipboardCheck, href: (id) => `/applications?expedition=${id}` },
  { page: "passport-manifest", label: "Manifest", icon: IdCard, href: (id) => `/expedition/${id}/passport-manifest` },
  { page: "awards", label: "Awards", icon: Trophy, href: (id) => `/awards?expedition=${id}` },
  { page: "grades", label: "Grades", icon: BookMarked, href: (id) => `/grades?expedition=${id}` },
]

// Under lg: a 48px-tall, 56px-wide icon-over-label chip in a scrolling strip
// (phones and tablets have no hover, and icon-only tabs were unreadable).
// At lg+: the original compact 28px row with the label beside the icon.
const TAB_BUTTON_CLASS =
  "cursor-pointer h-12 min-w-[56px] shrink-0 snap-start flex-col gap-0.5 rounded-md px-1.5 text-[11px] leading-none lg:h-7 lg:min-w-0 lg:shrink lg:flex-row lg:gap-1 lg:px-2 lg:text-xs"
const INACTIVE_TAB_CLASS = "bg-white border border-gray-200 hover:bg-gray-50"

// Local date string (not UTC) to avoid timezone issues
function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function ExpeditionHeader({ expedition, isLoading = false, currentPage = "overview" }: ExpeditionHeaderProps) {
  const { currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === "Admin"

  // Default to today when it falls inside the expedition; otherwise the
  // start date (or the end date once the expedition has passed).
  const defaultDate = useMemo(() => {
    const today = getLocalDateString()
    if (!expedition) return today
    const start = expedition.startDate || expedition.start_date
    const end = expedition.endDate || expedition.end_date
    return clampDateToExpeditionRange(today, start, end) || start || today
  }, [expedition])

  // The award system is only for residential expeditions, so academy
  // expeditions (and the skeleton, before the expedition loads) hide its tab.
  const visibleTabs = useMemo(
    () => TABS.filter((tab) => tab.page !== "awards" || isResidentialExpedition(expedition)),
    [expedition]
  )

  // When the strip scrolls (under lg), bring the active tab into view on mount
  // without scrolling the page itself.
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const nav = navRef.current
    if (!nav || nav.scrollWidth <= nav.clientWidth) return
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]')
    if (!active) return
    const target = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2
    nav.scrollLeft = Math.max(0, target)
  }, [currentPage, visibleTabs.length])

  return (
    <>
      {/* Breadcrumb: on phones a single back link with the expedition name; the full trail from md */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 md:hidden min-h-[24px]">
            <Link
              href={currentPage === "overview" ? (isAdmin ? "/expeditions" : "/my-expeditions") : expedition ? `/expedition/${expedition.id}` : "#"}
              className="flex min-w-0 items-center gap-1 text-sm font-medium text-gray-900 -ml-1.5 py-1 pr-1 rounded-md active:bg-gray-100"
              aria-label={currentPage === "overview" ? (isAdmin ? "All Expeditions" : "My Expeditions") : "Expedition overview"}
            >
              <ChevronLeft className="h-4 w-4 shrink-0 text-gray-500" />
              {expedition ? (
                <span className="truncate">{expedition.name}</span>
              ) : isLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <span className="text-gray-500">{isAdmin ? "All Expeditions" : "My Expeditions"}</span>
              )}
            </Link>
            {expedition && (
              <ExpeditionTypeBadge expedition={expedition} className="h-5 shrink-0 px-1.5 text-[10px] uppercase tracking-wide" />
            )}
          </div>
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={isAdmin ? "/expeditions" : "/my-expeditions"}
                  className="cursor-pointer"
                >
                  {isAdmin ? "All Expeditions" : "My Expeditions"}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {expedition ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {currentPage === "overview" ? (
                      <BreadcrumbPage>{expedition.name}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={`/expedition/${expedition.id}`} className="cursor-pointer">
                        {expedition.name}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  <BreadcrumbItem>
                    <ExpeditionTypeBadge expedition={expedition} className="h-5 px-1.5 text-[10px] uppercase tracking-wide" />
                  </BreadcrumbItem>
                </>
              ) : isLoading ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <Skeleton className="h-4 w-40" />
                  </BreadcrumbItem>
                </>
              ) : null}
              {currentPage !== "overview" && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{PAGE_TITLES[currentPage]}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b bg-muted/30">
        {/* Under lg the strip bleeds to the screen edges and scrolls sideways; from lg it
            sits in the container and wraps like before. */}
        <div className="container mx-auto px-0 py-2 lg:px-4 lg:py-3">
          <div className="flex items-center">
            <nav
              ref={navRef}
              aria-label="Expedition sections"
              className="flex w-full snap-x snap-mandatory flex-nowrap gap-1 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:w-auto lg:inline-flex lg:flex-wrap lg:overflow-visible lg:rounded-lg lg:border lg:border-gray-200 lg:bg-gray-50 lg:p-1 lg:shadow-sm"
            >
              {visibleTabs.map(({ page, label, icon: Icon, href }) => {
                const isActive = currentPage === page
                const className = cn(TAB_BUTTON_CLASS, !isActive && INACTIVE_TAB_CLASS)
                const content = (
                  <>
                    <Icon className="h-4 w-4 flex-shrink-0 lg:h-3.5 lg:w-3.5" />
                    <span className="truncate">{label}</span>
                  </>
                )

                if (!expedition) {
                  return (
                    <Button key={page} variant={isActive ? "default" : "ghost"} size="sm" className={className} disabled>
                      {content}
                    </Button>
                  )
                }

                return (
                  <Button key={page} asChild variant={isActive ? "default" : "ghost"} size="sm" className={className}>
                    <Link
                      href={href(expedition.id, defaultDate)}
                      // A dozen tabs each prefetch several route segments the moment the header
                      // renders (about fifty requests per page). With prefetch off, Next still
                      // prefetches the one tab the pointer hovers over.
                      prefetch={false}
                      aria-current={isActive ? "page" : undefined}
                      title={PAGE_TITLES[page]}
                    >
                      {content}
                    </Link>
                  </Button>
                )
              })}
            </nav>
          </div>
        </div>
      </div>
    </>
  )
}

/** Same footprint as the header, used while route params are still resolving. */
export function ExpeditionHeaderSkeleton({ currentPage = "overview" }: { currentPage?: ExpeditionPage }) {
  return <ExpeditionHeader expedition={null} isLoading currentPage={currentPage} />
}
