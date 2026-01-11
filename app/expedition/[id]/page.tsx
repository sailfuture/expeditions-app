"use client"

import { useEffect, useMemo, use, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  PlusCircle,
  RefreshCw,
  MapPin,
  Pencil,
  Trash2,
  HelpCircle
} from "lucide-react"
import { 
  useExpeditions, 
  useExpeditionSchedules, 
  useStudentsByExpedition, 
  useTeachersByExpedition,
  useEvaluationByStudent
} from "@/lib/hooks/use-expeditions"
import { getProfessionalismByStudent, calculateStudentEvaluation, getExpeditionLocations, createExpeditionLocation, updateExpeditionLocation, deleteExpeditionLocation } from "@/lib/xano"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { calculateDistanceBetweenLocations, calculateRouteDistance } from "@/lib/haversine"
import { ExpeditionHeader } from "@/components/expedition-header"

interface PageProps {
  params: Promise<{ id: string }>
}

const TIMEZONES = [
  { value: "UTC−12", label: "UTC−12 — Baker Island" },
  { value: "UTC−11", label: "UTC−11 — Pago Pago" },
  { value: "UTC−10", label: "UTC−10 — Honolulu" },
  { value: "UTC−9", label: "UTC−9 — Anchorage" },
  { value: "UTC−8", label: "UTC−8 — Los Angeles" },
  { value: "UTC−7", label: "UTC−7 — Denver" },
  { value: "UTC−6", label: "UTC−6 — Belize City" },
  { value: "UTC−5", label: "UTC−5 — Panama City" },
  { value: "UTC−4", label: "UTC−4 — Santo Domingo" },
  { value: "UTC−3", label: "UTC−3 — San Juan" },
  { value: "UTC−2", label: "UTC−2 — South Georgia" },
  { value: "UTC−1", label: "UTC−1 — Praia" },
  { value: "UTC±0", label: "UTC±0 — London" },
  { value: "UTC+1", label: "UTC+1 — Paris" },
  { value: "UTC+2", label: "UTC+2 — Cairo" },
  { value: "UTC+3", label: "UTC+3 — Nairobi" },
  { value: "UTC+4", label: "UTC+4 — Dubai" },
  { value: "UTC+5", label: "UTC+5 — Karachi" },
  { value: "UTC+6", label: "UTC+6 — Dhaka" },
  { value: "UTC+7", label: "UTC+7 — Bangkok" },
  { value: "UTC+8", label: "UTC+8 — Singapore" },
  { value: "UTC+9", label: "UTC+9 — Tokyo" },
  { value: "UTC+10", label: "UTC+10 — Sydney" },
  { value: "UTC+11", label: "UTC+11 — Nouméa" },
  { value: "UTC+12", label: "UTC+12 — Auckland" },
]

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
  // Convert decimal to percentage if needed
  const pct = percentage <= 1 ? percentage * 100 : percentage
  if (pct < 70) return "bg-red-50"
  if (pct >= 90) return "bg-blue-50"
  return "bg-green-50"
}

// Helper function to get color class based on journaling string value
function getJournalStringColor(value: string | null | undefined) {
  if (!value) return ""
  const lowerValue = value.toLowerCase()
  if (lowerValue.includes('complete') && !lowerValue.includes('incomplete')) return "bg-green-50"
  if (lowerValue.includes('incomplete') || lowerValue.includes('late')) return "bg-yellow-50"
  if (lowerValue.includes('not started') || lowerValue.includes('missing')) return "bg-red-50"
  if (lowerValue.includes('excused')) return "bg-blue-50"
  return ""
  return "bg-green-50"
}

