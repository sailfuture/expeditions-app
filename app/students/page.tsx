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
import { ExternalLink, User, Users } from "lucide-react"
import { useStudentsByExpedition, useStudents as useAllStudents } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
    expeditionIdFromUrl ? effectiveExpeditionId : null
  )
  const { data: allStudents, isLoading: loadingAllStudents } = useAllStudents()
  
  // Use the appropriate data source
  const students = expeditionIdFromUrl ? expeditionStudents : allStudents
  const isLoading = expeditionIdFromUrl ? loadingExpeditionStudents : loadingAllStudents

  // Group students by archived status
  const { activeStudents, archivedStudents } = useMemo(() => {
    if (!students) return { activeStudents: [], archivedStudents: [] }
    
    const active = students.filter((s: any) => !s.archived)
    const archived = students.filter((s: any) => s.archived)
    
    // Sort both groups alphabetically
    const sortAlphabetically = (a: any, b: any) => {
      const nameA = a.name || ""
      const nameB = b.name || ""
      return nameA.localeCompare(nameB)
    }
    
    return {
      activeStudents: active.sort(sortAlphabetically),
      archivedStudents: archived.sort(sortAlphabetically)
    }
  }, [students])

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
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Student Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Grade</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
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
                      <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Student Name</TableHead>
                      <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Grade</TableHead>
                      <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Expedition</TableHead>
                      <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Email</TableHead>
                      <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeStudents.map((student: any) => (
                      <TableRow 
                        key={student.id} 
                        className="hover:bg-gray-50/50 cursor-pointer"
                        onClick={() => router.push(`/student/${student.id}?expedition=${effectiveExpeditionId}`)}
                      >
                        <TableCell className="h-16 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                                {student.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-gray-900">{student.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="h-16 px-6">
                          <Badge variant="outline" className="bg-white border-gray-200 text-gray-700">
                            {student.grade || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="h-16 px-6">
                          <span className="text-sm text-gray-600">
                            {displayExpedition?.name || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="h-16 px-6">
                          <span className="text-sm text-gray-600">
                            {student.email || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="h-16 px-6 text-right">
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
                      <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Student Name</TableHead>
                      <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Grade</TableHead>
                      <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Expedition</TableHead>
                      <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Email</TableHead>
                      <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedStudents.map((student: any) => (
                      <TableRow 
                        key={student.id} 
                        className="hover:bg-gray-50/50 cursor-pointer opacity-60"
                        onClick={() => router.push(`/student/${student.id}?expedition=${effectiveExpeditionId}`)}
                      >
                        <TableCell className="h-16 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                                {student.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-gray-900">{student.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="h-16 px-6">
                          <Badge variant="outline" className="bg-white border-gray-200 text-gray-700">
                            {student.grade || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="h-16 px-6">
                          <span className="text-sm text-gray-600">
                            {displayExpedition?.name || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="h-16 px-6">
                          <span className="text-sm text-gray-600">
                            {student.email || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="h-16 px-6 text-right">
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
          /* Admin view - all students from all expeditions */
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Student Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Grade</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Expedition</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students
                  .filter((student: any) => showArchived || !student.archived)
                  .sort((a: any, b: any) => {
                    const nameA = a.name || ""
                    const nameB = b.name || ""
                    return nameA.localeCompare(nameB)
                  }).map((student: any) => (
                  <TableRow 
                    key={student.id} 
                    className="hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => router.push(`/student/${student.id}`)}
                  >
                    <TableCell className="h-16 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                            {student.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-900">{student.name || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="h-16 px-6">
                      <Badge variant="outline" className="bg-white border-gray-200 text-gray-700">
                        {student.grade || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="h-16 px-6">
                      <span className="text-sm text-gray-600">
                        {student._expeditions?.name || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="h-16 px-6">
                      {student.archived ? (
                        <Badge variant="outline" className="bg-gray-100 border-gray-300 text-gray-600">
                          Archived
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="h-16 px-6 text-right">
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  )
}

