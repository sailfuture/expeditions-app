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
import { FileText, User, Download, ExternalLink, Plus, Calendar, Eye, Trash2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { generatePerformanceReviewPDF } from "@/lib/pdf-generator"
import { toast } from "sonner"
import { getProfessionalismByStudentAndDate, getEvaluationByStudent, createPerformanceReview, updatePerformanceReviewNotes, getPerformanceReviewById, deletePerformanceReview, getExpeditionTransactionsByDateByStudent } from "@/lib/xano"
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
  saving
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
  
  // Fetch stored evaluation for the student (same as overview page uses)
  const { data: studentEvaluation, isLoading: loadingEvaluation } = useSWR(
    open && review?.students_id && review?.expeditions_id
      ? `evaluation_by_student_${review.students_id}_${review.expeditions_id}`
      : null,
    open && review?.students_id && review?.expeditions_id
      ? () => getEvaluationByStudent(review.students_id, review.expeditions_id)
      : null
  )
  
  // Helper to get evaluation text based on score
  const getEvaluationText = (score: number | null | undefined) => {
    if (score === null || score === undefined) return '—'
    if (score >= 3.21) return 'Exceptional'
    if (score >= 2.751) return 'Proficient'
    if (score >= 2.251) return 'Developing'
    if (score >= 1.1) return 'Needs Improvement'
    return 'Unsatisfactory'
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
  
  // Separate bonuses and penalties from transactions (excluding Purchases)
  const { bonuses, penalties } = useMemo(() => {
    if (!transactions) return { bonuses: [], penalties: [] }
    // The field is 'transaction' not 'type', with values like "Bonus", "Penalty", "Purchase"
    const bonusList = transactions.filter((t: any) => 
      t.transaction === 'Bonus' || (t.transaction !== 'Purchase' && t.transaction !== 'Penalty' && t.amount > 0)
    )
    const penaltyList = transactions.filter((t: any) => 
      t.transaction === 'Penalty' || (t.transaction !== 'Purchase' && t.transaction !== 'Bonus' && t.amount < 0)
    )
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
                ? `${`${review._students?.firstName || ""} ${review._students?.lastName || ""}`.trim() || 'Student'} — ${review.report_name || 'Performance Review'}`
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
          {/* Evaluation Summary Table - Based on stored evaluation (same as overview page) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Evaluation Summary <span className="text-xs font-normal text-gray-500">(All Days)</span></h3>
            {loadingEvaluation ? (
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
                  <TableRow className={`border-b ${getEvaluationColorByScore(studentEvaluation?.academics ?? null)}`}>
                    <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Academics</TableCell>
                    <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                      {studentEvaluation?.academics !== null && studentEvaluation?.academics !== undefined ? studentEvaluation.academics.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-gray-600 text-sm">
                      {studentEvaluation?.academics_evaluation || getEvaluationText(studentEvaluation?.academics)}
                    </TableCell>
                  </TableRow>
                  <TableRow className={`border-b ${getEvaluationColorByScore(studentEvaluation?.citizenship ?? null)}`}>
                    <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Citizenship</TableCell>
                    <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                      {studentEvaluation?.citizenship !== null && studentEvaluation?.citizenship !== undefined ? studentEvaluation.citizenship.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-gray-600 text-sm">
                      {studentEvaluation?.citizenship_evaluation || getEvaluationText(studentEvaluation?.citizenship)}
                    </TableCell>
                  </TableRow>
                  <TableRow className={`border-b ${getEvaluationColorByScore(studentEvaluation?.job ?? null)}`}>
                    <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Job Duties</TableCell>
                    <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                      {studentEvaluation?.job !== null && studentEvaluation?.job !== undefined ? studentEvaluation.job.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-gray-600 text-sm">
                      {studentEvaluation?.job_evaluation || getEvaluationText(studentEvaluation?.job)}
                    </TableCell>
                  </TableRow>
                  <TableRow className={`border-b ${getEvaluationColorByScore(studentEvaluation?.crew ?? null)}`}>
                    <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Crew</TableCell>
                    <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                      {studentEvaluation?.crew !== null && studentEvaluation?.crew !== undefined ? studentEvaluation.crew.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-gray-600 text-sm">
                      {studentEvaluation?.crew_evaluation || getEvaluationText(studentEvaluation?.crew)}
                    </TableCell>
                  </TableRow>
                  <TableRow className={`border-b ${getEvaluationColorByScore(studentEvaluation?.service ?? null)}`}>
                    <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Service</TableCell>
                    <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                      {studentEvaluation?.service !== null && studentEvaluation?.service !== undefined ? studentEvaluation.service.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-gray-600 text-sm">
                      {studentEvaluation?.service_evaluation || getEvaluationText(studentEvaluation?.service)}
                    </TableCell>
                  </TableRow>
                  <TableRow className={getJournalColor(studentEvaluation?.journal !== null && studentEvaluation?.journal !== undefined ? (studentEvaluation.journal <= 1 ? studentEvaluation.journal * 100 : studentEvaluation.journal) : null)}>
                    <TableCell className="px-3 py-2 font-medium text-gray-700 text-sm">Journaling</TableCell>
                    <TableCell className="px-3 py-2 text-center text-gray-700 text-sm">
                      {studentEvaluation?.journal !== null && studentEvaluation?.journal !== undefined 
                        ? `${(studentEvaluation.journal <= 1 ? studentEvaluation.journal * 100 : studentEvaluation.journal).toFixed(2)}%` 
                        : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-gray-600 text-sm">
                      {studentEvaluation?.journal_evaluation || getJournalingEvaluation(studentEvaluation?.journal)}
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
            disabled={saving}
            className="cursor-pointer"
          >
            Close
          </Button>
          <Button 
            onClick={onSave}
            disabled={saving}
            className="cursor-pointer"
          >
            {saving ? (
              <>
                <Spinner size="sm" className="h-4 w-4 mr-2" />
                Saving...
              </>
            ) : (
              'Save Review'
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
  
  const handlePreviewReview = async (reviewId: number, currentNotes: string) => {
    setSelectedReviewId(reviewId)
    setEditedNotes(currentNotes || "")
    setSelectedStaffId("")
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
  
  // Group reviews by student and sort students alphabetically
  const groupedReviews = useMemo(() => {
    if (!performanceReviews) return {}
    
    const grouped: Record<number, any[]> = {}
    performanceReviews.forEach((review: any) => {
      if (!grouped[review.students_id]) {
        grouped[review.students_id] = []
      }
      grouped[review.students_id].push(review)
    })
    
    // Convert to array, sort by student name, then back to object
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
            <div className="flex items-center justify-end">
              <Button 
                onClick={() => setCreateDialogOpen(true)} 
                variant="outline"
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Review
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
          Object.entries(groupedReviews).map(([studentId, reviews]: [string, any[]]) => {
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
                              onClick={() => handlePreviewReview(review.id, review.notes)}
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
          })
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
