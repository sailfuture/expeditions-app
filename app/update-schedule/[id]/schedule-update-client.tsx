"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ArrowLeft } from "lucide-react"
import { useExpeditionSchedules, useExpeditionLocations } from "@/lib/hooks/use-expeditions"
import { updateExpeditionSchedule } from "@/lib/xano"
import { mutate } from "swr"
import { toast } from "sonner"

interface ScheduleUpdateClientProps {
  scheduleId: string
}

export function ScheduleUpdateClient({ scheduleId }: ScheduleUpdateClientProps) {
  const router = useRouter()
  const { data: schedules, isLoading: loadingSchedules } = useExpeditionSchedules()
  const [updatingField, setUpdatingField] = useState<string | null>(null)
  const [notes, setNotes] = useState<string>("")
  const [notesChanged, setNotesChanged] = useState(false)

  const schedule = useMemo(() => {
    if (!schedules) return null
    return schedules.find((s: any) => s.id === Number(scheduleId))
  }, [schedules, scheduleId])
  
  // Update local notes state when schedule loads
  useMemo(() => {
    if (schedule?.notes) {
      setNotes(schedule.notes)
    }
  }, [schedule?.notes])

  const { data: locations } = useExpeditionLocations(schedule?.expeditions_id)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatLocation = (location: any) => {
    if (!location) return "No Location"
    return `${location.port}, ${location.country}`
  }

  const handleLocationChange = async (locationId: number, isDestination: boolean) => {
    if (!schedule) return
    
    const fieldKey = isDestination ? 'destination' : 'current_location'
    setUpdatingField(fieldKey)
    
    try {
      await updateExpeditionSchedule(schedule.id, {
        expedition_schedule_id: schedule.id,
        name: schedule.name,
        date: schedule.date,
        isOffshore: schedule.isOffshore,
        isService: schedule.isService,
        current_location: isDestination ? schedule.current_location : locationId,
        destination: isDestination ? locationId : schedule.destination,
        expeditions_id: schedule.expeditions_id,
      })
      mutate("expedition_schedules")
      toast.success("Location updated")
    } catch (error) {
      console.error("Failed to update location:", error)
      toast.error("Failed to update location")
    } finally {
      setUpdatingField(null)
    }
  }

  const handleTypeChange = async (type: "anchored" | "service" | "offshore") => {
    if (!schedule) return
    
    const typeMap = {
      "anchored": { isOffshore: false, isService: false },
      "service": { isOffshore: false, isService: true },
      "offshore": { isOffshore: true, isService: false },
    }
    const { isOffshore, isService } = typeMap[type]
    
    setUpdatingField('type')
    try {
      await updateExpeditionSchedule(schedule.id, {
        expedition_schedule_id: schedule.id,
        name: schedule.name,
        date: schedule.date,
        isOffshore: isOffshore,
        isService: isService,
        current_location: schedule.current_location,
        destination: isOffshore ? schedule.destination : 0,
        expeditions_id: schedule.expeditions_id,
      })
      mutate("expedition_schedules")
      toast.success("Type updated")
    } catch (error) {
      console.error("Failed to update type:", error)
      toast.error("Failed to update type")
    } finally {
      setUpdatingField(null)
    }
  }

  const getCurrentType = () => {
    if (!schedule) return "anchored"
    if (schedule.isOffshore || schedule.is_offshore) return "offshore"
    if (schedule.isService || schedule.is_service) return "service"
    return "anchored"
  }

  const handleNotesChange = (value: string) => {
    setNotes(value)
    setNotesChanged(true)
  }

  const handleNotesSave = async () => {
    if (!schedule || !notesChanged) return
    
    setUpdatingField('notes')
    try {
      await updateExpeditionSchedule(schedule.id, {
        expedition_schedule_id: schedule.id,
        name: schedule.name,
        date: schedule.date,
        isOffshore: schedule.isOffshore,
        isService: schedule.isService,
        current_location: schedule.current_location,
        destination: schedule.destination,
        expeditions_id: schedule.expeditions_id,
        notes: notes,
      })
      mutate("expedition_schedules")
      toast.success("Notes updated")
      setNotesChanged(false)
    } catch (error) {
      console.error("Failed to update notes:", error)
      toast.error("Failed to update notes")
    } finally {
      setUpdatingField(null)
    }
  }

  if (loadingSchedules) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Schedule not found</h1>
            <Button onClick={() => router.push("/dashboard")} className="cursor-pointer">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="cursor-pointer">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Update Schedule</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{schedule.name}</h1>
              <p className="text-muted-foreground mt-1">{formatDate(schedule.date)}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push("/dashboard")}
              className="cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-6">Schedule Details</h2>
            
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="w-[200px] font-semibold">Field</TableHead>
                  <TableHead className="font-semibold">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Date */}
                <TableRow>
                  <TableCell className="font-medium">Date</TableCell>
                  <TableCell>{formatDate(schedule.date)}</TableCell>
                </TableRow>

                {/* Name */}
                <TableRow>
                  <TableCell className="font-medium">Name</TableCell>
                  <TableCell>{schedule.name}</TableCell>
                </TableRow>

                {/* Current Location */}
                <TableRow>
                  <TableCell className="font-medium">Current Location</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Select
                        value={schedule.current_location?.toString() || "1"}
                        onValueChange={(value) => handleLocationChange(Number(value), false)}
                        disabled={updatingField === 'current_location'}
                      >
                        <SelectTrigger className="w-[300px]">
                          <SelectValue>
                            <span className="text-sm">
                              {formatLocation(schedule._expedition_current_location)}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {locations?.map((location: any) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.port}, {location.country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {updatingField === 'current_location' && (
                        <Spinner size="sm" className="h-4 w-4" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* Type */}
                <TableRow>
                  <TableCell className="font-medium">Type</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTypeChange("anchored")}
                          disabled={updatingField === 'type'}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                            getCurrentType() === "anchored"
                              ? 'bg-green-50 text-green-700 border-2 border-green-200'
                              : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                          } ${updatingField === 'type' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Anchored
                        </button>
                        <button
                          onClick={() => handleTypeChange("service")}
                          disabled={updatingField === 'type'}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                            getCurrentType() === "service"
                              ? 'bg-red-50 text-red-700 border-2 border-red-200'
                              : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                          } ${updatingField === 'type' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Service
                        </button>
                        <button
                          onClick={() => handleTypeChange("offshore")}
                          disabled={updatingField === 'type'}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                            getCurrentType() === "offshore"
                              ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                              : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                          } ${updatingField === 'type' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Offshore
                        </button>
                      </div>
                      {updatingField === 'type' && (
                        <Spinner size="sm" className="h-4 w-4" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* Destination (only if offshore) */}
                {(schedule.isOffshore || schedule.is_offshore) && (
                  <TableRow>
                    <TableCell className="font-medium">Destination</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Select
                          value={schedule.destination?.toString() || "0"}
                          onValueChange={(value) => handleLocationChange(Number(value), true)}
                          disabled={updatingField === 'destination'}
                        >
                          <SelectTrigger className="w-[300px]">
                            <SelectValue>
                              {schedule._expedition_destination && schedule.destination !== 0 ? (
                                <span className="text-sm">
                                  {formatLocation(schedule._expedition_destination)}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">No destination</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No destination</SelectItem>
                            {locations?.map((location: any) => (
                              <SelectItem key={location.id} value={location.id.toString()}>
                                {location.port}, {location.country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {updatingField === 'destination' && (
                          <Spinner size="sm" className="h-4 w-4" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Notes */}
                <TableRow>
                  <TableCell className="font-medium align-top pt-4">Notes</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <Input
                        value={notes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        placeholder="Add notes about this schedule..."
                        className="w-full"
                        disabled={updatingField === 'notes'}
                      />
                      {notesChanged && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={handleNotesSave}
                            disabled={updatingField === 'notes'}
                            className="cursor-pointer"
                          >
                            {updatingField === 'notes' ? (
                              <>
                                <Spinner size="sm" className="h-3 w-3 mr-2" />
                                Saving...
                              </>
                            ) : (
                              'Save Notes'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setNotes(schedule.notes || "")
                              setNotesChanged(false)
                            }}
                            disabled={updatingField === 'notes'}
                            className="cursor-pointer"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={() => {
              const dateStr = new Date(schedule.date).toISOString().split('T')[0]
              router.push(`/schedule/${dateStr}`)
            }}
            className="cursor-pointer"
          >
            View Full Schedule
          </Button>
          <Button 
            onClick={() => router.push(`/evaluate/${new Date(schedule.date).toISOString().split('T')[0]}`)}
            className="cursor-pointer"
          >
            Record Scores
          </Button>
        </div>
      </div>
    </div>
  )
}

