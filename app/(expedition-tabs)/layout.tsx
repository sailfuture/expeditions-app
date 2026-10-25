"use client"

import { Suspense, useMemo, type ReactNode } from "react"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { ExpeditionHeader, ExpeditionHeaderSkeleton, type ExpeditionPage } from "@/components/expedition-header"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"

// Maps each tab route to the page key the header highlights. Order matters:
// more specific /expedition/[id]/... routes must come before the overview.
const TAB_ROUTES: Array<[RegExp, ExpeditionPage]> = [
  [/^\/expedition\/\d+\/assignments/, "students"],
  [/^\/expedition\/\d+\/passport-manifest/, "passport-manifest"],
  [/^\/expedition\/\d+/, "overview"],
  [/^\/dashboard/, "trip-planner"],
  [/^\/map/, "route-map"],
  [/^\/planner/, "weekly-planner"],
  [/^\/schedule\//, "daily-view"],
  [/^\/evaluate\//, "add-scores"],
  [/^\/performance-reviews/, "performance-reviews"],
  [/^\/discipline/, "discipline"],
  [/^\/applications/, "applications"],
  [/^\/awards/, "awards"],
]

function resolveCurrentPage(pathname: string): ExpeditionPage {
  const match = TAB_ROUTES.find(([pattern]) => pattern.test(pathname))
  return match ? match[1] : "overview"
}

/**
 * Renders the breadcrumb + tab bar once for every expedition tab route.
 * Because this lives in a shared layout, switching tabs only swaps the page
 * content below it instead of remounting the whole tree.
 */
function ExpeditionShellHeader({ currentPage }: { currentPage: ExpeditionPage }) {
  const params = useParams<{ id?: string }>()
  const searchParams = useSearchParams()
  const { data: allExpeditions } = useExpeditions()
  const { userExpeditions, activeExpedition, selectedExpedition } = useExpeditionContext()

  const expeditionIdFromRoute = useMemo(() => {
    const raw = params?.id ?? searchParams.get("expedition")
    const parsed = raw ? parseInt(raw, 10) : NaN
    return Number.isFinite(parsed) ? parsed : null
  }, [params?.id, searchParams])

  const expedition = useMemo(() => {
    if (expeditionIdFromRoute) {
      const fromAll = allExpeditions?.find((e: any) => e.id === expeditionIdFromRoute)
      if (fromAll) return fromAll
      const fromUser = userExpeditions?.find((e: any) => e.id === expeditionIdFromRoute)
      if (fromUser) return fromUser
      return null
    }
    return activeExpedition || selectedExpedition || null
  }, [expeditionIdFromRoute, allExpeditions, userExpeditions, activeExpedition, selectedExpedition])

  return <ExpeditionHeader expedition={expedition} isLoading={!expedition} currentPage={currentPage} />
}

export default function ExpeditionTabsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const currentPage = resolveCurrentPage(pathname)
  // The weekly planner fills the viewport and scrolls internally; every other
  // tab scrolls the document normally.
  const fillsViewport = currentPage === "weekly-planner"

  return (
    <div
      className={
        fillsViewport
          ? "flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-50"
          : "flex flex-col min-h-[calc(100vh-64px)] bg-gray-50"
      }
    >
      <Suspense fallback={<ExpeditionHeaderSkeleton currentPage={currentPage} />}>
        <ExpeditionShellHeader currentPage={currentPage} />
      </Suspense>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </div>
  )
}