// Component to display a single student's evaluations
function StudentEvaluationRow({ 
  student, 
  expeditionId,
  onViewRecords 
}: { 
  student: any
  expeditionId: number
  onViewRecords: (student: any) => void
}) {
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
            <AvatarImage src={student.profileImage} alt={`${student.firstName || ""} ${student.lastName || ""}`.trim()} />
            <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
              {`${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-gray-900 truncate max-w-[180px]" title={`${student.firstName || ""} ${student.lastName || ""}`.trim()}>{`${student.firstName || ""} ${student.lastName || ""}`.trim()}</span>
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
          <span className="text-xs font-medium text-gray-700">
            {(() => {
              const pct = evaluation.journal <= 1 ? evaluation.journal * 100 : evaluation.journal
              return `${pct.toFixed(2)}%`
            })()}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className="h-14 px-4 text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onViewRecords(student)
          }}
          title="View all records"
        >
          <ExternalLink className="h-4 w-4 text-gray-500" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

// Component to display evaluations table
function StudentEvaluationsTable({ 
  students, 
  expeditionId,
  onViewRecords 
}: { 
  students: any[]
  expeditionId: number
  onViewRecords: (student: any) => void
}) {
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
          <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-right">View</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student: any) => (
          <StudentEvaluationRow 
            key={student.id} 
            student={student} 
            expeditionId={expeditionId}
            onViewRecords={onViewRecords}
          />
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
  
  // State for all evaluation records modal
  const [allRecordsModalOpen, setAllRecordsModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [isUpdatingScores, setIsUpdatingScores] = useState(false)
  
  // State for locations
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<any>(null)
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false)
  const [timezonePopoverOpen, setTimezonePopoverOpen] = useState(false)
  const [locationFormData, setLocationFormData] = useState({
    port: "",
    country: "",
    lat: 0,
    long: 0,
    timezone: ""
  })
  
  // Fetch locations
  const { data: locations, isLoading: locationsLoading } = useSWR(
    expeditionId ? `expedition_locations_${expeditionId}` : null,
    () => getExpeditionLocations(expeditionId)
  )
  
  // Fetch all professionalism records for selected student
  const { data: allEvaluationRecords, isLoading: loadingAllRecords } = useSWR(
    allRecordsModalOpen && selectedStudent ? `professionalism_records_${selectedStudent.id}_${expeditionId}` : null,
    allRecordsModalOpen && selectedStudent ? () => getProfessionalismByStudent(selectedStudent.id, expeditionId) : null
  )
  
  // Sort all records by date
  const sortedAllRecords = useMemo(() => {
    if (!allEvaluationRecords) return []
    return [...allEvaluationRecords].sort((a, b) => {
      const dateA = new Date(a._expedition_schedule?.date || a.date || '').getTime()
      const dateB = new Date(b._expedition_schedule?.date || b.date || '').getTime()
      return dateA - dateB
    })
  }, [allEvaluationRecords])
  
  // Handler to open all records modal
  const handleViewAllRecords = (student: any) => {
    setSelectedStudent(student)
    setAllRecordsModalOpen(true)
  }
  
  // Handler to update/recalculate scores for all students
  const handleUpdateScores = async () => {
    if (!expeditionStudents || expeditionStudents.length === 0) return
    
    setIsUpdatingScores(true)
    try {
      const activeStudents = expeditionStudents.filter((s: any) => !s.isArchived)
      
      // Recalculate evaluation for each student
      await Promise.all(
        activeStudents.map((student: any) => 
          calculateStudentEvaluation(student.id, expeditionId)
        )
      )
      
      // Refresh the evaluation data for each student to show updated scores
      await Promise.all(
        activeStudents.map((student: any) => 
          mutate(`evaluation_by_student_${student.id}_${expeditionId}`)
        )
      )
      
      toast.success(`Updated scores for ${activeStudents.length} students`)
    } catch (error) {
      console.error("Error updating scores:", error)
      toast.error("Failed to update scores")
    } finally {
      setIsUpdatingScores(false)
    }
  }
  
  // Helper functions for score formatting and colors
  const formatDetailDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    try {
      const [year, month, day] = dateStr.split('-').map(Number)
      return format(new Date(year, month - 1, day), 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }
  
  const formatScoreValue = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "No Score"
    return score.toString()
  }
  
  const getScoreClass = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "text-gray-400"
    return "font-medium text-gray-700"
  }
  
  // 5=blue, 3=green, 2=yellow, 1=red, 0/unexcused=red
  const getScoreRowColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return ""
    if (score === 5) return "bg-blue-50"
    if (score === 4) return "bg-blue-50"
    if (score === 3) return "bg-green-50"
    if (score === 2) return "bg-yellow-50"
    if (score === 1) return "bg-red-50"
    if (score === 0) return "bg-red-50"
    return ""
  }

  // Find the expedition by ID from the list
  const expedition = useMemo(() => {
    if (!expeditions) return null
    return expeditions.find((e: any) => e.id === expeditionId)
  }, [expeditions, expeditionId])

  const isAdmin = currentUser?.role === "Admin"

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
    
    // Calculate total nautical miles from destinations/locations
    let totalNauticalMiles = 0
    
    if (locations && locations.length >= 2) {
      try {
        // Sort locations by creation date to get the route order
        const sortedLocations = [...locations].sort((a, b) => a.created_at - b.created_at)
        
        // Calculate route distance using the new function
        const routeDistance = calculateRouteDistance(sortedLocations)
        totalNauticalMiles = routeDistance.total_nm
      } catch (error) {
        console.error('Error calculating route distance:', error)
        // Fallback to old method if route calculation fails
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
        totalNauticalMiles = Math.round(totalNauticalMiles * 10) / 10
      }
    }
    
    return {
      totalDays,
      anchoredDays,
      offshoreDays,
      serviceDays,
      totalNauticalMiles
    }
  }, [expeditionSchedules, locations])



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

  // Location handlers
  const handleAddLocation = () => {
    setEditingLocation(null)
    setLocationFormData({
      port: "",
      country: "",
      lat: 0,
      long: 0,
      timezone: ""
    })
    setLocationDialogOpen(true)
  }
  
  const handleEditLocation = (location: any) => {
    setEditingLocation(location)
    setLocationFormData({
      port: location.port || "",
      country: location.country || "",
      lat: location.lat || 0,
      long: location.long || 0,
      timezone: location.timezone || ""
    })
    setLocationDialogOpen(true)
  }
  
  const handleDeleteLocation = async (id: number) => {
    if (!confirm("Are you sure you want to delete this destination?")) return
    
    try {
      await deleteExpeditionLocation(id)
      mutate(`expedition_locations_${expeditionId}`)
      toast.success("Destination deleted successfully")
    } catch (error) {
      console.error("Error deleting destination:", error)
      toast.error("Failed to delete destination")
    }
  }
  
  const handleSubmitLocation = async () => {
    if (!locationFormData.port || !locationFormData.country) {
      toast.error("Port and country are required")
      return
    }
    
    setIsSubmittingLocation(true)
    try {
      if (editingLocation) {
        await updateExpeditionLocation(editingLocation.id, locationFormData)
        toast.success("Destination updated successfully")
      } else {
        await createExpeditionLocation({
          ...locationFormData,
          expeditions_id: expeditionId
        })
        toast.success("Destination created successfully")
      }
      mutate(`expedition_locations_${expeditionId}`)
      setLocationDialogOpen(false)
    } catch (error) {
      console.error("Error saving destination:", error)
      toast.error("Failed to save destination")
    } finally {
      setIsSubmittingLocation(false)
    }
  }

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


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Expedition Header with Navigation */}
      <ExpeditionHeader expedition={expedition} isLoading={expeditionsLoading} currentPage="overview" />

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Card className="py-4">
            <CardHeader className="px-3 py-0 pb-0 gap-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Days
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-0 pt-0">
              {isLoading ? (
                <Skeleton className="h-5 w-10" />
              ) : (
                <p className="text-lg font-bold leading-tight">{stats.totalDays}</p>
              )}
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-3 py-0 pb-0 gap-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Anchored
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-0 pt-0">
              {isLoading ? (
                <Skeleton className="h-5 w-10" />
              ) : (
                <p className="text-lg font-bold leading-tight">{stats.anchoredDays}</p>
              )}
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-3 py-0 pb-0 gap-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Offshore
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-0 pt-0">
              {isLoading ? (
                <Skeleton className="h-5 w-10" />
              ) : (
                <p className="text-lg font-bold leading-tight">{stats.offshoreDays}</p>
              )}
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-3 py-0 pb-0 gap-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Service
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-0 pt-0">
              {isLoading ? (
                <Skeleton className="h-5 w-10" />
              ) : (
                <p className="text-lg font-bold leading-tight">{stats.serviceDays}</p>
              )}
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-3 py-0 pb-0 gap-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Nautical Miles
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-0 pt-0">
              {isLoading ? (
                <Skeleton className="h-5 w-12" />
              ) : (
                <p className="text-lg font-bold leading-tight">{stats.totalNauticalMiles}</p>
              )}
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-3 py-0 pb-0 gap-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Students
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-0 pt-0">
              {studentsLoading ? (
                <Skeleton className="h-5 w-10" />
              ) : (
                <p className="text-lg font-bold leading-tight">
                  {expeditionStudents?.length || 0}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Student Evaluations Summary Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Student Evaluations</h2>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpdateScores}
                disabled={isUpdatingScores || !expeditionStudents || expeditionStudents.length === 0}
                className="cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isUpdatingScores ? 'animate-spin' : ''}`} />
                {isUpdatingScores ? 'Updating...' : 'Update Scores'}
              </Button>
            )}
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
              onViewRecords={handleViewAllRecords}
            />
          )}
        </div>

        {/* Destinations Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Destinations</h2>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddLocation}
                className="cursor-pointer"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Destination
              </Button>
            )}
          </div>
          {locationsLoading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Port</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Country</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Coordinates</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Timezone</TableHead>
                  {isAdmin && <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-16" /></TableCell>
                    {isAdmin && <TableCell className="h-14 px-4"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !locations || locations.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 font-medium">No destinations added yet</p>
              <p className="text-sm text-gray-500 mt-1">Add destinations to track ports visited during this expedition</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Port</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Country</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Coordinates</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Timezone</TableHead>
                  {isAdmin && <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location: any) => (
                  <TableRow 
                    key={location.id} 
                    className="border-b last:border-0 hover:bg-gray-50/50"
                  >
                    <TableCell className="h-14 px-4">
                      <span className="font-medium text-gray-900">{location.port}</span>
                    </TableCell>
                    <TableCell className="h-14 px-4">
                      <span className="text-sm text-gray-600">{location.country}</span>
                    </TableCell>
                    <TableCell className="h-14 px-4">
                      <span className="text-sm text-gray-600 font-mono">
                        {location.lat.toFixed(4)}, {location.long.toFixed(4)}
                      </span>
                    </TableCell>
                    <TableCell className="h-14 px-4">
                      <Badge variant="outline" className="bg-white border-gray-200 text-gray-700">
                        {location.timezone}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="h-14 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            onClick={() => handleEditLocation(location)}
                          >
                            <Pencil className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            onClick={() => handleDeleteLocation(location.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
      
      {/* All Evaluation Records Modal */}
      <Dialog open={allRecordsModalOpen} onOpenChange={setAllRecordsModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              All Evaluation Records
            </DialogTitle>
            <DialogDescription>
              {`${selectedStudent?.firstName || ""} ${selectedStudent?.lastName || ""}`.trim()} • {expedition?._schoolterms?.short_name || 'Term'} • {expedition?._schoolyears?.name || ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-hidden border rounded-lg">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gray-50 hover:bg-gray-50 sticky top-0 z-10">
                    <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 bg-gray-50 whitespace-nowrap">Date</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 bg-gray-50 text-center whitespace-nowrap">Type</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 bg-gray-50 text-center whitespace-nowrap">Citizenship</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 bg-gray-50 text-center whitespace-nowrap">Crew</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 bg-gray-50 text-center whitespace-nowrap">Academics</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 bg-gray-50 text-center whitespace-nowrap">Job</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 bg-gray-50 text-center whitespace-nowrap">Service</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 bg-gray-50 text-center whitespace-nowrap">Journal</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 bg-gray-50 text-right whitespace-nowrap">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAllRecords ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Spinner size="md" className="mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : sortedAllRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedAllRecords.map((record: any, index: number) => {
                      const recordDate = record.date || record._expedition_schedule?.date
                      return (
                        <TableRow 
                          key={`${recordDate}-${record._expedition_schedule?.id}-${index}`}
                          className="border-b hover:bg-gray-50/50"
                        >
                          <TableCell className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-700">{formatDetailDate(recordDate)}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            {(() => {
                              const schedule = record._expedition_schedule
                              if (schedule?.isService) {
                                return (
                                  <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                                    S
                                  </span>
                                )
                              } else if (schedule?.isOffshore) {
                                return (
                                  <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                                    O
                                  </span>
                                )
                              } else {
                                return (
                                  <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-green-50 text-green-700 text-xs font-bold border border-green-200">
                                    A
                                  </span>
                                )
                              }
                            })()}
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-center ${getScoreRowColor(record.citizenship)}`}>
                            <span className={`text-sm ${getScoreClass(record.citizenship)}`}>
                              {formatScoreValue(record.citizenship)}
                            </span>
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-center ${getScoreRowColor(record.crew)}`}>
                            <span className={`text-sm ${getScoreClass(record.crew)}`}>
                              {formatScoreValue(record.crew)}
                            </span>
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-center ${getScoreRowColor(record.school)}`}>
                            <span className={`text-sm ${getScoreClass(record.school)}`}>
                              {formatScoreValue(record.school)}
                            </span>
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-center ${getScoreRowColor(record.job)}`}>
                            <span className={`text-sm ${getScoreClass(record.job)}`}>
                              {formatScoreValue(record.job)}
                            </span>
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-center ${getScoreRowColor(record.service_learning)}`}>
                            <span className={`text-sm ${getScoreClass(record.service_learning)}`}>
                              {formatScoreValue(record.service_learning)}
                            </span>
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-center ${(record.journaling || record.note) ? getJournalStringColor(record.journaling || record.note) : ''}`}>
                            <span className={`text-sm ${(record.journaling || record.note) ? 'font-medium text-gray-700' : 'text-gray-400'}`}>
                              {record.journaling || record.note || 'No Score'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 cursor-pointer"
                              onClick={() => {
                                const scheduleDate = record._expedition_schedule?.date || record.date
                                if (scheduleDate) {
                                  router.push(`/evaluate/${scheduleDate}?expedition=${expeditionId}`)
                                }
                              }}
                              title="View evaluation for this date"
                            >
                              <ExternalLink className="h-4 w-4 text-gray-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {sortedAllRecords.length} records
              </span>
              <Button variant="outline" onClick={() => setAllRecordsModalOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Location Add/Edit Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="sm:max-w-[500px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Edit Destination" : "Add Destination"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation ? "Update the destination details" : "Add a new port destination to this expedition"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="port">Port *</Label>
              <Input
                id="port"
                placeholder="e.g., Shelter Bay"
                value={locationFormData.port}
                onChange={(e) => setLocationFormData({ ...locationFormData, port: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                placeholder="e.g., Panama"
                value={locationFormData.country}
                onChange={(e) => setLocationFormData({ ...locationFormData, country: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="lat">Latitude</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Use decimal format (e.g., 9.3547)</p>
                        <p className="text-xs text-gray-400">Range: -90 to 90</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="lat"
                  type="number"
                  step="0.0001"
                  placeholder="e.g., 9.3547"
                  value={locationFormData.lat}
                  onChange={(e) => setLocationFormData({ ...locationFormData, lat: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="long">Longitude</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Use decimal format (e.g., -79.9539)</p>
                        <p className="text-xs text-gray-400">Range: -180 to 180</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="long"
                  type="number"
                  step="0.0001"
                  placeholder="e.g., -79.9539"
                  value={locationFormData.long}
                  onChange={(e) => setLocationFormData({ ...locationFormData, long: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Popover open={timezonePopoverOpen} onOpenChange={setTimezonePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={timezonePopoverOpen}
                    className="w-full justify-between cursor-pointer"
                  >
                    {locationFormData.timezone
                      ? TIMEZONES.find((tz) => tz.value === locationFormData.timezone)?.label
                      : "Select timezone..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start" sideOffset={5}>
                  <Command>
                    <CommandInput placeholder="Search timezone..." />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty>No timezone found.</CommandEmpty>
                      <CommandGroup>
                        {TIMEZONES.map((tz) => (
                          <CommandItem
                            key={tz.value}
                            value={tz.label}
                            onSelect={() => {
                              setLocationFormData({ ...locationFormData, timezone: tz.value })
                              setTimezonePopoverOpen(false)
                            }}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                locationFormData.timezone === tz.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {tz.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setLocationDialogOpen(false)}
              disabled={isSubmittingLocation}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitLocation}
              disabled={isSubmittingLocation}
              className="cursor-pointer"
            >
              {isSubmittingLocation ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Saving...
                </>
              ) : (
                editingLocation ? "Update Destination" : "Add Destination"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

