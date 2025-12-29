"use client"

import { useMemo, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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
import { Skeleton } from "@/components/ui/skeleton"
import { ExpeditionHeader } from "@/components/expedition-header"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import { Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import jsPDF from "jspdf"
import { addPDFHeader } from "@/lib/pdf-generator"

// Fetcher for SWR
async function fetchApplications() {
  const response = await fetch("https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y/expedition_student_applications")
  if (!response.ok) throw new Error("Failed to fetch applications")
  return response.json()
}

// Helper function to format dates
function formatDate(timestamp: number | null) {
  if (!timestamp) return "—"
  try {
    return format(new Date(timestamp), "MMM d, yyyy")
  } catch {
    return "—"
  }
}

// Helper function to format relative time
function formatRelativeTime(timestamp: number | null) {
  if (!timestamp) return "—"
  try {
    const now = Date.now()
    const diff = now - timestamp
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return "now"
  } catch {
    return "—"
  }
}

// Generate PDF for application
function generateApplicationPDF(application: any) {
  const doc = new jsPDF()
  
  // Add header
  const startY = addPDFHeader(doc)
  let y = startY + 5
  
  // Title
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Crew Application", 14, y)
  y += 10
  
  // Submitted date
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100)
  doc.text(`Submitted: ${formatDate(application.created_at)}`, 14, y)
  y += 10
  
  // Reset text color
  doc.setTextColor(0)
  
  // Helper to add sections
  const addSection = (title: string, content: string) => {
    if (y > 260) {
      doc.addPage()
      y = 20
    }
    
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text(title, 14, y)
    y += 6
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const lines = doc.splitTextToSize(content || "—", 180)
    doc.text(lines, 14, y)
    y += lines.length * 5 + 8
  }
  
  // Add all sections
  addSection("First Choice Department", application.firstChoiceDepartment || "—")
  addSection("Why First Choice", application.whyFirstChoiceDepartment || "—")
  addSection("Second Choice Department", application.secondChoiceDepartment || "—")
  addSection("Why Second Choice", application.whySecondChoiceDepartment || "—")
  addSection("Career Goals or Interests", application.careerGoalsOrInterests || "—")
  addSection("Relevant Experience or Skills", application.relevantExperienceOrSkills || "—")
  addSection("Professional Traits", application.professionalTraits || "—")
  addSection("Conflict Resolution Example", application.conflictResolutionExample || "—")
  addSection("Problem Solving Approach", application.problemSolvingApproach || "—")
  addSection("Perseverance or Resilience Example", application.perseveranceOrResilienceExample || "—")
  
  if (application.resumeLink) {
    addSection("Resume Link", application.resumeLink)
  }
  
  // Save
  const fileName = `Application_${application.id}_${formatDate(application.created_at).replace(/,?\s+/g, '_')}.pdf`
  doc.save(fileName)
}

function ApplicationsContent() {
  const searchParams = useSearchParams()
  const expeditionIdFromUrl = searchParams.get("expedition")
  
  const { data: allExpeditionsData } = useExpeditions()
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  
  // Fetch applications
  const { data: applications, isLoading } = useSWR(
    "expedition_student_applications",
    fetchApplications
  )
  
  // Get the display expedition
  const displayExpedition = useMemo(() => {
    if (!allExpeditionsData) return null
    if (expeditionIdFromUrl) {
      return allExpeditionsData.find((e: any) => e.id === Number(expeditionIdFromUrl))
    }
    return allExpeditionsData.find((e: any) => e.isActive) || allExpeditionsData[0]
  }, [allExpeditionsData, expeditionIdFromUrl])
  
  // Sort applications by created_at (newest first)
  const sortedApplications = useMemo(() => {
    if (!applications) return []
    return [...applications].sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0))
  }, [applications])
  
  const handleOpenView = (application: any) => {
    setSelectedApplication(application)
    setViewModalOpen(true)
  }
  
  const handleDownloadPDF = (application: any) => {
    generateApplicationPDF(application)
  }

  return (
    <div className="min-h-screen bg-background">
      <ExpeditionHeader expedition={displayExpedition} isLoading={!displayExpedition} currentPage="applications" />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Student Applications</h1>
            <p className="text-sm text-gray-500 mt-1">
              {sortedApplications.length} application{sortedApplications.length !== 1 ? 's' : ''} submitted
            </p>
          </div>
        </div>
        
        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "80px" }}>Submitted</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "120px" }}>1st Choice</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "120px" }}>2nd Choice</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Career Goals</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "100px" }}>Resume</TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600" style={{ width: "100px" }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="border-b last:border-0">
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : sortedApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No applications submitted yet
                  </TableCell>
                </TableRow>
              ) : (
                sortedApplications.map((application: any) => (
                  <TableRow 
                    key={application.id} 
                    className="border-b last:border-0 transition-colors hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => handleOpenView(application)}
                  >
                    <TableCell className="h-14 px-4 text-sm text-gray-500">
                      {formatRelativeTime(application.created_at)}
                    </TableCell>
                    <TableCell className="h-14 px-4 text-sm font-medium text-gray-900">
                      {application.firstChoiceDepartment || "—"}
                    </TableCell>
                    <TableCell className="h-14 px-4 text-sm text-gray-700">
                      {application.secondChoiceDepartment || "—"}
                    </TableCell>
                    <TableCell className="h-14 px-4 text-sm text-gray-700 truncate" title={application.careerGoalsOrInterests}>
                      {application.careerGoalsOrInterests || "—"}
                    </TableCell>
                    <TableCell className="h-14 px-4 text-sm">
                      {application.resumeLink ? (
                        <a 
                          href={application.resumeLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="h-14 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadPDF(application)
                          }}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenView(application)
                          }}
                          title="View"
                        >
                          <Eye className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
      
      {/* View Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center justify-between">
              <span>Application Details</span>
              <span className="text-sm font-normal text-gray-500">
                {selectedApplication && formatDate(selectedApplication.created_at)}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {/* Department Choices */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">First Choice</p>
                  <p className="text-sm font-medium text-gray-900">{selectedApplication.firstChoiceDepartment || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Second Choice</p>
                  <p className="text-sm font-medium text-gray-900">{selectedApplication.secondChoiceDepartment || "—"}</p>
                </div>
              </div>
              
              {/* Why First Choice */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Why First Choice</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedApplication.whyFirstChoiceDepartment || "—"}</p>
              </div>
              
              {/* Why Second Choice */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Why Second Choice</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedApplication.whySecondChoiceDepartment || "—"}</p>
              </div>
              
              {/* Career Goals */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Career Goals or Interests</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedApplication.careerGoalsOrInterests || "—"}</p>
              </div>
              
              {/* Relevant Experience */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Relevant Experience or Skills</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedApplication.relevantExperienceOrSkills || "—"}</p>
              </div>
              
              {/* Professional Traits */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Professional Traits</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedApplication.professionalTraits || "—"}</p>
              </div>
              
              {/* Conflict Resolution */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Conflict Resolution Example</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedApplication.conflictResolutionExample || "—"}</p>
              </div>
              
              {/* Problem Solving */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Problem Solving Approach</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedApplication.problemSolvingApproach || "—"}</p>
              </div>
              
              {/* Perseverance */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Perseverance or Resilience Example</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedApplication.perseveranceOrResilienceExample || "—"}</p>
              </div>
              
              {/* Resume Link */}
              {selectedApplication.resumeLink && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Resume</p>
                  <a 
                    href={selectedApplication.resumeLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {selectedApplication.resumeLink}
                  </a>
                </div>
              )}
            </div>
          )}
          
          {/* Footer */}
          <div className="border-t pt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setViewModalOpen(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
            <Button
              onClick={() => selectedApplication && handleDownloadPDF(selectedApplication)}
              className="cursor-pointer"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <ApplicationsContent />
    </Suspense>
  )
}

