"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
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
import { useExpeditions, useExpeditionPerformanceReviews } from "@/lib/hooks/use-expeditions"
import { FileText, User, Download, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { generatePerformanceReviewPDF } from "@/lib/pdf-generator"
import { toast } from "sonner"
import { getProfessionalismByStudentAndDate } from "@/lib/xano"
import { Spinner } from "@/components/ui/spinner"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Component to display scores table for a review
function ReviewScoresTable({ review }: { review: any }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  
  const { data: scores, isLoading } = useSWR(
    isOpen ? `professionalism_scores_${review.students_id}_${review.expeditions_id}_${review.startDate}_${review.endDate}` : null,
    isOpen ? () => getProfessionalismByStudentAndDate(
      review.students_id,
      review.expeditions_id,
      review.startDate,
      review.endDate
    ) : null
  )
  
  const sortedScores = useMemo(() => {
    if (!scores) return []
    return [...scores].sort((a, b) => {
      if (!a.date || !b.date) return 0
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })
  }, [scores])
  
  const formatScore = (value: number | null | undefined, isUsed: boolean) => {
    if (isUsed) return "N/A"
    if (value === null || value === undefined) return "No Score"
    if (value === 0) return "Unexcused"
    return value.toString()
  }
  
  const getScoreColor = (value: number | null | undefined, isUsed: boolean) => {
    if (isUsed) return "bg-gray-50"
    if (value === null || value === undefined) return ""
    if (value === 0) return "bg-gray-50"
    if (value === 5) return "bg-blue-50"
    if (value === 4) return "bg-green-50"
    if (value === 3) return ""
    if (value === 2) return "bg-yellow-50"
    if (value === 1) return "bg-red-50"
    return ""
  }
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    try {
      const [year, month, day] = dateStr.split('-').map(Number)
      return format(new Date(year, month - 1, day), 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <TableRow className="border-b last:border-0 hover:bg-gray-50/50 cursor-pointer">
          <TableCell className="h-14 px-6">
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
              {review.report_name ? (
                <span className="text-sm font-medium text-gray-700">{review.report_name}</span>
              ) : (
                <span className="text-sm text-gray-400 italic">Untitled</span>
              )}
            </div>
          </TableCell>
          <TableCell className="h-14 px-6">
            <span className="text-sm text-gray-600">{formatDate(review.startDate)}</span>
          </TableCell>
          <TableCell className="h-14 px-6">
            <span className="text-sm text-gray-600">{formatDate(review.endDate)}</span>
          </TableCell>
          <TableCell className="h-14 px-6 text-right" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                try {
                  generatePerformanceReviewPDF(review)
                  toast.success("PDF downloaded successfully")
                } catch (error) {
                  console.error("Error generating PDF:", error)
                  toast.error("Failed to generate PDF")
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </TableCell>
        </TableRow>
      </CollapsibleTrigger>
      <CollapsibleContent asChild>
        <>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="px-6 py-4">
                <div className="flex justify-center py-8">
                  <Spinner size="md" />
                </div>
              </TableCell>
            </TableRow>
          ) : sortedScores.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="px-6 py-4 text-center text-gray-500">
                No scores recorded for this period
              </TableCell>
            </TableRow>
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="px-0 py-0">
                <div className="bg-gray-50 px-6 py-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b bg-white hover:bg-white">
                        <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Date</TableHead>
                        <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Citizenship</TableHead>
                        <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Crew</TableHead>
                        <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Academics</TableHead>
                        <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Job</TableHead>
                        <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">Service</TableHead>
                        <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 text-center">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedScores.map((score: any) => (
                        <TableRow 
                          key={score.date || score._expedition_schedule?.id}
                          className="border-b last:border-0 hover:bg-gray-100/50 bg-white"
                        >
                          <TableCell className="h-12 px-4">
                            <span className="text-sm text-gray-700">{formatDate(score.date)}</span>
                          </TableCell>
                          <TableCell className={`h-12 px-4 text-center ${getScoreColor(score.citizenship, score.isCitizenshipUsed)}`}>
                            <span className="text-sm text-gray-700">{formatScore(score.citizenship, score.isCitizenshipUsed)}</span>
                          </TableCell>
                          <TableCell className={`h-12 px-4 text-center ${getScoreColor(score.crew, score.isCrewUsed)}`}>
                            <span className="text-sm text-gray-700">{formatScore(score.crew, score.isCrewUsed)}</span>
                          </TableCell>
                          <TableCell className={`h-12 px-4 text-center ${getScoreColor(score.academics, score.isAcademicsUsed)}`}>
                            <span className="text-sm text-gray-700">{formatScore(score.academics, score.isAcademicsUsed)}</span>
                          </TableCell>
                          <TableCell className={`h-12 px-4 text-center ${getScoreColor(score.job, score.isJobUsed)}`}>
                            <span className="text-sm text-gray-700">{formatScore(score.job, score.isJobUsed)}</span>
                          </TableCell>
                          <TableCell className={`h-12 px-4 text-center ${getScoreColor(score.service, score.isServiceUsed)}`}>
                            <span className="text-sm text-gray-700">{formatScore(score.service, score.isServiceUsed)}</span>
                          </TableCell>
                          <TableCell className="h-12 px-4 text-center">
                            {score.date && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 cursor-pointer"
                                onClick={() => router.push(`/evaluate/${score.date}?expedition=${review.expeditions_id}`)}
                              >
                                <ExternalLink className="h-4 w-4 text-gray-500" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-3 text-xs text-gray-500">
                    {sortedScores.length} {sortedScores.length === 1 ? 'record' : 'records'}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
        </>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default function PerformanceReviewsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const expeditionId = searchParams.get('expedition') ? parseInt(searchParams.get('expedition')!) : null
  
  const { data: allExpeditions } = useExpeditions()
  const { data: performanceReviews, isLoading } = useExpeditionPerformanceReviews(expeditionId)
  
  // Find the expedition to display
  const displayExpedition = useMemo(() => {
    if (!expeditionId || !allExpeditions) return null
    return allExpeditions.find((e: any) => e.id === expeditionId)
  }, [expeditionId, allExpeditions])
  
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
      const nameA = reviewsA[0]?._students?.name || ''
      const nameB = reviewsB[0]?._students?.name || ''
      return nameA.localeCompare(nameB)
    })
    
    return Object.fromEntries(sortedEntries)
  }, [performanceReviews])
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    try {
      const [year, month, day] = dateStr.split('-').map(Number)
      return format(new Date(year, month - 1, day), 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }
  
  
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
                    <TableCell className="h-14 px-6"><Skeleton className="h-9 w-32 ml-auto" /></TableCell>
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
            // Sort reviews by start date for this student
            const sortedReviews = [...reviews].sort((a, b) => {
              if (!a.startDate || !b.startDate) return 0
              return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
            })
            
            // Get student info from first review
            const student = sortedReviews[0]?._students
            const studentName = student?.name || `Student ${studentId}`
            
            return (
              <div key={studentId} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
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
                      <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Report Name</TableHead>
                      <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Start Date</TableHead>
                      <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">End Date</TableHead>
                      <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedReviews.map((review: any) => (
                      <ReviewScoresTable key={review.id} review={review} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}

