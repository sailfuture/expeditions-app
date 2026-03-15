"use client"

import { use, useState, useRef } from "react"
import { useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, FileText, ExternalLink, Pencil, FileDown, Upload, Trash2 } from "lucide-react"
import { ExpeditionHeader } from "@/components/expedition-header"
import { Switch } from "@/components/ui/switch"
import { getStudentsByExpedition, getTeachersByExpedition, getExpeditionAssignmentsByExpedition, updateExpeditionAssignment, updateStudent, updateTeacher } from "@/lib/xano"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PassportManifestPage({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)
  const expeditionId = parseInt(id)

  const { data: allExpeditions, isLoading: expeditionsLoading } = useExpeditions()
  const expedition = allExpeditions?.find((e: any) => e.id === expeditionId)

  const { data: students, isLoading: studentsLoading } = useSWR(
    expeditionId ? `students_expedition_${expeditionId}` : null,
    () => getStudentsByExpedition(expeditionId)
  )

  const { data: staff, isLoading: staffLoading } = useSWR(
    expeditionId ? `staff_expedition_${expeditionId}` : null,
    () => getTeachersByExpedition(expeditionId)
  )

  const { data: assignments, isLoading: assignmentsLoading } = useSWR(
    expeditionId ? `assignments_expedition_${expeditionId}` : null,
    () => getExpeditionAssignmentsByExpedition(expeditionId)
  )

  const isLoading = expeditionsLoading || studentsLoading || staffLoading || assignmentsLoading

  // Filter state: "active" | "inactive" | "all"
  const [statusFilter, setStatusFilter] = useState<string>("active")

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [removePhotoConfirmOpen, setRemovePhotoConfirmOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editFormData, setEditFormData] = useState({
    crew_role: "",
    crew_status: "",
    dob: null as string | null,
    gender: "",
    nationality: "",
    passport_number: "",
    issue_date: null as string | null,
    expiration_date: null as string | null,
    passport_photo: "",
  })

  const openEditDialog = (person: any) => {
    setEditingPerson(person)
    setEditFormData({
      crew_role: person.crew_role || "",
      crew_status: person.crew_status || "",
      dob: person.dob || null,
      gender: person.gender || "",
      nationality: person.nationality || "",
      passport_number: person.passport_number || "",
      issue_date: person.issue_date || null,
      expiration_date: person.expiration_date || null,
      passport_photo: person.passport_photo || "",
    })
    setEditDialogOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!editingPerson) return

    setIsSubmitting(true)
    try {
      if (editingPerson.type === "Staff") {
        await updateTeacher(editingPerson.id, {
          crew_role: editFormData.crew_role,
          crew_status: editFormData.crew_status,
          dob: editFormData.dob,
          gender: editFormData.gender,
          nationality: editFormData.nationality,
          passport_number: editFormData.passport_number,
          passport_issue_date: editFormData.issue_date,
          passport_expiration_date: editFormData.expiration_date,
          passport_photo: editFormData.passport_photo,
        })
      } else {
        await updateStudent(editingPerson.id, {
          students_id: editingPerson.id,
          crew_position: editFormData.crew_role,
          crew_status: editFormData.crew_status,
          dob: editFormData.dob,
          gender: editFormData.gender,
          nationality: editFormData.nationality,
          passport_number: editFormData.passport_number,
          issue_date: editFormData.issue_date,
          expiration_date: editFormData.expiration_date,
          passport_photo: editFormData.passport_photo,
        })
      }

      // Revalidate both SWR caches
      mutate(`students_expedition_${expeditionId}`)
      mutate(`staff_expedition_${expeditionId}`)
      mutate("teachers")
      mutate("students")

      toast.success(`${editingPerson.name} updated successfully`)
      setEditDialogOpen(false)
    } catch (error) {
      console.error("Failed to update:", error)
      toast.error("Failed to update record")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingPerson) return

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ""

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("person_id", editingPerson.id.toString())
      formData.append("person_type", editingPerson.type === "Staff" ? "staff" : "student")

      const res = await fetch("/api/upload-passport-photo", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Upload failed")
      }

      const data = await res.json()
      setEditFormData(prev => ({ ...prev, passport_photo: data.url }))

      // Revalidate SWR caches
      mutate(`students_expedition_${expeditionId}`)
      mutate(`staff_expedition_${expeditionId}`)
      mutate("teachers")
      mutate("students")

      toast.success("Passport photo uploaded to Google Drive")
    } catch (error: any) {
      console.error("Photo upload failed:", error)
      toast.error(error.message || "Failed to upload photo")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!editingPerson) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/upload-passport-photo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: editingPerson.id,
          person_type: editingPerson.type === "Staff" ? "staff" : "student",
          photo_url: editFormData.passport_photo,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to remove photo")
      }

      setEditFormData(prev => ({ ...prev, passport_photo: "" }))
      mutate(`students_expedition_${expeditionId}`)
      mutate(`staff_expedition_${expeditionId}`)
      mutate("teachers")
      mutate("students")
      toast.success("Passport photo removed")
    } catch (error: any) {
      console.error("Failed to remove photo:", error)
      toast.error(error.message || "Failed to remove photo")
    } finally {
      setIsSubmitting(false)
      setRemovePhotoConfirmOpen(false)
    }
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "in", format: "letter" })

    // Title
    const title = expedition?.name ? `${expedition.name} — Passport Manifest` : "Passport Manifest"
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(title, 0.5, 0.5)

    // Expedition details
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80)

    let detailY = 0.75
    const leftCol = 0.5
    const rightCol = 3.5

    if (expedition?.startDate || expedition?.endDate) {
      doc.setFont("helvetica", "bold")
      doc.text("Dates:", leftCol, detailY)
      doc.setFont("helvetica", "normal")
      doc.text(`${expedition.startDate || "—"} to ${expedition.endDate || "—"}`, leftCol + 0.5, detailY)
    }
    if (expedition?._schoolterms?.full_name) {
      doc.setFont("helvetica", "bold")
      doc.text("Term:", rightCol, detailY)
      doc.setFont("helvetica", "normal")
      doc.text(expedition._schoolterms.full_name, rightCol + 0.45, detailY)
    }

    detailY += 0.18
    if (expedition?._schoolyears?.name) {
      doc.setFont("helvetica", "bold")
      doc.text("Year:", leftCol, detailY)
      doc.setFont("helvetica", "normal")
      doc.text(expedition._schoolyears.name, leftCol + 0.5, detailY)
    }

    detailY += 0.18
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    doc.setFont("helvetica", "bold")
    doc.text("Generated:", leftCol, detailY)
    doc.setFont("helvetica", "normal")
    doc.text(today, leftCol + 0.75, detailY)

    doc.setTextColor(0)

    const columns = ["Name", "Crew Role", "DOB", "Gender", "Nationality", "Passport #", "Issue Date", "Expiration", "Status"]

    const rows = manifestData.map(p => [
      p.name || "—",
      p.crew_role || "—",
      p.dob || "—",
      p.gender || "—",
      p.nationality || "—",
      p.passport_number || "—",
      p.issue_date || "—",
      p.expiration_date || "—",
      p.crew_status || "—",
    ])

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: detailY + 0.25,
      margin: { left: 0.5, right: 0.5 },
      styles: { fontSize: 7.5, cellPadding: 0.05 },
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      tableWidth: "auto",
    })

    const fileName = expedition?.name
      ? `${expedition.name.replace(/\s+/g, "_")}_Passport_Manifest.pdf`
      : "Passport_Manifest.pdf"

    doc.save(fileName)
    toast.success("PDF exported successfully")
  }

  // Build a lookup of expedition assignment isArchived status
  const assignmentArchivedMap = new Map<string, boolean>()
  ;(assignments || []).forEach((a: any) => {
    if (a.expedition_staff_id) {
      assignmentArchivedMap.set(`staff-${a.expedition_staff_id}`, a.isArchived === true)
    }
    if (a.students_id) {
      assignmentArchivedMap.set(`student-${a.students_id}`, a.isArchived === true)
    }
  })

  // Determine if a person is considered "active" on this expedition
  const isPersonActive = (type: "Staff" | "Student", id: number, profileActive: boolean) => {
    const key = type === "Staff" ? `staff-${id}` : `student-${id}`
    const isArchived = assignmentArchivedMap.get(key)
    // If there's an assignment record, use its isArchived; otherwise fall back to profile status
    if (isArchived !== undefined) return !isArchived
    return profileActive
  }

  // Combine staff and students into one manifest
  const manifestData = [
    ...(staff || [])
      .map((person: any) => ({
        ...person,
        type: "Staff" as const,
        name: person.name,
        crew_role: person.crew_role,
        crew_status: person.crew_status,
        dob: person.dob,
        passport_number: person.passport_number,
        issue_date: person.issue_date,
        expiration_date: person.expiration_date,
        gender: person.gender,
        nationality: person.nationality,
        passport_photo: person.passport_photo,
        _isActiveOnExpedition: isPersonActive("Staff", person.id, person.isActive !== false),
      })),
    ...(students || [])
      .map((person: any) => {
        // Passport data for students may be in _expeditions_student_information
        const info = person._expeditions_student_information
        return {
          ...person,
          type: "Student" as const,
          name: `${person.firstName || ""} ${person.lastName || ""}`.trim(),
          crew_role: person.crew_position,
          crew_status: person.crew_status,
          dob: person.dob || info?.date_of_birth || null,
          passport_number: person.passport_number || info?.passport_number || "",
          issue_date: person.issue_date || info?.passport_issued_date || null,
          expiration_date: person.expiration_date || info?.passport_expiration_date || null,
          gender: person.gender || "",
          nationality: person.nationality || "",
          passport_photo: person.passport_photo || info?.passport_photo || "",
          _isActiveOnExpedition: isPersonActive("Student", person.id, !person.isArchived),
        }
      }),
  ]
    .filter((person) => {
      if (statusFilter === "active") return person._isActiveOnExpedition
      if (statusFilter === "inactive") return !person._isActiveOnExpedition
      return true // "all"
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "Staff" ? -1 : 1
      return (a.name || "").localeCompare(b.name || "")
    })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Expedition Header with Navigation */}
      <ExpeditionHeader expedition={expedition} isLoading={expeditionsLoading} currentPage="passport-manifest" />

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Summary Stats */}
        {!isLoading && manifestData.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-sm font-medium text-gray-500">Total Personnel</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{manifestData.length}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-sm font-medium text-gray-500">Staff Members</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {manifestData.filter(p => p.type === "Staff").length}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-sm font-medium text-gray-500">Students</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {manifestData.filter(p => p.type === "Student").length}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Table header bar with filter and export */}
          {!isLoading && (
            <div className="px-6 py-3 border-b bg-gray-50/30 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Manifest Records</h2>
              <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-xs cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs cursor-pointer">Active</SelectItem>
                    <SelectItem value="inactive" className="text-xs cursor-pointer">Inactive</SelectItem>
                    <SelectItem value="all" className="text-xs cursor-pointer">All</SelectItem>
                  </SelectContent>
                </Select>
                {manifestData.length > 0 && (
                  <Button
                    onClick={exportPDF}
                    variant="outline"
                    size="sm"
                    className="cursor-pointer h-8 text-xs"
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1.5" />
                    Export PDF
                  </Button>
                )}
              </div>
            </div>
          )}
          {isLoading ? (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[180px] min-w-[180px]">Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[110px] min-w-[110px]">Crew Role</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[110px] min-w-[110px]">DOB</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[90px] min-w-[90px]">Gender</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[110px] min-w-[110px]">Nationality</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[120px] min-w-[120px]">Passport #</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[110px] min-w-[110px]">Issue Date</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[110px] min-w-[110px]">Expiration</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[90px] min-w-[90px]">Status</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[70px] min-w-[70px]">Photo</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[50px] min-w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !manifestData || manifestData.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-600">No passport data found</p>
              <p className="text-sm text-gray-500 mt-1">
                Staff and students with passport information will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[180px] min-w-[180px]">Name</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[110px] min-w-[110px]">Crew Role</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[110px] min-w-[110px]">DOB</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[90px] min-w-[90px]">Gender</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[110px] min-w-[110px]">Nationality</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[120px] min-w-[120px]">Passport #</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[110px] min-w-[110px]">Issue Date</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[110px] min-w-[110px]">Expiration</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[90px] min-w-[90px]">Status</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[70px] min-w-[70px]">Photo</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[50px] min-w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Staff Group */}
                  {manifestData.some(p => p.type === "Staff") && (
                    <>
                      <TableRow className="bg-gray-100/80 hover:bg-gray-100/80 border-b">
                        <TableCell colSpan={11} className="h-9 px-6">
                          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Staff ({manifestData.filter(p => p.type === "Staff").length})
                          </span>
                        </TableCell>
                      </TableRow>
                      {manifestData.filter(p => p.type === "Staff").map((person: any, index: number) => (
                        <TableRow key={`Staff-${person.id || index}`} className="hover:bg-gray-50/50">
                          <TableCell className="h-16 px-6">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                                  {person.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-gray-900 whitespace-nowrap">{person.name || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.crew_role || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.dob || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.gender || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.nationality || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-900 font-mono whitespace-nowrap">{person.passport_number || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.issue_date || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.expiration_date || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.crew_status || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            {person.passport_photo ? (
                              <div className="flex items-center gap-2">
                                <a href={person.passport_photo} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 cursor-pointer" title="View passport photo">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                                <a href={person.passport_photo} download className="text-gray-600 hover:text-gray-900 cursor-pointer" title="Download passport photo">
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-gray-400 hover:text-gray-900" onClick={() => openEditDialog(person)} title={`Edit ${person.name}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}

                  {/* Students Group */}
                  {manifestData.some(p => p.type === "Student") && (
                    <>
                      <TableRow className="bg-gray-100/80 hover:bg-gray-100/80 border-b">
                        <TableCell colSpan={11} className="h-9 px-6">
                          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Students ({manifestData.filter(p => p.type === "Student").length})
                          </span>
                        </TableCell>
                      </TableRow>
                      {manifestData.filter(p => p.type === "Student").map((person: any, index: number) => (
                        <TableRow key={`Student-${person.id || index}`} className="hover:bg-gray-50/50">
                          <TableCell className="h-16 px-6">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                                  {person.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-gray-900 whitespace-nowrap">{person.name || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.crew_role || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.dob || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.gender || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.nationality || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-900 font-mono whitespace-nowrap">{person.passport_number || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.issue_date || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.expiration_date || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <span className="text-sm text-gray-600 whitespace-nowrap">{person.crew_status || "—"}</span>
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            {person.passport_photo ? (
                              <div className="flex items-center gap-2">
                                <a href={person.passport_photo} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 cursor-pointer" title="View passport photo">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                                <a href={person.passport_photo} download className="text-gray-600 hover:text-gray-900 cursor-pointer" title="Download passport photo">
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="h-16 px-6">
                            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-gray-400 hover:text-gray-900" onClick={() => openEditDialog(person)} title={`Edit ${person.name}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      {/* Edit Passport Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Passport Information</DialogTitle>
            <DialogDescription>
              Update passport and crew details for{" "}
              <span className="font-medium text-gray-900">{editingPerson?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Expedition Status */}
            {(() => {
              const assignment = editingPerson && (assignments || []).find((a: any) =>
                editingPerson.type === "Staff"
                  ? a.expedition_staff_id === editingPerson.id
                  : a.students_id === editingPerson.id
              )
              return assignment ? (
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="space-y-0.5">
                    <Label>Active on this expedition</Label>
                    <div className="text-xs text-gray-500">Archive to remove from active manifest</div>
                  </div>
                  <Switch
                    checked={!assignment.isArchived}
                    onCheckedChange={async (checked) => {
                      try {
                        await updateExpeditionAssignment(assignment.id, { isArchived: !checked })
                        mutate(`assignments_expedition_${expeditionId}`)
                        mutate(`students_expedition_${expeditionId}`)
                        mutate(`staff_expedition_${expeditionId}`)
                        toast.success(checked ? "Marked as active" : "Marked as archived")
                      } catch (error) {
                        console.error("Failed to update status:", error)
                        toast.error("Failed to update status")
                      }
                    }}
                  />
                </div>
              ) : null
            })()}

            {/* Crew Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Crew Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_crew_role">Crew Role</Label>
                  <Input
                    id="edit_crew_role"
                    value={editFormData.crew_role}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, crew_role: e.target.value }))}
                    placeholder="e.g. Captain, Mate"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_crew_status">Crew Status</Label>
                  <Input
                    id="edit_crew_status"
                    value={editFormData.crew_status}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, crew_status: e.target.value }))}
                    placeholder="e.g. Active, On Leave"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Personal Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_dob">Date of Birth</Label>
                  <Input
                    id="edit_dob"
                    type="date"
                    value={editFormData.dob || ""}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, dob: e.target.value || null }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_gender">Gender</Label>
                  <Input
                    id="edit_gender"
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, gender: e.target.value }))}
                    placeholder="Gender"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_nationality">Nationality</Label>
                  <Input
                    id="edit_nationality"
                    value={editFormData.nationality}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, nationality: e.target.value }))}
                    placeholder="Nationality"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Passport Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Passport Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_passport_number">Passport Number</Label>
                  <Input
                    id="edit_passport_number"
                    value={editFormData.passport_number}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, passport_number: e.target.value }))}
                    placeholder="Passport number"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_issue_date">Issue Date</Label>
                  <Input
                    id="edit_issue_date"
                    type="date"
                    value={editFormData.issue_date || ""}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, issue_date: e.target.value || null }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_expiration_date">Expiration Date</Label>
                  <Input
                    id="edit_expiration_date"
                    type="date"
                    value={editFormData.expiration_date || ""}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, expiration_date: e.target.value || null }))}
                    className="mt-1.5"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Passport Photo</Label>
                  <div className="mt-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                    {editFormData.passport_photo ? (
                      <div className="flex items-center gap-3">
                        <a
                          href={editFormData.passport_photo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          View in Google Drive
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="cursor-pointer h-8 w-8 text-gray-400 hover:text-gray-900"
                          onClick={() => setRemovePhotoConfirmOpen(true)}
                          title="Remove photo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {isUploading ? (
                          <>
                            <Spinner size="sm" className="mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload to Google Drive
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleEditSubmit}
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

      {/* Remove Photo Confirmation */}
      <AlertDialog open={removePhotoConfirmOpen} onOpenChange={setRemovePhotoConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Passport Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the passport photo for {editingPerson?.name}? This will remove the link from the record but will not delete the file from Google Drive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemovePhoto}
              className="bg-red-600 hover:bg-red-700 cursor-pointer"
            >
              Remove Photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
