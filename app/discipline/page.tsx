"use client"

import { useMemo, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import useSWR, { mutate } from "swr"
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
import { useExpeditions, useStudentsByExpedition, useTeachersByExpedition } from "@/lib/hooks/use-expeditions"
import { AlertTriangle, Download, Plus, Eye, Pencil, Trash2, FileWarning, Calendar } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { 
  getExpeditionDiscipline, 
  createExpeditionDiscipline, 
  updateExpeditionDiscipline, 
  deleteExpeditionDiscipline 
} from "@/lib/xano"
import { Spinner } from "@/components/ui/spinner"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import jsPDF from "jspdf"
import { addPDFHeader } from "@/lib/pdf-generator"

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

// Helper function to format relative time (abbreviated)
function formatRelativeTime(timestamp: number | null) {
  if (!timestamp) return "—"
  try {
    const date = new Date(timestamp)
    const distance = formatDistanceToNow(date, { addSuffix: false })
    // Abbreviate: "2 days" -> "2d", "3 hours" -> "3h", "5 minutes" -> "5m"
    return distance
      .replace(/ days?/, 'd')
      .replace(/ hours?/, 'h')
      .replace(/ minutes?/, 'm')
      .replace(/ seconds?/, 's')
      .replace(/about /, '')
      .replace(/less than /, '<')
      .replace(/over /, '>')
  } catch {
    return "—"
  }
}

// Generate PDF for discipline record
function generateDisciplinePDF(record: any, studentName: string, staffName: string) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  
  const docType = record.isReferral ? "Referral" : "Infraction"
  
  // Add school header
  let yPos = addPDFHeader(doc)
  
  // Title
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text(`Student ${docType} Report`, pageWidth / 2, yPos, { align: "center" })
  yPos += 10
  
  // Document type badge
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  if (record.isReferral) {
    doc.setFillColor(239, 68, 68) // Red
    doc.roundedRect(pageWidth / 2 - 20, yPos - 5, 40, 7, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.text("REFERRAL", pageWidth / 2, yPos, { align: "center" })
  } else {
    doc.setFillColor(234, 179, 8) // Yellow
    doc.roundedRect(pageWidth / 2 - 20, yPos - 5, 40, 7, 2, 2, 'F')
    doc.setTextColor(0, 0, 0)
    doc.text("INFRACTION", pageWidth / 2, yPos, { align: "center" })
  }
  doc.setTextColor(0, 0, 0)
  
  yPos += 12
  
  // Info section
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Student:", margin, yPos)
  doc.setFont("helvetica", "normal")
  doc.text(studentName, margin + 30, yPos)
  
  yPos += 8
  doc.setFont("helvetica", "bold")
  doc.text("Date:", margin, yPos)
  doc.setFont("helvetica", "normal")
  doc.text(formatDate(record.date), margin + 30, yPos)
  
  yPos += 8
  doc.setFont("helvetica", "bold")
  doc.text("Staff:", margin, yPos)
  doc.setFont("helvetica", "normal")
  doc.text(staffName, margin + 30, yPos)
  
  yPos += 8
  doc.setFont("helvetica", "bold")
  doc.text("Reason:", margin, yPos)
  doc.setFont("helvetica", "normal")
  doc.text(record.reason || "—", margin + 30, yPos)
  
  yPos += 8
  doc.setFont("helvetica", "bold")
  doc.text("Consequence:", margin, yPos)
  doc.setFont("helvetica", "normal")
  doc.text(record.consequence || "—", margin + 45, yPos)
  
  // Summary section
  yPos += 15
  doc.setFont("helvetica", "bold")
  doc.text("Summary of Incident:", margin, yPos)
  yPos += 7
  doc.setFont("helvetica", "normal")
  const summaryLines = doc.splitTextToSize(record.summary_of_incident || "No summary provided.", contentWidth)
  doc.text(summaryLines, margin, yPos)
  yPos += summaryLines.length * 5 + 5
  
  // Action taken section
  yPos += 5
  doc.setFont("helvetica", "bold")
  doc.text("Action Taken:", margin, yPos)
  yPos += 7
  doc.setFont("helvetica", "normal")
  const actionLines = doc.splitTextToSize(record.action_taken || "No action documented.", contentWidth)
  doc.text(actionLines, margin, yPos)
  
  // Footer
  doc.setFontSize(9)
  doc.setTextColor(128, 128, 128)
  doc.text(`Generated on ${format(new Date(), 'MMM d, yyyy h:mm a')}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" })
  
  // Save
  const fileName = `${studentName.replace(/\s+/g, '_')}_${docType}_${record.date}.pdf`
  doc.save(fileName)
}

function DisciplinePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const expeditionId = searchParams.get("expedition")
  
  // Data hooks
  const { data: expeditions, isLoading: loadingExpeditions } = useExpeditions()
  const { data: students } = useStudentsByExpedition(expeditionId ? parseInt(expeditionId) : null)
  const { data: staff } = useTeachersByExpedition(expeditionId ? parseInt(expeditionId) : null)
  
  const expedition = useMemo(() => {
    if (!expeditions || !expeditionId) return null
    return expeditions.find((e: any) => e.id === parseInt(expeditionId))
  }, [expeditions, expeditionId])
  
  // Discipline records
  const { data: disciplineRecords, isLoading: loadingDiscipline, error: disciplineError } = useSWR(
    expeditionId ? `discipline_${expeditionId}` : null,
    expeditionId ? () => getExpeditionDiscipline(parseInt(expeditionId)) : null
  )
  
  // State
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    students_id: "",
    date: new Date().toISOString().split('T')[0],
    isReferral: false,
    reason: "",
    summary_of_incident: "",
    consequence: "",
    expedition_staff_id: "",
    action_taken: "",
  })
  
  const resetForm = () => {
    setFormData({
      students_id: "",
      date: new Date().toISOString().split('T')[0],
      isReferral: false,
      reason: "",
      summary_of_incident: "",
      consequence: "",
      expedition_staff_id: "",
      action_taken: "",
    })
  }
  
  const handleOpenView = (record: any) => {
    setSelectedRecord(record)
    setFormData({
      students_id: record.students_id?.toString() || "",
      date: record.date || "",
      isReferral: record.isReferral || false,
      reason: record.reason || "",
      summary_of_incident: record.summary_of_incident || "",
      consequence: record.consequence || "",
      expedition_staff_id: record.expedition_staff_id?.toString() || "",
      action_taken: record.action_taken || "",
    })
    setIsEditing(false)
    setViewModalOpen(true)
  }
  
  const handleOpenCreate = () => {
    resetForm()
    setCreateModalOpen(true)
  }
  
  const handleCreate = async () => {
    if (!expeditionId) return
    
    if (!formData.students_id || !formData.date || !formData.reason) {
      toast.error("Please fill in required fields: Student, Date, and Reason")
      return
    }
    
    setIsSaving(true)
    try {
      await createExpeditionDiscipline({
        expeditions_id: parseInt(expeditionId),
        students_id: parseInt(formData.students_id),
        date: formData.date,
        isReferral: formData.isReferral,
        reason: formData.reason,
        summary_of_incident: formData.summary_of_incident,
        consequence: formData.consequence,
        expedition_staff_id: parseInt(formData.expedition_staff_id) || 0,
        action_taken: formData.action_taken,
      })
      
      toast.success(`${formData.isReferral ? "Referral" : "Infraction"} created successfully`)
      mutate(`discipline_${expeditionId}`)
      setCreateModalOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error creating discipline record:", error)
      toast.error("Failed to create record")
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleSaveEdit = async () => {
    if (!selectedRecord) return
    
    setIsSaving(true)
    try {
      await updateExpeditionDiscipline(selectedRecord.id, {
        students_id: parseInt(formData.students_id),
        date: formData.date,
        isReferral: formData.isReferral,
        reason: formData.reason,
        summary_of_incident: formData.summary_of_incident,
        consequence: formData.consequence,
        expedition_staff_id: parseInt(formData.expedition_staff_id) || 0,
        action_taken: formData.action_taken,
      })
      
      toast.success("Record updated successfully")
      mutate(`discipline_${expeditionId}`)
      setIsEditing(false)
      setViewModalOpen(false)
    } catch (error) {
      console.error("Error updating record:", error)
      toast.error("Failed to update record")
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleDelete = async () => {
    if (!selectedRecord) return
    
    setIsDeleting(true)
    try {
      await deleteExpeditionDiscipline(selectedRecord.id)
      toast.success("Record deleted successfully")
      mutate(`discipline_${expeditionId}`)
      setDeleteDialogOpen(false)
      setViewModalOpen(false)
      setSelectedRecord(null)
    } catch (error) {
      console.error("Error deleting record:", error)
      toast.error("Failed to delete record")
    } finally {
      setIsDeleting(false)
    }
  }
  
  const handleDownloadPDF = (record: any) => {
    const student = students?.find((s: any) => s.id === record.students_id)
    const staffMember = staff?.find((s: any) => s.id === record.expedition_staff_id)
    generateDisciplinePDF(
      record, 
      `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "Unknown Student",
      staffMember?.name || "Unknown Staff"
    )
    toast.success("PDF downloaded")
  }
  
  // Get student and staff names for display
  const getStudentName = (id: number) => {
    const student = students?.find((s: any) => s.id === id)
    return `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "Unknown"
  }
  
  const getStaffName = (id: number) => {
    const staffMember = staff?.find((s: any) => s.id === id)
    return staffMember?.name || "Unknown"
  }
  
  // Sort records by date (newest first)
  const sortedRecords = useMemo(() => {
    if (!disciplineRecords) return []
    return [...disciplineRecords].sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA
    })
  }, [disciplineRecords])
  
  // Reason options
  const reasonOptions = [
    "Physically Dangerous",
    "Verbally Aggressive",
    "Property Damage",
    "Insubordination",
    "Safety Violation",
    "Academic Dishonesty",
    "Substance Use",
    "Unauthorized Absence",
    "Other",
  ]
  
  // Consequence options
  const consequenceOptions = [
    "Shore Leave Revoked",
    "Loss of Privileges",
    "Parent Contact",
    "Written Warning",
    "Community Service",
    "Suspension from Activity",
    "Other",
  ]

  return (
    <div className="min-h-screen bg-gray-50/50">
      <ExpeditionHeader 
        expedition={expedition} 
        isLoading={loadingExpeditions}
        currentPage="discipline"
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Discipline Records</h1>
            <p className="text-muted-foreground">
              Track infractions and referrals for expedition students
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            New Record
          </Button>
        </div>
        
        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "80px" }}>Created</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "90px" }}>Type</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "150px" }}>Student</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "100px" }}>Date</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Reason</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Consequence</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600" style={{ width: "120px" }}>Staff</TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600" style={{ width: "100px" }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingDiscipline ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="border-b last:border-0">
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : sortedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No discipline records found
                  </TableCell>
                </TableRow>
              ) : (
                sortedRecords.map((record: any) => (
                  <TableRow 
                    key={record.id} 
                    className="border-b last:border-0 transition-colors hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => handleOpenView(record)}
                  >
                    <TableCell className="h-14 px-4 text-muted-foreground text-sm">
                      {formatRelativeTime(record.created_at)}
                    </TableCell>
                    <TableCell className="h-14 px-4">
                      {record.isReferral ? (
                        <Badge variant="destructive" className="text-xs">Referral</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">Infraction</Badge>
                      )}
                    </TableCell>
                    <TableCell className="h-14 px-4 font-medium text-sm text-gray-900">{getStudentName(record.students_id)}</TableCell>
                    <TableCell className="h-14 px-4 text-sm text-gray-700">{formatDate(record.date)}</TableCell>
                    <TableCell className="h-14 px-4 text-sm text-gray-700 truncate" title={record.reason}>
                      {record.reason}
                    </TableCell>
                    <TableCell className="h-14 px-4 text-sm text-gray-700 truncate" title={record.consequence}>
                      {record.consequence || "—"}
                    </TableCell>
                    <TableCell className="h-14 px-4 text-sm text-gray-700">{getStaffName(record.expedition_staff_id)}</TableCell>
                    <TableCell className="h-14 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadPDF(record)
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
                            handleOpenView(record)
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
      
      {/* View/Edit Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRecord?.isReferral ? (
                <Badge variant="destructive">Referral</Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Infraction</Badge>
              )}
              <span>{getStudentName(selectedRecord?.students_id)}</span>
            </DialogTitle>
            <DialogDescription>
              {formatDate(selectedRecord?.date)} • Filed by {getStaffName(selectedRecord?.expedition_staff_id)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Student *</Label>
                    <Select value={formData.students_id} onValueChange={(v) => setFormData(prev => ({ ...prev, students_id: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students?.map((s: any) => (
                          <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {formData.date ? formatDate(formData.date) : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={formData.date ? new Date(formData.date + 'T00:00:00') : undefined}
                          onSelect={(date) => date && setFormData(prev => ({ ...prev, date: date.toISOString().split('T')[0] }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isReferral}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, isReferral: v }))}
                  />
                  <Label>Referral (vs Infraction)</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reason *</Label>
                    <Select value={formData.reason} onValueChange={(v) => setFormData(prev => ({ ...prev, reason: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {reasonOptions.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Consequence</Label>
                    <Select value={formData.consequence} onValueChange={(v) => setFormData(prev => ({ ...prev, consequence: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select consequence" />
                      </SelectTrigger>
                      <SelectContent>
                        {consequenceOptions.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Staff Member</Label>
                  <Select value={formData.expedition_staff_id} onValueChange={(v) => setFormData(prev => ({ ...prev, expedition_staff_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Summary of Incident</Label>
                  <Textarea
                    value={formData.summary_of_incident}
                    onChange={(e) => setFormData(prev => ({ ...prev, summary_of_incident: e.target.value }))}
                    rows={4}
                    placeholder="Describe what happened..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Action Taken</Label>
                  <Textarea
                    value={formData.action_taken}
                    onChange={(e) => setFormData(prev => ({ ...prev, action_taken: e.target.value }))}
                    rows={3}
                    placeholder="What actions were taken..."
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Reason</Label>
                    <p className="font-medium">{selectedRecord?.reason || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Consequence</Label>
                    <p className="font-medium">{selectedRecord?.consequence || "—"}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground text-sm">Summary of Incident</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selectedRecord?.summary_of_incident || "No summary provided."}</p>
                </div>
                
                <div>
                  <Label className="text-muted-foreground text-sm">Action Taken</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selectedRecord?.action_taken || "No action documented."}</p>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter className="border-t pt-4">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving ? <Spinner className="mr-2" /> : null}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => selectedRecord && handleDownloadPDF(selectedRecord)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Record</DialogTitle>
            <DialogDescription>
              Document a new infraction or referral for a student
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Student *</Label>
                <Select value={formData.students_id} onValueChange={(v) => setFormData(prev => ({ ...prev, students_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.date ? formatDate(formData.date) : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={formData.date ? new Date(formData.date + 'T00:00:00') : undefined}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, date: date.toISOString().split('T')[0] }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isReferral}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, isReferral: v }))}
              />
              <Label>Referral (vs Infraction)</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select value={formData.reason} onValueChange={(v) => setFormData(prev => ({ ...prev, reason: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonOptions.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Consequence</Label>
                <Select value={formData.consequence} onValueChange={(v) => setFormData(prev => ({ ...prev, consequence: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select consequence" />
                  </SelectTrigger>
                  <SelectContent>
                    {consequenceOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={formData.expedition_staff_id} onValueChange={(v) => setFormData(prev => ({ ...prev, expedition_staff_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Summary of Incident</Label>
              <Textarea
                value={formData.summary_of_incident}
                onChange={(e) => setFormData(prev => ({ ...prev, summary_of_incident: e.target.value }))}
                rows={4}
                placeholder="Describe what happened..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Action Taken</Label>
              <Textarea
                value={formData.action_taken}
                onChange={(e) => setFormData(prev => ({ ...prev, action_taken: e.target.value }))}
                rows={3}
                placeholder="What actions were taken..."
              />
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <Spinner className="mr-2" /> : null}
              Create {formData.isReferral ? "Referral" : "Infraction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {selectedRecord?.isReferral ? "referral" : "infraction"} record?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Spinner className="mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function DisciplinePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50/50 flex items-center justify-center"><Spinner /></div>}>
      <DisciplinePageContent />
    </Suspense>
  )
}

