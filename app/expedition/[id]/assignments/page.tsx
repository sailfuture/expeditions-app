"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ExpeditionHeader } from "@/components/expedition-header"
import { ExternalLink } from "lucide-react"
import { getExpeditionAssignmentsByExpedition, updateExpeditionAssignment, getExpeditionLaptops, getExpeditionsRooms } from "@/lib/xano"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { mutate } from "swr"
import { toast } from "sonner"
import { useState } from "react"

interface PageProps {
  params: Promise<{ id: string }>
}

const departments = [
  { value: "Bridge", label: "Bridge" },
  { value: "Deck", label: "Deck" },
  { value: "Engineer", label: "Engineering" },
  { value: "Galley", label: "Galley" },
  { value: "Interior", label: "Interior" },
]

const dishDays = [
  { value: "Monday", label: "Monday" },
  { value: "Tuesday", label: "Tuesday" },
  { value: "Wednesday", label: "Wednesday" },
  { value: "Thursday", label: "Thursday" },
  { value: "Friday", label: "Friday" },
  { value: "Saturday", label: "Saturday" },
  { value: "Sunday", label: "Sunday" },
]

export default function AssignmentsPage({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)
  const expeditionId = parseInt(id)

  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { currentUser } = useCurrentUser()
  const isAdmin = currentUser?.role === "Admin"

  const { data: allExpeditions, isLoading: expeditionsLoading } = useExpeditions()
  const expedition = allExpeditions?.find((e: any) => e.id === expeditionId)

  const { data: assignments, isLoading: assignmentsLoading } = useSWR(
    expeditionId ? `expedition_assignments_${expeditionId}` : null,
    () => getExpeditionAssignmentsByExpedition(expeditionId)
  )

  const { data: laptops } = useSWR("expedition_laptops", getExpeditionLaptops)
  const { data: rooms } = useSWR("expeditions_rooms", getExpeditionsRooms)

  const isLoading = expeditionsLoading || assignmentsLoading

  // Process assignments into staff and students
  const staffAssignments = (assignments || [])
    .filter((a: any) => a.expedition_staff_id > 0 && a._expedition_staff && a._expedition_staff.isActive !== false)
    .map((a: any) => ({
      ...a,
      type: "Staff",
      personId: a.expedition_staff_id,
      name: a._expedition_staff?.name || "Unknown",
      profileImage: a._expedition_staff?.passport_photo || "",
    }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))

  const studentAssignments = (assignments || [])
    .filter((a: any) => a.students_id > 0 && a._students)
    .map((a: any) => ({
      ...a,
      type: "Student",
      personId: a.students_id,
      name: `${a._students?.firstName || ""} ${a._students?.lastName || ""}`.trim() || "Unknown",
      profileImage: a._students?.profileImage || "",
    }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))

  const handleFieldChange = async (assignmentId: number, field: string, value: string) => {
    const updateKey = `${assignmentId}-${field}`
    setUpdatingId(updateKey)
    
    try {
      const updateData: any = {}
      updateData[field] = value
      
      await updateExpeditionAssignment(assignmentId, updateData)
      mutate(`expedition_assignments_${expeditionId}`)
      
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')} updated`)
    } catch (error) {
      console.error(`Failed to update ${field}:`, error)
      toast.error(`Failed to update ${field}`)
    } finally {
      setUpdatingId(null)
    }
  }

  const renderAssignmentRow = (assignment: any) => {
    const deptUpdateKey = `${assignment.id}-department`
    const dishUpdateKey = `${assignment.id}-dish_day`
    const laptopUpdateKey = `${assignment.id}-laptop`
    const bunkUpdateKey = `${assignment.id}-bunk`
    
    const isStudent = assignment.type === "Student"
    
    return (
      <TableRow 
        key={assignment.id} 
        className="hover:bg-gray-50/50"
      >
        <TableCell className="h-16 px-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {assignment.profileImage ? (
                <AvatarImage src={assignment.profileImage} alt={assignment.name} />
              ) : null}
              <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                {assignment.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-gray-900">{assignment.name || "—"}</span>
          </div>
        </TableCell>
        <TableCell className="h-16 px-6">
          <div className="flex items-center gap-2">
            <Select
              value={assignment.department || ""}
              onValueChange={(value) => handleFieldChange(assignment.id, "department", value)}
              disabled={updatingId === deptUpdateKey}
            >
              <SelectTrigger className="w-full cursor-pointer [&>span]:data-[placeholder]:text-gray-400">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value} className="cursor-pointer">
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {updatingId === deptUpdateKey && <Spinner className="h-4 w-4 shrink-0" />}
          </div>
        </TableCell>
        <TableCell className="h-16 px-6">
          <div className="flex items-center gap-2">
            <Select
              value={assignment.dish_day || ""}
              onValueChange={(value) => handleFieldChange(assignment.id, "dish_day", value)}
              disabled={updatingId === dishUpdateKey}
            >
              <SelectTrigger className="w-full cursor-pointer [&>span]:data-[placeholder]:text-gray-400">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {dishDays.map((day) => (
                  <SelectItem key={day.value} value={day.value} className="cursor-pointer">
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {updatingId === dishUpdateKey && <Spinner className="h-4 w-4 shrink-0" />}
          </div>
        </TableCell>
        <TableCell className="h-16 px-6">
          <div className="flex items-center gap-2">
            <Select
              value={assignment.bunk || ""}
              onValueChange={(value) => handleFieldChange(assignment.id, "bunk", value)}
              disabled={updatingId === bunkUpdateKey}
            >
              <SelectTrigger className="w-full cursor-pointer [&>span]:data-[placeholder]:text-gray-400">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {rooms?.sort((a: any, b: any) => (a.location || "").localeCompare(b.location || "")).map((room: any) => (
                  <SelectItem key={room.id} value={room.location} className="cursor-pointer">
                    {room.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {updatingId === bunkUpdateKey && <Spinner className="h-4 w-4 shrink-0" />}
          </div>
        </TableCell>
        <TableCell className="h-16 px-6">
          {isStudent ? (
            <div className="flex items-center gap-2">
              <Select
                value={assignment.laptop || ""}
                onValueChange={(value) => handleFieldChange(assignment.id, "laptop", value)}
                disabled={updatingId === laptopUpdateKey}
              >
                <SelectTrigger className="w-full cursor-pointer [&>span]:data-[placeholder]:text-gray-400">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {laptops?.sort((a: any, b: any) => a.laptop_number.localeCompare(b.laptop_number)).map((laptop: any) => (
                    <SelectItem key={laptop.id} value={laptop.laptop_number} className="cursor-pointer">
                      {laptop.laptop_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 w-[56px] shrink-0">
                {updatingId === laptopUpdateKey ? (
                  <Spinner className="h-4 w-4" />
                ) : assignment.laptop && laptops?.find((l: any) => l.laptop_number === assignment.laptop)?.adminConsoleLink ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 cursor-pointer"
                    onClick={() => {
                      const laptop = laptops.find((l: any) => l.laptop_number === assignment.laptop)
                      if (laptop?.adminConsoleLink) {
                        window.open(laptop.adminConsoleLink, '_blank')
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </TableCell>
        <TableCell className="h-16 px-6 text-right">
          {isStudent ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 cursor-pointer"
              onClick={() => router.push(`/student/${assignment.personId}?expedition=${expeditionId}`)}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          ) : isAdmin ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 cursor-pointer"
              onClick={() => router.push(`/staff/${assignment.personId}`)}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          ) : null}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Expedition Header with Navigation */}
      <ExpeditionHeader expedition={expedition} isLoading={expeditionsLoading} currentPage="students" />

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Department</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Dish Day</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Bunk</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Laptop</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-8 w-24" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-8 w-24" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-8 w-24" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : staffAssignments.length === 0 && studentAssignments.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-lg font-medium text-gray-600">No assignments found</p>
              <p className="text-sm text-gray-500 mt-1">
                Staff and students will appear here once assigned to this expedition.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Department</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Dish Day</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Bunk</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Laptop</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Students Section */}
                {studentAssignments.length > 0 && (
                  <>
                    <TableRow className="bg-gray-100/50">
                      <TableCell colSpan={6} className="h-10 px-6">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          Students ({studentAssignments.length})
                        </span>
                      </TableCell>
                    </TableRow>
                    {studentAssignments.map((assignment: any) => renderAssignmentRow(assignment))}
                  </>
                )}

                {/* Staff Section */}
                {staffAssignments.length > 0 && (
                  <>
                    <TableRow className="bg-gray-100/50">
                      <TableCell colSpan={6} className="h-10 px-6">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          Staff ({staffAssignments.length})
                        </span>
                      </TableCell>
                    </TableRow>
                    {staffAssignments.map((assignment: any) => renderAssignmentRow(assignment))}
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  )
}
