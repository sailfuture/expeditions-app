"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { format } from "date-fns"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, Calendar, MapPin } from "lucide-react"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"

export default function ExpeditionsPage() {
  const router = useRouter()
  const { currentUser, isLoading: userLoading } = useCurrentUser()
  const { data: expeditions, isLoading } = useExpeditions()

  // Redirect non-admin users
  useEffect(() => {
    if (!userLoading && currentUser && currentUser.role !== "Admin") {
      router.push("/dashboard")
    }
  }, [currentUser, userLoading, router])

  // Show loading while checking auth
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-8 w-32 mx-auto mb-2" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    )
  }

  // Don't render if not admin
  if (!currentUser || currentUser.role !== "Admin") {
    return null
  }

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return format(date, "MMM d, yyyy")
    } catch {
      return dateStr
    }
  }

  const calculateDays = (startDate: string, endDate: string) => {
    try {
      const [sy, sm, sd] = startDate.split('-').map(Number)
      const [ey, em, ed] = endDate.split('-').map(Number)
      const start = new Date(sy, sm - 1, sd)
      const end = new Date(ey, em - 1, ed)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      return diffDays
    } catch {
      return 0
    }
  }

  const getStatusBadge = (startDate: string, endDate: string) => {
    const now = new Date()
    const [sy, sm, sd] = startDate.split('-').map(Number)
    const [ey, em, ed] = endDate.split('-').map(Number)
    const start = new Date(sy, sm - 1, sd)
    const end = new Date(ey, em - 1, ed)

    if (now < start) {
      return <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">Upcoming</Badge>
    } else if (now > end) {
      return <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-600">Completed</Badge>
    } else {
      return <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">Active</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Expeditions</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Expeditions</h1>
              <p className="text-muted-foreground mt-2">
                View and manage all expeditions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Dates</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Duration</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Term</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">School Year</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !expeditions || expeditions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-600">No expeditions found</p>
              <p className="text-sm text-gray-500 mt-1">Expeditions will appear here once created.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Dates</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Duration</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Term</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">School Year</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expeditions.map((expedition: any) => {
                  const days = calculateDays(expedition.startDate, expedition.endDate)
                  
                  return (
                    <TableRow key={expedition.id} className="hover:bg-gray-50/50">
                      <TableCell className="h-16 px-6">
                        <div className="font-medium text-gray-900">{expedition.name}</div>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            {formatDate(expedition.startDate)} — {formatDate(expedition.endDate)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <span className="text-sm text-gray-600">{days} days</span>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <Badge variant="outline" className="bg-white border-gray-200 text-gray-700">
                          {expedition._schoolterms?.short_name || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <span className="text-sm text-gray-600">
                          {expedition._schoolyears?.name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        {getStatusBadge(expedition.startDate, expedition.endDate)}
                      </TableCell>
                      <TableCell className="h-16 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                          onClick={() => router.push(`/expedition/${expedition.id}`)}
                        >
                          <ExternalLink className="h-4 w-4 text-gray-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  )
}

