"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExternalLink, Users, Plus, Check, ChevronsUpDown, X, Calendar as CalendarIcon } from "lucide-react"
import { useTeachers, useExpeditions } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { createTeacher, createExpeditionAssignment } from "@/lib/xano"
import { mutate } from "swr"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export default function StaffPage() {
  const router = useRouter()
  const { currentUser } = useCurrentUser()
  const { data: staff, isLoading } = useTeachers()
  const { data: allExpeditions } = useExpeditions()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expeditionPopoverOpen, setExpeditionPopoverOpen] = useState(false)
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

  // Admin only
  if (currentUser && currentUser.role !== "Admin") {
    router.push("/dashboard")
    return null
  }

  // Sort staff alphabetically by name
  const sortedStaff = staff?.slice().sort((a: any, b: any) => {
    const nameA = a.name || ""
    const nameB = b.name || ""
    return nameA.localeCompare(nameB)
  })

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      isActive: true,
      expeditions_id: [],
      role: "Staff",
      crew_role: "",
      dob: null,
      crew_status: "",
      passport_number: "",
      passport_issue_date: null,
      passport_expiration_date: null,
      gender: "",
      nationality: "",
      passport_photo: "",
    })
  }

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Staff name is required")
      return
    }

    setIsSubmitting(true)
    try {
      // Create the staff member and get the response with the new ID
      const newStaff = await createTeacher(formData)
      
      // Create expedition assignments for all assigned expeditions
      if (newStaff?.id && formData.expeditions_id.length > 0) {
        for (const expId of formData.expeditions_id) {
          await createExpeditionAssignment({
            expedition_staff_id: newStaff.id,
            expeditions_id: expId,
          })
        }
      }
      
      mutate("teachers")
      toast.success("Staff member created successfully")
      setDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Failed to create staff member:", error)
      toast.error("Failed to create staff member")
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Staff Records</h1>
              <p className="text-muted-foreground mt-2">
                All staff members across all expeditions
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
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
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Staff Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Expeditions</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Role</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !sortedStaff || sortedStaff.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-600">No staff found</p>
              <p className="text-sm text-gray-500 mt-1">Staff records will appear here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Staff Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Expeditions</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Role</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStaff.map((staffMember: any) => {
                  // Get expedition names
                  const expeditionIds = Array.isArray(staffMember.expeditions_id) 
                    ? staffMember.expeditions_id 
                    : staffMember.expeditions_id ? [staffMember.expeditions_id] : []
                  
                  const expeditionNames = expeditionIds.length > 0
                    ? expeditionIds.map((id: number) => 
                        allExpeditions?.find((e: any) => e.id === id)?.name || `Expedition ${id}`
                      )
                    : []

                  return (
                    <TableRow 
                      key={staffMember.id} 
                      className="hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => router.push(`/staff/${staffMember.id}?expedition=${staffMember.expeditions_id}`)}
                    >
                      <TableCell className="h-16 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                              {staffMember.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-900">{staffMember.name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        {expeditionNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {expeditionNames.slice(0, 2).map((name: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                            {expeditionNames.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{expeditionNames.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No expeditions</span>
                        )}
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <Badge variant="outline" className="bg-white border-gray-200 text-gray-700">
                          {staffMember.role || "Staff"}
                        </Badge>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <Badge 
                          variant={staffMember.isActive ? "default" : "secondary"}
                          className={staffMember.isActive 
                            ? "bg-green-100 text-green-700 border-green-200" 
                            : "bg-gray-100 text-gray-600 border-gray-200"
                          }
                        >
                          {staffMember.isActive ? "Active" : "Archived"}
                        </Badge>
                      </TableCell>
                      <TableCell className="h-16 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/staff/${staffMember.id}?expedition=${staffMember.expeditions_id}`)
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
          )}
        </div>
      </main>

      {/* Add Staff Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Create a new staff member and assign them to expeditions.
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
                    placeholder="Enter staff member name"
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
              </div>
            </div>
            
            <div>
              <Label>Expedition Assignments</Label>
              <Popover open={expeditionPopoverOpen} onOpenChange={setExpeditionPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={expeditionPopoverOpen}
                    className="w-full mt-1.5 justify-between cursor-pointer font-normal"
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
                  Creating...
                </>
              ) : (
                "Add Staff"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
