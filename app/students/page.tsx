"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState, Suspense } from "react"
import { Badge } from "@/components/ui/badge"
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
import { ExternalLink, User, Users, Link2, Link2Off } from "lucide-react"
import { useStudentsByExpedition, useStudents as useAllStudents } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ExpeditionHeader } from "@/components/expedition-header"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { updateStudent } from "@/lib/xano"
import { mutate } from "swr"
import { toast } from "sonner"
import useSWR from "swr"
import { Spinner } from "@/components/ui/spinner"

// Department options
const departments = [
  { value: "Bridge", label: "Bridge" },
  { value: "Deck", label: "Deck" },
  { value: "Galley", label: "Galley" },
  { value: "Interior", label: "Interior" },
  { value: "Engineer", label: "Engineering" },
]

// Dish day options
const dishDays = [
  { value: "Monday", label: "Monday" },
  { value: "Tuesday", label: "Tuesday" },
  { value: "Wednesday", label: "Wednesday" },
  { value: "Thursday", label: "Thursday" },
  { value: "Friday", label: "Friday" },
  { value: "Saturday", label: "Saturday" },
  { value: "Sunday", label: "Sunday" },
]

// Fetcher for applications
async function fetchApplications() {
  const response = await fetch("https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y/expedition_student_applications")
  if (!response.ok) throw new Error("Failed to fetch applications")
  return response.json()
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Skeleton className="h-8 w-32" /></div>}>
      <StudentsPageContent />
    </Suspense>
  )
}

function StudentsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentUser } = useCurrentUser()
  const { activeExpedition, userExpeditions } = useExpeditionContext()
  const { data: allExpeditionsData } = useExpeditions()
  const [showArchived, setShowArchived] = useState(true)
  const [updatingStudentId, setUpdatingStudentId] = useState<number | null>(null)
  const [updatingField, setUpdatingField] = useState<string | null>(null)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [selectedStudentForLink, setSelectedStudentForLink] = useState<any>(null)
  
  // Fetch applications for linking
  const { data: applications } = useSWR("expedition_student_applications", fetchApplications)
  
  // Get expedition ID from URL or use active expedition
  const expeditionIdFromUrl = searchParams.get('expedition') ? parseInt(searchParams.get('expedition')!) : null
  const effectiveExpeditionId = expeditionIdFromUrl || activeExpedition?.id
  
  // Find the expedition to display - prioritize URL parameter, fetch full data with term info
  const displayExpedition = useMemo(() => {
    if (expeditionIdFromUrl && allExpeditionsData) {
      const expeditionFromUrl = allExpeditionsData.find((e: any) => e.id === expeditionIdFromUrl)
      if (expeditionFromUrl) return expeditionFromUrl
    }
    if (expeditionIdFromUrl && userExpeditions) {
      const expeditionFromUrl = userExpeditions.find((e: any) => e.id === expeditionIdFromUrl)
      if (expeditionFromUrl) return expeditionFromUrl
    }
    return activeExpedition
  }, [expeditionIdFromUrl, allExpeditionsData, userExpeditions, activeExpedition])
  
  // Conditionally fetch data based on whether expedition-specific or all students
  const { data: expeditionStudents, isLoading: loadingExpeditionStudents } = useStudentsByExpedition(
    expeditionIdFromUrl ? (effectiveExpeditionId ?? null) : null
  )
  const { data: allStudents, isLoading: loadingAllStudents } = useAllStudents()
  
  // Use the appropriate data source
  const students = expeditionIdFromUrl ? expeditionStudents : allStudents
  const isLoading = expeditionIdFromUrl ? loadingExpeditionStudents : loadingAllStudents

  // Group students by archived status
  const { activeStudents, archivedStudents} = useMemo(() => {
    if (!students) return { activeStudents: [], archivedStudents: [] }
    
    const active = students.filter((s: any) => !s.archived)
    const archived = students.filter((s: any) => s.archived)
    
    // Sort both groups alphabetically
    const sortAlphabetically = (a: any, b: any) => {
      const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim()
      const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim()
      return nameA.localeCompare(nameB)
    }
    
    return {
      activeStudents: active.sort(sortAlphabetically),
      archivedStudents: archived.sort(sortAlphabetically)
    }
  }, [students])

  // Group students by year group for admin view
  const studentsByYearGroup = useMemo(() => {
    if (!students) return []
    
    const filtered = students.filter((student: any) => showArchived || !student.archived)
    
    // Group by yearGroup
    const grouped = filtered.reduce((acc: any, student: any) => {
      const yearGroup = student.yearGroup || "No Year Group"
      if (!acc[yearGroup]) {
        acc[yearGroup] = []
      }
      acc[yearGroup].push(student)
      return acc
    }, {})
    
    // Sort students within each group alphabetically
    Object.keys(grouped).forEach(yearGroup => {
      grouped[yearGroup].sort((a: any, b: any) => {
        const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim()
        const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim()
        return nameA.localeCompare(nameB)
      })
    })
    
    // Convert to array and sort year groups (oldest/lowest batch first)
    return Object.entries(grouped)
      .sort(([yearGroupA], [yearGroupB]) => {
        // Extract year from "Batch of YYYY" format
        const getYear = (yg: string) => {
          const match = yg.match(/\d{4}/)
          return match ? parseInt(match[0]) : 0
        }
        return getYear(yearGroupA) - getYear(yearGroupB)
      })
  }, [students, showArchived])

  // Handle updating student department
  const handleDepartmentChange = async (student: any, newDepartment: string) => {
    setUpdatingStudentId(student.id)
    setUpdatingField("department")
    try {
      await updateStudent(student.id, {
        students_id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        expeditions_id: Array.isArray(student.expeditions_id) ? student.expeditions_id : [student.expeditions_id].filter(Boolean),
        department: newDepartment,
      })
      mutate("students")
      if (effectiveExpeditionId) {
        mutate(`students_by_expedition_${effectiveExpeditionId}`)
      }
      toast.success("Department updated")
    } catch (error) {
      console.error("Failed to update department:", error)
      toast.error("Failed to update department")
    } finally {
      setUpdatingStudentId(null)
      setUpdatingField(null)
    }
  }

  // Handle updating student dish day
  const handleDishDayChange = async (student: any, newDishDay: string) => {
    setUpdatingStudentId(student.id)
    setUpdatingField("dish_day")
    try {
      await updateStudent(student.id, {
        students_id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        expeditions_id: Array.isArray(student.expeditions_id) ? student.expeditions_id : [student.expeditions_id].filter(Boolean),
        dish_day: newDishDay,
      })
      mutate("students")
      if (effectiveExpeditionId) {
        mutate(`students_by_expedition_${effectiveExpeditionId}`)
      }
      toast.success("Dish day updated")
    } catch (error) {
      console.error("Failed to update dish day:", error)
      toast.error("Failed to update dish day")
    } finally {
      setUpdatingStudentId(null)
      setUpdatingField(null)
    }
  }

  // Handle linking application to student
  const handleLinkApplication = async (applicationId: number) => {
    if (!selectedStudentForLink) return
    
    setUpdatingStudentId(selectedStudentForLink.id)
    setUpdatingField("application")
    try {
      await updateStudent(selectedStudentForLink.id, {
        students_id: selectedStudentForLink.id,
        firstName: selectedStudentForLink.firstName,
        lastName: selectedStudentForLink.lastName,
        expeditions_id: Array.isArray(selectedStudentForLink.expeditions_id) ? selectedStudentForLink.expeditions_id : [selectedStudentForLink.expeditions_id].filter(Boolean),
        expedition_student_application_id: applicationId,
      })
      mutate("students")
      if (effectiveExpeditionId) {
        mutate(`students_by_expedition_${effectiveExpeditionId}`)
      }
      toast.success("Application linked")
      setLinkModalOpen(false)
      setSelectedStudentForLink(null)
    } catch (error) {
      console.error("Failed to link application:", error)
      toast.error("Failed to link application")
    } finally {
      setUpdatingStudentId(null)
      setUpdatingField(null)
    }
  }

  // Handle unlinking application from student
  const handleUnlinkApplication = async (student: any) => {
    setUpdatingStudentId(student.id)
    setUpdatingField("application")
    try {
      await updateStudent(student.id, {
        students_id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        expeditions_id: Array.isArray(student.expeditions_id) ? student.expeditions_id : [student.expeditions_id].filter(Boolean),
        expedition_student_application_id: 0,
      })
      mutate("students")
      if (effectiveExpeditionId) {
        mutate(`students_by_expedition_${effectiveExpeditionId}`)
      }
      toast.success("Application unlinked")
    } catch (error) {
      console.error("Failed to unlink application:", error)
      toast.error("Failed to unlink application")
    } finally {
      setUpdatingStudentId(null)
      setUpdatingField(null)
    }
  }

  // Open link modal
  const openLinkModal = (student: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedStudentForLink(student)
    setLinkModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {expeditionIdFromUrl ? (
        /* Expedition-specific view with navigation */
        <>
          <ExpeditionHeader expedition={displayExpedition} isLoading={!displayExpedition} currentPage="students" />
          
          {/* Filter Bar */}
          <div className="border-b bg-muted/30">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-archived-expedition"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
                <Label htmlFor="show-archived-expedition" className="text-sm cursor-pointer">
                  Show archived students
                </Label>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Admin view - all students across all expeditions */
        <>
          {/* Header */}
          <div className="border-b bg-white">
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Student Records</h1>
                  <p className="text-muted-foreground mt-2">
                    All students across all expeditions
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-archived"
                    checked={showArchived}
                    onCheckedChange={setShowArchived}
                  />
                  <Label htmlFor="show-archived" className="text-sm cursor-pointer">
                    Show archived students
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Student Name</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Department</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Dish Day</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Application</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-14 px-4"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : !students || students.length === 0 ? (
          <Empty className="bg-white border-gray-200">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <User />
              </EmptyMedia>
              <EmptyTitle>No Students Found</EmptyTitle>
              <EmptyDescription>
                {expeditionIdFromUrl 
                  ? "No students are currently assigned to this expedition."
                  : "No student records found in the system."
                }
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : expeditionIdFromUrl ? (
          /* Expedition-specific view - grouped by archived status */
          <>
            {/* Active Students */}
            {activeStudents.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50/30">
                  <h2 className="text-lg font-semibold text-gray-900">Active Students</h2>
                  <p className="text-sm text-gray-500 mt-1">{activeStudents.length} student{activeStudents.length !== 1 ? 's' : ''}</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                      <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Student Name</TableHead>
                      <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Department</TableHead>
                      <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Dish Day</TableHead>
                      <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Application</TableHead>
                      <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeStudents.map((student: any) => (
                      <TableRow 
                        key={student.id} 
                        className="hover:bg-gray-50/50 cursor-pointer"
                        onClick={() => router.push(`/student/${student.id}?expedition=${effectiveExpeditionId}`)}
                      >
                        <TableCell className="h-14 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.profileImage} alt={`${student.firstName || ""} ${student.lastName || ""}`.trim()} />
                              <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                                {`${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}` || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-gray-900">{`${student.firstName || ""} ${student.lastName || ""}`.trim() || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <Select
                              value={student.department || ""}
                              onValueChange={(value) => handleDepartmentChange(student, value)}
                              disabled={updatingStudentId === student.id && updatingField === "department"}
                            >
                              <SelectTrigger className={`w-[120px] h-8 text-sm border-gray-200 ${updatingStudentId === student.id && updatingField === "department" ? "opacity-50" : ""}`}>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {departments.map((dept) => (
                                  <SelectItem key={dept.value} value={dept.value}>
                                    {dept.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {updatingStudentId === student.id && updatingField === "department" && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-md">
                                <Spinner size="sm" className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <Select
                              value={student.dish_day || ""}
                              onValueChange={(value) => handleDishDayChange(student, value)}
                              disabled={updatingStudentId === student.id && updatingField === "dish_day"}
                            >
                              <SelectTrigger className={`w-[110px] h-8 text-sm border-gray-200 ${updatingStudentId === student.id && updatingField === "dish_day" ? "opacity-50" : ""}`}>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {dishDays.map((day) => (
                                  <SelectItem key={day.value} value={day.value}>
                                    {day.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {updatingStudentId === student.id && updatingField === "dish_day" && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-md">
                                <Spinner size="sm" className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="h-14 px-4" onClick={(e) => e.stopPropagation()}>
                          {student.expedition_student_application_id ? (
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                                Linked
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 cursor-pointer hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUnlinkApplication(student)
                                }}
                                disabled={updatingStudentId === student.id && updatingField === "application"}
                                title="Unlink application"
                              >
                                <Link2Off className="h-3.5 w-3.5 text-gray-500" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs cursor-pointer"
                              onClick={(e) => openLinkModal(student, e)}
                              disabled={updatingStudentId === student.id && updatingField === "application"}
                            >
                              <Link2 className="h-3.5 w-3.5 mr-1" />
                              Link
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="h-14 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/student/${student.id}?expedition=${effectiveExpeditionId}`)
                            }}
                          >
                            <ExternalLink className="h-4 w-4 text-gray-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Archived Students */}
            {showArchived && archivedStudents.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-700">Archived Students</h2>
                  <p className="text-sm text-gray-500 mt-1">{archivedStudents.length} student{archivedStudents.length !== 1 ? 's' : ''}</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                      <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Student Name</TableHead>
                      <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Department</TableHead>
                      <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Dish Day</TableHead>
                      <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600">Application</TableHead>
                      <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedStudents.map((student: any) => (
                      <TableRow 
                        key={student.id} 
                        className="hover:bg-gray-50/50 cursor-pointer opacity-60"
                        onClick={() => router.push(`/student/${student.id}?expedition=${effectiveExpeditionId}`)}
                      >
                        <TableCell className="h-14 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.profileImage} alt={`${student.firstName || ""} ${student.lastName || ""}`.trim()} />
                              <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                                {`${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}` || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-gray-900">{`${student.firstName || ""} ${student.lastName || ""}`.trim() || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="h-14 px-4">
                          <span className="text-sm text-gray-600">{student.department || "—"}</span>
                        </TableCell>
                        <TableCell className="h-14 px-4">
                          <span className="text-sm text-gray-600">{student.dish_day || "—"}</span>
                        </TableCell>
                        <TableCell className="h-14 px-4">
                          {student.expedition_student_application_id ? (
                            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                              Linked
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="h-14 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/student/${student.id}?expedition=${effectiveExpeditionId}`)
                            }}
                          >
                            <ExternalLink className="h-4 w-4 text-gray-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        ) : (
          /* Admin view - all students from all expeditions grouped by year */
          <div className="space-y-6">
            {studentsByYearGroup.map(([yearGroup, yearStudents]: [string, any]) => (
              <div key={yearGroup} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50/30">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">{yearGroup}</h2>
                    <Badge variant="outline" className="bg-white">
                      {yearStudents.length} student{yearStudents.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                      <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 w-[240px]">Student Name</TableHead>
                      <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 w-[120px]">Crew</TableHead>
                      <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 w-[200px]">Email</TableHead>
                      <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 w-[280px]">Expeditions</TableHead>
                      <TableHead className="h-10 px-4 text-xs font-semibold text-gray-600 w-[100px]">Status</TableHead>
                      <TableHead className="h-10 px-4 text-right text-xs font-semibold text-gray-600 w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yearStudents.map((student: any) => {
                      // Get expedition names
                      const expeditionNames = Array.isArray(student.expeditions_id) 
                        ? student.expeditions_id
                            .map((expId: any) => {
                              const exp = allExpeditionsData?.find((e: any) => e.id === (typeof expId === 'object' ? expId.id : expId))
                              return exp?.name
                            })
                            .filter(Boolean)
                        : []
                      
                      return (
                        <TableRow 
                          key={student.id} 
                          className="hover:bg-gray-50/50 cursor-pointer"
                          onClick={() => router.push(`/student/${student.id}`)}
                        >
                          <TableCell className="h-14 px-4 w-[240px]">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={student.profileImage} alt={`${student.firstName || ""} ${student.lastName || ""}`.trim()} />
                                <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                                  {`${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}` || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-gray-900 truncate" title={`${student.firstName || ""} ${student.lastName || ""}`.trim()}>
                                {`${student.firstName || ""} ${student.lastName || ""}`.trim() || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="h-14 px-4 w-[120px]">
                            <span className="text-sm text-gray-600 truncate block" title={student.crew_name || ""}>
                              {student.crew_name || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="h-14 px-4 w-[200px]">
                            <span className="text-sm text-gray-600 truncate block" title={student.studentEmail || ""}>
                              {student.studentEmail || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="h-14 px-4 w-[280px]">
                            {expeditionNames.length > 0 ? (
                              <span className="text-sm text-gray-600 truncate block" title={expeditionNames.join(', ')}>
                                {expeditionNames.join(', ')}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="h-14 px-4 w-[100px]">
                            {student.archived ? (
                              <Badge variant="outline" className="bg-gray-100 border-gray-300 text-gray-600 text-xs whitespace-nowrap">
                                Archived
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs whitespace-nowrap">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="h-14 px-4 text-right w-[80px]">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/student/${student.id}`)
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
              </div>
            ))}
            {studentsByYearGroup.length === 0 && (
              <Empty className="bg-white border-gray-200">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <User />
                  </EmptyMedia>
                  <EmptyTitle>No Students Found</EmptyTitle>
                  <EmptyDescription>
                    No student records found in the system.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        )}
      </main>

      {/* Link Application Modal */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="w-full sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>
              Link Application to {`${selectedStudentForLink?.firstName || ""} ${selectedStudentForLink?.lastName || ""}`.trim()}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            {!applications || applications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No applications available</p>
            ) : (
              <div className="space-y-2">
                {applications.map((application: any) => (
                  <div
                    key={application.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleLinkApplication(application.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {application.firstChoiceDepartment || "No department"} / {application.secondChoiceDepartment || "—"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {application.careerGoalsOrInterests || "No career goals specified"}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        #{application.id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="border-t pt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setLinkModalOpen(false)
                setSelectedStudentForLink(null)
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

