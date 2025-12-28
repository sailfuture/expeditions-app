"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, ExternalLink, Check, Pencil, Trash2, Eye, X } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { formatDistanceToNow } from "date-fns"
import { useIntakeSubmissions, useStudents } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { updateStudent, updateExpeditionsStudentInformation, deleteExpeditionsStudentInformation } from "@/lib/xano"
import { toast } from "sonner"
import { mutate } from "swr"
import { Spinner } from "@/components/ui/spinner"

export default function IntakeRecordsPage() {
  const router = useRouter()
  const { currentUser } = useCurrentUser()
  const { data: intakeSubmissions, isLoading } = useIntakeSubmissions()
  const { data: students } = useStudents()
  
  const [linkingId, setLinkingId] = useState<number | null>(null)
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null)
  
  // View modal state
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingSubmission, setViewingSubmission] = useState<any>(null)
  
  // Edit dialog state (in view modal)
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingSubmission, setDeletingSubmission] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Admin only
  if (currentUser && currentUser.role !== "Admin") {
    router.push("/dashboard")
    return null
  }

  const handleLinkToStudent = async (intakeId: number, studentId: number) => {
    setLinkingId(intakeId)
    try {
      const student = students?.find((s: any) => s.id === studentId)
      if (!student) {
        toast.error("Student not found")
        setLinkingId(null)
        return
      }
      
      // Include all required fields in the PATCH request
      const updateData = {
        students_id: studentId,
        name: student.name,
        expeditions_id: Array.isArray(student.expeditions_id) ? student.expeditions_id : [student.expeditions_id].filter(Boolean),
        grade: student.grade || "",
        expeditions_student_information_id: intakeId,
      }
      
      console.log("Linking intake form to student:", updateData)
      await updateStudent(studentId, updateData)
      mutate("students")
      toast.success("Intake form linked to student")
    } catch (error) {
      console.error("Failed to link intake form:", error)
      toast.error("Failed to link intake form")
    } finally {
      setLinkingId(null)
    }
  }

  const handleUnlinkStudent = async (intakeId: number, studentId: number) => {
    setUnlinkingId(intakeId)
    try {
      const student = students?.find((s: any) => s.id === studentId)
      if (!student) {
        toast.error("Student not found")
        setUnlinkingId(null)
        return
      }
      
      // Remove the link by setting expeditions_student_information_id to null
      const updateData = {
        students_id: studentId,
        name: student.name,
        expeditions_id: Array.isArray(student.expeditions_id) ? student.expeditions_id : [student.expeditions_id].filter(Boolean),
        grade: student.grade || "",
        expeditions_student_information_id: null,
      }
      
      await updateStudent(studentId, updateData)
      mutate("students")
      toast.success("Student unlinked from intake record")
    } catch (error) {
      console.error("Failed to unlink student:", error)
      toast.error("Failed to unlink student")
    } finally {
      setUnlinkingId(null)
    }
  }

  const handleOpenView = (submission: any) => {
    setViewingSubmission(submission)
    setEditFormData({ ...submission })
    setIsEditing(false)
    setViewModalOpen(true)
  }

  const handleStartEdit = () => {
    setEditFormData({ ...viewingSubmission })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditFormData({ ...viewingSubmission })
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    if (!viewingSubmission) return
    
    setIsSaving(true)
    try {
      await updateExpeditionsStudentInformation(viewingSubmission.id, {
        expeditions_student_information_id: viewingSubmission.id,
        ...editFormData,
      })
      mutate("expeditions_student_information")
      toast.success("Intake record updated")
      setViewingSubmission({ ...viewingSubmission, ...editFormData })
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to update intake record:", error)
      toast.error("Failed to update intake record")
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenDelete = (submission: any) => {
    setDeletingSubmission(submission)
    setDeleteDialogOpen(true)
  }

  const handleDeleteFromModal = () => {
    setDeleteDialogOpen(true)
    setDeletingSubmission(viewingSubmission)
  }

  const handleConfirmDelete = async () => {
    if (!deletingSubmission) return
    
    setIsDeleting(true)
    try {
      // Check if linked to a student, if so, unlink first
      const linkedStudent = getLinkedStudent(deletingSubmission.id)
      if (linkedStudent) {
        await updateStudent(linkedStudent.id, {
          students_id: linkedStudent.id,
          name: linkedStudent.name,
          expeditions_id: Array.isArray(linkedStudent.expeditions_id) ? linkedStudent.expeditions_id : [linkedStudent.expeditions_id].filter(Boolean),
          grade: linkedStudent.grade || "",
          expeditions_student_information_id: null,
        })
      }
      
      await deleteExpeditionsStudentInformation(deletingSubmission.id)
      mutate("expeditions_student_information")
      mutate("students")
      toast.success("Intake record deleted")
      setDeleteDialogOpen(false)
      setDeletingSubmission(null)
      setViewModalOpen(false)
      setViewingSubmission(null)
    } catch (error) {
      console.error("Failed to delete intake record:", error)
      toast.error("Failed to delete intake record")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "—"
    try {
      const [year, month, day] = dateString.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return dateString
    }
  }

  // Sort by most recent first
  const sortedSubmissions = intakeSubmissions?.slice().sort((a: any, b: any) => b.id - a.id)

  // Check if intake is already linked
  const isLinked = (intakeId: number) => {
    return students?.some((s: any) => s.expeditions_student_information_id === intakeId)
  }

  const getLinkedStudent = (intakeId: number) => {
    return students?.find((s: any) => s.expeditions_student_information_id === intakeId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold">Intake Records</h1>
              <p className="text-muted-foreground mt-2">
                All student intake form submissions
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push("/intake")} className="cursor-pointer bg-white">
              <FileText className="h-4 w-4 mr-2" />
              New Intake Form
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {isLoading ? (
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[200px]">Student Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[140px]">Submitted</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[100px]">Status</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[220px]">Link to Student</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-16 px-6 w-[200px]"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="h-16 px-6 w-[140px]"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-16 px-6 w-[100px]"><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="h-16 px-6 w-[220px]"><Skeleton className="h-8 w-40" /></TableCell>
                    <TableCell className="h-16 px-6 w-[120px]"><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !sortedSubmissions || sortedSubmissions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-600">No intake submissions found</p>
              <p className="text-sm text-gray-500 mt-1">Completed intake forms will appear here.</p>
            </div>
          ) : (
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[200px]">Student Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[140px]">Submitted</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[100px]">Status</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[220px]">Link to Student</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSubmissions.map((submission: any) => {
                  const linked = isLinked(submission.id)
                  const linkedStudent = getLinkedStudent(submission.id)
                  
                  return (
                    <TableRow 
                      key={submission.id} 
                      className="hover:bg-gray-50/50"
                    >
                      <TableCell className="h-16 px-6 w-[200px]">
                        <div className="font-medium text-gray-900 truncate">
                          {submission.student_name || <span className="text-gray-400">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="h-16 px-6 w-[140px]">
                        <span className="text-sm text-gray-600">
                          {submission.created_at 
                            ? formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="h-16 px-6 w-[100px]">
                        {linked ? (
                          <Badge className="bg-green-50 text-gray-900 border border-green-200">
                            <Check className="h-3 w-3 mr-1" />
                            Linked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-white border-gray-200 text-gray-600">
                            Unlinked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="h-16 px-6 w-[220px]">
                        {linked && linkedStudent ? (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-600 truncate max-w-[120px]" title={linkedStudent.name}>
                              {linkedStudent.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 cursor-pointer hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/student/${linkedStudent.id}`)
                              }}
                              title="View student"
                            >
                              <ExternalLink className="h-3 w-3 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 cursor-pointer hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUnlinkStudent(submission.id, linkedStudent.id)
                              }}
                              disabled={unlinkingId === submission.id}
                              title="Unlink student"
                            >
                              {unlinkingId === submission.id ? (
                                <Spinner size="sm" className="h-3 w-3" />
                              ) : (
                                <X className="h-3 w-3 text-gray-500" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Select
                            onValueChange={(value) => handleLinkToStudent(submission.id, parseInt(value))}
                            disabled={linkingId === submission.id}
                          >
                            <SelectTrigger className="w-full h-8 text-sm cursor-pointer bg-white border-gray-300 focus:ring-2 focus:ring-offset-0">
                              {linkingId === submission.id ? (
                                <span className="flex items-center gap-2">
                                  <Spinner size="sm" className="h-3 w-3" />
                                  Linking...
                                </span>
                              ) : (
                                <SelectValue placeholder="Select student..." />
                              )}
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-[100]">
                              {students?.filter((s: any) => !s.expeditions_student_information_id).length === 0 ? (
                                <div className="py-2 px-3 text-sm text-gray-500">No unlinked students available</div>
                              ) : (
                                students?.filter((s: any) => !s.expeditions_student_information_id).map((student: any) => (
                                  <SelectItem key={student.id} value={student.id.toString()} className="cursor-pointer">
                                    {student.name} - {student._expeditions?.name || "No expedition"}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="h-16 px-6 w-[120px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleOpenView(submission)}
                            title="View"
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              handleOpenView(submission)
                              setTimeout(() => setIsEditing(true), 100)
                            }}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleOpenDelete(submission)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-gray-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      {/* View/Edit Modal */}
      <Dialog open={viewModalOpen} onOpenChange={(open) => {
        setViewModalOpen(open)
        if (!open) {
          setIsEditing(false)
          setViewingSubmission(null)
        }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="border-b p-6 pb-4 shrink-0">
            <DialogTitle className="text-xl">
              {viewingSubmission?.student_name || "Intake Record"}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "Edit intake record details" : "View intake record details"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Student Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Student Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Student Name</Label>
                  {isEditing ? (
                    <Input
                      value={editFormData.student_name || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, student_name: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{viewingSubmission?.student_name || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Date of Birth</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editFormData.date_of_birth || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{formatDate(viewingSubmission?.date_of_birth)}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Shirt Size</Label>
                  {isEditing ? (
                    <Input
                      value={editFormData.student_shirt_size || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, student_shirt_size: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{viewingSubmission?.student_shirt_size || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Swimming Level</Label>
                  {isEditing ? (
                    <Input
                      value={editFormData.swimming_level || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, swimming_level: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{viewingSubmission?.swimming_level || "—"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Passport Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Passport Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Passport Number</Label>
                  {isEditing ? (
                    <Input
                      value={editFormData.passport_number || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, passport_number: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{viewingSubmission?.passport_number || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Issued Date</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editFormData.passport_issued_date || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, passport_issued_date: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{formatDate(viewingSubmission?.passport_issued_date)}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Expiration Date</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editFormData.passport_expiration_date || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, passport_expiration_date: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{formatDate(viewingSubmission?.passport_expiration_date)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Medical Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs text-gray-500">Health Conditions</Label>
                  {isEditing ? (
                    <Textarea
                      value={editFormData.health_conditions || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, health_conditions: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm">{viewingSubmission?.health_conditions || "—"}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-gray-500">Medical History</Label>
                  {isEditing ? (
                    <Textarea
                      value={editFormData.medical_history || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, medical_history: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm">{viewingSubmission?.medical_history || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Allergies</Label>
                  {isEditing ? (
                    <Textarea
                      value={editFormData.allergies || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, allergies: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm">{viewingSubmission?.allergies || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Dietary Restrictions</Label>
                  {isEditing ? (
                    <Textarea
                      value={editFormData.dietary_restrictions || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, dietary_restrictions: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm">{viewingSubmission?.dietary_restrictions || "—"}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-gray-500">Other Medical Information</Label>
                  {isEditing ? (
                    <Textarea
                      value={editFormData.other_medical_info || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, other_medical_info: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm">{viewingSubmission?.other_medical_info || "—"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Medications */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Medications</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-500">Morning Medication:</Label>
                    {isEditing ? (
                      <Switch
                        checked={editFormData.takes_morning_medication || false}
                        onCheckedChange={(checked) => setEditFormData({ ...editFormData, takes_morning_medication: checked })}
                      />
                    ) : (
                      <Badge variant={viewingSubmission?.takes_morning_medication ? "default" : "outline"}>
                        {viewingSubmission?.takes_morning_medication ? "Yes" : "No"}
                      </Badge>
                    )}
                  </div>
                </div>
                {(viewingSubmission?.takes_morning_medication || editFormData.takes_morning_medication) && (
                  <div>
                    <Label className="text-xs text-gray-500">Morning Medication Details</Label>
                    {isEditing ? (
                      <Textarea
                        value={editFormData.morning_medication_details || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, morning_medication_details: e.target.value })}
                        className="mt-1"
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm">{viewingSubmission?.morning_medication_details || "—"}</p>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-500">Evening Medication:</Label>
                    {isEditing ? (
                      <Switch
                        checked={editFormData.takes_evening_medication || false}
                        onCheckedChange={(checked) => setEditFormData({ ...editFormData, takes_evening_medication: checked })}
                      />
                    ) : (
                      <Badge variant={viewingSubmission?.takes_evening_medication ? "default" : "outline"}>
                        {viewingSubmission?.takes_evening_medication ? "Yes" : "No"}
                      </Badge>
                    )}
                  </div>
                </div>
                {(viewingSubmission?.takes_evening_medication || editFormData.takes_evening_medication) && (
                  <div>
                    <Label className="text-xs text-gray-500">Evening Medication Details</Label>
                    {isEditing ? (
                      <Textarea
                        value={editFormData.evening_medication_details || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, evening_medication_details: e.target.value })}
                        className="mt-1"
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm">{viewingSubmission?.evening_medication_details || "—"}</p>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-500">Additional Medications:</Label>
                    {isEditing ? (
                      <Switch
                        checked={editFormData.takes_additional_medications || false}
                        onCheckedChange={(checked) => setEditFormData({ ...editFormData, takes_additional_medications: checked })}
                      />
                    ) : (
                      <Badge variant={viewingSubmission?.takes_additional_medications ? "default" : "outline"}>
                        {viewingSubmission?.takes_additional_medications ? "Yes" : "No"}
                      </Badge>
                    )}
                  </div>
                </div>
                {(viewingSubmission?.takes_additional_medications || editFormData.takes_additional_medications) && (
                  <div>
                    <Label className="text-xs text-gray-500">Other Medications Details</Label>
                    {isEditing ? (
                      <Textarea
                        value={editFormData.other_medications_details || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, other_medications_details: e.target.value })}
                        className="mt-1"
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm">{viewingSubmission?.other_medications_details || "—"}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Behavioral Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Behavioral & Emotional Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs text-gray-500">Behavioral/Emotional Conditions</Label>
                  {isEditing ? (
                    <Textarea
                      value={editFormData.behavioral_emotional_conditions || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, behavioral_emotional_conditions: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm">{viewingSubmission?.behavioral_emotional_conditions || "—"}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-gray-500">Behavior Management Strategies</Label>
                  {isEditing ? (
                    <Textarea
                      value={editFormData.behavior_management_strategies || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, behavior_management_strategies: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm">{viewingSubmission?.behavior_management_strategies || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Fears or Anxieties</Label>
                  {isEditing ? (
                    <Textarea
                      value={editFormData.fears_or_anxieties || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, fears_or_anxieties: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm">{viewingSubmission?.fears_or_anxieties || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Separation Concerns</Label>
                  {isEditing ? (
                    <Textarea
                      value={editFormData.separation_concerns || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, separation_concerns: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm">{viewingSubmission?.separation_concerns || "—"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Treatment Goals */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Treatment & Accommodations</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Treatment Goals</Label>
                  {isEditing ? (
                    <Textarea
                      value={editFormData.treatment_goals || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, treatment_goals: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm">{viewingSubmission?.treatment_goals || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Additional Accommodations</Label>
                  {isEditing ? (
                    <Textarea
                      value={editFormData.additional_accommodations || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, additional_accommodations: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm">{viewingSubmission?.additional_accommodations || "—"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Primary Contact</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Name</Label>
                  {isEditing ? (
                    <Input
                      value={editFormData.primary_contact_name || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, primary_contact_name: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{viewingSubmission?.primary_contact_name || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Phone</Label>
                  {isEditing ? (
                    <Input
                      value={editFormData.primary_contact_phone || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, primary_contact_phone: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{viewingSubmission?.primary_contact_phone || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  {isEditing ? (
                    <Input
                      value={editFormData.primary_contact_email || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, primary_contact_email: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{viewingSubmission?.primary_contact_email || "—"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Emergency Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Name</Label>
                  {isEditing ? (
                    <Input
                      value={editFormData.emergency_contact_name || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_name: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{viewingSubmission?.emergency_contact_name || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Relationship</Label>
                  {isEditing ? (
                    <Input
                      value={editFormData.emergency_contact_relationship || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_relationship: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{viewingSubmission?.emergency_contact_relationship || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Phone</Label>
                  {isEditing ? (
                    <Input
                      value={editFormData.emergency_contact_phone || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_phone: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{viewingSubmission?.emergency_contact_phone || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  {isEditing ? (
                    <Input
                      value={editFormData.emergency_contact_email || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_email: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium">{viewingSubmission?.emergency_contact_email || "—"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Fixed Footer with Actions */}
          <div className="border-t p-4 shrink-0 bg-gray-50 flex items-center justify-end gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleDeleteFromModal}
                  className="cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button
                  onClick={handleStartEdit}
                  className="cursor-pointer"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Intake Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this intake record for{" "}
              <span className="font-semibold">{deletingSubmission?.student_name || "this student"}</span>?
              {getLinkedStudent(deletingSubmission?.id) && (
                <span className="block mt-2 text-amber-600">
                  This record is linked to a student. The link will be removed before deletion.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

