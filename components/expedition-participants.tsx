"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { mutate } from "swr"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { UserPlus, Users } from "lucide-react"
import {
  useStudents,
  useTeachers,
  useStudentsByExpedition,
  useTeachersByExpedition,
} from "@/lib/hooks/use-expeditions"
import {
  updateStudent,
  updateTeacher,
  createExpeditionAssignment,
} from "@/lib/xano"

interface ExpeditionParticipantsProps {
  expeditionId: number
  isAdmin: boolean
  /** expedition_student_assignments rows already filtered to this expedition */
  assignments?: any[]
}

interface Candidate {
  id: number
  name: string
  secondary?: string
  image?: string
  initials: string
}

/** Normalise a student/teacher `expeditions_id` field to a list of numeric ids. */
function toExpeditionIds(value: any): number[] {
  if (!Array.isArray(value)) return value ? [Number(value)] : []
  return value
    .map((e: any) => (typeof e === "object" && e !== null ? e.id : e))
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Button that opens a searchable list of people not yet on the expedition.
 * Selecting one calls `onSelect` immediately.
 */
function AddParticipantButton({
  label,
  searchPlaceholder,
  emptyText,
  candidates,
  isLoading,
  isAdding,
  onSelect,
}: {
  label: string
  searchPlaceholder: string
  emptyText: string
  candidates: Candidate[]
  isLoading: boolean
  isAdding: boolean
  onSelect: (id: number) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          disabled={isAdding}
          aria-expanded={open}
        >
          {isAdding ? (
            <Spinner className="h-4 w-4 mr-2" />
          ) : (
            <UserPlus className="h-4 w-4 mr-2" />
          )}
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="end" sideOffset={5}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Spinner className="h-4 w-4 mx-auto" />
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {candidates.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.secondary || ""} ${c.id}`}
                      onSelect={() => {
                        setOpen(false)
                        onSelect(c.id)
                      }}
                      className="cursor-pointer"
                    >
                      <Avatar className="h-6 w-6 mr-2">
                        {c.image ? <AvatarImage src={c.image} alt={c.name} /> : null}
                        <AvatarFallback className="text-[10px] bg-gray-200 text-gray-600">
                          {c.initials || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm truncate">{c.name}</span>
                        {c.secondary && (
                          <span className="text-xs text-muted-foreground truncate">
                            {c.secondary}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function ExpeditionParticipants({
  expeditionId,
  isAdmin,
  assignments,
}: ExpeditionParticipantsProps) {
  const router = useRouter()

  const { data: expeditionStudents, isLoading: studentsLoading } =
    useStudentsByExpedition(expeditionId)
  const { data: expeditionTeachers, isLoading: teachersLoading } =
    useTeachersByExpedition(expeditionId)
  // Full lists are only needed by admins for the add pickers.
  const { data: allStudents, isLoading: allStudentsLoading } = useStudents()
  const { data: allTeachers, isLoading: allTeachersLoading } = useTeachers()

  const [addingStudent, setAddingStudent] = useState(false)
  const [addingStaff, setAddingStaff] = useState(false)

  const staffRows = useMemo(() => {
    if (!expeditionTeachers) return []
    return [...expeditionTeachers].sort((a: any, b: any) =>
      (a.name || "").localeCompare(b.name || "")
    )
  }, [expeditionTeachers])

  const studentRows = useMemo(() => {
    if (!expeditionStudents) return []
    return [...expeditionStudents].sort((a: any, b: any) => {
      const an = `${a.lastName || ""} ${a.firstName || ""}`.trim()
      const bn = `${b.lastName || ""} ${b.firstName || ""}`.trim()
      return an.localeCompare(bn)
    })
  }, [expeditionStudents])

  // Candidates = everyone not already on this expedition.
  const studentCandidates = useMemo<Candidate[]>(() => {
    if (!allStudents) return []
    const onExpedition = new Set((expeditionStudents || []).map((s: any) => s.id))
    return allStudents
      .filter((s: any) => !onExpedition.has(s.id) && !s.isArchived)
      .map((s: any) => {
        const name = `${s.firstName || ""} ${s.lastName || ""}`.trim()
        return {
          id: s.id,
          name,
          secondary: [s.grade, s.yearGroup].filter(Boolean).join(" · ") || undefined,
          image: s.profileImage || undefined,
          initials: initialsOf(name),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allStudents, expeditionStudents])

  const staffCandidates = useMemo<Candidate[]>(() => {
    if (!allTeachers) return []
    const onExpedition = new Set((expeditionTeachers || []).map((t: any) => t.id))
    return allTeachers
      .filter((t: any) => !onExpedition.has(t.id) && t.isActive !== false)
      .map((t: any) => ({
        id: t.id,
        name: t.name || "",
        secondary: [t.role, t.crew_role].filter(Boolean).join(" · ") || undefined,
        image: t.passport_photo || undefined,
        initials: initialsOf(t.name || ""),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allTeachers, expeditionTeachers])

  // Department + bunk lookup from the assignments join table.
  const assignmentFor = (kind: "staff" | "student", id: number) =>
    (assignments || []).find((a: any) =>
      kind === "staff" ? a.expedition_staff_id === id : a.students_id === id
    )

  const departmentNames = (assignment: any): string[] => {
    if (!assignment || !Array.isArray(assignment.expedition_departments_id)) return []
    return assignment.expedition_departments_id
      .map((d: any) => (typeof d === "object" && d !== null ? d.name : null))
      .filter(Boolean)
  }

  const refreshCaches = () => {
    mutate(`students_by_expedition_${expeditionId}`)
    mutate(`teachers_by_expedition_${expeditionId}`)
    mutate(`expedition_assignments_${expeditionId}`)
    mutate("expedition_student_assignments")
    mutate("students")
    mutate("teachers")
  }

  const handleAddStudent = async (studentId: number) => {
    const student = allStudents?.find((s: any) => s.id === studentId)
    if (!student) return
    setAddingStudent(true)
    try {
      const existingIds = toExpeditionIds(student.expeditions_id)
      if (!existingIds.includes(expeditionId)) {
        await updateStudent(student.id, {
          students_id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          expeditions_id: [...existingIds, expeditionId],
        })
      }
      // The Assignments tab reads only from the join table, so make sure a row exists.
      if (!assignmentFor("student", student.id)) {
        await createExpeditionAssignment({
          students_id: student.id,
          expeditions_id: expeditionId,
        })
      }
      refreshCaches()
      toast.success(`${student.firstName} ${student.lastName} added to expedition`)
    } catch (error) {
      console.error("Failed to add student to expedition:", error)
      toast.error("Failed to add student")
    } finally {
      setAddingStudent(false)
    }
  }

  const handleAddStaff = async (staffId: number) => {
    const staff = allTeachers?.find((t: any) => t.id === staffId)
    if (!staff) return
    setAddingStaff(true)
    try {
      const existingIds = toExpeditionIds(staff.expeditions_id)
      if (!existingIds.includes(expeditionId)) {
        await updateTeacher(staff.id, {
          name: staff.name,
          expeditions_id: [...existingIds, expeditionId],
        })
      }
      if (!assignmentFor("staff", staff.id)) {
        await createExpeditionAssignment({
          expedition_staff_id: staff.id,
          expeditions_id: expeditionId,
        })
      }
      refreshCaches()
      toast.success(`${staff.name} added to expedition`)
    } catch (error) {
      console.error("Failed to add staff to expedition:", error)
      toast.error("Failed to add staff member")
    } finally {
      setAddingStaff(false)
    }
  }

  const isLoading = studentsLoading || teachersLoading
  const total = staffRows.length + studentRows.length

  const headerCell = "h-10 px-4 text-xs font-semibold text-gray-600"
  const groupRow = (label: string, count: number) => (
    <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
      <TableCell colSpan={6} className="h-8 px-4 py-0">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {label} · {count}
        </span>
      </TableCell>
    </TableRow>
  )

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">
      <div className="px-6 py-4 border-b bg-gray-50/50 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Participants</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            {isLoading ? "Loading…" : `${staffRows.length} staff · ${studentRows.length} students`}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <AddParticipantButton
              label="Add Staff"
              searchPlaceholder="Search staff…"
              emptyText="No staff found."
              candidates={staffCandidates}
              isLoading={allTeachersLoading}
              isAdding={addingStaff}
              onSelect={handleAddStaff}
            />
            <AddParticipantButton
              label="Add Student"
              searchPlaceholder="Search students…"
              emptyText="No students found."
              candidates={studentCandidates}
              isLoading={allStudentsLoading}
              isAdding={addingStudent}
              onSelect={handleAddStudent}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
              <TableHead className={headerCell}>Name</TableHead>
              <TableHead className={headerCell}>Type</TableHead>
              <TableHead className={headerCell}>Role / Grade</TableHead>
              <TableHead className={headerCell}>Department</TableHead>
              <TableHead className={headerCell}>Bunk</TableHead>
              <TableHead className={`${headerCell} text-right`}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4].map((i) => (
              <TableRow key={i}>
                <TableCell className="h-12 px-4"><Skeleton className="h-4 w-36" /></TableCell>
                <TableCell className="h-12 px-4"><Skeleton className="h-4 w-14" /></TableCell>
                <TableCell className="h-12 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="h-12 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="h-12 px-4"><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell className="h-12 px-4"><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : total === 0 ? (
        <div className="p-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 font-medium">No participants yet</p>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin
              ? "Use Add Staff or Add Student to build the roster for this expedition."
              : "Staff and students will appear here once assigned."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
              <TableHead className={headerCell}>Name</TableHead>
              <TableHead className={headerCell}>Type</TableHead>
              <TableHead className={headerCell}>Role / Grade</TableHead>
              <TableHead className={headerCell}>Department</TableHead>
              <TableHead className={headerCell}>Bunk</TableHead>
              <TableHead className={`${headerCell} text-right`}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffRows.length > 0 && groupRow("Staff", staffRows.length)}
            {staffRows.map((t: any) => {
              const a = assignmentFor("staff", t.id)
              const depts = departmentNames(a)
              const inactive = t.isActive === false || a?.isArchived === true
              return (
                <TableRow
                  key={`staff-${t.id}`}
                  className="border-b last:border-0 hover:bg-gray-50/50 cursor-pointer"
                  onClick={() => router.push(`/staff/${t.id}?expedition=${expeditionId}`)}
                >
                  <TableCell className="h-12 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {t.passport_photo ? <AvatarImage src={t.passport_photo} alt={t.name} /> : null}
                        <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                          {initialsOf(t.name || "") || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-gray-900 truncate max-w-[220px]" title={t.name}>
                        {t.name || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="h-12 px-4">
                    <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                      Staff
                    </Badge>
                  </TableCell>
                  <TableCell className="h-12 px-4">
                    <span className="text-sm text-gray-700">
                      {[t.role, t.crew_role].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="h-12 px-4">
                    {depts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {depts.map((d) => (
                          <Badge key={d} variant="outline" className="bg-white border-gray-200 text-gray-700">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="h-12 px-4">
                    <span className="text-sm text-gray-700">{a?.bunk || "—"}</span>
                  </TableCell>
                  <TableCell className="h-12 px-4 text-right">
                    <Badge
                      variant="outline"
                      className={inactive
                        ? "bg-gray-100 border-gray-200 text-gray-500"
                        : "bg-green-50 border-green-200 text-green-700"}
                    >
                      {inactive ? "Inactive" : "Active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}

            {studentRows.length > 0 && groupRow("Students", studentRows.length)}
            {studentRows.map((s: any) => {
              const a = assignmentFor("student", s.id)
              const depts = departmentNames(a)
              const name = `${s.firstName || ""} ${s.lastName || ""}`.trim()
              const archived = s.isArchived === true || a?.isArchived === true
              return (
                <TableRow
                  key={`student-${s.id}`}
                  className="border-b last:border-0 hover:bg-gray-50/50 cursor-pointer"
                  onClick={() => router.push(`/student/${s.id}?expedition=${expeditionId}`)}
                >
                  <TableCell className="h-12 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {s.profileImage ? <AvatarImage src={s.profileImage} alt={name} /> : null}
                        <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                          {initialsOf(name) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-gray-900 truncate max-w-[220px]" title={name}>
                        {name || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="h-12 px-4">
                    <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                      Student
                    </Badge>
                  </TableCell>
                  <TableCell className="h-12 px-4">
                    <span className="text-sm text-gray-700">
                      {[s.grade, s.crew_position].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="h-12 px-4">
                    {depts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {depts.map((d) => (
                          <Badge key={d} variant="outline" className="bg-white border-gray-200 text-gray-700">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="h-12 px-4">
                    <span className="text-sm text-gray-700">{a?.bunk || "—"}</span>
                  </TableCell>
                  <TableCell className="h-12 px-4 text-right">
                    <Badge
                      variant="outline"
                      className={archived
                        ? "bg-gray-100 border-gray-200 text-gray-500"
                        : "bg-green-50 border-green-200 text-green-700"}
                    >
                      {archived ? "Archived" : "Active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
