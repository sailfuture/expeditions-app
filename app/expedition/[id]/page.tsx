"use client"

import { useEffect, useMemo, use } from "react"
import { useRouter } from "next/navigation"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Calendar, 
  FileText,
  ClipboardList,
  Map,
  Award,
  ExternalLink
} from "lucide-react"
import { 
  useExpeditions, 
  useExpeditionSchedules, 
  useStudentsByExpedition, 
  useTeachersByExpedition 
} from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { calculateDistanceBetweenLocations } from "@/lib/haversine"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ExpeditionDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const expeditionId = parseInt(id)
  const router = useRouter()
  const { currentUser, isLoading: userLoading } = useCurrentUser()
  
  const { data: expeditions, isLoading: expeditionsLoading } = useExpeditions()
  const { data: schedules, isLoading: schedulesLoading } = useExpeditionSchedules()
  const { data: expeditionStudents, isLoading: studentsLoading } = useStudentsByExpedition(expeditionId)
  const { data: expeditionStaff, isLoading: staffLoading } = useTeachersByExpedition(expeditionId)

  // Find the expedition by ID from the list
  const expedition = useMemo(() => {
    if (!expeditions) return null
    return expeditions.find((e: any) => e.id === expeditionId)
  }, [expeditions, expeditionId])

  // Redirect non-admin users
  useEffect(() => {
    if (!userLoading && currentUser && currentUser.role !== "Admin") {
      router.push("/dashboard")
    }
  }, [currentUser, userLoading, router])

  // Filter schedules for this expedition
  const expeditionSchedules = useMemo(() => {
    if (!schedules) return []
    return schedules.filter((s: any) => s.expeditions_id === expeditionId)
  }, [schedules, expeditionId])

  // Calculate stats
  const stats = useMemo(() => {
    const totalDays = expeditionSchedules.length
    const anchoredDays = expeditionSchedules.filter((s: any) => !s.isOffshore && !s.isService).length
    const offshoreDays = expeditionSchedules.filter((s: any) => s.isOffshore).length
    const serviceDays = expeditionSchedules.filter((s: any) => s.isService).length
    
    // Calculate total nautical miles from schedule data
    let totalNauticalMiles = 0
    expeditionSchedules.forEach((schedule: any) => {
      if (schedule.nautical_miles) {
        totalNauticalMiles += schedule.nautical_miles
      } else if (schedule._expedition_current_location && schedule._expedition_destination) {
        const distance = calculateDistanceBetweenLocations(
          schedule._expedition_current_location,
          schedule._expedition_destination
        )
        if (distance) {
          totalNauticalMiles += distance
        }
      }
    })
    
    return {
      totalDays,
      anchoredDays,
      offshoreDays,
      serviceDays,
      totalNauticalMiles: Math.round(totalNauticalMiles * 10) / 10
    }
  }, [expeditionSchedules])



  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return format(date, "MMM d, yyyy")
    } catch {
      return dateStr
    }
  }

  // Get today's date for navigation links
  const today = new Date().toISOString().split('T')[0]

  const isLoading = userLoading || expeditionsLoading || schedulesLoading

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
                <BreadcrumbLink href="/expeditions">Expeditions</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{expedition?.name || "Loading..."}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-9 w-64 mb-2" />
                  <Skeleton className="h-5 w-48" />
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold">{expedition?.name}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground mt-2">
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button 
              variant="outline" 
              className="cursor-pointer"
              onClick={() => router.push(`/schedule/${today}`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Daily Log
            </Button>
            <Button 
              variant="outline" 
              className="cursor-pointer"
              onClick={() => router.push("/planner")}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Weekly Planner
            </Button>
            <Button 
              variant="outline" 
              className="cursor-pointer"
              onClick={() => router.push("/dashboard")}
            >
              <Map className="h-4 w-4 mr-2" />
              Trip Plan
            </Button>
            <Button 
              variant="outline" 
              className="cursor-pointer"
              onClick={() => router.push(`/evaluate/${today}`)}
            >
              <Award className="h-4 w-4 mr-2" />
              Professionalism
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats.totalDays}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Anchored
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-green-600">{stats.anchoredDays}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Offshore
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-blue-600">{stats.offshoreDays}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-red-600">{stats.serviceDays}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Nautical Miles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats.totalNauticalMiles}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Crew Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentsLoading || staffLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">
                  {(expeditionStudents?.length || 0) + (expeditionStaff?.length || 0)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Staff Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b bg-gray-50/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Staff</h2>
              <Badge variant="outline">
                {expeditionStaff?.length || 0}
              </Badge>
            </div>
          </div>
          {staffLoading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Email</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Role</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !expeditionStaff || expeditionStaff.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p>No staff assigned to this expedition</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Email</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Role</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expeditionStaff.map((member: any) => (
                  <TableRow 
                    key={member.id} 
                    className="border-b last:border-0 hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => router.push(`/staff/${member.id}?expedition=${expeditionId}`)}
                  >
                    <TableCell className="h-14 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                            {member.name?.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-900">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="h-14 px-4">
                      <span className="text-sm text-gray-600">{member.email || "—"}</span>
                    </TableCell>
                    <TableCell className="h-14 px-4">
                      <Badge variant="outline" className="bg-white border-gray-200 text-gray-700">
                        {member.role || "Staff"}
                      </Badge>
                    </TableCell>
                    <TableCell className="h-14 px-4 text-right">
                      <ExternalLink className="h-4 w-4 text-gray-400 inline-block" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Students Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Students</h2>
              <Badge variant="outline">
                {expeditionStudents?.length || 0}
              </Badge>
            </div>
          </div>
          {studentsLoading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !expeditionStudents || expeditionStudents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p>No students assigned to this expedition</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expeditionStudents.map((student: any) => (
                  <TableRow 
                    key={student.id} 
                    className="border-b last:border-0 hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => router.push(`/student/${student.id}?expedition=${expeditionId}`)}
                  >
                    <TableCell className="h-14 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                            {student.name?.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-900">{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="h-14 px-4">
                      <Badge 
                        variant="outline" 
                        className={student.isArchived 
                          ? "bg-gray-50 border-gray-200 text-gray-500" 
                          : "bg-green-50 border-green-200 text-green-700"
                        }
                      >
                        {student.isArchived ? "Archived" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="h-14 px-4 text-right">
                      <ExternalLink className="h-4 w-4 text-gray-400 inline-block" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  )
}

