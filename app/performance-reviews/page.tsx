"use client"

import { useMemo, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import useSWR from "swr"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ExpeditionHeader } from "@/components/expedition-header"
import { useExpeditions, useExpeditionPerformanceReviews, useTeachersByExpedition } from "@/lib/hooks/use-expeditions"
import { FileText, User, Download, ExternalLink, Plus, Calendar, Eye, Trash2, Mail, Award, CheckCircle2, AlertCircle } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { generatePerformanceReviewPDF } from "@/lib/pdf-generator"
import { toast } from "sonner"
import { getProfessionalismByStudentAndDate, createPerformanceReview, updatePerformanceReviewNotes, getPerformanceReviewById, deletePerformanceReview, getExpeditionTransactionsByDateByStudent, getEvaluationByStudent, getStudentById } from "@/lib/xano"
import { Spinner } from "@/components/ui/spinner"
import { mutate } from "swr"
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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Helper function to format dates
function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    return format(new Date(year, month - 1, day), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

// Helper function to format dates (short version)
function formatDateShort(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    return format(new Date(year, month - 1, day), 'EEE, MMM d')
  } catch {
    return dateStr
  }
}

// Helper function to format relative time (abbreviated)
function formatRelativeTime(timestamp: number | null) {
  if (!timestamp) return "—"
  try {
    const distance = formatDistanceToNow(new Date(timestamp), { addSuffix: false })
    // Abbreviate common terms
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

// Component to preview a performance review with scores
function PreviewModal({ 
  reviewId, 
  open, 
  onOpenChange,
  notes,
  onNotesChange,
  selectedStaffId,
  onStaffChange,
  staff,
  onSave,
  saving,
  expeditionStartDate
}: { 
  reviewId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  notes: string
  onNotesChange: (notes: string) => void
  selectedStaffId: string
  onStaffChange: (staffId: string) => void
  staff: any[] | undefined
  onSave: () => void
  saving: boolean
  expeditionStartDate?: string
}) {
  // Fetch full review data by ID
  const { data: review, isLoading: loadingReview } = useSWR(
    open && reviewId ? `performance_review_${reviewId}` : null,
    open && reviewId ? () => getPerformanceReviewById(reviewId) : null,
    {
      onSuccess: (data) => {
        // Update notes and staff when review data loads
        if (data && data.notes !== undefined) {
          onNotesChange(data.notes || "")
        }
        if (data && data.expedition_staff_id) {
          onStaffChange(data.expedition_staff_id.toString())
        }
      }
    }
  )
  
  // Fetch student details to get parent contact info
  const { data: studentDetails } = useSWR(
    open && review?.students_id ? `student_details_${review.students_id}` : null,
    open && review?.students_id ? () => getStudentById(review.students_id) : null
  )
  const parentEmail = studentDetails?._expeditions_student_information?.primary_contact_email || null
  const parentName = studentDetails?._expeditions_student_information?.primary_contact_name || null

  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const handleEmailToParent = async () => {
    if (!reviewId || !parentEmail || !review) return
    setIsSendingEmail(true)
    try {
      const studentName = `${review._students?.firstName || ""} ${review._students?.lastName || ""}`.trim()

      // Generate PDF client-side
      const pdfDoc = await generatePerformanceReviewPDF(reviewId)
      const pdfBase64 = pdfDoc.output("datauristring").split(",")[1]

      const response = await fetch("/api/send-performance-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentEmail,
          parentName,
          studentName,
          reportName: review.report_name,
          startDate: review.startDate ? formatDate(review.startDate) : null,
          endDate: review.endDate ? formatDate(review.endDate) : null,
          pdfBase64,
          isFinal: !!review.is_final,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to send email")
      }

      toast.success(`Email sent to ${parentName || parentEmail}`, {
        description: `Performance review delivered to ${parentEmail}`,
      })
    } catch (error: any) {
      console.error("Failed to send email:", error)
      toast.error("Failed to send email", {
        description: error.message || "An unexpected error occurred",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Fetch daily scores for this student and date range (for Daily Scores table)
  const { data: dailyScores, isLoading: loadingDailyScores } = useSWR(
    open && review?.students_id && review?.expeditions_id && review?.startDate && review?.endDate
      ? `daily_scores_${review.students_id}_${review.expeditions_id}_${review.startDate}_${review.endDate}`
      : null,
    open && review?.students_id && review?.expeditions_id && review?.startDate && review?.endDate
      ? () => getProfessionalismByStudentAndDate(
          review.students_id,
          review.expeditions_id,
          review.startDate,
          review.endDate
        )
      : null
  )
  
  // Fetch student evaluation summary (same as Student Evaluations table on expedition page)
  const { data: studentEvaluation, isLoading: loadingStudentEvaluation } = useSWR(
    open && review?.students_id && review?.expeditions_id
      ? `evaluation_by_student_${review.students_id}_${review.expeditions_id}`
      : null,
    open && review?.students_id && review?.expeditions_id
      ? () => getEvaluationByStudent(review.students_id, review.expeditions_id)
      : null
  )
  
  // Use the student evaluation data (same as expedition overview table)
  const displayAverages = useMemo(() => {
    if (studentEvaluation) {
      return {
        academics: studentEvaluation.academics,
        citizenship: studentEvaluation.citizenship,
        job: studentEvaluation.job,
        crew: studentEvaluation.crew,
        service: studentEvaluation.service,
        journaling: studentEvaluation.journal
      }
    }
    // Fallback to stored review values
    return {
      academics: review?.academics,
      citizenship: review?.citizenship,
      job: review?.job,
      crew: review?.crew,
      service: review?.service,
      journaling: review?.journaling
    }
  }, [studentEvaluation, review])
  
  // Helper to get evaluation text based on score
  const getEvaluationText = (score: number | null | undefined) => {
    if (score === null || score === undefined) return '—'
    if (score >= 3.21) return 'Exceptional'
    if (score >= 2.751) return 'Proficient'
    if (score >= 2.251) return 'Developing'
    if (score >= 1.1) return 'Needs Improvement'
    return 'Unsatisfactory'
  }

  // Final Evaluation scoring: Strong Sat (>=3.21), Sat (>=2.75), Unsat (<2.75)
  const getFinalEvaluationStatus = (score: number | null | undefined): { label: string; color: string; bg: string; isPassing: boolean } => {
    if (score === null || score === undefined) return { label: 'Unsat', color: 'text-red-700', bg: 'bg-red-50', isPassing: false }
    if (score >= 3.21) return { label: 'Strong Sat', color: 'text-blue-700', bg: 'bg-blue-50', isPassing: true }
    if (score >= 2.75) return { label: 'Sat', color: 'text-green-700', bg: 'bg-green-50', isPassing: true }
    return { label: 'Unsat', color: 'text-red-700', bg: 'bg-red-50', isPassing: false }
  }

  // Journaling thresholds (percentage 0-1 or 0-100)
  const getFinalJournalingStatus = (pct: number | null | undefined): { label: string; color: string; bg: string; isPassing: boolean } => {
    if (pct === null || pct === undefined) return { label: 'Unsat', color: 'text-red-700', bg: 'bg-red-50', isPassing: false }
    const normalized = pct <= 1 ? pct * 100 : pct
    if (normalized >= 90) return { label: 'Strong Sat', color: 'text-blue-700', bg: 'bg-blue-50', isPassing: true }
    if (normalized >= 70) return { label: 'Sat', color: 'text-green-700', bg: 'bg-green-50', isPassing: true }
    return { label: 'Unsat', color: 'text-red-700', bg: 'bg-red-50', isPassing: false }
  }
  
  const getJournalingEvaluation = (pct: number | null | undefined) => {
    if (pct === null || pct === undefined) return '—'
    const normalizedPct = pct <= 1 ? pct : pct / 100
    if (normalizedPct < 0.7) return 'Needs Improvement'
    if (normalizedPct >= 0.9) return 'Exceptional'
    return 'Proficient'
  }
  
  // Fetch bonuses and penalties for this student and date range
  const { data: transactions, isLoading: loadingTransactions } = useSWR(
    open && review?.students_id && review?.expeditions_id && review?.startDate && review?.endDate
      ? `transactions_${review.students_id}_${review.expeditions_id}_${review.startDate}_${review.endDate}`
      : null,
    open && review?.students_id && review?.expeditions_id && review?.startDate && review?.endDate
      ? () => getExpeditionTransactionsByDateByStudent(
          review.students_id,
          review.expeditions_id,
          review.startDate,
          review.endDate
        )
      : null
  )
  
  // Separate bonuses (positive) and penalties (negative) from transactions, excluding store Purchases
  const { bonuses, penalties } = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) return { bonuses: [], penalties: [] }
    // Filter out store purchases, then split by positive/negative amount
    const nonPurchases = transactions.filter((t: any) => t.transaction !== 'Purchase')
    const bonusList = nonPurchases.filter((t: any) => t.amount > 0)
    const penaltyList = nonPurchases.filter((t: any) => t.amount < 0)
    return { bonuses: bonusList, penalties: penaltyList }
  }, [transactions])
  
  const getEvaluationColorByScore = (score: number | null | undefined) => {
    if (score === null || score === undefined) return ""
    if (score >= 3.21) return "bg-blue-50"
    if (score >= 2.751) return "bg-green-50"
    if (score >= 2.251) return "bg-yellow-50"
    if (score >= 1.1) return "bg-red-50"
    return "bg-gray-50"
  }
  
  const getJournalColor = (percentage: number | null | undefined) => {
    if (percentage === null || percentage === undefined) return ""
    if (percentage < 70) return "bg-red-50"
    if (percentage >= 90) return "bg-blue-50"
    return "bg-green-50"
  }
  
  if (!reviewId) return null
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-full sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <DialogHeader>
          <DialogTitle>
            {loadingReview
              ? 'Loading...'
              : review
                ? `${`${review._students?.firstName || ""} ${review._students?.lastName || ""}`.trim() || 'Student'} — ${review.is_final ? 'Final Expedition Evaluation' : (review.report_name || 'Performance Review')}`
                : 'Performance Review'
            }
          </DialogTitle>
          {review && (
            <DialogDescription>
              {formatDate(review.startDate)} - {formatDate(review.endDate)}
            </DialogDescription>
          )}
        </DialogHeader>
        {loadingReview ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" />
          </div>
        ) : review ? (
          <>
            
            <div className="flex-1 overflow-y-auto space-y-6">
          {/* Final Evaluation Banner & Table - only when is_final */}
          {review?.is_final && !loadingReview && !loadingStudentEvaluation && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                Final Evaluation Status
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-gray-50 hover:bg-gray-50">
                      <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600">Domain</TableHead>
                      <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600 text-center w-20">Average</TableHead>
                      <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600 w-32">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { key: "academics", label: "Academics", score: displayAverages.academics, isJournal: false },
                      { key: "citizenship", label: "Citizenship", score: displayAverages.citizenship, isJournal: false },
                      { key: "job", label: "Job Duties", score: displayAverages.job, isJournal: false },
                      { key: "crew", label: "Crew Responsibilities", score: displayAverages.crew, isJournal: false },
                      { key: "service", label: "Service Learning", score: displayAverages.service, isJournal: false },
                      { key: "journaling", label: "Personal Reflection (Journaling)", score: displayAverages.journaling, isJournal: true },
                    ].map((row) => {
                      const status = row.isJournal
                        ? getFinalJournalingStatus(row.score)
                        : getFinalEvaluationStatus(row.score)
                      const scoreDisplay = row.score === null || row.score === undefined
                        ? "—"
                        : row.isJournal
                          ? `${(row.score <= 1 ? row.score * 100 : row.score).toFixed(1)}%`
                          : row.score.toFixed(2)
                      return (
                        <TableRow key={row.key} className={`border-b ${status.bg}`}>
                          <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">{row.label}</TableCell>
                          <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">{scoreDisplay}</TableCell>
                          <TableCell className={`px-3 py-2 text-sm font-semibold ${status.color}`}>{status.label}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {(() => {
                const domainStatuses = [
                  { label: "Academics", status: getFinalEvaluationStatus(displayAverages.academics) },
                  { label: "Citizenship", status: getFinalEvaluationStatus(displayAverages.citizenship) },
                  { label: "Job Duties", status: getFinalEvaluationStatus(displayAverages.job) },
                  { label: "Crew Responsibilities", status: getFinalEvaluationStatus(displayAverages.crew) },
                  { label: "Service Learning", status: getFinalEvaluationStatus(displayAverages.service) },
                  { label: "Personal Reflection", status: getFinalJournalingStatus(displayAverages.journaling) },
                ]
                const allPassing = domainStatuses.every(d => d.status.isPassing)
                const failedDomains = domainStatuses.filter(d => !d.status.isPassing).map(d => d.label)
                return allPassing ? (
                  <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Successfully Completed Expedition</p>
                      <p className="text-xs text-green-700 mt-0.5">
                        {`${review._students?.firstName || "Student"} `}has passed all six domains and successfully completed this expedition.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Did Not Pass All Domains</p>
                      <p className="text-xs text-red-700 mt-0.5">
                        Unsatisfactory in: {failedDomains.join(", ")}
                      </p>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Evaluation Summary Table - Same as Student Evaluations table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Evaluation Summary <span className="text-xs font-normal text-gray-500">(All Days)</span></h3>
            {loadingReview || loadingStudentEvaluation ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : (
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
                  <TableRow className={`border-b ${getEvaluationColorByScore(displayAverages.academics ?? null)}`}>
                    <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Academics</TableCell>
                    <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                      {displayAverages.academics !== null && displayAverages.academics !== undefined ? displayAverages.academics.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-gray-600 text-sm">
                      {getEvaluationText(displayAverages.academics)}
                    </TableCell>
                  </TableRow>
                  <TableRow className={`border-b ${getEvaluationColorByScore(displayAverages.citizenship ?? null)}`}>
                    <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Citizenship</TableCell>
                    <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                      {displayAverages.citizenship !== null && displayAverages.citizenship !== undefined ? displayAverages.citizenship.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-gray-600 text-sm">
                      {getEvaluationText(displayAverages.citizenship)}
                    </TableCell>
                  </TableRow>
                  <TableRow className={`border-b ${getEvaluationColorByScore(displayAverages.job ?? null)}`}>
                    <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Job Duties</TableCell>
                    <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                      {displayAverages.job !== null && displayAverages.job !== undefined ? displayAverages.job.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-gray-600 text-sm">
                      {getEvaluationText(displayAverages.job)}
                    </TableCell>
                  </TableRow>
                  <TableRow className={`border-b ${getEvaluationColorByScore(displayAverages.crew ?? null)}`}>
                    <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Crew</TableCell>
                    <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                      {displayAverages.crew !== null && displayAverages.crew !== undefined ? displayAverages.crew.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-gray-600 text-sm">
                      {getEvaluationText(displayAverages.crew)}
                    </TableCell>
                  </TableRow>
                  <TableRow className={`border-b ${getEvaluationColorByScore(displayAverages.service ?? null)}`}>
                    <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Service</TableCell>
                    <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                      {displayAverages.service !== null && displayAverages.service !== undefined ? displayAverages.service.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-gray-600 text-sm">
                      {getEvaluationText(displayAverages.service)}
                    </TableCell>
                  </TableRow>
                  <TableRow className={getJournalColor(displayAverages.journaling !== null && displayAverages.journaling !== undefined ? (displayAverages.journaling <= 1 ? displayAverages.journaling * 100 : displayAverages.journaling) : null)}>
                    <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Journaling</TableCell>
                    <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                      {displayAverages.journaling !== null && displayAverages.journaling !== undefined 
                        ? `${(displayAverages.journaling <= 1 ? displayAverages.journaling * 100 : displayAverages.journaling).toFixed(2)}%` 
                        : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-gray-600 text-sm">
                      {getJournalingEvaluation(displayAverages.journaling)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            )}
          </div>
          
          {/* Daily Scores Table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Scores</h3>
            {loadingDailyScores ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : dailyScores && dailyScores.length > 0 ? (
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
                      {[...dailyScores]
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((score: any) => (
                        <TableRow key={score.date} className="border-b last:border-0">
                          <TableCell className="px-2 py-2 font-medium text-gray-700 text-sm">
                            {formatDateShort(score.date)}
                          </TableCell>
                          <TableCell className={`px-2 py-2 text-center text-sm ${getEvaluationColorByScore(score.academics)}`}>
                            {score.academics !== null && score.academics !== undefined ? score.academics : '—'}
                          </TableCell>
                          <TableCell className={`px-2 py-2 text-center text-sm ${getEvaluationColorByScore(score.citizenship)}`}>
                            {score.citizenship !== null && score.citizenship !== undefined ? score.citizenship : '—'}
                          </TableCell>
                          <TableCell className={`px-2 py-2 text-center text-sm ${getEvaluationColorByScore(score.job)}`}>
                            {score.job !== null && score.job !== undefined ? score.job : '—'}
                          </TableCell>
                          <TableCell className={`px-2 py-2 text-center text-sm ${getEvaluationColorByScore(score.crew)}`}>
                            {score.crew !== null && score.crew !== undefined ? score.crew : '—'}
                          </TableCell>
                          <TableCell className={`px-2 py-2 text-center text-sm ${getEvaluationColorByScore(score.service)}`}>
                            {score.service !== null && score.service !== undefined ? score.service : '—'}
                          </TableCell>
                          <TableCell className={`px-2 py-2 text-center text-sm ${(() => {
                            const jrnl = score.journaling || score.note || score._expedition_journal_status?.name || ''
                            if (!jrnl) return ''
                            const lower = jrnl.toLowerCase()
                            // Check red conditions first (not started, missing)
                            if (lower.includes('not started') || lower.includes('not') || lower.includes('missing')) return 'bg-red-50'
                            // Check green (completed/complete)
                            if (lower === 'completed' || lower === 'complete') return 'bg-green-50'
                            // Check yellow (incomplete, partial, late, started)
                            if (lower.includes('incomplete') || lower.includes('partial') || lower.includes('started') || lower.includes('late')) return 'bg-yellow-50'
                            return ''
                          })()}`}>
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
          
          {/* Daily Transaction History Table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Transaction History</h3>
            {loadingTransactions ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : (bonuses.length > 0 || penalties.length > 0) ? (
              (() => {
                const allTransactions = [...bonuses, ...penalties].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                const total = allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
                return (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b bg-gray-50 hover:bg-gray-50">
                            <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600">Date</TableHead>
                            <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600">Type</TableHead>
                            <TableHead className="h-10 px-3 text-xs font-semibold text-gray-600 text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allTransactions.map((transaction: any, idx: number) => {
                            const isBonus = transaction.transaction === 'Bonus' || transaction.amount > 0
                            return (
                              <TableRow key={transaction.id || idx} className="border-b">
                                <TableCell className="px-3 py-2 text-sm text-gray-700">
                                  {formatDateShort(transaction.date)}
                                </TableCell>
                                <TableCell className="px-3 py-2 text-sm text-gray-600">
                                  {transaction.transaction || '—'}
                                </TableCell>
                                <TableCell className={`px-3 py-2 text-sm text-right font-medium ${isBonus ? 'text-green-600' : 'text-red-600'}`}>
                                  {isBonus ? '+' : ''}{transaction.amount || 0}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          <TableRow className="bg-gray-50 border-t-2">
                            <TableCell colSpan={2} className="px-3 py-2 text-sm font-semibold text-gray-900">
                              Total
                            </TableCell>
                            <TableCell className={`px-3 py-2 text-sm text-right font-bold ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {total >= 0 ? '+' : ''}{total}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )
              })()
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No transactions for this period.</p>
            )}
          </div>
          
          {/* Notes Section */}
          <div>
            <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this performance review..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="mt-2 min-h-[120px]"
            />
          </div>
          
          {/* Staff Selection */}
          <div>
            <Label htmlFor="staff" className="text-sm font-semibold text-gray-700">Reviewed By</Label>
            <Select value={selectedStaffId} onValueChange={onStaffChange}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {staff?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter className="flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving || isSendingEmail}
            className="cursor-pointer"
          >
            Close
          </Button>
          <Button
            variant="outline"
            onClick={handleEmailToParent}
            disabled={!parentEmail || isSendingEmail || saving}
            className="cursor-pointer"
            title={parentEmail ? `Send to ${parentName || parentEmail}` : "No parent email on file"}
          >
            {isSendingEmail ? (
              <>
                <Spinner size="sm" className="h-4 w-4 mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                {parentEmail ? "Email to Parent" : "No Parent Email"}
              </>
            )}
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || isSendingEmail}
            className="cursor-pointer"
          >
            {saving ? (
              <>
                <Spinner size="sm" className="h-4 w-4 mr-2" />
                Saving...
              </>
            ) : (
              review?.is_final ? 'Save Evaluation' : 'Save Review'
            )}
          </Button>
        </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function PerformanceReviewsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const expeditionId = searchParams.get('expedition') ? parseInt(searchParams.get('expedition')!) : null
  
  const { data: allExpeditions } = useExpeditions()
  const { data: performanceReviews, isLoading } = useExpeditionPerformanceReviews(expeditionId)
  const { data: staff } = useTeachersByExpedition(expeditionId)
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [reportName, setReportName] = useState("")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Final Evaluation creation
  const [finalDialogOpen, setFinalDialogOpen] = useState(false)
  const [finalStartDate, setFinalStartDate] = useState<Date | undefined>(undefined)
  const [finalEndDate, setFinalEndDate] = useState<Date | undefined>(undefined)
  const [finalStartDateOpen, setFinalStartDateOpen] = useState(false)
  const [finalEndDateOpen, setFinalEndDateOpen] = useState(false)
  const [creatingFinal, setCreatingFinal] = useState(false)
  
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null)
  const [editedNotes, setEditedNotes] = useState("")
  const [selectedStaffId, setSelectedStaffId] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [reviewToDelete, setReviewToDelete] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Find the expedition to display
  const displayExpedition = useMemo(() => {
    if (!expeditionId || !allExpeditions) return null
    return allExpeditions.find((e: any) => e.id === expeditionId)
  }, [expeditionId, allExpeditions])
  
  const handleCreateReview = async () => {
    if (!reportName || !startDate || !endDate || !expeditionId) {
      toast.error("Please fill in all fields")
      return
    }
    
    setCreating(true)
    try {
      // Format dates as YYYY-MM-DD
      const formattedStartDate = format(startDate, 'yyyy-MM-dd')
      const formattedEndDate = format(endDate, 'yyyy-MM-dd')
      
      // Call API to create performance review
      await createPerformanceReview({
        expeditions_id: expeditionId,
        report_name: reportName,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      })
      
      toast.success("Performance review created")
      setCreateDialogOpen(false)
      setReportName("")
      setStartDate(undefined)
      setEndDate(undefined)
      
      // Refresh data
      await mutate(`expedition_performance_reviews_${expeditionId}`)
    } catch (error) {
      console.error("Error creating review:", error)
      toast.error("Failed to create review")
    } finally {
      setCreating(false)
    }
  }
  
  const handleCreateFinalEvaluation = async () => {
    if (!finalStartDate || !finalEndDate || !expeditionId) {
      toast.error("Please fill in start and end dates")
      return
    }

    setCreatingFinal(true)
    try {
      const formattedStartDate = format(finalStartDate, 'yyyy-MM-dd')
      const formattedEndDate = format(finalEndDate, 'yyyy-MM-dd')

      await createPerformanceReview({
        expeditions_id: expeditionId,
        report_name: "Final Expedition Evaluation",
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        is_final: true,
      })

      toast.success("Final Expedition Evaluation created")
      setFinalDialogOpen(false)
      setFinalStartDate(undefined)
      setFinalEndDate(undefined)

      await mutate(`expedition_performance_reviews_${expeditionId}`)
    } catch (error) {
      console.error("Error creating final evaluation:", error)
      toast.error("Failed to create final evaluation")
    } finally {
      setCreatingFinal(false)
    }
  }

  // Pre-fill final eval dates from expedition range when dialog opens
  const openFinalDialog = () => {
    if (displayExpedition) {
      const start = displayExpedition.startDate || displayExpedition.start_date
      const end = displayExpedition.endDate || displayExpedition.end_date
      if (start && !finalStartDate) {
        const [y, m, d] = start.split('-').map(Number)
        setFinalStartDate(new Date(y, m - 1, d))
      }
      if (end && !finalEndDate) {
        const [y, m, d] = end.split('-').map(Number)
        setFinalEndDate(new Date(y, m - 1, d))
      }
    }
    setFinalDialogOpen(true)
  }

  const handlePreviewReview = async (reviewId: number, currentNotes: string, staffId?: number) => {
    setSelectedReviewId(reviewId)
    setEditedNotes(currentNotes || "")
    setSelectedStaffId(staffId ? staffId.toString() : "")
    setPreviewModalOpen(true)
  }
  
  const handleSaveNotes = async () => {
    if (!selectedReviewId) return
    
    setSavingNotes(true)
    try {
      const staffId = selectedStaffId ? parseInt(selectedStaffId) : undefined
      await updatePerformanceReviewNotes(selectedReviewId, editedNotes, staffId)
      toast.success("Review saved successfully")
      await mutate(`expedition_performance_reviews_${expeditionId}`)
      await mutate(`performance_review_${selectedReviewId}`)
      setPreviewModalOpen(false)
    } catch (error) {
      console.error("Error saving review:", error)
      toast.error("Failed to save review")
    } finally {
      setSavingNotes(false)
    }
  }
  
  const handleDeleteClick = (review: any) => {
    setReviewToDelete(review)
    setDeleteConfirmOpen(true)
  }
  
  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return
    
    setDeleting(true)
    try {
      await deletePerformanceReview(reviewToDelete.id)
      toast.success("Performance review deleted")
      setDeleteConfirmOpen(false)
      setReviewToDelete(null)
      await mutate(`expedition_performance_reviews_${expeditionId}`)
    } catch (error) {
      console.error("Error deleting review:", error)
      toast.error("Failed to delete review")
    } finally {
      setDeleting(false)
    }
  }
  
  // Group reviews by student and sort students alphabetically (regular reviews only, not final evaluations)
  const groupedReviews = useMemo(() => {
    if (!performanceReviews) return {}

    const grouped: Record<number, any[]> = {}
    performanceReviews.forEach((review: any) => {
      if (review.is_final) return
      if (!grouped[review.students_id]) {
        grouped[review.students_id] = []
      }
      grouped[review.students_id].push(review)
    })

    const sortedEntries = Object.entries(grouped).sort(([, reviewsA], [, reviewsB]) => {
      const nameA = `${reviewsA[0]?._students?.firstName || ""} ${reviewsA[0]?._students?.lastName || ""}`.trim()
      const nameB = `${reviewsB[0]?._students?.firstName || ""} ${reviewsB[0]?._students?.lastName || ""}`.trim()
      return nameA.localeCompare(nameB)
    })

    return Object.fromEntries(sortedEntries)
  }, [performanceReviews])

  // Group FINAL evaluations by student
  const groupedFinalEvaluations = useMemo(() => {
    if (!performanceReviews) return {}

    const grouped: Record<number, any[]> = {}
    performanceReviews.forEach((review: any) => {
      if (!review.is_final) return
      if (!grouped[review.students_id]) {
        grouped[review.students_id] = []
      }
      grouped[review.students_id].push(review)
    })

    const sortedEntries = Object.entries(grouped).sort(([, reviewsA], [, reviewsB]) => {
      const nameA = `${reviewsA[0]?._students?.firstName || ""} ${reviewsA[0]?._students?.lastName || ""}`.trim()
      const nameB = `${reviewsB[0]?._students?.firstName || ""} ${reviewsB[0]?._students?.lastName || ""}`.trim()
      return nameA.localeCompare(nameB)
    })

    return Object.fromEntries(sortedEntries)
  }, [performanceReviews])
  
  if (!expeditionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No expedition selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Expedition Header with Navigation */}
      <ExpeditionHeader 
        expedition={displayExpedition} 
        isLoading={!displayExpedition} 
        currentPage="performance-reviews" 
      />

      {/* Button Bar */}
      {expeditionId && (
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={() => setCreateDialogOpen(true)}
                variant="outline"
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Review
              </Button>
              <Button
                onClick={openFinalDialog}
                className="cursor-pointer"
              >
                <Award className="h-4 w-4 mr-2" />
                Create Final Evaluation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50/50">
              <Skeleton className="h-6 w-32" />
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Report Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Start Date</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">End Date</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2].map((i) => (
                  <TableRow key={i}>
                    <TableCell className="h-14 px-6"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="h-14 px-6"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="h-14 px-6"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="h-14 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Skeleton className="h-9 w-9" />
                        <Skeleton className="h-9 w-9" />
                        <Skeleton className="h-9 w-9" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : !performanceReviews || performanceReviews.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600 mb-1">No Performance Reviews</p>
              <p className="text-sm text-gray-500">No reviews have been created for this expedition yet.</p>
            </div>
          </div>
        ) : (
          <>
          {/* Final Evaluations Section */}
          {Object.keys(groupedFinalEvaluations).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Award className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-semibold text-gray-900">Final Expedition Evaluations</h2>
              </div>
              {Object.entries(groupedFinalEvaluations).map(([studentId, reviews]: [string, any[]]) => {
                const sortedReviews = [...reviews].sort((a, b) => (a.created_at || 0) - (b.created_at || 0))
                const student = sortedReviews[0]?._students
                const studentName = `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || `Student ${studentId}`
                return (
                  <div key={`final-${studentId}`} className="rounded-xl border-2 border-amber-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b bg-amber-50/40">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {student?.profileImage ? <AvatarImage src={student.profileImage} alt={studentName} /> : null}
                          <AvatarFallback className="text-sm bg-amber-100 text-amber-700">
                            {studentName.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-lg font-semibold">{studentName}</h2>
                          <p className="text-xs text-gray-500">{sortedReviews.length} Final Evaluation{sortedReviews.length === 1 ? '' : 's'}</p>
                        </div>
                      </div>
                    </div>
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
                        {sortedReviews.map((review: any) => (
                          <TableRow key={review.id} className="border-b last:border-0 hover:bg-gray-50/50">
                            <TableCell className="h-14 px-4">
                              <span className="text-xs text-gray-500">{formatRelativeTime(review.created_at)}</span>
                            </TableCell>
                            <TableCell className="h-14 px-6">
                              <span className="text-sm font-medium text-gray-700">Final Expedition Evaluation</span>
                            </TableCell>
                            <TableCell className="h-14 px-6">
                              <span className="text-sm text-gray-600">{formatDate(review.startDate)}</span>
                            </TableCell>
                            <TableCell className="h-14 px-6">
                              <span className="text-sm text-gray-600">{formatDate(review.endDate)}</span>
                            </TableCell>
                            <TableCell className="h-14 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="icon" className="cursor-pointer h-9 w-9" onClick={() => handlePreviewReview(review.id, review.notes, review.expedition_staff_id)} title="Preview">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" className="cursor-pointer h-9 w-9" onClick={async () => {
                                  try { await generatePerformanceReviewPDF(review.id); toast.success("PDF downloaded successfully") }
                                  catch (error) { console.error(error); toast.error("Failed to generate PDF") }
                                }} title="Download PDF">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" className="cursor-pointer h-9 w-9 hover:bg-red-50 hover:border-red-200" onClick={() => handleDeleteClick(review)} title="Delete">
                                  <Trash2 className="h-4 w-4 text-gray-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              })}
            </div>
          )}

          {/* Performance Reviews Section */}
          {Object.keys(groupedReviews).length > 0 && (
            <div className="space-y-3">
              {Object.keys(groupedFinalEvaluations).length > 0 && (
                <div className="flex items-center gap-2 px-1 pt-2">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-900">Performance Reviews</h2>
                </div>
              )}
              {Object.entries(groupedReviews).map(([studentId, reviews]: [string, any[]]) => {
            // Sort reviews by creation date (oldest to newest)
            const sortedReviews = [...reviews].sort((a, b) => {
              if (!a.created_at || !b.created_at) return 0
              return a.created_at - b.created_at
            })
            
            // Get student info from first review
            const student = sortedReviews[0]?._students
            const studentName = `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || `Student ${studentId}`
            
            return (
              <div key={studentId} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={student?.profileImage || student?.photo_url} 
                        alt={studentName} 
                      />
                      <AvatarFallback className="text-sm bg-gray-200 text-gray-600">
                        {studentName?.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-lg font-semibold">{studentName}</h2>
                      <p className="text-xs text-gray-500">{sortedReviews.length} {sortedReviews.length === 1 ? 'Review' : 'Reviews'}</p>
                    </div>
                  </div>
                </div>
                
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
                    {sortedReviews.map((review: any) => (
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
                              onClick={() => handlePreviewReview(review.id, review.notes, review.expedition_staff_id)}
                              title="Preview"
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
                            <Button
                              variant="outline"
                              size="icon"
                              className="cursor-pointer h-9 w-9 hover:bg-red-50 hover:border-red-200"
                              onClick={() => handleDeleteClick(review)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          })}
            </div>
          )}
          </>
        )}
      </main>
      
      {/* Preview Modal */}
      {selectedReviewId && (
        <PreviewModal
          reviewId={selectedReviewId}
          open={previewModalOpen}
          onOpenChange={(open) => {
            setPreviewModalOpen(open)
            if (!open) {
              setSelectedReviewId(null)
            }
          }}
          notes={editedNotes}
          onNotesChange={setEditedNotes}
          selectedStaffId={selectedStaffId}
          onStaffChange={setSelectedStaffId}
          staff={staff}
          onSave={handleSaveNotes}
          saving={savingNotes}
          expeditionStartDate={displayExpedition?.startDate || displayExpedition?.start_date}
        />
      )}
      
      {/* Create Review Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Performance Review</DialogTitle>
            <DialogDescription>
              Create a new performance review for all students in this expedition.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                placeholder="Enter report name"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal cursor-pointer"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date)
                        setStartDateOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal cursor-pointer"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date)
                        setEndDateOpen(false)
                      }}
                      initialFocus
                      disabled={(date) => startDate ? date < startDate : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateReview}
              disabled={creating || !reportName || !startDate || !endDate}
              className="cursor-pointer"
            >
              {creating ? (
                <>
                  <Spinner size="sm" className="h-4 w-4 mr-2" />
                  Creating...
                </>
              ) : (
                'Create Review'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Final Evaluation Dialog */}
      <Dialog open={finalDialogOpen} onOpenChange={setFinalDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Create Final Expedition Evaluation
            </DialogTitle>
            <DialogDescription>
              Generate a final evaluation for all students using their aggregated scores across the expedition. Strong Sat (≥3.21), Sat (2.75–3.20), or Unsat (&lt;2.75) is determined per domain.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover open={finalStartDateOpen} onOpenChange={setFinalStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal cursor-pointer">
                      <Calendar className="mr-2 h-4 w-4" />
                      {finalStartDate ? format(finalStartDate, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={finalStartDate}
                      onSelect={(date) => { setFinalStartDate(date); setFinalStartDateOpen(false) }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover open={finalEndDateOpen} onOpenChange={setFinalEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal cursor-pointer">
                      <Calendar className="mr-2 h-4 w-4" />
                      {finalEndDate ? format(finalEndDate, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={finalEndDate}
                      onSelect={(date) => { setFinalEndDate(date); setFinalEndDateOpen(false) }}
                      initialFocus
                      disabled={(date) => finalStartDate ? date < finalStartDate : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Defaults to the full expedition date range. Adjust if you want a narrower window.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalDialogOpen(false)} disabled={creatingFinal} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleCreateFinalEvaluation} disabled={creatingFinal || !finalStartDate || !finalEndDate} className="cursor-pointer">
              {creatingFinal ? (
                <>
                  <Spinner size="sm" className="h-4 w-4 mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Award className="h-4 w-4 mr-2" />
                  Create Final Evaluation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Performance Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{reviewToDelete?.report_name || 'this review'}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Spinner size="sm" className="h-4 w-4 mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function PerformanceReviewsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    }>
      <PerformanceReviewsContent />
    </Suspense>
  )
}
