"use client"

import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Pencil, ArrowLeft, Check, ChevronsUpDown, X, Upload, ExternalLink, Trash2 } from "lucide-react"
import { useTeachers, useExpeditions } from "@/lib/hooks/use-expeditions"
import { updateTeacher, createExpeditionAssignment, getExpeditionAssignments, updateExpeditionAssignment } from "@/lib/xano"
import { toast } from "sonner"
import useSWR, { mutate } from "swr"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export default function StaffDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const staffId = parseInt(params.id as string)
  const expeditionId = searchParams.get('expedition')
  
  const { data: staff, isLoading } = useTeachers()
  const { data: allExpeditions } = useExpeditions()
  const { data: allAssignments } = useSWR("expedition_assignments", getExpeditionAssignments)
  const staffMember = staff?.find((s: any) => s.id === staffId)
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [removePhotoConfirmOpen, setRemovePhotoConfirmOpen] = useState(false)
  const [expeditionPopoverOpen, setExpeditionPopoverOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    isActive: true,
    expeditions_id: [] as number[],
    role: "Staff",
    crew_role: "",
    dob: null as string | null,
    crew_status: "",
    passport_number: "",
    passport_issue_date: null as string | null,
    passport_expiration_date: null as string | null,
    gender: "",
    nationality: "",
    passport_photo: "",
  })
  
  useEffect(() => {
    if (staffMember) {
      setFormData({
        name: staffMember.name || "",
        email: staffMember.email || "",
        isActive: staffMember.isActive ?? true,
        expeditions_id: Array.isArray(staffMember.expeditions_id) ? staffMember.expeditions_id : [staffMember.expeditions_id].filter(Boolean),
        role: staffMember.role || "Staff",
        crew_role: staffMember.crew_role || "",
        dob: staffMember.dob || null,
        crew_status: staffMember.crew_status || "",
        passport_number: staffMember.passport_number || "",
        passport_issue_date: staffMember.passport_issue_date || null,
        passport_expiration_date: staffMember.passport_expiration_date || null,
        gender: staffMember.gender || "",
        nationality: staffMember.nationality || "",
        passport_photo: staffMember.passport_photo || "",
      })
    }
  }, [staffMember])
  
  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Staff name is required")
      return
    }
    
    setIsSubmitting(true)
    try {
      // Get current expedition IDs from the original staff data
      const currentExpeditionIds = Array.isArray(staffMember?.expeditions_id) 
        ? staffMember.expeditions_id 
        : [staffMember?.expeditions_id].filter(Boolean)
      
      // Find newly added expeditions
      const newExpeditions = formData.expeditions_id.filter(
        (id: number) => !currentExpeditionIds.includes(id)
      )
      
      // Update the staff record
      await updateTeacher(staffId, formData)
      
      // Create expedition assignments for newly added expeditions
      for (const expId of newExpeditions) {
        await createExpeditionAssignment({
          expedition_staff_id: staffId,
          expeditions_id: expId,
        })
      }
      
      mutate("teachers")
      toast.success("Staff member updated successfully")
      setDialogOpen(false)
    } catch (error) {
      console.error("Failed to update staff member:", error)
      toast.error("Failed to update staff member")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleExpedition = (expeditionId: number) => {
    setFormData(prev => ({
      ...prev,
      expeditions_id: prev.expeditions_id.includes(expeditionId)
        ? prev.expeditions_id.filter(id => id !== expeditionId)
        : [...prev.expeditions_id, expeditionId]
    }))
  }

  const getExpeditionName = (id: number) => {
    return allExpeditions?.find((e: any) => e.id === id)?.name || `Expedition ${id}`
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ""

    setIsUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append("file", file)
      formDataUpload.append("person_id", staffId.toString())
      formDataUpload.append("person_type", "staff")

      const res = await fetch("/api/upload-passport-photo", {
        method: "POST",
        body: formDataUpload,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Upload failed")
      }

      const data = await res.json()
      setFormData(prev => ({ ...prev, passport_photo: data.url }))
      mutate("teachers")
      toast.success("Passport photo uploaded to Google Drive")
    } catch (error: any) {
      console.error("Photo upload failed:", error)
      toast.error(error.message || "Failed to upload photo")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/upload-passport-photo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: staffId,
          person_type: "staff",
          photo_url: formData.passport_photo,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to remove photo")
      }

      setFormData(prev => ({ ...prev, passport_photo: "" }))
      mutate("teachers")
      toast.success("Passport photo removed")
    } catch (error: any) {
      console.error("Failed to remove photo:", error)
      toast.error(error.message || "Failed to remove photo")
    } finally {
      setIsSubmitting(false)
      setRemovePhotoConfirmOpen(false)
    }
  }

  const handleAssignmentArchiveToggle = async (assignmentId: number, isArchived: boolean) => {
    try {
      await updateExpeditionAssignment(assignmentId, { isArchived })
      mutate("expedition_assignments")
      toast.success(isArchived ? "Marked as archived" : "Marked as active")
    } catch (error) {
      console.error("Failed to update assignment status:", error)
      toast.error("Failed to update status")
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
  
  if (!staffMember) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-600">Staff member not found</p>
          <Button onClick={() => router.back()} className="mt-4 cursor-pointer">
            Go Back
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/staff" className="cursor-pointer">Staff Records</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{staffMember.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-lg bg-gray-200 text-gray-600">
                    {staffMember.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold">{staffMember.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {staffMember._expeditions?.name || "—"}
                    </span>
                    {staffMember.role && (
                      <>
                        <span className="text-gray-300">|</span>
                        <Badge variant="outline">{staffMember.role}</Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="cursor-pointer">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Staff
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Staff Information Card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50/30">
            <h2 className="text-lg font-semibold">Staff Information</h2>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{staffMember.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{staffMember.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="mt-1 text-sm text-gray-900">{staffMember.role || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <Badge 
                    variant={staffMember.isActive ? "default" : "secondary"}
                    className={staffMember.isActive 
                      ? "bg-green-100 text-green-700 border-green-200" 
                      : "bg-gray-100 text-gray-600 border-gray-200"
                    }
                  >
                    {staffMember.isActive ? "Active" : "Archived"}
                  </Badge>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Passport Information Card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50/30">
            <h2 className="text-lg font-semibold">Passport Information</h2>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                <dd className="mt-1 text-sm text-gray-900">{staffMember.dob || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Gender</dt>
                <dd className="mt-1 text-sm text-gray-900">{staffMember.gender || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Nationality</dt>
                <dd className="mt-1 text-sm text-gray-900">{staffMember.nationality || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Crew Role</dt>
                <dd className="mt-1 text-sm text-gray-900">{staffMember.crew_role || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Crew Status</dt>
                <dd className="mt-1 text-sm text-gray-900">{staffMember.crew_status || "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Passport Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{staffMember.passport_number || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Passport Issue Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{staffMember.passport_issue_date || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Passport Expiration</dt>
                <dd className="mt-1 text-sm text-gray-900">{staffMember.passport_expiration_date || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Passport Photo</dt>
                <dd className="mt-1 text-sm">
                  {staffMember.passport_photo ? (
                    <a
                      href={staffMember.passport_photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View in Google Drive
                    </a>
                  ) : (
                    <span className="text-gray-900">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Assigned Expeditions Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Assigned Expeditions</h2>
          </div>
          {(() => {
            const expeditionIds = Array.isArray(staffMember.expeditions_id) 
              ? staffMember.expeditions_id 
              : staffMember.expeditions_id ? [staffMember.expeditions_id] : []
            
            const assignedExpeditions = expeditionIds
              .map((id: number) => allExpeditions?.find((e: any) => e.id === id))
              .filter(Boolean)

            // Find assignments for this staff member
            const staffAssignments = (allAssignments || []).filter(
              (a: any) => a.expedition_staff_id === staffId
            )

            return assignedExpeditions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Expedition Name</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Term</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Dates</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[80px]">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedExpeditions.map((expedition: any) => {
                    const assignment = staffAssignments.find(
                      (a: any) => a.expeditions_id === expedition.id
                    )
                    return (
                      <TableRow key={expedition.id} className="hover:bg-gray-50/50">
                        <TableCell className="h-16 px-6">
                          <span className="font-medium text-gray-900">{expedition.name}</span>
                        </TableCell>
                        <TableCell className="h-16 px-6">
                          <span className="text-sm text-gray-600">
                            {expedition._schoolterms?.full_name || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="h-16 px-6">
                          <span className="text-sm text-gray-600">
                            {expedition.startDate} - {expedition.endDate}
                          </span>
                        </TableCell>
                        <TableCell className="h-16 px-6">
                          {assignment ? (
                            <Switch
                              checked={!assignment.isArchived}
                              onCheckedChange={(checked) => handleAssignmentArchiveToggle(assignment.id, !checked)}
                            />
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <p className="text-sm text-gray-500">No expeditions assigned</p>
              </div>
            )
          })()}
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff information and expedition assignments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="staff_name">Name *</Label>
                  <Input
                    id="staff_name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Staff member name"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger className="mt-1.5 cursor-pointer">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Staff" className="cursor-pointer">Staff</SelectItem>
                      <SelectItem value="Admin" className="cursor-pointer">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between pt-5">
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive">Active Status</Label>
                    <div className="text-xs text-gray-500">Active or archived</div>
                  </div>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Passport & Crew Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Passport & Crew Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="crew_role">Crew Role</Label>
                  <Input
                    id="crew_role"
                    value={formData.crew_role}
                    onChange={(e) => setFormData(prev => ({ ...prev, crew_role: e.target.value }))}
                    placeholder="e.g. Captain, Mate"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="crew_status">Crew Status</Label>
                  <Input
                    id="crew_status"
                    value={formData.crew_status}
                    onChange={(e) => setFormData(prev => ({ ...prev, crew_status: e.target.value }))}
                    placeholder="e.g. Active, On Leave"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value || null }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Input
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    placeholder="Gender"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                    placeholder="Nationality"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="passport_number">Passport Number</Label>
                  <Input
                    id="passport_number"
                    value={formData.passport_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, passport_number: e.target.value }))}
                    placeholder="Passport number"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="passport_issue_date">Issue Date</Label>
                  <Input
                    id="passport_issue_date"
                    type="date"
                    value={formData.passport_issue_date || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, passport_issue_date: e.target.value || null }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="passport_expiration_date">Expiration Date</Label>
                  <Input
                    id="passport_expiration_date"
                    type="date"
                    value={formData.passport_expiration_date || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, passport_expiration_date: e.target.value || null }))}
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
                    {formData.passport_photo ? (
                      <div className="flex items-center gap-3">
                        <a
                          href={formData.passport_photo}
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

            {/* Expedition Assignments */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Expedition Assignments</h3>
              <Popover open={expeditionPopoverOpen} onOpenChange={setExpeditionPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={expeditionPopoverOpen}
                    className="w-full justify-between cursor-pointer font-normal"
                  >
                    {formData.expeditions_id.length === 0
                      ? "Select expeditions..."
                      : `${formData.expeditions_id.length} expedition(s) selected`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search expeditions..." />
                    <CommandList>
                      <CommandEmpty>No expeditions found.</CommandEmpty>
                      <CommandGroup>
                        {allExpeditions?.map((expedition: any) => (
                          <CommandItem
                            key={expedition.id}
                            value={expedition.name}
                            onSelect={() => toggleExpedition(expedition.id)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.expeditions_id.includes(expedition.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{expedition.name}</span>
                              <span className="text-xs text-gray-500">
                                {expedition.startDate} - {expedition.endDate}
                              </span>
                            </div>
                            {expedition.isActive && (
                              <Badge variant="outline" className="ml-auto text-xs bg-green-50 text-green-700 border-green-200">
                                Active
                              </Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Selected expeditions chips */}
              {formData.expeditions_id.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.expeditions_id.map(id => (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {getExpeditionName(id)}
                      <button
                        type="button"
                        onClick={() => toggleExpedition(id)}
                        className="ml-1 rounded-full p-0.5 hover:bg-gray-300 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
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

      {/* Remove Photo Confirmation */}
      <AlertDialog open={removePhotoConfirmOpen} onOpenChange={setRemovePhotoConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Passport Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the passport photo for {staffMember?.name}? This will remove the link from the record but will not delete the file from Google Drive.
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
