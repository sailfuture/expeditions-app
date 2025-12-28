"use client"

import { useRouter } from "next/navigation"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Calendar, Home, Map, ClipboardList, Users, Eye, PlusCircle, FileText } from "lucide-react"
import { format } from "date-fns"

interface ExpeditionHeaderProps {
  expedition: any
  isLoading?: boolean
  currentPage?: "overview" | "trip-planner" | "weekly-planner" | "students" | "daily-view" | "add-scores" | "performance-reviews"
}

const PAGE_TITLES: Record<string, string> = {
  "overview": "Overview",
  "trip-planner": "Trip Planner",
  "weekly-planner": "Weekly Planner",
  "students": "Students",
  "daily-view": "Daily View",
  "add-scores": "Add Scores",
  "performance-reviews": "Performance Reviews",
}

export function ExpeditionHeader({ expedition, isLoading = false, currentPage = "overview" }: ExpeditionHeaderProps) {
  const router = useRouter()
  
  // Get the appropriate default date based on expedition status
  const defaultDate = useMemo(() => {
    if (!expedition) return new Date().toISOString().split('T')[0]
    
    if (expedition.isActive) {
      return new Date().toISOString().split('T')[0]
    }
    
    // For non-active expeditions, use the start date
    const startDate = expedition.startDate || expedition.start_date
    if (startDate) {
      return startDate
    }
    
    return new Date().toISOString().split('T')[0]
  }, [expedition])
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    try {
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return format(date, "MMM d, yyyy")
    } catch {
      return dateStr
    }
  }

  return (
    <>
      {/* Breadcrumb - Always visible */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/expeditions" className="cursor-pointer">All Expeditions</BreadcrumbLink>
              </BreadcrumbItem>
              {expedition && (
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
              )}
              {currentPage !== "overview" && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{PAGE_TITLES[currentPage || "overview"]}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Header - Always visible without skeleton */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{expedition?.name || "Expedition"}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {expedition?.startDate && expedition?.endDate 
                  ? `${formatDate(expedition.startDate)} — ${formatDate(expedition.endDate)}`
                  : "—"
                }
              </span>
              {expedition?._schoolterms && (
                <>
                  <span className="text-gray-300">|</span>
                  <Badge variant="outline" className="bg-white">
                    {expedition._schoolterms.short_name}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Overview */}
            <Button 
              variant={currentPage === "overview" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => expedition && router.push(`/expedition/${expedition.id}`)}
              disabled={!expedition}
            >
              <Home className="h-4 w-4 mr-2" />
              Overview
            </Button>
            
            {/* 2. Trip Planner */}
            <Button 
              variant={currentPage === "trip-planner" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => expedition && router.push(`/dashboard?expedition=${expedition.id}`)}
              disabled={!expedition}
            >
              <Map className="h-4 w-4 mr-2" />
              Trip Planner
            </Button>
            
            {/* 3. Weekly Planner */}
            <Button 
              variant={currentPage === "weekly-planner" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => expedition && router.push(`/planner?expedition=${expedition.id}`)}
              disabled={!expedition}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Weekly Planner
            </Button>
            
            {/* 4. Daily View */}
            <Button 
              variant={currentPage === "daily-view" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => expedition && router.push(`/schedule/${defaultDate}?expedition=${expedition.id}`)}
              disabled={!expedition}
            >
              <Eye className="h-4 w-4 mr-2" />
              Daily View
            </Button>
            
            {/* 5. Students */}
            <Button 
              variant={currentPage === "students" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => expedition && router.push(`/students?expedition=${expedition.id}`)}
              disabled={!expedition}
            >
              <Users className="h-4 w-4 mr-2" />
              Students
            </Button>
            
            {/* 6. Add Scores */}
            <Button 
              variant={currentPage === "add-scores" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => expedition && router.push(`/evaluate/${defaultDate}?expedition=${expedition.id}`)}
              disabled={!expedition}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Scores
            </Button>
            
            {/* 7. Performance Reviews */}
            <Button 
              variant={currentPage === "performance-reviews" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => expedition && router.push(`/performance-reviews?expedition=${expedition.id}`)}
              disabled={!expedition}
            >
              <FileText className="h-4 w-4 mr-2" />
              Performance Reviews
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

