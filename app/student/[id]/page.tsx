"use client"

import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import useSWR from "swr"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, Plus } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Pencil, ExternalLink, Calendar, FileText, TrendingUp, CheckCircle2, ArrowLeft, Calculator, Download, Check, ChevronsUpDown, X } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { getStudentById, updateStudent, calculateStudentEvaluation, getPerformanceReviewById, updatePerformanceReviewNotes, getProfessionalismByStudentAndDate, getEvaluationByStudentAll } from "@/lib/xano"
import { toast } from "sonner"
import { mutate } from "swr"
import { Spinner } from "@/components/ui/spinner"
import { useExpeditions, useEvaluationByStudent, useProfessionalismByStudent, useExpeditionPerformanceReviews } from "@/lib/hooks/use-expeditions"
import { generatePerformanceReviewPDF } from "@/lib/pdf-generator"
import { formatDistanceToNow } from "date-fns"
import { Eye } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

export default function StudentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const studentId = parseInt(params.id as string)
  const expeditionId = searchParams.get('expedition') ? parseInt(searchParams.get('expedition')!) : null
  
  const { data: student, isLoading } = useSWR(
    studentId ? `student_${studentId}` : null,
    () => getStudentById(studentId)
  )
  const { data: allExpeditions } = useExpeditions()
  const { data: evaluationSummary, isLoading: loadingEvaluation } = useEvaluationByStudent(
    studentId,
    expeditionId
  )
  
  // State for viewing all scores modal
  const [allScoresModalOpen, setAllScoresModalOpen] = useState(false)
  
  // State for calculating evaluation
  const [calculating, setCalculating] = useState(false)
  
  
  // Fetch all professionalism records for chart and all scores modal
  const { data: allProfessionalismRecords, isLoading: loadingAllRecords } = useProfessionalismByStudent(
    expeditionId ? studentId : null,
    expeditionId
  )
  
  // Fetch performance reviews for this expedition
  const { data: allPerformanceReviews, isLoading: loadingPerformanceReviews } = useExpeditionPerformanceReviews(expeditionId)
  
  // Filter performance reviews for this specific student
  const studentPerformanceReviews = useMemo(() => {
    if (!allPerformanceReviews) return []
    return allPerformanceReviews
      .filter((review: any) => review.students_id === studentId)
      .sort((a: any, b: any) => (a.created_at || 0) - (b.created_at || 0))
  }, [allPerformanceReviews, studentId])
  
  // Fetch all evaluation records for the chart
  const { data: allEvaluationRecords } = useSWR(
    expeditionId && studentId ? `evaluation_by_student_all_${studentId}_${expeditionId}` : null,
    expeditionId && studentId ? () => getEvaluationByStudentAll(studentId, expeditionId) : null
  )
  
  // Format relative time (abbreviated) - defined early for useMemo usage
  const formatRelativeTimeForChart = (timestamp: number | null) => {
    if (!timestamp) return "—"
    try {
      const distance = formatDistanceToNow(new Date(timestamp), { addSuffix: false })
      return distance
        .replace('about ', '')
        .replace(' minutes', 'm')
        .replace(' minute', 'm')
        .replace(' hours', 'h')
        .replace(' hour', 'h')
        .replace(' days', 'd')
        .replace(' day', 'd')
        .replace(' weeks', 'w')
        .replace(' week', 'w')
        .replace(' months', 'mo')
        .replace(' month', 'mo')
        .replace(' years', 'y')
        .replace(' year', 'y')
        .replace('less than a', '<1')
    } catch {
      return "—"
    }
  }
  
  // Transform evaluation data for the chart
  const chartData = useMemo(() => {
    if (!allEvaluationRecords || allEvaluationRecords.length === 0) return []
    return allEvaluationRecords
      .sort((a: any, b: any) => (a.created_at || 0) - (b.created_at || 0))
      .map((record: any) => {
        return {
          dateLabel: formatRelativeTimeForChart(record.created_at),
          academics: record.academics !== null ? Number(record.academics.toFixed(2)) : null,
          citizenship: record.citizenship !== null ? Number(record.citizenship.toFixed(2)) : null,
          job: record.job !== null ? Number(record.job.toFixed(2)) : null,
          crew: record.crew !== null ? Number(record.crew.toFixed(2)) : null,
          service: record.service !== null ? Number(record.service.toFixed(2)) : null,
          total: record.total !== null ? Number(record.total.toFixed(2)) : null,
        }
      })
  }, [allEvaluationRecords])
  
  // Chart configuration
  const chartConfig = {
    total: {
      label: "Total",
      color: "hsl(0, 0%, 20%)",
    },
    academics: {
      label: "Academics",
      color: "hsl(221, 83%, 53%)",
    },
    citizenship: {
      label: "Citizenship",
      color: "hsl(142, 71%, 45%)",
    },
    job: {
      label: "Job",
      color: "hsl(38, 92%, 50%)",
    },
    crew: {
      label: "Crew",
      color: "hsl(262, 83%, 58%)",
    },
    service: {
      label: "Service",
      color: "hsl(330, 81%, 60%)",
    },
  } satisfies ChartConfig
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  
  // Performance review preview modal state
  const [reviewPreviewOpen, setReviewPreviewOpen] = useState(false)
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null)
  const [editedNotes, setEditedNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  
  // Fetch selected review data for preview modal
  const { data: selectedReview, isLoading: loadingSelectedReview } = useSWR(
    reviewPreviewOpen && selectedReviewId ? `performance_review_${selectedReviewId}` : null,
    reviewPreviewOpen && selectedReviewId ? () => getPerformanceReviewById(selectedReviewId) : null,
    {
      onSuccess: (data) => {
        if (data && data.notes !== undefined) {
          setEditedNotes(data.notes || "")
        }
      }
    }
  )
  
  // Fetch daily scores for preview modal
  const { data: reviewDailyScores, isLoading: loadingReviewDailyScores } = useSWR(
    reviewPreviewOpen && selectedReview?.students_id && selectedReview?.expeditions_id && selectedReview?.startDate && selectedReview?.endDate
      ? `daily_scores_${selectedReview.students_id}_${selectedReview.expeditions_id}_${selectedReview.startDate}_${selectedReview.endDate}`
      : null,
    reviewPreviewOpen && selectedReview?.students_id && selectedReview?.expeditions_id && selectedReview?.startDate && selectedReview?.endDate
      ? () => getProfessionalismByStudentAndDate(
          selectedReview.students_id,
          selectedReview.expeditions_id,
          selectedReview.startDate,
          selectedReview.endDate
        )
      : null
  )
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    expeditions_id: [] as number[],
    isArchived: false,
  })
  
  useEffect(() => {
    if (student) {
      // Extract expedition IDs from the full expedition objects or plain IDs
      const expeditionIds = Array.isArray(student.expeditions_id)
        ? student.expeditions_id.map((e: any) => typeof e === 'object' ? e.id : e).filter(Boolean)
        : []
      
      setFormData({
        firstName: student.firstName || "",
        lastName: student.lastName || "",
        grade: student.grade || "",
        expeditions_id: expeditionIds,
        isArchived: student.isArchived || false,
      })
    }
  }, [student])
  
  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName) {
      toast.error("Student first name and last name are required")
      return
    }
    
    setIsSubmitting(true)
    try {
      await updateStudent(studentId, {
        students_id: studentId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        grade: formData.grade,
        expeditions_id: formData.expeditions_id,
        isArchived: formData.isArchived,
      })
      mutate(`student_${studentId}`)
      mutate("students")
      toast.success("Student updated successfully")
      setDialogOpen(false)
    } catch (error) {
      console.error("Failed to update student:", error)
      toast.error("Failed to update student")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleUnlinkIntake = async () => {
    setUnlinking(true)
    try {
      await updateStudent(studentId, {
        students_id: studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        grade: student.grade,
        expeditions_id: formData.expeditions_id,
        isArchived: student.isArchived,
        expeditions_student_information_id: 0,
      })
      mutate(`student_${studentId}`)
      mutate("students")
      toast.success("Intake information unlinked")
      setUnlinkConfirmOpen(false)
    } catch (error) {
      toast.error("Failed to unlink intake information")
    } finally {
      setUnlinking(false)
    }
  }
  
  const formatDate = (dateString: string) => {
    if (!dateString) return "—"
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
  
  const formatHeaderDate = (dateStr: string) => {
    if (!dateStr) return ""
    try {
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return format(date, "MMM d, yyyy")
    } catch {
      return dateStr
    }
  }
  
  // Get evaluation summary from API
  const evaluationData = useMemo(() => {
    if (!evaluationSummary) return null
    // API now returns a single object, not an array
    return evaluationSummary
  }, [evaluationSummary])
  
  
  // Handler to calculate student evaluation
  const handleCalculateEvaluation = async () => {
    if (!studentId || !expeditionId) return
    
    setCalculating(true)
    try {
      await calculateStudentEvaluation(studentId, expeditionId)
      toast.success("Evaluation calculated successfully")
      // Refresh the evaluation data
      mutate(`evaluation_by_student_${studentId}_${expeditionId}`)
    } catch (error) {
      console.error("Error calculating evaluation:", error)
      toast.error("Failed to calculate evaluation")
    } finally {
      setCalculating(false)
    }
  }
  
  // Format score for display
  const formatScore = (score: number | null | undefined) => {
    if (score === null || score === undefined || score === 0) return null
    return score.toFixed(2)
  }
  
  // Get evaluation grade based on score (3+ is satisfactory)
  const getEvaluationGradeFromScore = (score: number | null | undefined) => {
    if (score === null || score === undefined || score === 0) return null
    if (score >= 4.5) return "Exemplary"
    if (score >= 3.5) return "Proficient"
    if (score >= 3) return "Developing"
    return "Needs Improvement"
  }
  
  // Get color class based on evaluation text
  const getEvaluationColorClass = (evaluation: string | null | undefined) => {
    if (!evaluation) return "bg-gray-50"
    if (evaluation.includes("Critical") || evaluation === "N/A") return "bg-gray-50"
    if (evaluation.includes("Needs Improvement")) return "bg-red-50"
    if (evaluation.includes("Developing")) return "bg-yellow-50"
    if (evaluation.includes("Met Expectations")) return "bg-green-50"
    if (evaluation.includes("Exceeded")) return "bg-blue-50"
    return "bg-gray-50"
  }
  
  
  // Sort all professionalism records by date
  const sortedAllRecords = useMemo(() => {
    if (!allProfessionalismRecords) return []
    return allProfessionalismRecords
      .filter((r: any) => r._students?.id === studentId) // Only show records for this student
      .sort((a: any, b: any) => {
        const dateA = a.date || a._expedition_schedule?.date || ''
        const dateB = b.date || b._expedition_schedule?.date || ''
        return new Date(dateA).getTime() - new Date(dateB).getTime()
      })
  }, [allProfessionalismRecords, studentId])
  
  // Format score value with special handling for null, 0, and isUsed
  const formatScoreValue = (value: number | null | undefined, isUsed: boolean) => {
    if (isUsed) return "N/A"
    if (value === null || value === undefined) return "No Score"
    if (value === 0) return "Unexcused"
    return value.toString()
  }
  
  // Get CSS class for score value
  const getScoreClass = (value: number | null | undefined, isUsed: boolean) => {
    if (isUsed) return "text-gray-700"
    if (value === null || value === undefined) return "text-gray-700"
    if (value === 0) return "text-gray-700"
    return "text-gray-700"
  }
  
  // Get row background color based on score value
  // 5=blue, 3=green, 2=yellow, 1=red, 0/unexcused=red
  const getScoreRowColor = (value: number | null | undefined, isUsed: boolean) => {
    if (isUsed) return "bg-red-50" // Unexcused
    if (value === null || value === undefined) return ""
    if (value === 5) return "bg-blue-50"
    if (value === 4) return "bg-blue-50"
    if (value === 3) return "bg-green-50"
    if (value === 2) return "bg-yellow-50"
    if (value === 1) return "bg-red-50"
    if (value === 0) return "bg-red-50"
    return ""
  }
  
  // Get the expedition name if an expedition is specified
  const currentExpedition = useMemo(() => {
    if (!expeditionId || !allExpeditions) return null
    return allExpeditions.find((e: any) => e.id === expeditionId)
  }, [expeditionId, allExpeditions])
  
  // Get evaluation grade based on percentage (kept for backwards compatibility)
  const getEvaluationGrade = (percentage: number) => {
    if (percentage >= 90) return "Exemplary"
    if (percentage >= 75) return "Proficient"
    if (percentage >= 60) return "Developing"
    return "Needs Improvement"
  }
  
  // Format date for detailed scores modal
  const formatDetailDate = (dateStr: string) => {
    if (!dateStr) return "—"
    try {
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return format(date, "MMM d, yyyy")
    } catch {
      return dateStr
    }
  }
  
  // Format relative time (abbreviated)
  const formatRelativeTime = (timestamp: number | null) => {
    if (!timestamp) return "—"
    try {
      const distance = formatDistanceToNow(new Date(timestamp), { addSuffix: false })
      return distance
        .replace('about ', '')
        .replace(' minutes', 'm')
        .replace(' minute', 'm')
        .replace(' hours', 'h')
        .replace(' hour', 'h')
        .replace(' days', 'd')
        .replace(' day', 'd')
        .replace(' weeks', 'w')
        .replace(' week', 'w')
        .replace(' months', 'mo')
        .replace(' month', 'mo')
        .replace(' years', 'y')
        .replace(' year', 'y')
        .replace('less than a', '<1')
    } catch {
      return "—"
    }
  }
  
  // Format date short for daily scores
  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return "—"
    try {
      const [year, month, day] = dateStr.split('-').map(Number)
      return format(new Date(year, month - 1, day), 'EEE, MMM d')
    } catch {
      return dateStr
    }
  }
  
  // Color coding for performance review scores
  const getReviewScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return ""
    if (score >= 3.21) return "bg-blue-50"
    if (score >= 2.751) return "bg-green-50"
    if (score >= 2.251) return "bg-yellow-50"
    if (score >= 1.1) return "bg-red-50"
    return "bg-gray-50"
  }
  
  const getJournalColor = (percentage: number | null | undefined) => {
    if (percentage === null || percentage === undefined) return ""
    // Convert decimal to percentage for comparison if needed
    const pct = percentage <= 1 ? percentage * 100 : percentage
    if (pct < 70) return "bg-red-50"
    if (pct >= 90) return "bg-blue-50"
    return "bg-green-50"
  }
  
  // Format journal percentage - API returns decimal (0-1), convert to percentage
  const formatJournalPercent = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '—'
    // If value is <= 1, it's a decimal that needs to be converted to percentage
    const pct = value <= 1 ? value * 100 : value
    return `${pct.toFixed(2)}%`
  }
  
  // Get journal color class based on raw value from API
  const getJournalColorClass = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return ''
    const pct = value <= 1 ? value * 100 : value
    if (pct >= 90) return 'bg-blue-50'
    if (pct >= 70) return 'bg-green-50'
    return 'bg-red-50'
  }
  
  // Get journal color class based on string value (Completed, Incomplete, etc.)
  const getJournalStringColor = (value: string | null | undefined): string => {
    if (!value) return ''
    const lowerValue = value.toLowerCase()
    if (lowerValue.includes('complete') && !lowerValue.includes('incomplete')) return 'bg-green-50'
    if (lowerValue.includes('incomplete') || lowerValue.includes('late')) return 'bg-yellow-50'
    if (lowerValue.includes('not started') || lowerValue.includes('missing')) return 'bg-red-50'
    if (lowerValue.includes('excused')) return 'bg-blue-50'
    return ''
  }
  
  // Handler to open performance review preview
  const handlePreviewReview = (reviewId: number, currentNotes: string) => {
    setSelectedReviewId(reviewId)
    setEditedNotes(currentNotes || "")
    setReviewPreviewOpen(true)
  }
  
  // Handler to save notes
  const handleSaveReviewNotes = async () => {
    if (!selectedReviewId) return
    
    setSavingNotes(true)
    try {
      await updatePerformanceReviewNotes(selectedReviewId, editedNotes)
      toast.success("Notes saved successfully")
      mutate(`expedition_performance_reviews_${expeditionId}`)
      mutate(`performance_review_${selectedReviewId}`)
      setReviewPreviewOpen(false)
    } catch (error) {
      console.error("Error saving notes:", error)
      toast.error("Failed to save notes")
    } finally {
      setSavingNotes(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-3">
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    )
  }
  
  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-600">Student not found</p>
          <Button onClick={() => router.back()} className="mt-4 cursor-pointer">
            Go Back
          </Button>
        </div>
      </div>
    )
  }
  
  const intakeInfo = student._expeditions_student_information
  
  // Get expedition assignments - API returns full expedition objects in expeditions_id
  const assignedExpeditions = Array.isArray(student.expeditions_id)
    ? student.expeditions_id.filter((e: any) => typeof e === 'object' && e.id)
    : []
  
  return (
    <div className="min-h-screen bg-gray-50">
      {currentExpedition ? (
        /* Expedition-specific view with consistent header */
        <>
          {/* Breadcrumb */}
          <div className="bg-white border-b">
            <div className="container mx-auto px-4 py-3">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/expeditions" className="cursor-pointer">All Expeditions</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/expedition/${currentExpedition.id}`} className="cursor-pointer">
                      {currentExpedition.name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/students?expedition=${currentExpedition.id}`} className="cursor-pointer">
                      Students
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{`${student.firstName || ""} ${student.lastName || ""}`.trim()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Header - matching expedition header style */}
          <div className="border-b bg-white">
            <div className="container mx-auto px-4 py-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{currentExpedition.name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {currentExpedition.startDate && currentExpedition.endDate 
                      ? `${formatHeaderDate(currentExpedition.startDate)} — ${formatHeaderDate(currentExpedition.endDate)}`
                      : "—"
                    }
                  </span>
                  {currentExpedition._schoolterms && (
                    <>
                      <span className="text-gray-300">|</span>
                      <Badge variant="outline" className="bg-white">
                        {currentExpedition._schoolterms.short_name}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Student Info Bar */}
          <div className="border-b bg-muted/30">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={student.profileImage} alt={`${student.firstName || ""} ${student.lastName || ""}`.trim()} />
                    <AvatarFallback className="text-sm bg-gray-200 text-gray-600">
                      {`${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}` || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{`${student.firstName || ""} ${student.lastName || ""}`.trim()}</span>
                    {student.grade && (
                      <Badge variant="outline" className="bg-white">{student.grade}</Badge>
                    )}
                    {student.isArchived && (
                      <Badge variant="outline" className="bg-gray-100 text-gray-600">Archived</Badge>
                    )}
                  </div>
                  {student.department && (
                    <>
                      <div className="h-6 w-px bg-border" />
                      <span className="text-sm text-muted-foreground">{student.department}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Admin view without expedition context */
        <>
          {/* Breadcrumb */}
          <div className="bg-white border-b">
            <div className="container mx-auto px-4 py-3">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/students" className="cursor-pointer">Student Records</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{`${student.firstName || ""} ${student.lastName || ""}`.trim()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Header */}
          <div className="border-b bg-white">
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={student.profileImage} alt={`${student.firstName || ""} ${student.lastName || ""}`.trim()} />
                    <AvatarFallback className="text-lg bg-gray-200 text-gray-600">
                      {`${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}` || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-3xl font-bold">{`${student.firstName || ""} ${student.lastName || ""}`.trim()}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      {student.grade && (
                        <Badge variant="outline">{student.grade}</Badge>
                      )}
                      {student.isArchived && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">Archived</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button onClick={() => setDialogOpen(true)} className="cursor-pointer">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Student
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Evaluation Metrics Table - Only show when expedition ID is present */}
        {expeditionId && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Student Evaluations</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {evaluationData ? `Overall Average: ${formatScore(evaluationData.total) || 'N/A'}` : 'No evaluations yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => setAllScoresModalOpen(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View All Scores
                  </Button>
                  <Button
                    size="sm"
                    className="cursor-pointer bg-gray-900 hover:bg-gray-800 text-white"
                    onClick={handleCalculateEvaluation}
                    disabled={calculating}
                  >
                    {calculating ? (
                      <Spinner className="h-4 w-4 mr-2" />
                    ) : (
                      <Calculator className="h-4 w-4 mr-2" />
                    )}
                    {calculating ? "Calculating..." : "Calculate Scores"}
                  </Button>
                </div>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[35%]">Requirement</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Average Score</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Evaluation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Citizenship */}
                <TableRow className="border-b hover:bg-gray-50/50">
                  <TableCell className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Citizenship</p>
                      <p className="text-sm text-gray-500 truncate max-w-[400px]" title="Demonstrates respect, responsibility, and positive contributions to the onboard community, including attitude, teamwork, and conduct during the expedition.">
                        Demonstrates respect, responsibility, and positive contributions to the onboard community
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {formatScore(evaluationData?.citizenship) ? (
                      <span className="text-sm font-medium text-gray-700">{formatScore(evaluationData?.citizenship)}</span>
                    ) : (
                      <span className="text-sm font-medium text-gray-700">No record</span>
                    )}
                  </TableCell>
                  <TableCell className={`px-6 py-4 ${getEvaluationColorClass(evaluationData?.citizenship_evaluation)}`}>
                    {evaluationData?.citizenship_evaluation ? (
                      <span className="text-sm font-medium text-gray-700">{evaluationData.citizenship_evaluation}</span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                  </TableRow>

                {/* Crew */}
                <TableRow className="border-b hover:bg-gray-50/50">
                  <TableCell className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Crew Responsibilities</p>
                      <p className="text-sm text-gray-500 truncate max-w-[400px]" title="Performs assigned job duties essential to the operation and maintenance of the vessel, including reliability, follow-through, and teamwork.">
                        Performs assigned job duties essential to vessel operation and maintenance
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {formatScore(evaluationData?.crew) ? (
                      <span className="text-sm font-medium text-gray-700">{formatScore(evaluationData?.crew)}</span>
                    ) : (
                      <span className="text-sm font-medium text-gray-700">No record</span>
                    )}
                  </TableCell>
                  <TableCell className={`px-6 py-4 ${getEvaluationColorClass(evaluationData?.crew_evaluation)}`}>
                    {evaluationData?.crew_evaluation ? (
                      <span className="text-sm font-medium text-gray-700">{evaluationData.crew_evaluation}</span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                  </TableRow>

                {/* Service Learning */}
                <TableRow className="border-b hover:bg-gray-50/50">
                  <TableCell className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Service Learning</p>
                      <p className="text-sm text-gray-500 truncate max-w-[400px]" title="Engages meaningfully in service projects or activities that support community, cultural, or environmental needs encountered during the expedition.">
                        Engages meaningfully in service projects supporting community needs
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {formatScore(evaluationData?.service) ? (
                      <span className="text-sm font-medium text-gray-700">{formatScore(evaluationData?.service)}</span>
                    ) : (
                      <span className="text-sm font-medium text-gray-700">No record</span>
                    )}
                  </TableCell>
                  <TableCell className={`px-6 py-4 ${getEvaluationColorClass(evaluationData?.service_evaluation)}`}>
                    {evaluationData?.service_evaluation ? (
                      <span className="text-sm font-medium text-gray-700">{evaluationData.service_evaluation}</span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                  </TableRow>

                {/* Academics */}
                <TableRow className="border-b hover:bg-gray-50/50">
                  <TableCell className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Academics</p>
                      <p className="text-sm text-gray-500 truncate max-w-[400px]" title="Shows understanding and application of sailing-related knowledge, including navigation, weather, maritime safety, and sailing techniques.">
                        Shows understanding and application of sailing-related knowledge
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {formatScore(evaluationData?.academics) ? (
                      <span className="text-sm font-medium text-gray-700">{formatScore(evaluationData?.academics)}</span>
                    ) : (
                      <span className="text-sm font-medium text-gray-700">No record</span>
                    )}
                  </TableCell>
                  <TableCell className={`px-6 py-4 ${getEvaluationColorClass(evaluationData?.academics_evaluation)}`}>
                    {evaluationData?.academics_evaluation ? (
                      <span className="text-sm font-medium text-gray-700">{evaluationData.academics_evaluation}</span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                  </TableRow>

                {/* Job Duties */}
                <TableRow className="border-b last:border-0 hover:bg-gray-50/50">
                  <TableCell className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Job Duties</p>
                      <p className="text-sm text-gray-500 truncate max-w-[400px]" title="Reliably completes assigned tasks essential to the operation and maintenance of the vessel, including cleaning, upkeep, and daily responsibilities.">
                        Reliably completes assigned tasks essential to vessel operation
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {formatScore(evaluationData?.job) ? (
                      <span className="text-sm font-medium text-gray-700">{formatScore(evaluationData?.job)}</span>
                    ) : (
                      <span className="text-sm font-medium text-gray-700">No record</span>
                    )}
                  </TableCell>
                  <TableCell className={`px-6 py-4 ${getEvaluationColorClass(evaluationData?.job_evaluation)}`}>
                    {evaluationData?.job_evaluation ? (
                      <span className="text-sm font-medium text-gray-700">{evaluationData.job_evaluation}</span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                  </TableRow>

                {/* Journaling */}
                <TableRow className="border-b hover:bg-gray-50/50">
                  <TableCell className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Journaling</p>
                      <p className="text-sm text-gray-500 truncate max-w-[400px]" title="Consistently records daily experiences, learning, and reflections during the expedition.">
                        Consistently records daily experiences, learning, and reflections
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {evaluationData?.journal !== null && evaluationData?.journal !== undefined ? (
                      <span className="text-sm font-medium text-gray-700">{formatJournalPercent(evaluationData.journal)}</span>
                    ) : (
                      <span className="text-sm font-medium text-gray-700">No record</span>
                    )}
                  </TableCell>
                  <TableCell className={`px-6 py-4 ${getJournalColorClass(evaluationData?.journal) || 'bg-gray-50'}`}>
                    {evaluationData?.journal !== null && evaluationData?.journal !== undefined ? (
                      <span className="text-sm font-medium text-gray-700">
                        {(() => {
                          const pct = evaluationData.journal <= 1 ? evaluationData.journal * 100 : evaluationData.journal
                          return pct < 70 ? 'Unsatisfactory' : pct >= 90 ? 'Strong' : 'Satisfactory'
                        })()}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Score Trends Chart - Only show when expedition ID is present and we have data */}
        {expeditionId && chartData.length > 0 && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Evaluation Trends</CardTitle>
              <CardDescription>
                Average scores across evaluations
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart
                  accessibilityLayer
                  data={chartData}
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    domain={[0, 5]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent 
                        formatter={(value, name, item, index, payload) => {
                          const itemConfig = chartConfig[name as keyof typeof chartConfig]
                          const indicatorColor = item.color
                          const displayValue = value === null || value === undefined ? "n/a" : value.toLocaleString()
                          return (
                            <div className="flex w-full items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                style={{ backgroundColor: indicatorColor }}
                              />
                              <div className="flex flex-1 justify-between items-center leading-none">
                                <span className="text-muted-foreground">
                                  {itemConfig?.label || name}
                                </span>
                                <span className={`font-mono font-medium tabular-nums ${value === null || value === undefined ? "text-muted-foreground" : "text-foreground"}`}>
                                  {displayValue}
                                </span>
                              </div>
                            </div>
                          )
                        }}
                      />
                    }
                  />
                  <Line
                    dataKey="total"
                    type="natural"
                    stroke="var(--color-total)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    dataKey="academics"
                    type="natural"
                    stroke="var(--color-academics)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="citizenship"
                    type="natural"
                    stroke="var(--color-citizenship)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="job"
                    type="natural"
                    stroke="var(--color-job)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="crew"
                    type="natural"
                    stroke="var(--color-crew)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="service"
                    type="natural"
                    stroke="var(--color-service)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(0, 0%, 20%)' }} />
                  <span className="text-muted-foreground font-medium">Total</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(221, 83%, 53%)' }} />
                  <span className="text-muted-foreground">Academics</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
                  <span className="text-muted-foreground">Citizenship</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(38, 92%, 50%)' }} />
                  <span className="text-muted-foreground">Job</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(262, 83%, 58%)' }} />
                  <span className="text-muted-foreground">Crew</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(330, 81%, 60%)' }} />
                  <span className="text-muted-foreground">Service</span>
                </div>
              </div>
              <div className="text-muted-foreground leading-none">
                Showing {chartData.length} evaluation{chartData.length !== 1 ? 's' : ''} over time
              </div>
            </CardFooter>
          </Card>
        )}

        {/* Performance Reviews - Only show when expedition ID is present */}
        {expeditionId && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Performance Reviews</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {studentPerformanceReviews.length} {studentPerformanceReviews.length === 1 ? 'review' : 'reviews'} for this student
                  </p>
                </div>
              </div>
            </div>
            {loadingPerformanceReviews ? (
              <div className="p-8 flex justify-center">
                <Spinner size="md" />
              </div>
            ) : studentPerformanceReviews.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm">No performance reviews yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                    <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 w-16">Created</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Report Name</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Start Date</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">End Date</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentPerformanceReviews.map((review: any) => (
                    <TableRow 
                      key={review.id}
                      className="border-b last:border-0 hover:bg-gray-50/50"
                    >
                      <TableCell className="h-14 px-4">
                        <span className="text-xs text-gray-500">{formatRelativeTime(review.created_at)}</span>
                      </TableCell>
                      <TableCell className="h-14 px-6">
                        {review.report_name ? (
                          <span className="text-sm font-medium text-gray-700">{review.report_name}</span>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Untitled</span>
                        )}
                      </TableCell>
                      <TableCell className="h-14 px-6">
                        <span className="text-sm text-gray-600">{formatDate(review.startDate)}</span>
                      </TableCell>
                      <TableCell className="h-14 px-6">
                        <span className="text-sm text-gray-600">{formatDate(review.endDate)}</span>
                      </TableCell>
                      <TableCell className="h-14 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="cursor-pointer h-9 w-9"
                            onClick={() => handlePreviewReview(review.id, review.notes)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="cursor-pointer h-9 w-9"
                            onClick={async () => {
                              try {
                                await generatePerformanceReviewPDF(review.id)
                                toast.success("PDF downloaded successfully")
                              } catch (error) {
                                console.error("Error generating PDF:", error)
                                toast.error("Failed to generate PDF")
                              }
                            }}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Intake Information - Only show when expedition ID is present and data exists */}
        {expeditionId && intakeInfo && (
          <Collapsible className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <CollapsibleTrigger className="w-full px-6 py-4 border-b bg-gray-50/30 hover:bg-gray-50/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ChevronDown className="h-5 w-5 text-gray-500 transition-transform" />
                  <h2 className="text-lg font-semibold text-left">Intake Information</h2>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-6">
                {/* Basic Info */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                      <dd className="mt-1 text-sm text-gray-900">{intakeInfo.date_of_birth ? formatDate(intakeInfo.date_of_birth) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Shirt Size</dt>
                      <dd className="mt-1 text-sm text-gray-900">{intakeInfo.student_shirt_size || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Swimming Level</dt>
                      <dd className="mt-1 text-sm text-gray-900">{intakeInfo.swimming_level || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Passport Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{intakeInfo.passport_number || "—"}</dd>
                    </div>
                  </dl>
                </div>

                <hr className="my-6 border-gray-200" />

                {/* Medical Information */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Medical Information</h3>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Health Conditions</dt>
                      <dd className="mt-1 text-sm text-gray-900">{intakeInfo.health_conditions || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Medical History</dt>
                      <dd className="mt-1 text-sm text-gray-900">{intakeInfo.medical_history || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Allergies</dt>
                      <dd className="mt-1 text-sm text-gray-900">{intakeInfo.allergies || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Dietary Restrictions</dt>
                      <dd className="mt-1 text-sm text-gray-900">{intakeInfo.dietary_restrictions || "—"}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Admin view sections - Only show when no expedition ID */}
        {!expeditionId && (
          <>
            {/* Expedition Assignments */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50/30">
                <h2 className="text-lg font-semibold">Expedition Assignments</h2>
              </div>
          {assignedExpeditions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No expedition assignments</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Expedition Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Dates</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Term</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedExpeditions.map((expedition: any) => {
                  return (
                    <TableRow 
                      key={expedition.id} 
                      className="hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => router.push(`/expedition/${expedition.id}`)}
                    >
                      <TableCell className="h-14 px-6">
                        <span className="font-medium text-gray-900">{expedition.name}</span>
                      </TableCell>
                      <TableCell className="h-14 px-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(expedition.startDate)} — {formatDate(expedition.endDate)}
                        </div>
                      </TableCell>
                      <TableCell className="h-14 px-6">
                        <Badge variant="outline" className="bg-white border-gray-200 text-gray-700">
                          {expedition._schoolterms?.short_name || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="h-14 px-6">
                        <Badge 
                          variant="outline" 
                          className={
                            expedition.isActive ? "bg-green-50 border-green-200 text-green-700" :
                            "bg-gray-50 border-gray-200 text-gray-600"
                          }
                        >
                          {expedition.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="h-14 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/expedition/${expedition.id}`)
                          }}
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

            {/* Student Information */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50/30">
                <h2 className="text-lg font-semibold">Student Information</h2>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{`${student.firstName || ""} ${student.lastName || ""}`.trim() || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Grade</dt>
                    <dd className="mt-1 text-sm text-gray-900">{student.grade || "—"}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Intake Information */}
            {intakeInfo && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50/30 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Intake Information</h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer h-7 text-xs"
                      onClick={() => router.push(`/intake-records`)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer h-7 text-xs"
                      onClick={() => setUnlinkConfirmOpen(true)}
                    >
                      Remove Link
                    </Button>
                  </div>
                </div>
            <div className="p-6">
              {/* Basic Info */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.date_of_birth ? formatDate(intakeInfo.date_of_birth) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Shirt Size</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.student_shirt_size || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Swimming Level</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.swimming_level || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Passport Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.passport_number || "—"}</dd>
                  </div>
                </dl>
              </div>

              <hr className="my-6 border-gray-200" />

              {/* Medical Information - Two Column */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Medical Information</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Health Conditions</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.health_conditions || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Medical History</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.medical_history || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Allergies</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.allergies || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Dietary Restrictions</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.dietary_restrictions || "—"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Other Medical Information</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.other_medical_info || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Treatment Goals</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.treatment_goals || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Additional Accommodations</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.additional_accommodations || "—"}</dd>
                  </div>
                </dl>
              </div>

              <hr className="my-6 border-gray-200" />

              {/* Medications - Two Column */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Medications</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Morning Medication</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {intakeInfo.takes_morning_medication ? (
                        <div>
                          <Badge className="bg-green-600 text-white mb-1">Yes</Badge>
                          {intakeInfo.morning_medication_details && (
                            <p className="mt-1 text-gray-700">{intakeInfo.morning_medication_details}</p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Evening Medication</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {intakeInfo.takes_evening_medication ? (
                        <div>
                          <Badge className="bg-green-600 text-white mb-1">Yes</Badge>
                          {intakeInfo.evening_medication_details && (
                            <p className="mt-1 text-gray-700">{intakeInfo.evening_medication_details}</p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Other Medications</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {intakeInfo.takes_additional_medications ? (
                        <div>
                          <Badge className="bg-green-600 text-white mb-1">Yes</Badge>
                          {intakeInfo.other_medications_details && (
                            <p className="mt-1 text-gray-700">{intakeInfo.other_medications_details}</p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <hr className="my-6 border-gray-200" />

              {/* Behavioral Information - Two Column */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Behavioral Information</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Behavioral or Emotional Conditions</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.behavioral_emotional_conditions || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Behavior Management Strategies</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.behavior_management_strategies || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Known Fears or Anxieties</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.fears_or_anxieties || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Separation Concerns</dt>
                    <dd className="mt-1 text-sm text-gray-900">{intakeInfo.separation_concerns || "—"}</dd>
                  </div>
                </dl>
              </div>

              <hr className="my-6 border-gray-200" />

              {/* Contact Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contacts</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Primary Contact</h4>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-xs text-gray-500">Name</dt>
                        <dd className="text-sm text-gray-900">{intakeInfo.primary_contact_name || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Phone</dt>
                        <dd className="text-sm text-gray-900">{intakeInfo.primary_contact_phone || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Email</dt>
                        <dd className="text-sm text-gray-900">{intakeInfo.primary_contact_email || "—"}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Emergency Contact</h4>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-xs text-gray-500">Name</dt>
                        <dd className="text-sm text-gray-900">{intakeInfo.emergency_contact_name || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Relationship</dt>
                        <dd className="text-sm text-gray-900">{intakeInfo.emergency_contact_relationship || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Phone</dt>
                        <dd className="text-sm text-gray-900">{intakeInfo.emergency_contact_phone || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Email</dt>
                        <dd className="text-sm text-gray-900">{intakeInfo.emergency_contact_email || "—"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

            {!intakeInfo && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="font-medium">No intake information linked</p>
                <p className="text-sm mt-1">Link an intake form submission from the Intake Records page.</p>
                <Button 
                  onClick={() => router.push("/intake-records")} 
                  variant="outline" 
                  className="mt-4 cursor-pointer"
                >
                  Go to Intake Records
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Unlink Intake Confirmation Modal */}
      <AlertDialog open={unlinkConfirmOpen} onOpenChange={setUnlinkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Intake Information Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the intake information link? This won't delete the intake record, only unlink it from this student.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinking}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUnlinkIntake}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={unlinking}
            >
              {unlinking ? <Spinner size="sm" className="mr-2" /> : null}
              Remove Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information and expedition assignments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="First name"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Last name"
                  className="mt-1.5"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="grade">Grade</Label>
              <Input
                id="grade"
                value={formData.grade}
                onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                placeholder="e.g. 10th"
                className="mt-1.5"
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="archived">Archive Student</Label>
                <p className="text-xs text-gray-500">Archived students won't appear in active lists</p>
              </div>
              <Switch
                id="archived"
                checked={formData.isArchived}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isArchived: checked }))}
              />
            </div>
            
            <div>
              <Label htmlFor="expeditions">Expedition Assignments</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between mt-1.5 h-auto min-h-[2.5rem] py-2 px-3"
                  >
                    <div className="flex flex-wrap gap-1 flex-1">
                      {formData.expeditions_id.length === 0 ? (
                        <span className="text-muted-foreground text-sm">Select expeditions...</span>
                      ) : (
                        formData.expeditions_id.map((expId) => {
                          const expedition = allExpeditions?.find((e: any) => e.id === expId)
                          if (!expedition) return null
                          return (
                            <Badge
                              key={expId}
                              variant="secondary"
                              className="gap-1 pr-0.5 hover:bg-secondary"
                            >
                              <span className="text-xs">{expedition.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setFormData(prev => ({
                                    ...prev,
                                    expeditions_id: prev.expeditions_id.filter(id => id !== expId)
                                  }))
                                }}
                                className="ml-1 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )
                        })
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search expeditions..." />
                    <CommandList>
                      <CommandEmpty>No expeditions found.</CommandEmpty>
                      <CommandGroup>
                        {allExpeditions?.map((expedition: any) => {
                          const isSelected = formData.expeditions_id.includes(expedition.id)
                          const termInfo = expedition._schoolterms?.short_name || ''
                          const yearInfo = expedition._schoolyears?.name || ''
                          const dateRange = expedition.startDate && expedition.endDate 
                            ? `${format(new Date(expedition.startDate), 'MMM d')} - ${format(new Date(expedition.endDate), 'MMM d, yyyy')}`
                            : ''
                          
                          return (
                            <CommandItem
                              key={expedition.id}
                              value={`${expedition.name} ${termInfo} ${yearInfo}`}
                              onSelect={() => {
                                if (isSelected) {
                                  setFormData(prev => ({
                                    ...prev,
                                    expeditions_id: prev.expeditions_id.filter(id => id !== expedition.id)
                                  }))
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    expeditions_id: [...prev.expeditions_id, expedition.id]
                                  }))
                                }
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  isSelected ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{expedition.name}</span>
                                  {expedition.isActive && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs h-5">
                                      Active
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <span>{termInfo} • {yearInfo}</span>
                                  {dateRange && <span>• {dateRange}</span>}
                                </div>
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Scores Modal */}
      <Dialog open={allScoresModalOpen} onOpenChange={setAllScoresModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              All Evaluation Records
            </DialogTitle>
            <DialogDescription>
              {student?.name} • {currentExpedition?._schoolterms?.short_name || 'Term'} • {currentExpedition?._schoolyears?.name || ''}
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
                          <TableCell className={`px-4 py-3 text-center ${getScoreRowColor(record.citizenship, record.isCitizenshipUsed)}`}>
                            <span className={`text-sm ${getScoreClass(record.citizenship, record.isCitizenshipUsed)}`}>
                              {formatScoreValue(record.citizenship, record.isCitizenshipUsed)}
                            </span>
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-center ${getScoreRowColor(record.crew, record.isCrewUsed)}`}>
                            <span className={`text-sm ${getScoreClass(record.crew, record.isCrewUsed)}`}>
                              {formatScoreValue(record.crew, record.isCrewUsed)}
                            </span>
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-center ${getScoreRowColor(record.academics, record.isAcademicsUsed)}`}>
                            <span className={`text-sm ${getScoreClass(record.academics, record.isAcademicsUsed)}`}>
                              {formatScoreValue(record.academics, record.isAcademicsUsed)}
                            </span>
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-center ${getScoreRowColor(record.job, record.isJobUsed)}`}>
                            <span className={`text-sm ${getScoreClass(record.job, record.isJobUsed)}`}>
                              {formatScoreValue(record.job, record.isJobUsed)}
                            </span>
                          </TableCell>
                          <TableCell className={`px-4 py-3 text-center ${getScoreRowColor(record.service, record.isServiceUsed)}`}>
                            <span className={`text-sm ${getScoreClass(record.service, record.isServiceUsed)}`}>
                              {formatScoreValue(record.service, record.isServiceUsed)}
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
                                if (recordDate) {
                                  router.push(`/evaluate/${recordDate}?expedition=${expeditionId}`)
                                }
                              }}
                              disabled={!recordDate}
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
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
          
          <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
            <div className="text-sm text-gray-600">
              {sortedAllRecords.length > 0 && (
                <span>{sortedAllRecords.length} record{sortedAllRecords.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={() => setAllScoresModalOpen(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Performance Review Preview Modal */}
      <Dialog open={reviewPreviewOpen} onOpenChange={(open) => {
        setReviewPreviewOpen(open)
        if (!open) setSelectedReviewId(null)
      }}>
        <DialogContent className="w-full sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {loadingSelectedReview 
                ? 'Loading...' 
                : selectedReview 
                  ? `${selectedReview._students?.name || 'Student'} — ${selectedReview.report_name || 'Performance Review'}`
                  : 'Performance Review'
              }
            </DialogTitle>
            {selectedReview && (
              <DialogDescription>
                {formatDate(selectedReview.startDate)} - {formatDate(selectedReview.endDate)}
              </DialogDescription>
            )}
          </DialogHeader>
          {loadingSelectedReview ? (
            <div className="flex justify-center items-center py-20">
              <Spinner size="lg" />
            </div>
          ) : selectedReview ? (
            <>
              
              <div className="flex-1 overflow-y-auto space-y-6">
                {/* Evaluation Summary Table */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Evaluation Summary</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b bg-gray-50 hover:bg-gray-50">
                          <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600">Category</TableHead>
                          <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600 text-center w-16">Score</TableHead>
                          <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600">Evaluation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className={`border-b ${getReviewScoreColor(selectedReview.academics)}`}>
                          <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Academics</TableCell>
                          <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                            {selectedReview.academics !== null && selectedReview.academics !== undefined ? selectedReview.academics.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-gray-600 text-sm">
                            {selectedReview.academics_evaluation || '—'}
                          </TableCell>
                        </TableRow>
                        <TableRow className={`border-b ${getReviewScoreColor(selectedReview.citizenship)}`}>
                          <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Citizenship</TableCell>
                          <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                            {selectedReview.citizenship !== null && selectedReview.citizenship !== undefined ? selectedReview.citizenship.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-gray-600 text-sm">
                            {selectedReview.citizenship_evaluation || '—'}
                          </TableCell>
                        </TableRow>
                        <TableRow className={`border-b ${getReviewScoreColor(selectedReview.job)}`}>
                          <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Job Duties</TableCell>
                          <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                            {selectedReview.job !== null && selectedReview.job !== undefined ? selectedReview.job.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-gray-600 text-sm">
                            {selectedReview.job_evaluation || '—'}
                          </TableCell>
                        </TableRow>
                        <TableRow className={`border-b ${getReviewScoreColor(selectedReview.crew)}`}>
                          <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Crew</TableCell>
                          <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                            {selectedReview.crew !== null && selectedReview.crew !== undefined ? selectedReview.crew.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-gray-600 text-sm">
                            {selectedReview.crew_evaluation || '—'}
                          </TableCell>
                        </TableRow>
                        <TableRow className={`border-b ${getReviewScoreColor(selectedReview.service)}`}>
                          <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Service</TableCell>
                          <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                            {selectedReview.service !== null && selectedReview.service !== undefined ? selectedReview.service.toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-gray-600 text-sm">
                            {selectedReview.service_evaluation || '—'}
                          </TableCell>
                        </TableRow>
                        <TableRow className={getJournalColor(selectedReview.journaling)}>
                          <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Journaling</TableCell>
                          <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                            {formatJournalPercent(selectedReview.journaling)}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-gray-600 text-sm">
                            {selectedReview.journaling_evaluation || '—'}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                {/* Daily Scores Table */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Scores</h3>
                  {loadingReviewDailyScores ? (
                    <div className="flex justify-center py-4">
                      <Spinner size="sm" />
                    </div>
                  ) : reviewDailyScores && reviewDailyScores.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b bg-gray-50 hover:bg-gray-50">
                              <TableHead className="h-10 px-2 text-xs font-semibold text-gray-600 whitespace-nowrap">Date</TableHead>
                              <TableHead className="h-10 px-2 text-xs font-semibold text-gray-600 text-center">Acad</TableHead>
                              <TableHead className="h-10 px-2 text-xs font-semibold text-gray-600 text-center">Citz</TableHead>
                              <TableHead className="h-10 px-2 text-xs font-semibold text-gray-600 text-center">Job</TableHead>
                              <TableHead className="h-10 px-2 text-xs font-semibold text-gray-600 text-center">Crew</TableHead>
                              <TableHead className="h-10 px-2 text-xs font-semibold text-gray-600 text-center">Serv</TableHead>
                              <TableHead className="h-10 px-2 text-xs font-semibold text-gray-600 text-center">Jrnl</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...reviewDailyScores]
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                              .map((score: any, index: number) => (
                              <TableRow key={`${score.date}-${index}`} className="border-b last:border-0">
                                <TableCell className="px-2 py-2 font-medium text-gray-700 text-sm whitespace-nowrap">
                                  {formatDateShort(score.date)}
                                </TableCell>
                                <TableCell className={`px-2 py-2 text-center text-sm ${getReviewScoreColor(score.academics)}`}>
                                  {score.academics !== null && score.academics !== undefined ? score.academics : '—'}
                                </TableCell>
                                <TableCell className={`px-2 py-2 text-center text-sm ${getReviewScoreColor(score.citizenship)}`}>
                                  {score.citizenship !== null && score.citizenship !== undefined ? score.citizenship : '—'}
                                </TableCell>
                                <TableCell className={`px-2 py-2 text-center text-sm ${getReviewScoreColor(score.job)}`}>
                                  {score.job !== null && score.job !== undefined ? score.job : '—'}
                                </TableCell>
                                <TableCell className={`px-2 py-2 text-center text-sm ${getReviewScoreColor(score.crew)}`}>
                                  {score.crew !== null && score.crew !== undefined ? score.crew : '—'}
                                </TableCell>
                                <TableCell className={`px-2 py-2 text-center text-sm ${getReviewScoreColor(score.service)}`}>
                                  {score.service !== null && score.service !== undefined ? score.service : '—'}
                                </TableCell>
                                <TableCell className={`px-2 py-2 text-center text-sm ${(score.journaling || score.note || score._expedition_journal_status?.name) ? getJournalStringColor(score.journaling || score.note || score._expedition_journal_status?.name) : ''}`}>
                                  {score.journaling || score.note || score._expedition_journal_status?.name || '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No daily scores found for this period.</p>
                  )}
                </div>
                
                {/* Notes Section */}
                <div>
                  <Label htmlFor="review-notes" className="text-sm font-semibold text-gray-700">Notes</Label>
                  <Textarea
                    id="review-notes"
                    placeholder="Add notes about this performance review..."
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    className="mt-2 min-h-[120px]"
                  />
                </div>
              </div>
              
              <DialogFooter className="flex-shrink-0">
                <Button 
                  variant="outline" 
                  onClick={() => setReviewPreviewOpen(false)}
                  disabled={savingNotes}
                  className="cursor-pointer"
                >
                  Close
                </Button>
                <Button 
                  onClick={handleSaveReviewNotes}
                  disabled={savingNotes}
                  className="cursor-pointer"
                >
                  {savingNotes ? (
                    <>
                      <Spinner size="sm" className="h-4 w-4 mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Notes'
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
