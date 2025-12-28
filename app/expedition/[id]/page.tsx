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
  ExternalLink,
  Home,
  Users,
  Eye,
  PlusCircle
} from "lucide-react"
import { 
  useExpeditions, 
  useExpeditionSchedules, 
  useStudentsByExpedition, 
  useTeachersByExpedition,
  useEvaluationByStudent
} from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { calculateDistanceBetweenLocations } from "@/lib/haversine"
import { ExpeditionHeader } from "@/components/expedition-header"

interface PageProps {
  params: Promise<{ id: string }>
}

// Helper function to get color class based on evaluation text
function getEvaluationColorClass(evaluation: string | null | undefined) {
  if (!evaluation) return "bg-gray-50"
  if (evaluation.includes("Critical") || evaluation === "N/A") return "bg-gray-50"
  if (evaluation.includes("Needs Improvement")) return "bg-red-50"
  if (evaluation.includes("Developing")) return "bg-yellow-50"
  if (evaluation.includes("Met Expectations")) return "bg-green-50"
  if (evaluation.includes("Exceeded")) return "bg-blue-50"
  return "bg-gray-50"
}

// Helper function to get color class based on journal percentage
function getJournalColorClass(percentage: number | null | undefined) {
  if (percentage === null || percentage === undefined) return "bg-gray-50"
  if (percentage < 70) return "bg-red-50"
  if (percentage >= 90) return "bg-blue-50"
  return "bg-green-50"
}

// Component to display a single student's evaluations
function StudentEvaluationRow({ student, expeditionId }: { student: any; expeditionId: number }) {
  const router = useRouter()
  const { data: evaluation } = useEvaluationByStudent(student.id, expeditionId)
  
  const formatScore = (score: number | null | undefined) => {
    if (score === null || score === undefined) return null
    return score.toFixed(2)
  }
  
  return (
    <TableRow className="border-b last:border-0 hover:bg-gray-50/50">
      <TableCell 
        className="h-14 px-4 cursor-pointer"
        onClick={() => router.push(`/student/${student.id}?expedition=${expeditionId}`)}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
              {student.name?.split(" ").map((n: string) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-gray-900 truncate max-w-[180px]" title={student.name}>{student.name}</span>
        </div>
      </TableCell>
      <TableCell className={`h-14 px-4 text-center ${getEvaluationColorClass(evaluation?.academics_evaluation)}`}>
        {formatScore(evaluation?.academics) ? (
          <span className="text-xs font-medium text-gray-700">{formatScore(evaluation.academics)}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className={`h-14 px-4 text-center ${getEvaluationColorClass(evaluation?.citizenship_evaluation)}`}>
        {formatScore(evaluation?.citizenship) ? (
          <span className="text-xs font-medium text-gray-700">{formatScore(evaluation.citizenship)}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className={`h-14 px-4 text-center ${getEvaluationColorClass(evaluation?.job_evaluation)}`}>
        {formatScore(evaluation?.job) ? (
          <span className="text-xs font-medium text-gray-700">{formatScore(evaluation.job)}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className={`h-14 px-4 text-center ${getEvaluationColorClass(evaluation?.crew_evaluation)}`}>
        {formatScore(evaluation?.crew) ? (
          <span className="text-xs font-medium text-gray-700">{formatScore(evaluation.crew)}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className={`h-14 px-4 text-center ${getEvaluationColorClass(evaluation?.service_evaluation)}`}>
        {formatScore(evaluation?.service) ? (
          <span className="text-xs font-medium text-gray-700">{formatScore(evaluation.service)}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className={`h-14 px-4 text-center ${getJournalColorClass(evaluation?.journal)}`}>
        {evaluation?.journal !== null && evaluation?.journal !== undefined ? (
          <span className="text-xs font-medium text-gray-700">{Math.round(evaluation.journal)}%</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}

// Component to display evaluations table
function StudentEvaluationsTable({ students, expeditionId }: { students: any[]; expeditionId: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Student</TableHead>
          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Academics</TableHead>
          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Citizenship</TableHead>
          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Job Duties</TableHead>
          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Crew</TableHead>
          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Service</TableHead>
          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Journaling</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student: any) => (
          <StudentEvaluationRow key={student.id} student={student} expeditionId={expeditionId} />
        ))}
      </TableBody>
    </Table>
  )
}

export default function ExpeditionDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const expeditionId = parseInt(id)
  const router = useRouter()
  const { currentUser, isLoading: userLoading } = useCurrentUser()
  
  const { data: expeditions, isLoading: expeditionsLoading } = useExpeditions()
  const { data: schedules, isLoading: schedulesLoading } = useExpeditionSchedules(expeditionId)
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
      {/* Expedition Header with Navigation */}
      <ExpeditionHeader expedition={expedition} isLoading={expeditionsLoading} currentPage="overview" />

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Days
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              {isLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold">{stats.totalDays}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Anchored
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              {isLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold">{stats.anchoredDays}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Offshore
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              {isLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold">{stats.offshoreDays}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Service
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              {isLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold">{stats.serviceDays}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Nautical Miles
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              {isLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <p className="text-xl font-bold">{stats.totalNauticalMiles}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Students
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              {studentsLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold">
                  {expeditionStudents?.length || 0}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Student Evaluations Summary Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b bg-gray-50/50">
            <h2 className="text-lg font-semibold">Student Evaluations</h2>
          </div>
          {studentsLoading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Student</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Academics</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Citizenship</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Job Duties</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Crew</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Service</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Journaling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !expeditionStudents || expeditionStudents.filter((s: any) => !s.isArchived).length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p>No active students in this expedition</p>
            </div>
          ) : (
            <StudentEvaluationsTable 
              students={expeditionStudents.filter((s: any) => !s.isArchived)} 
              expeditionId={expeditionId} 
            />
          )}
        </div>

        {/* Staff Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50/50">
            <h2 className="text-lg font-semibold">Staff</h2>
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
      </main>
    </div>
  )
}

