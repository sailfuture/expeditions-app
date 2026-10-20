"use client"

import Link from "next/link"
import { useMemo } from "react"
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
  Home, Map, ClipboardList, Users, Eye, PlusCircle, FileText, AlertTriangle, ClipboardCheck, IdCard, Receipt,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/contexts/user-context"

export type ExpeditionPage =
  | "overview"
  | "trip-planner"
  | "weekly-planner"
  | "students"
  | "daily-view"
  | "add-scores"
  | "performance-reviews"
  | "discipline"
  | "applications"
  | "passport-manifest"
  | "transactions"

interface ExpeditionHeaderProps {
  expedition: any
  isLoading?: boolean
  currentPage?: ExpeditionPage
}

const PAGE_TITLES: Record<ExpeditionPage, string> = {
  "overview": "Overview",
  "trip-planner": "Trip Planner",
  "weekly-planner": "Weekly Planner",
  "students": "Assignments",
  "daily-view": "Daily View",
  "add-scores": "Add Scores",
  "performance-reviews": "Performance Reviews",
  "discipline": "Discipline",
  "applications": "Applications",
  "passport-manifest": "Manifest",
  "transactions": "Transactions",
}

interface TabDef {
  page: ExpeditionPage
  label: string
  icon: LucideIcon
  href: (expeditionId: number, defaultDate: string) => string
}

const TABS: TabDef[] = [
  { page: "overview", label: "Overview", icon: Home, href: (id) => `/expedition/${id}` },
  { page: "trip-planner", label: "Planner", icon: Map, href: (id) => `/dashboard?expedition=${id}` },
  { page: "weekly-planner", label: "Weekly", icon: ClipboardList, href: (id) => `/planner?expedition=${id}` },
  { page: "daily-view", label: "Daily", icon: Eye, href: (id, date) => `/schedule/${date}?expedition=${id}` },
  { page: "students", label: "Assign", icon: Users, href: (id) => `/expedition/${id}/assignments` },
  { page: "add-scores", label: "Scores", icon: PlusCircle, href: (id, date) => `/evaluate/${date}?expedition=${id}` },
  { page: "performance-reviews", label: "Reviews", icon: FileText, href: (id) => `/performance-reviews?expedition=${id}` },
  { page: "discipline", label: "Discipline", icon: AlertTriangle, href: (id) => `/discipline?expedition=${id}` },
  { page: "applications", label: "Apps", icon: ClipboardCheck, href: (id) => `/applications?expedition=${id}` },
  { page: "passport-manifest", label: "Manifest", icon: IdCard, href: (id) => `/expedition/${id}/passport-manifest` },
  { page: "transactions", label: "Orders", icon: Receipt, href: (id) => `/expedition/${id}/store/transactions` },
]

const TAB_BUTTON_CLASS = "cursor-pointer h-7 px-2 rounded-md text-xs min-w-0"
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

  // Active expeditions default to today; otherwise jump to the start date.
  const defaultDate = useMemo(() => {
    if (!expedition) return getLocalDateString()
    if (expedition.isActive) return getLocalDateString()
    return expedition.startDate || expedition.start_date || getLocalDateString()
  }, [expedition])

  return (
    <>
      {/* Breadcrumb - Always visible */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <Breadcrumb>
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
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center">
            <nav aria-label="Expedition sections" className="inline-flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 shadow-sm flex-wrap">
              {TABS.map(({ page, label, icon: Icon, href }) => {
                const isActive = currentPage === page
                const className = cn(TAB_BUTTON_CLASS, !isActive && INACTIVE_TAB_CLASS)
                const content = (
                  <>
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 lg:mr-1" />
                    <span className="hidden lg:inline truncate">{label}</span>
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
