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
import { FileText, ExternalLink, Check } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useIntakeSubmissions, useStudents } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { updateStudent } from "@/lib/xano"
import { toast } from "sonner"
import { mutate } from "swr"
import { Spinner } from "@/components/ui/spinner"

export default function IntakeRecordsPage() {
  const router = useRouter()
  const { currentUser } = useCurrentUser()
  const { data: intakeSubmissions, isLoading } = useIntakeSubmissions()
  const { data: students } = useStudents()
  
  const [linkingId, setLinkingId] = useState<number | null>(null)

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Intake Records</h1>
              <p className="text-muted-foreground mt-2">
                All student intake form submissions
              </p>
            </div>
            <Button onClick={() => router.push("/intake")} className="cursor-pointer">
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
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Student Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Submitted</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Link to Student</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-8 w-40" /></TableCell>
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
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Student Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Submitted</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Link to Student</TableHead>
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
                      <TableCell className="h-16 px-6">
                        <div className="font-medium text-gray-900">
                          {submission.student_name || <span className="text-gray-400">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <span className="text-sm text-gray-600">
                          {submission.id 
                            ? formatDistanceToNow(new Date(submission.id), { addSuffix: true })
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        {linked ? (
                          <Badge className="bg-green-600 text-white border-0">
                            <Check className="h-3 w-3 mr-1" />
                            Linked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-white border-gray-200 text-gray-600">
                            Unlinked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="h-16 px-6" onClick={(e) => e.stopPropagation()}>
                        {linked && linkedStudent ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              {linkedStudent.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 cursor-pointer hover:bg-gray-100"
                              onClick={() => router.push(`/student/${linkedStudent.id}`)}
                            >
                              <ExternalLink className="h-3 w-3 text-gray-500" />
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value=""
                            onValueChange={(value) => handleLinkToStudent(submission.id, parseInt(value))}
                            disabled={linkingId === submission.id}
                          >
                            <SelectTrigger className="w-full h-8 text-sm cursor-pointer bg-white">
                              <SelectValue>
                                {linkingId === submission.id ? (
                                  <span className="flex items-center gap-2">
                                    <Spinner size="sm" className="h-3 w-3" />
                                    Linking...
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Select student...</span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {students?.filter((s: any) => !s.expeditions_student_information_id).map((student: any) => (
                                <SelectItem key={student.id} value={student.id.toString()} className="cursor-pointer">
                                  {student.name} - {student._expeditions?.name || "No expedition"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  )
}

