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
import { ExternalLink, Check, ChevronsUpDown, X, Plus, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { getExpeditionAssignmentsByExpedition, updateExpeditionAssignment, getExpeditionLaptops, getExpeditionsRooms, getExpeditionDishDays, updateExpeditionDishDay, getExpeditionsGalleyTeam, updateExpeditionsGalleyTeam, createExpeditionsGalleyTeam, deleteExpeditionsGalleyTeam, getExpeditionDepartments } from "@/lib/xano"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { mutate } from "swr"
import { toast } from "sonner"
import { useState } from "react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function AssignmentsPage({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)
  const expeditionId = parseInt(id)

  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [addGalleyTeamOpen, setAddGalleyTeamOpen] = useState(false)
  const [newGalleyTeamName, setNewGalleyTeamName] = useState("")
  const [creatingGalleyTeam, setCreatingGalleyTeam] = useState(false)
  const [deleteGalleyTeamOpen, setDeleteGalleyTeamOpen] = useState(false)
  const [galleyTeamToDelete, setGalleyTeamToDelete] = useState<any>(null)
  const [deletingGalleyTeam, setDeletingGalleyTeam] = useState(false)
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
  const { data: departmentsData } = useSWR("expedition_departments", getExpeditionDepartments)
  const { data: dishTeams, isLoading: dishTeamsLoading } = useSWR(
    expeditionId ? `expedition_dish_days_${expeditionId}` : null,
    () => getExpeditionDishDays(expeditionId)
  )
  const { data: galleyTeams, isLoading: galleyTeamsLoading } = useSWR(
    expeditionId ? `expeditions_galley_team_${expeditionId}` : null,
    () => getExpeditionsGalleyTeam(expeditionId)
  )

  // Build departments list from API data
  const departments = [
    { value: "none", label: "None", id: 0 },
    ...(departmentsData || []).map((d: any) => ({
      value: String(d.id),
      label: d.name,
      id: d.id
    })).sort((a: any, b: any) => a.label.localeCompare(b.label))
  ]

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

  const handleFieldChange = async (assignmentId: number, field: string, value: string | number[] | null) => {
    const updateKey = `${assignmentId}-${field}`
    setUpdatingId(updateKey)
    
    // Handle different field types
    let displayValue: any
    let apiValue: any
    
    if (field === 'expedition_departments_id') {
      // expedition_departments_id is an array of department IDs
      if (value === null || value === "none" || (Array.isArray(value) && value.length === 0)) {
        // For optimistic display, we need to show empty array of objects
        displayValue = []
        apiValue = []
      } else if (Array.isArray(value)) {
        // For optimistic display, convert IDs to objects with names
        displayValue = value.map((id: number) => {
          const dept = departmentsData?.find((d: any) => d.id === id)
          return dept ? { id: dept.id, name: dept.name } : { id, name: "Unknown" }
        })
        apiValue = value
      } else {
        // Single value - convert to array
        const numValue = typeof value === 'string' ? parseInt(value) : value
        const dept = departmentsData?.find((d: any) => d.id === numValue)
        displayValue = dept ? [{ id: dept.id, name: dept.name }] : []
        apiValue = [numValue]
      }
    } else {
      // Other fields remain as strings
      displayValue = value === "none" ? "" : value
      apiValue = value === "none" ? null : value
    }
    
    // Optimistic update - update local cache immediately
    mutate(
      `expedition_assignments_${expeditionId}`,
      (currentData: any[] | undefined) => {
        if (!currentData) return currentData
        return currentData.map((item: any) => {
          if (item.id === assignmentId) {
            return { ...item, [field]: displayValue }
          }
          return item
        })
      },
      false // Don't revalidate yet
    )
    
    try {
      const updateData: any = {}
      updateData[field] = apiValue
      
      console.log(`Updating assignment ${assignmentId}, field ${field} to:`, apiValue)
      
      await updateExpeditionAssignment(assignmentId, updateData)
      
      toast.success(`Department updated`)
    } catch (error) {
      console.error(`Failed to update ${field}:`, error)
      toast.error(`Failed to update department`)
      // Revert on error by refetching
      mutate(`expedition_assignments_${expeditionId}`)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDishTeamFieldChange = async (dishTeamId: number, field: string, value: any) => {
    const updateKey = `dishteam-${dishTeamId}-${field}`
    setUpdatingId(updateKey)
    
    try {
      const updateData: any = {}
      updateData[field] = value
      
      await updateExpeditionDishDay(dishTeamId, updateData)
      mutate(`expedition_dish_days_${expeditionId}`)
      
      toast.success(`Dish team ${field} updated`)
    } catch (error) {
      console.error(`Failed to update dish team ${field}:`, error)
      toast.error(`Failed to update dish team ${field}`)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleGalleyTeamFieldChange = async (galleyTeamId: number, field: string, value: any) => {
    const updateKey = `galleyteam-${galleyTeamId}-${field}`
    setUpdatingId(updateKey)
    
    try {
      const updateData: any = {}
      updateData[field] = value
      
      await updateExpeditionsGalleyTeam(galleyTeamId, updateData)
      mutate(`expeditions_galley_team_${expeditionId}`)
      
      toast.success(`Galley team ${field} updated`)
    } catch (error) {
      console.error(`Failed to update galley team ${field}:`, error)
      toast.error(`Failed to update galley team ${field}`)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleCreateGalleyTeam = async () => {
    if (!newGalleyTeamName.trim()) {
      toast.error("Please enter a team name")
      return
    }

    setCreatingGalleyTeam(true)
    try {
      await createExpeditionsGalleyTeam({
        name: newGalleyTeamName.trim(),
        expeditions_id: expeditionId,
        students_id: [],
      })
      mutate(`expeditions_galley_team_${expeditionId}`)
      toast.success(`Galley team "${newGalleyTeamName}" created`)
      setNewGalleyTeamName("")
      setAddGalleyTeamOpen(false)
    } catch (error) {
      console.error("Failed to create galley team:", error)
      toast.error("Failed to create galley team")
    } finally {
      setCreatingGalleyTeam(false)
    }
  }

  const handleDeleteGalleyTeam = async () => {
    if (!galleyTeamToDelete) return

    setDeletingGalleyTeam(true)
    try {
      await deleteExpeditionsGalleyTeam(galleyTeamToDelete.id)
      mutate(`expeditions_galley_team_${expeditionId}`)
      toast.success(`Galley team "${galleyTeamToDelete.name}" deleted`)
      setDeleteGalleyTeamOpen(false)
      setGalleyTeamToDelete(null)
    } catch (error) {
      console.error("Failed to delete galley team:", error)
      toast.error("Failed to delete galley team")
    } finally {
      setDeletingGalleyTeam(false)
    }
  }

  const renderAssignmentRow = (assignment: any) => {
    const deptUpdateKey = `${assignment.id}-department`
    const laptopUpdateKey = `${assignment.id}-laptop`
    const bunkUpdateKey = `${assignment.id}-bunk`
    
    const isStudent = assignment.type === "Student"
    
    return (
      <TableRow 
        key={assignment.id} 
        className={isStudent ? "hover:bg-gray-50/50 cursor-pointer" : "hover:bg-gray-50/50"}
        onClick={() => {
          if (isStudent) {
            router.push(`/student/${assignment.personId}?expedition=${expeditionId}`)
          }
        }}
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
        <TableCell className="h-16 px-6 w-[300px] min-w-[300px] max-w-[300px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 w-full">
            {isStudent ? (
              // Single select for students
              <>
                <Select
                  value={Array.isArray(assignment.expedition_departments_id) && assignment.expedition_departments_id.length > 0 
                    ? String(assignment.expedition_departments_id[0]?.id || assignment.expedition_departments_id[0]) 
                    : "none"}
                  onValueChange={(value) => handleFieldChange(assignment.id, "expedition_departments_id", value === "none" ? [] : [parseInt(value)])}
                  disabled={updatingId === deptUpdateKey}
                >
                  <SelectTrigger className="w-[220px] min-w-[220px] max-w-[220px] cursor-pointer [&_[data-placeholder]]:text-gray-400">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem 
                        key={dept.value} 
                        value={dept.value} 
                        className={dept.value === "none" ? "cursor-pointer text-gray-500" : "cursor-pointer"}
                      >
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-4 h-4 shrink-0">
                  {updatingId === deptUpdateKey && <Spinner className="h-4 w-4" />}
                </div>
              </>
            ) : (
              // Multi-select for staff
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-[220px] min-w-[220px] max-w-[220px] justify-between h-9 text-sm cursor-pointer [&_[data-placeholder]]:text-gray-400"
                      disabled={updatingId === deptUpdateKey}
                    >
                    <span className="truncate text-left flex-1">
                      {Array.isArray(assignment.expedition_departments_id) && assignment.expedition_departments_id.length > 0 ? (
                        assignment.expedition_departments_id.map((d: any) => d.name || d).join(', ')
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Search departments..." />
                      <CommandEmpty>No department found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-y-auto">
                        {departments.filter(d => d.value !== "none").map((dept) => {
                          const currentDeptIds = Array.isArray(assignment.expedition_departments_id) 
                            ? assignment.expedition_departments_id.map((d: any) => d.id || d) 
                            : []
                          const isSelected = currentDeptIds.includes(dept.id)
                          return (
                            <CommandItem
                              key={dept.value}
                              onSelect={() => {
                                const newDeptIds = isSelected
                                  ? currentDeptIds.filter((id: number) => id !== dept.id)
                                  : [...currentDeptIds, dept.id]
                                handleFieldChange(assignment.id, "expedition_departments_id", newDeptIds)
                              }}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  isSelected ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="flex-1 text-sm">{dept.label}</span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {/* Clear button - always reserve space */}
                <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                  {Array.isArray(assignment.expedition_departments_id) && assignment.expedition_departments_id.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 cursor-pointer hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFieldChange(assignment.id, "expedition_departments_id", [])
                      }}
                      disabled={updatingId === deptUpdateKey}
                      title="Clear departments"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </Button>
                  ) : updatingId === deptUpdateKey ? (
                    <Spinner className="h-4 w-4" />
                  ) : null}
                </div>
              </>
            )}
          </div>
        </TableCell>
        <TableCell className="h-16 px-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <Select
              value={assignment.bunk || "none"}
              onValueChange={(value) => handleFieldChange(assignment.id, "bunk", value)}
              disabled={updatingId === bunkUpdateKey}
            >
              <SelectTrigger className="w-full cursor-pointer [&_[data-placeholder]]:text-gray-400">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="cursor-pointer text-gray-500">
                  None
                </SelectItem>
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
                value={assignment.laptop || "none"}
                onValueChange={(value) => handleFieldChange(assignment.id, "laptop", value)}
                disabled={updatingId === laptopUpdateKey}
              >
                <SelectTrigger className="w-full cursor-pointer [&>span]:data-[placeholder]:text-gray-400">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="cursor-pointer text-gray-500">
                    None
                  </SelectItem>
                  {laptops?.sort((a: any, b: any) => a.laptop_number.localeCompare(b.laptop_number)).map((laptop: any) => (
                    <SelectItem key={laptop.id} value={laptop.laptop_number} className="cursor-pointer">
                      {laptop.laptop_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 w-[56px] shrink-0" onClick={(e) => e.stopPropagation()}>
                {updatingId === laptopUpdateKey ? (
                  <Spinner className="h-4 w-4" />
                ) : assignment.laptop && assignment.laptop !== "none" && laptops?.find((l: any) => l.laptop_number === assignment.laptop)?.adminConsoleLink ? (
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
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[300px] min-w-[300px]">Department</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Bunk</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Laptop</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-16 px-6 w-[300px] min-w-[300px]"><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-8 w-24" /></TableCell>
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
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[300px] min-w-[300px]">Department</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Bunk</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Laptop</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Students Section */}
                {studentAssignments.length > 0 && (
                  <>
                    <TableRow className="bg-gray-100/50">
                      <TableCell colSpan={4} className="h-10 px-6">
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
                      <TableCell colSpan={4} className="h-10 px-6">
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

        {/* Dish Teams Section */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Dish Team Assignments</h2>
            <p className="text-sm text-gray-600 mt-1">Assign students and staff to daily dish teams</p>
          </div>
          
          {dishTeamsLoading ? (
            <div className="p-12 text-center">
              <Spinner className="h-6 w-6" />
              <p className="text-sm text-gray-500 mt-3">Loading dish teams...</p>
            </div>
          ) : !dishTeams || dishTeams.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-lg font-medium text-gray-600">No dish teams found</p>
              <p className="text-sm text-gray-500 mt-1">Dish teams will appear here for this expedition.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[120px] min-w-[120px] max-w-[120px]">Team</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[100px] min-w-[100px] max-w-[100px]">Day</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[200px] min-w-[200px] max-w-[200px]">Wash (Students)</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[200px] min-w-[200px] max-w-[200px]">Dry (Students)</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[180px] min-w-[180px] max-w-[180px]">Support (Staff)</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[180px] min-w-[180px] max-w-[180px]">Supervisor (Staff)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...dishTeams]
                  .sort((a: any, b: any) => {
                    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                    return dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week)
                  })
                  .map((team: any) => {
                  const washUpdateKey = `dishteam-${team.id}-wash`
                  const dryUpdateKey = `dishteam-${team.id}-dry`
                  const supportUpdateKey = `dishteam-${team.id}-support`
                  const supervisorUpdateKey = `dishteam-${team.id}-supervisor`
                  
                  return (
                    <TableRow key={team.id} className="hover:bg-gray-50/50">
                      <TableCell className="h-16 px-6 w-[120px] min-w-[120px] max-w-[120px]">
                        <span className="font-medium text-gray-900 truncate block">{team.dishteam}</span>
                      </TableCell>
                      <TableCell className="h-16 px-6 w-[100px] min-w-[100px] max-w-[100px]">
                        <span className="text-gray-600 truncate block">{team.day_of_week}</span>
                      </TableCell>
                      
                      {/* Wash (Multi-select Students) */}
                      <TableCell className="h-16 px-6 w-[200px] min-w-[200px] max-w-[200px]">
                        <div className="flex items-center gap-2 w-full">
                          {assignmentsLoading ? (
                            <div className="flex items-center gap-2 h-9">
                              <Spinner className="h-4 w-4" />
                              <span className="text-sm text-gray-400">Loading...</span>
                            </div>
                          ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between h-9 text-sm cursor-pointer [&_[data-placeholder]]:text-gray-400"
                                disabled={updatingId === washUpdateKey}
                              >
                                <span className="truncate text-left flex-1">
                                  {team.wash && team.wash.length > 0 ? (
                                    team.wash.map((studentId: number) => {
                                      const student = studentAssignments.find((s: any) => s.personId === studentId)
                                      return student?.name || ''
                                    }).filter(Boolean).join(', ')
                                  ) : (
                                    <span className="text-gray-400">None</span>
                                  )}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0">
                              <Command>
                                <CommandInput placeholder="Search students..." />
                                <CommandEmpty>No student found.</CommandEmpty>
                                <CommandGroup className="max-h-64 overflow-y-auto">
                                  {studentAssignments.map((student: any) => {
                                    const isSelected = team.wash?.includes(student.personId)
                                    return (
                                      <CommandItem
                                        key={student.personId}
                                        onSelect={() => {
                                          const currentWash = team.wash || []
                                          const newWash = isSelected
                                            ? currentWash.filter((id: number) => id !== student.personId)
                                            : [...currentWash, student.personId]
                                          handleDishTeamFieldChange(team.id, 'wash', newWash)
                                        }}
                                        className="cursor-pointer flex items-center gap-2"
                                      >
                                        <Check
                                          className={cn(
                                            "h-4 w-4",
                                            isSelected ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <Avatar className="h-5 w-5">
                                          {student.profileImage ? (
                                            <AvatarImage src={student.profileImage} alt={student.name} />
                                          ) : null}
                                          <AvatarFallback className="text-[8px] bg-gray-200 text-gray-600">
                                            {student.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="flex-1 text-sm truncate">{student.name}</span>
                                      </CommandItem>
                                    )
                                  })}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          )}
                          {updatingId === washUpdateKey && <Spinner className="h-4 w-4 shrink-0" />}
                        </div>
                      </TableCell>
                      
                      {/* Dry (Multi-select Students) */}
                      <TableCell className="h-16 px-6 w-[200px] min-w-[200px] max-w-[200px]">
                        <div className="flex items-center gap-2 w-full">
                          {assignmentsLoading ? (
                            <div className="flex items-center gap-2 h-9">
                              <Spinner className="h-4 w-4" />
                              <span className="text-sm text-gray-400">Loading...</span>
                            </div>
                          ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between h-9 text-sm cursor-pointer [&_[data-placeholder]]:text-gray-400"
                                disabled={updatingId === dryUpdateKey}
                              >
                                <span className="truncate text-left flex-1">
                                  {team.dry && team.dry.length > 0 ? (
                                    team.dry.map((studentId: number) => {
                                      const student = studentAssignments.find((s: any) => s.personId === studentId)
                                      return student?.name || ''
                                    }).filter(Boolean).join(', ')
                                  ) : (
                                    <span className="text-gray-400">None</span>
                                  )}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0">
                              <Command>
                                <CommandInput placeholder="Search students..." />
                                <CommandEmpty>No student found.</CommandEmpty>
                                <CommandGroup className="max-h-64 overflow-y-auto">
                                  {studentAssignments.map((student: any) => {
                                    const isSelected = team.dry?.includes(student.personId)
                                    return (
                                      <CommandItem
                                        key={student.personId}
                                        onSelect={() => {
                                          const currentDry = team.dry || []
                                          const newDry = isSelected
                                            ? currentDry.filter((id: number) => id !== student.personId)
                                            : [...currentDry, student.personId]
                                          handleDishTeamFieldChange(team.id, 'dry', newDry)
                                        }}
                                        className="cursor-pointer flex items-center gap-2"
                                      >
                                        <Check
                                          className={cn(
                                            "h-4 w-4",
                                            isSelected ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <Avatar className="h-5 w-5">
                                          {student.profileImage ? (
                                            <AvatarImage src={student.profileImage} alt={student.name} />
                                          ) : null}
                                          <AvatarFallback className="text-[8px] bg-gray-200 text-gray-600">
                                            {student.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="flex-1 text-sm truncate">{student.name}</span>
                                      </CommandItem>
                                    )
                                  })}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          )}
                          {updatingId === dryUpdateKey && <Spinner className="h-4 w-4 shrink-0" />}
                        </div>
                      </TableCell>
                      
                      {/* Support (Single-select Staff) */}
                      <TableCell className="h-16 px-6 w-[180px] min-w-[180px] max-w-[180px]">
                        <div className="flex items-center gap-2 w-full">
                          {assignmentsLoading ? (
                            <div className="flex items-center gap-2 h-9">
                              <Spinner className="h-4 w-4" />
                              <span className="text-sm text-gray-400">Loading...</span>
                            </div>
                          ) : (
                          <Select
                            value={team.support ? team.support.toString() : "0"}
                            onValueChange={(value) => handleDishTeamFieldChange(team.id, "support", parseInt(value))}
                            disabled={updatingId === supportUpdateKey}
                          >
                            <SelectTrigger className="w-full cursor-pointer">
                              <SelectValue placeholder="Select staff..." className="truncate" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0" className="cursor-pointer text-gray-500">
                                None
                              </SelectItem>
                              {staffAssignments.map((staff: any) => (
                                <SelectItem key={staff.personId} value={staff.personId.toString()} className="cursor-pointer">
                                  <span className="truncate">{staff.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          )}
                          {updatingId === supportUpdateKey && <Spinner className="h-4 w-4 shrink-0" />}
                        </div>
                      </TableCell>
                      
                      {/* Supervisor (Single-select Staff) */}
                      <TableCell className="h-16 px-6 w-[180px] min-w-[180px] max-w-[180px]">
                        <div className="flex items-center gap-2 w-full">
                          {assignmentsLoading ? (
                            <div className="flex items-center gap-2 h-9">
                              <Spinner className="h-4 w-4" />
                              <span className="text-sm text-gray-400">Loading...</span>
                            </div>
                          ) : (
                          <Select
                            value={team.supervisor ? team.supervisor.toString() : "0"}
                            onValueChange={(value) => handleDishTeamFieldChange(team.id, "supervisor", parseInt(value))}
                            disabled={updatingId === supervisorUpdateKey}
                          >
                            <SelectTrigger className="w-full cursor-pointer">
                              <SelectValue placeholder="Select staff..." className="truncate" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0" className="cursor-pointer text-gray-500">
                                None
                              </SelectItem>
                              {staffAssignments.map((staff: any) => (
                                <SelectItem key={staff.personId} value={staff.personId.toString()} className="cursor-pointer">
                                  <span className="truncate">{staff.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          )}
                          {updatingId === supervisorUpdateKey && <Spinner className="h-4 w-4 shrink-0" />}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Galley Teams Section */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Galley Team Assignments</h2>
              <p className="text-sm text-gray-600 mt-1">Assign students and staff to galley teams</p>
            </div>
            <Button
              onClick={() => setAddGalleyTeamOpen(true)}
              size="sm"
              className="cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Team
            </Button>
          </div>
          
          {galleyTeamsLoading ? (
            <div className="p-12 text-center">
              <Spinner className="h-6 w-6" />
              <p className="text-sm text-gray-500 mt-3">Loading galley teams...</p>
            </div>
          ) : !galleyTeams || galleyTeams.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-lg font-medium text-gray-600">No galley teams found</p>
              <p className="text-sm text-gray-500 mt-1">Click "Add Team" to create your first galley team.</p>
            </div>
          ) : (
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600" style={{ width: '15%' }}>Team Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600" style={{ width: '50%' }}>Students</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600" style={{ width: '25%' }}>Staff Supervisor</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 text-right" style={{ width: '10%' }}></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {galleyTeams
                  .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
                  .map((team: any) => {
                  const studentsUpdateKey = `galleyteam-${team.id}-students`
                  const staffUpdateKey = `galleyteam-${team.id}-staff`
                  
                  return (
                    <TableRow key={team.id} className="hover:bg-gray-50/50">
                      <TableCell className="h-16 px-6">
                        <span className="font-medium text-gray-900">{team.name}</span>
                      </TableCell>
                      
                      {/* Students (Multi-select) */}
                      <TableCell className="h-16 px-6">
                        <div className="flex items-center gap-2">
                          {assignmentsLoading ? (
                            <div className="flex items-center gap-2 h-10">
                              <Spinner className="h-4 w-4" />
                              <span className="text-sm text-gray-400">Loading...</span>
                            </div>
                          ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between h-10 text-sm cursor-pointer min-w-0"
                                disabled={updatingId === studentsUpdateKey}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                                  {team.students_id && team.students_id.length > 0 ? (
                                    <>
                                      {team.students_id.slice(0, 3).map((studentId: number) => {
                                        const student = studentAssignments.find((s: any) => s.personId === studentId)
                                        if (!student) return null
                                        return (
                                          <div key={studentId} className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">
                                            <Avatar className="h-5 w-5">
                                              {student.profileImage ? (
                                                <AvatarImage src={student.profileImage} alt={student.name} />
                                              ) : null}
                                              <AvatarFallback className="text-[8px] bg-gray-200 text-gray-600">
                                                {student.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-gray-700 whitespace-nowrap">{student.name?.split(' ')[0]}</span>
                                          </div>
                                        )
                                      })}
                                      {team.students_id.length > 1 && (
                                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-900 text-white text-xs font-semibold shrink-0">
                                          {team.students_id.length}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-gray-400 truncate">Select students...</span>
                                  )}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0">
                              <Command>
                                <CommandInput placeholder="Search students..." />
                                <CommandEmpty>No student found.</CommandEmpty>
                                <CommandGroup className="max-h-64 overflow-y-auto">
                                  {studentAssignments.map((student: any) => {
                                    const isSelected = team.students_id?.includes(student.personId)
                                    return (
                                      <CommandItem
                                        key={student.personId}
                                        onSelect={() => {
                                          const currentStudents = team.students_id || []
                                          const newStudents = isSelected
                                            ? currentStudents.filter((id: number) => id !== student.personId)
                                            : [...currentStudents, student.personId]
                                          handleGalleyTeamFieldChange(team.id, 'students_id', newStudents)
                                        }}
                                        className="cursor-pointer flex items-center gap-2"
                                      >
                                        <Check
                                          className={cn(
                                            "h-4 w-4",
                                            isSelected ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <Avatar className="h-5 w-5">
                                          {student.profileImage ? (
                                            <AvatarImage src={student.profileImage} alt={student.name} />
                                          ) : null}
                                          <AvatarFallback className="text-[8px] bg-gray-200 text-gray-600">
                                            {student.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="flex-1 text-sm">{student.name}</span>
                                      </CommandItem>
                                    )
                                  })}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          )}
                          {updatingId === studentsUpdateKey && <Spinner className="h-4 w-4 shrink-0" />}
                        </div>
                      </TableCell>
                      
                      {/* Staff Supervisor (Single-select) */}
                      <TableCell className="h-16 px-6">
                        <div className="flex items-center gap-2">
                          {assignmentsLoading ? (
                            <div className="flex items-center gap-2 h-10">
                              <Spinner className="h-4 w-4" />
                              <span className="text-sm text-gray-400">Loading...</span>
                            </div>
                          ) : (
                          <Select
                            value={team.expedition_staff_id ? team.expedition_staff_id.toString() : "0"}
                            onValueChange={(value) => handleGalleyTeamFieldChange(team.id, "expedition_staff_id", parseInt(value))}
                            disabled={updatingId === staffUpdateKey}
                          >
                            <SelectTrigger className="w-full cursor-pointer">
                              <SelectValue placeholder="Select staff..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0" className="cursor-pointer text-gray-500">
                                None
                              </SelectItem>
                              {staffAssignments.map((staff: any) => (
                                <SelectItem key={staff.personId} value={staff.personId.toString()} className="cursor-pointer">
                                  {staff.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          )}
                          {updatingId === staffUpdateKey && <Spinner className="h-4 w-4 shrink-0" />}
                        </div>
                      </TableCell>
                      
                      {/* Delete Button */}
                      <TableCell className="h-16 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          onClick={() => {
                            setGalleyTeamToDelete(team)
                            setDeleteGalleyTeamOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      {/* Add Galley Team Dialog */}
      <Dialog open={addGalleyTeamOpen} onOpenChange={setAddGalleyTeamOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Galley Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="e.g., Galley Team C"
                value={newGalleyTeamName}
                onChange={(e) => setNewGalleyTeamName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAddGalleyTeamOpen(false)
                  setNewGalleyTeamName("")
                }}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateGalleyTeam}
                disabled={creatingGalleyTeam || !newGalleyTeamName.trim()}
                className="cursor-pointer"
              >
                {creatingGalleyTeam ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Team"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Galley Team Confirmation */}
      <AlertDialog open={deleteGalleyTeamOpen} onOpenChange={setDeleteGalleyTeamOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Galley Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{galleyTeamToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGalleyTeam}
              disabled={deletingGalleyTeam}
              className="bg-red-600 hover:bg-red-700 cursor-pointer"
            >
              {deletingGalleyTeam ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
