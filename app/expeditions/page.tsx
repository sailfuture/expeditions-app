"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { format } from "date-fns"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { ExternalLink, Calendar, MapPin, Plus, Pencil, ChevronDown } from "lucide-react"
import { useExpeditions, useSchoolTerms, useSchoolYears } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { createExpedition, updateExpedition } from "@/lib/xano"
import { toast } from "sonner"
import { mutate } from "swr"

export default function ExpeditionsPage() {
  const router = useRouter()
  const { currentUser, isLoading: userLoading } = useCurrentUser()
  const { data: expeditions, isLoading } = useExpeditions()
  const { data: schoolTerms } = useSchoolTerms()
  const { data: schoolYears } = useSchoolYears()
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingExpedition, setEditingExpedition] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSettingActive, setIsSettingActive] = useState<number | null>(null)
  const [showPastExpeditions, setShowPastExpeditions] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    schoolterms_id: 0,
    schoolyears_id: 0,
  })

  // Sort expeditions by start date descending (most recent first) - MUST be before any conditional returns
  const sortedExpeditions = useMemo(() => {
    if (!expeditions) return []
    return [...expeditions].sort((a: any, b: any) => {
      const dateA = new Date(a.startDate)
      const dateB = new Date(b.startDate)
      return dateB.getTime() - dateA.getTime() // Descending
    })
  }, [expeditions])
  
  // Filter past expeditions if toggle is off - MUST be before any conditional returns
  const filteredExpeditions = useMemo(() => {
    if (showPastExpeditions) return sortedExpeditions
    const now = new Date()
    return sortedExpeditions.filter((e: any) => new Date(e.endDate) >= now)
  }, [sortedExpeditions, showPastExpeditions])

  const isAdmin = currentUser?.role === "Admin"

  // Redirect non-admin users to their expeditions page
  useEffect(() => {
    if (!userLoading && currentUser && currentUser.role !== "Admin") {
      router.push("/my-expeditions")
    }
  }, [currentUser, userLoading, router])
  
  const parseLocalDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  
  const openCreateDialog = () => {
    setEditingExpedition(null)
    setFormData({
      name: "",
      startDate: "",
      endDate: "",
      schoolterms_id: 0,
      schoolyears_id: 0,
    })
    setDialogOpen(true)
  }
  
  const openEditDialog = (expedition: any) => {
    setEditingExpedition(expedition)
    setFormData({
      name: expedition.name,
      startDate: expedition.startDate,
      endDate: expedition.endDate,
      schoolterms_id: expedition.schoolterms_id,
      schoolyears_id: expedition.schoolyears_id,
    })
    setDialogOpen(true)
  }
  
  const handleSubmit = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate || !formData.schoolterms_id || !formData.schoolyears_id) {
      toast.error("Please fill in all fields")
      return
    }
    
    setIsSubmitting(true)
    try {
      if (editingExpedition) {
        await updateExpedition(editingExpedition.id, {
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate,
          schoolterms_id: formData.schoolterms_id,
          schoolyears_id: formData.schoolyears_id,
        })
        toast.success("Expedition updated successfully")
      } else {
        await createExpedition(formData)
        toast.success("Expedition created successfully")
      }
      mutate("expeditions")
      setDialogOpen(false)
    } catch (error) {
      console.error("Failed to save expedition:", error)
      toast.error("Failed to save expedition")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking auth
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-8 w-32 mx-auto mb-2" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    )
  }


  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return format(date, "MMM d, yyyy")
    } catch {
      return dateStr
    }
  }

  const calculateDays = (startDate: string, endDate: string) => {
    try {
      const [sy, sm, sd] = startDate.split('-').map(Number)
      const [ey, em, ed] = endDate.split('-').map(Number)
      const start = new Date(sy, sm - 1, sd)
      const end = new Date(ey, em - 1, ed)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      return diffDays
    } catch {
      return 0
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">All Expeditions</h1>
              <p className="text-muted-foreground mt-2">
                View and manage all expeditions
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-past"
                  checked={showPastExpeditions}
                  onCheckedChange={setShowPastExpeditions}
                />
                <Label htmlFor="show-past" className="text-sm cursor-pointer">
                  Show past expeditions
                </Label>
              </div>
              {isAdmin && (
                <Button onClick={openCreateDialog} className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-2" />
                  New Expedition
                </Button>
              )}
            </div>
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
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Dates</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Duration</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Term</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">School Year</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-16 px-6">
                      <div className="flex items-center justify-end gap-1">
                        <Skeleton className="h-7 w-20" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !filteredExpeditions || filteredExpeditions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-600">No expeditions found</p>
              <p className="text-sm text-gray-500 mt-1">
                {!showPastExpeditions && expeditions && expeditions.length > 0 
                  ? "All expeditions are in the past. Toggle 'Show past expeditions' to view them."
                  : "Expeditions will appear here once created."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Dates</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Duration</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Term</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">School Year</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpeditions.map((expedition: any) => {
                  const days = calculateDays(expedition.startDate, expedition.endDate)
                  
                  return (
                    <TableRow 
                      key={expedition.id} 
                      className="hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => router.push(`/expedition/${expedition.id}`)}
                    >
                      <TableCell className="h-16 px-6">
                        <div className="font-medium text-gray-900">{expedition.name}</div>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            {formatDate(expedition.startDate)} — {formatDate(expedition.endDate)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <span className="text-sm text-gray-600">{days} days</span>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <Badge variant="outline" className="bg-white border-gray-200 text-gray-700">
                          {expedition._schoolterms?.short_name || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <span className="text-sm text-gray-600">
                          {expedition._schoolyears?.name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="h-16 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin && (
                            <>
                              <Button
                                variant={expedition.isActive ? "default" : "outline"}
                                size="sm"
                                className="h-7 cursor-pointer text-xs"
                                disabled={isSettingActive === expedition.id}
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (expedition.isActive) {
                                    // Don't allow deactivating - must set another as active
                                    return
                                  }
                                  setIsSettingActive(expedition.id)
                                  try {
                                    // First, deactivate all other expeditions
                                    const activeExpeditions = expeditions?.filter((e: any) => e.isActive && e.id !== expedition.id) || []
                                    for (const exp of activeExpeditions) {
                                      await updateExpedition(exp.id, { isActive: false })
                                    }
                                    // Then activate this one
                                    await updateExpedition(expedition.id, { isActive: true })
                                    mutate("expeditions")
                                    toast.success("Expedition activated")
                                  } catch (error) {
                                    console.error("Failed to set active expedition:", error)
                                    toast.error("Failed to activate expedition")
                                  } finally {
                                    setIsSettingActive(null)
                                  }
                                }}
                              >
                                {isSettingActive === expedition.id ? (
                                  <Spinner size="sm" className="h-3 w-3" />
                                ) : expedition.isActive ? "Active" : "Set Active"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditDialog(expedition)
                                }}
                              >
                                <Pencil className="h-4 w-4 text-gray-500" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/expedition/${expedition.id}`)
                            }}
                          >
                            <ExternalLink className="h-4 w-4 text-gray-500" />
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

      {/* Create/Edit Expedition Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingExpedition ? "Edit Expedition" : "Create New Expedition"}</DialogTitle>
            <DialogDescription>
              {editingExpedition ? "Update expedition details below." : "Add a new expedition to the system."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="expedition_name">Expedition Name *</Label>
              <Input
                id="expedition_name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Winter Expedition"
                className="mt-1.5"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="flex-1 bg-white"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        type="button"
                        size="icon"
                        className="cursor-pointer flex-shrink-0 bg-white h-8"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                      <CalendarComponent
                        mode="single"
                        selected={parseLocalDate(formData.startDate)}
                        captionLayout="dropdown-buttons"
                        onSelect={(date) => {
                          if (date) {
                            setFormData(prev => ({ ...prev, startDate: format(date, "yyyy-MM-dd") }))
                          }
                        }}
                        fromYear={2020}
                        toYear={2030}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div>
                <Label htmlFor="end_date">End Date *</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="flex-1 bg-white"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        type="button"
                        size="icon"
                        className="cursor-pointer flex-shrink-0 bg-white h-8"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                      <CalendarComponent
                        mode="single"
                        selected={parseLocalDate(formData.endDate)}
                        captionLayout="dropdown-buttons"
                        onSelect={(date) => {
                          if (date) {
                            setFormData(prev => ({ ...prev, endDate: format(date, "yyyy-MM-dd") }))
                          }
                        }}
                        fromYear={2020}
                        toYear={2030}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="school_term">School Term *</Label>
              <Select
                value={formData.schoolterms_id ? formData.schoolterms_id.toString() : ""}
                onValueChange={(value) => setFormData(prev => ({ ...prev, schoolterms_id: parseInt(value) }))}
              >
                <SelectTrigger className="w-full mt-1.5 cursor-pointer">
                  <SelectValue placeholder="Select school term" />
                </SelectTrigger>
                <SelectContent>
                  {schoolTerms?.map((term: any) => (
                    <SelectItem key={term.id} value={term.id.toString()}>
                      {term.full_name} ({term.short_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="school_year">School Year *</Label>
              <Select
                value={formData.schoolyears_id ? formData.schoolyears_id.toString() : ""}
                onValueChange={(value) => setFormData(prev => ({ ...prev, schoolyears_id: parseInt(value) }))}
              >
                <SelectTrigger className="w-full mt-1.5 cursor-pointer">
                  <SelectValue placeholder="Select school year" />
                </SelectTrigger>
                <SelectContent>
                  {schoolYears?.map((year: any) => (
                    <SelectItem key={year.id} value={year.id.toString()}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                editingExpedition ? "Update Expedition" : "Create Expedition"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

