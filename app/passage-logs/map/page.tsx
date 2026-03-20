"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import dynamic from "next/dynamic"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ChevronLeft, Trash2, Pencil, Check, X } from "lucide-react"
import { getExpeditionPassageLogs, getTeachers, deleteExpeditionPassageLog, updateExpeditionPassageLog } from "@/lib/xano"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import { toast } from "sonner"
import { mutate } from "swr"
import Link from "next/link"

// Dynamically import the map to avoid SSR issues with Leaflet
const PassageLogMap = dynamic(() => import("./passage-log-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <Spinner className="h-8 w-8" />
    </div>
  ),
})

// Convert DMS (degrees, minutes, seconds) to decimal degrees
function dmsToDecimal(deg: number, min: number, sec: number, dir: string): number {
  const decimal = Math.abs(deg) + (min || 0) / 60 + (sec || 0) / 3600
  return (dir === "S" || dir === "W") ? -decimal : decimal
}

export default function PassageLogsMapPage() {
  const [expeditionFilter, setExpeditionFilter] = useState<string>("all")
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<any>({})

  const { data: logs, isLoading: logsLoading } = useSWR(
    "expedition_passage_logs",
    getExpeditionPassageLogs
  )
  const { data: staff } = useSWR("teachers", getTeachers)
  const { data: allExpeditions } = useExpeditions()

  const getStaffName = (staffId: number) => {
    if (!staffId || !staff) return "\u2014"
    const staffMember = staff.find((s: any) => s.id === staffId)
    return staffMember?.name || "Unknown"
  }

  const getStatusBadge = (status: string) => {
    if (!status) return <span className="text-gray-400">{"\u2014"}</span>
    if (status === "completed" || status === "secure" || status === "yes") {
      return <Check className="h-5 w-5 text-green-500" />
    }
    if (status === "not_completed" || status === "not_secure" || status === "no") {
      return <X className="h-5 w-5 text-red-500" />
    }
    return <span className="text-sm text-muted-foreground">{status}</span>
  }

  const formatDateTime = (log: any) => {
    if (!log.date) return "No date"
    try {
      const dateStr = format(new Date(log.date + "T00:00:00"), "MMM d, yyyy")
      const time = log.hrs !== undefined ? `${String(log.hrs).padStart(2, "0")}:${String(log.min).padStart(2, "0")}` : ""
      return time ? `${dateStr} at ${time}` : dateStr
    } catch {
      return log.date
    }
  }

  // Filter logs and convert coordinates
  const mapPoints = useMemo(() => {
    if (!logs) return []

    let filtered = [...logs]
    if (expeditionFilter !== "all") {
      const filterExpId = parseInt(expeditionFilter)
      filtered = filtered.filter((log: any) => log.expeditions_id === filterExpId)
    }

    return filtered
      .filter((log: any) => {
        // Must have valid lat/long data
        return (
          log.latitude_deg !== undefined &&
          log.latitude_deg !== null &&
          log.longitude_deg !== undefined &&
          log.longitude_deg !== null &&
          (log.latitude_deg !== 0 || log.latitude_min !== 0 || log.latitude_sec !== 0) &&
          (log.longitude_deg !== 0 || log.longitude_min !== 0 || log.longitude_sec !== 0)
        )
      })
      .map((log: any) => ({
        ...log,
        lat: dmsToDecimal(log.latitude_deg, log.latitude_min, log.latitude_sec, log.latitude_dir || "N"),
        lng: dmsToDecimal(log.longitude_deg, log.longitude_min, log.longitude_sec, log.longitude_dir || "W"),
      }))
      .sort((a: any, b: any) => a.id - b.id)
  }, [logs, expeditionFilter])

  const handleMarkerClick = (log: any) => {
    setSelectedLog(log)
    setEditing(false)
    setDetailOpen(true)
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedLog) return
    setDeleting(true)
    try {
      await deleteExpeditionPassageLog(selectedLog.id)
      await mutate("expedition_passage_logs")
      toast.success("Passage log deleted")
      setDeleteDialogOpen(false)
      setDetailOpen(false)
      setSelectedLog(null)
    } catch (error) {
      console.error("Failed to delete:", error)
      toast.error("Failed to delete passage log")
    } finally {
      setDeleting(false)
    }
  }

  const handleEditClick = () => {
    if (!selectedLog) return
    setEditData({
      departure_location_name: selectedLog.departure_location_name || "",
      destination_location_name: selectedLog.destination_location_name || "",
      wind_speed_kn: selectedLog.wind_speed_kn || "",
      wind_direction_deg: selectedLog.wind_direction_deg || "",
      boat_speed_kn: selectedLog.boat_speed_kn || "",
      heading_deg: selectedLog.heading_deg || "",
      course_over_ground_deg: selectedLog.course_over_ground_deg || "",
      latitude_deg: selectedLog.latitude_deg || "",
      latitude_min: selectedLog.latitude_min || "",
      latitude_sec: selectedLog.latitude_sec || "",
      longitude_deg: selectedLog.longitude_deg || "",
      longitude_min: selectedLog.longitude_min || "",
      longitude_sec: selectedLog.longitude_sec || "",
      general_observations: selectedLog.general_observations || "",
      additional_notes: selectedLog.additional_notes || "",
    })
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedLog) return
    setSaving(true)
    try {
      const updatePayload: Record<string, any> = {}
      for (const [key, value] of Object.entries(editData)) {
        const numericFields = ["wind_speed_kn", "wind_direction_deg", "boat_speed_kn", "heading_deg", "course_over_ground_deg", "latitude_deg", "latitude_min", "latitude_sec", "longitude_deg", "longitude_min", "longitude_sec"]
        updatePayload[key] = numericFields.includes(key) ? parseFloat(value as string) || 0 : value
      }
      await updateExpeditionPassageLog(selectedLog.id, updatePayload)
      await mutate("expedition_passage_logs")
      toast.success("Passage log updated")
      setEditing(false)
      // Update selectedLog in place
      setSelectedLog((prev: any) => ({ ...prev, ...updatePayload }))
    } catch (error) {
      console.error("Failed to update:", error)
      toast.error("Failed to update passage log")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="border-b bg-white shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Passage Log Map
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {mapPoints.length} log{mapPoints.length !== 1 ? "s" : ""} with coordinates
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={expeditionFilter} onValueChange={setExpeditionFilter}>
                <SelectTrigger className="w-[220px] cursor-pointer">
                  <SelectValue placeholder="Filter by expedition..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">All Expeditions</SelectItem>
                  {allExpeditions?.map((exp: any) => (
                    <SelectItem key={exp.id} value={exp.id.toString()} className="cursor-pointer">
                      {exp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link href="/passage-logs">
                <Button variant="outline" size="sm" className="cursor-pointer">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {logsLoading ? (
          <div className="w-full h-full flex items-center justify-center min-h-[600px]">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <PassageLogMap points={mapPoints} onMarkerClick={handleMarkerClick} />
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:w-[75vw] sm:max-w-[1200px] sm:min-w-[600px] p-0 flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b bg-white shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl">
                  Passage Log #{selectedLog?.id}
                </SheetTitle>
                <SheetDescription>
                  {selectedLog ? formatDateTime(selectedLog) : ""}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" className="cursor-pointer" onClick={handleSaveEdit} disabled={saving}>
                      {saving ? <Spinner className="h-4 w-4 mr-1" /> : null}
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="cursor-pointer" onClick={handleEditClick}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" className="cursor-pointer text-white" onClick={handleDeleteClick}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetHeader>

          {selectedLog && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {editing ? (
                /* Edit Mode */
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Overview</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Departure</Label>
                        <Input value={editData.departure_location_name} onChange={(e) => setEditData((prev: any) => ({ ...prev, departure_location_name: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Destination</Label>
                        <Input value={editData.destination_location_name} onChange={(e) => setEditData((prev: any) => ({ ...prev, destination_location_name: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Position</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Lat Degrees</Label>
                        <Input type="number" value={editData.latitude_deg} onChange={(e) => setEditData((prev: any) => ({ ...prev, latitude_deg: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Lat Minutes</Label>
                        <Input type="number" value={editData.latitude_min} onChange={(e) => setEditData((prev: any) => ({ ...prev, latitude_min: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Lat Seconds</Label>
                        <Input type="number" value={editData.latitude_sec} onChange={(e) => setEditData((prev: any) => ({ ...prev, latitude_sec: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Lon Degrees</Label>
                        <Input type="number" value={editData.longitude_deg} onChange={(e) => setEditData((prev: any) => ({ ...prev, longitude_deg: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Lon Minutes</Label>
                        <Input type="number" value={editData.longitude_min} onChange={(e) => setEditData((prev: any) => ({ ...prev, longitude_min: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Lon Seconds</Label>
                        <Input type="number" value={editData.longitude_sec} onChange={(e) => setEditData((prev: any) => ({ ...prev, longitude_sec: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Navigation</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Wind Speed (kn)</Label>
                        <Input type="number" value={editData.wind_speed_kn} onChange={(e) => setEditData((prev: any) => ({ ...prev, wind_speed_kn: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Wind Direction (°)</Label>
                        <Input type="number" value={editData.wind_direction_deg} onChange={(e) => setEditData((prev: any) => ({ ...prev, wind_direction_deg: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Boat Speed (kn)</Label>
                        <Input type="number" value={editData.boat_speed_kn} onChange={(e) => setEditData((prev: any) => ({ ...prev, boat_speed_kn: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Heading (°)</Label>
                        <Input type="number" value={editData.heading_deg} onChange={(e) => setEditData((prev: any) => ({ ...prev, heading_deg: e.target.value }))} />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Course Over Ground (°)</Label>
                        <Input type="number" value={editData.course_over_ground_deg} onChange={(e) => setEditData((prev: any) => ({ ...prev, course_over_ground_deg: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>General Observations</Label>
                        <Textarea value={editData.general_observations} onChange={(e) => setEditData((prev: any) => ({ ...prev, general_observations: e.target.value }))} rows={3} />
                      </div>
                      <div className="space-y-2">
                        <Label>Additional Notes</Label>
                        <Textarea value={editData.additional_notes} onChange={(e) => setEditData((prev: any) => ({ ...prev, additional_notes: e.target.value }))} rows={3} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-6">
              {/* Overview */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Overview</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium w-1/3">Supervisor</TableCell>
                        <TableCell>{getStaffName(selectedLog.expedition_staff_id)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Date</TableCell>
                        <TableCell>{selectedLog.date || "\u2014"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Time</TableCell>
                        <TableCell>{selectedLog.hrs !== undefined ? `${String(selectedLog.hrs).padStart(2, "0")}:${String(selectedLog.min).padStart(2, "0")}` : "\u2014"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Departure</TableCell>
                        <TableCell>{selectedLog.departure_location_name || "\u2014"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Destination</TableCell>
                        <TableCell>{selectedLog.destination_location_name || "\u2014"}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Navigation */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Navigation</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Position</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium w-1/3">Latitude</TableCell>
                        <TableCell>{selectedLog.latitude_deg}&deg; {selectedLog.latitude_min}&apos; {selectedLog.latitude_sec}&quot; {selectedLog.latitude_dir}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Longitude</TableCell>
                        <TableCell>{selectedLog.longitude_deg}&deg; {selectedLog.longitude_min}&apos; {selectedLog.longitude_sec}&quot; {selectedLog.longitude_dir}</TableCell>
                      </TableRow>
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Wind</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Speed</TableCell>
                        <TableCell>{selectedLog.wind_speed_kn || 0} kn</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Direction</TableCell>
                        <TableCell>{selectedLog.wind_direction_deg || 0}&deg;</TableCell>
                      </TableRow>
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Speed & Course</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Boat Speed</TableCell>
                        <TableCell>{selectedLog.boat_speed_kn || 0} kn</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Heading</TableCell>
                        <TableCell>{selectedLog.heading_deg || 0}&deg;</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Course Over Ground</TableCell>
                        <TableCell>{selectedLog.course_over_ground_deg || 0}&deg;</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Bridge */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Bridge</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium w-1/3">Logbook Entry</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.bridge_logbook_entry_status)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Plot Position</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.bridge_plot_position_status)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Spotlight Charged</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.bridge_spotlight_charged_status)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Binoculars</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.bridge_binoculars_status)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">VHF Channel 16</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.bridge_vhf_channel_16_status)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Engineering */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Engineering</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Main Engine</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium w-1/3">RPM</TableCell>
                        <TableCell>{selectedLog.main_engine_rpm || "\u2014"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Temperature</TableCell>
                        <TableCell>{selectedLog.main_engine_temp_f || "\u2014"}&deg;F</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Oil Pressure</TableCell>
                        <TableCell>{selectedLog.main_engine_oil_pressure_psi || "\u2014"} PSI</TableCell>
                      </TableRow>
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Batteries</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Service Battery</TableCell>
                        <TableCell>{selectedLog.service_battery_voltage_v || "\u2014"}V</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Electronics Battery</TableCell>
                        <TableCell>{selectedLog.electronics_battery_voltage_v || "\u2014"}V</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Engine Battery</TableCell>
                        <TableCell>{selectedLog.engine_battery_voltage_v || "\u2014"}V</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Deck */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Deck</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium w-1/3">Catamaran Secure</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.deck_catamaran_secure_status)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Stern RIB Secure</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.deck_stern_rib_secure_status)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Anchors Secure</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.deck_anchors_secure_status)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Sailing Lines Coiled</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.deck_sailing_lines_coiled_status)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Interior */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Interior</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium w-1/3">Salon Items Secure</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.interior_salon_items_secure_status)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Galley Items Secure</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.interior_galley_items_secure_status)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">All Cabin Items Secure</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.interior_all_cabin_items_secure_status)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Notes */}
              {(selectedLog.general_observations || selectedLog.additional_notes) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableBody>
                        {selectedLog.general_observations && (
                          <TableRow>
                            <TableCell className="text-muted-foreground font-medium w-1/3 align-top">General Observations</TableCell>
                            <TableCell className="whitespace-pre-wrap">{selectedLog.general_observations}</TableCell>
                          </TableRow>
                        )}
                        {selectedLog.additional_notes && (
                          <TableRow>
                            <TableCell className="text-muted-foreground font-medium align-top">Additional Notes</TableCell>
                            <TableCell className="whitespace-pre-wrap">{selectedLog.additional_notes}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Passage Log</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Passage Log #{selectedLog?.id}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? <Spinner className="h-4 w-4 mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
