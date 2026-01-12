"use client"

import { useState, useMemo } from "react"
import useSWR, { mutate } from "swr"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Spinner } from "@/components/ui/spinner"
import { ChevronLeft, ChevronRight, Trash2, Eye, Plus } from "lucide-react"
import { getExpeditionPassageLogs, deleteExpeditionPassageLog, getTeachers } from "@/lib/xano"
import { toast } from "sonner"
import Link from "next/link"

export default function PassageLogsPage() {
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [logToDelete, setLogToDelete] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const logsPerPage = 20

  const { data: logs, isLoading: logsLoading } = useSWR(
    "expedition_passage_logs",
    getExpeditionPassageLogs
  )

  const { data: staff } = useSWR("teachers", getTeachers)

  // Sort logs by date (newest first) and paginate
  const sortedLogs = useMemo(() => {
    if (!logs) return []
    return [...logs].sort((a, b) => {
      // Sort by id descending if no date
      if (!a.date && !b.date) return b.id - a.id
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [logs])

  const totalPages = Math.ceil((sortedLogs?.length || 0) / logsPerPage)
  const paginatedLogs = sortedLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  )

  const getStaffName = (staffId: number) => {
    if (!staffId || !staff) return "—"
    const staffMember = staff.find((s: any) => s.id === staffId)
    return staffMember?.name || "Unknown"
  }

  const formatDateTime = (log: any) => {
    if (!log.date) return "No date"
    try {
      const [year, month, day] = log.date.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      const dateStr = format(date, "MMM d, yyyy")
      const timeStr = log.hrs !== undefined && log.min !== undefined 
        ? `${String(log.hrs).padStart(2, '0')}:${String(log.min).padStart(2, '0')}`
        : ""
      return timeStr ? `${dateStr} @ ${timeStr}` : dateStr
    } catch {
      return log.date
    }
  }

  const handleViewDetails = (log: any) => {
    setSelectedLog(log)
    setDetailDialogOpen(true)
  }

  const handleDeleteClick = (log: any) => {
    setLogToDelete(log)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!logToDelete) return
    setDeleting(true)
    try {
      await deleteExpeditionPassageLog(logToDelete.id)
      await mutate("expedition_passage_logs")
      toast.success("Passage log deleted")
      setDeleteDialogOpen(false)
      setLogToDelete(null)
    } catch (error) {
      console.error("Failed to delete:", error)
      toast.error("Failed to delete passage log")
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    if (!status) return <span className="text-gray-400">—</span>
    if (status === "completed") {
      return <span>✅</span>
    }
    if (status === "not_completed") {
      return <span>❌</span>
    }
    return <span className="text-sm text-muted-foreground">{status}</span>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Passage Logs</h1>
              <p className="text-muted-foreground mt-2">
                {logs?.length || 0} total logs recorded
              </p>
            </div>
            <Link href="/public/passage-logs">
              <Button className="cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                New Log
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {logsLoading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[60px]">ID</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Date / Time</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Supervisor</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Departure</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Destination</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[100px]">Status</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600 w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : paginatedLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-lg font-medium text-gray-600">No Passage Logs Found</p>
              <p className="text-sm text-gray-500 mt-1">Passage logs will appear here once recorded.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[60px]">ID</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Date / Time</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Supervisor</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Departure</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Destination</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 w-[100px]">Status</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600 w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log: any) => (
                  <TableRow 
                    key={log.id} 
                    className="hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => handleViewDetails(log)}
                  >
                    <TableCell className="h-16 px-6">
                      <span className="font-mono text-xs text-gray-500">#{log.id}</span>
                    </TableCell>
                    <TableCell className="h-16 px-6">
                      <span className="text-sm font-medium text-gray-900">{formatDateTime(log)}</span>
                    </TableCell>
                    <TableCell className="h-16 px-6">
                      <span className="text-sm text-gray-700">{getStaffName(log.expedition_staff_id)}</span>
                    </TableCell>
                    <TableCell className="h-16 px-6">
                      <span className="text-sm text-gray-700 truncate max-w-[140px]">
                        {log.departure_location_name || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="h-16 px-6">
                      <span className="text-sm text-gray-700 truncate max-w-[140px]">
                        {log.destination_location_name || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="h-16 px-6">
                      <div className="flex items-center gap-1">
                        {getStatusBadge(log.bridge_logbook_entry_status)}
                        {getStatusBadge(log.bridge_plot_position_status)}
                      </div>
                    </TableCell>
                    <TableCell className="h-16 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewDetails(log)
                          }}
                        >
                          <Eye className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(log)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t px-6 py-4 flex items-center justify-between bg-gray-50/30">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * logsPerPage + 1} to{" "}
                {Math.min(currentPage * logsPerPage, sortedLogs.length)} of{" "}
                {sortedLogs.length} logs
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 cursor-pointer"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 cursor-pointer"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Detail Sheet */}
      <Sheet open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <SheetContent className="w-full sm:w-[75vw] sm:max-w-[1200px] sm:min-w-[600px] p-0 flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b bg-white shrink-0">
            <SheetTitle className="text-xl">
              Passage Log #{selectedLog?.id}
            </SheetTitle>
            <SheetDescription>
              {selectedLog ? formatDateTime(selectedLog) : ""}
            </SheetDescription>
          </SheetHeader>

          {selectedLog && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                        <TableCell>{selectedLog.date || "—"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Time</TableCell>
                        <TableCell>{selectedLog.hrs !== undefined ? `${String(selectedLog.hrs).padStart(2, '0')}:${String(selectedLog.min).padStart(2, '0')}` : "—"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Departure</TableCell>
                        <TableCell>{selectedLog.departure_location_name || "—"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Destination</TableCell>
                        <TableCell>{selectedLog.destination_location_name || "—"}</TableCell>
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
                      {/* Position */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Position</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium w-1/3">Latitude</TableCell>
                        <TableCell>{selectedLog.latitude_deg}° {selectedLog.latitude_min}' {selectedLog.latitude_sec}" {selectedLog.latitude_dir}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Longitude</TableCell>
                        <TableCell>{selectedLog.longitude_deg}° {selectedLog.longitude_min}' {selectedLog.longitude_sec}" {selectedLog.longitude_dir}</TableCell>
                      </TableRow>
                      {/* Wind */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Wind</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Speed</TableCell>
                        <TableCell>{selectedLog.wind_speed_kn || 0} kn</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Direction</TableCell>
                        <TableCell>{selectedLog.wind_direction_deg || 0}°</TableCell>
                      </TableRow>
                      {/* Speed & Course */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Speed & Course</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Boat Speed</TableCell>
                        <TableCell>{selectedLog.boat_speed_kn || 0} kn</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Heading</TableCell>
                        <TableCell>{selectedLog.heading_deg || 0}°</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Course Over Ground</TableCell>
                        <TableCell>{selectedLog.course_over_ground_deg || 0}°</TableCell>
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
                      {/* Main Engine */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Main Engine</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium w-1/3">RPM</TableCell>
                        <TableCell>{selectedLog.main_engine_rpm || "—"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Temperature</TableCell>
                        <TableCell>{selectedLog.main_engine_temp_f || "—"}°F</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Oil Pressure</TableCell>
                        <TableCell>{selectedLog.main_engine_oil_pressure_psi || "—"} PSI</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Gear Oil Pressure</TableCell>
                        <TableCell>{selectedLog.main_engine_gear_oil_pressure_psi || "—"} PSI</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Valve Cover Temp</TableCell>
                        <TableCell>{selectedLog.main_engine_valve_cover_temp_f || "—"}°F</TableCell>
                      </TableRow>
                      {/* Generator */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Generator</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Oil Temperature</TableCell>
                        <TableCell>{selectedLog.generator_oil_temp_f || "—"}°F</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Oil Pressure</TableCell>
                        <TableCell>{selectedLog.generator_oil_pressure_psi || "—"} PSI</TableCell>
                      </TableRow>
                      {/* Electrical */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Electrical</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Chilled Water Temp</TableCell>
                        <TableCell>{selectedLog.chilled_water_temp_f || "—"}°F</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Voltage Amp Draw</TableCell>
                        <TableCell>{selectedLog.voltage_amp_draw_a || "—"}A</TableCell>
                      </TableRow>
                      {/* Batteries */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Batteries</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Service Battery</TableCell>
                        <TableCell>{selectedLog.service_battery_voltage_v || "—"}V</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Electronics Battery</TableCell>
                        <TableCell>{selectedLog.electronics_battery_voltage_v || "—"}V</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Engine Battery</TableCell>
                        <TableCell>{selectedLog.engine_battery_voltage_v || "—"}V</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Emergency Battery</TableCell>
                        <TableCell>{selectedLog.emergency_battery_voltage_v || "—"}V</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Tank Levels */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Tank Levels</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      {/* Fuel */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Fuel</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium w-1/3">Day Tank</TableCell>
                        <TableCell>{selectedLog.fuel_day_tank_current || "—"} / {selectedLog.fuel_day_tank_total || "—"}</TableCell>
                      </TableRow>
                      {/* Water */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Water</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Port Water</TableCell>
                        <TableCell>{selectedLog.port_water_tank_current || "—"} / {selectedLog.port_water_tank_total || "—"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Starboard Water</TableCell>
                        <TableCell>{selectedLog.starboard_water_tank_current || "—"} / {selectedLog.starboard_water_tank_total || "—"}</TableCell>
                      </TableRow>
                      {/* Waste */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Waste</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Gray Water</TableCell>
                        <TableCell>{selectedLog.gray_water_tank_current || "—"} / {selectedLog.gray_water_tank_total || "—"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Black Water</TableCell>
                        <TableCell>{selectedLog.black_water_tank_current || "—"} / {selectedLog.black_water_tank_total || "—"}</TableCell>
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
                      {/* Vessels */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Vessels</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium w-1/3">Catamaran Secure</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.deck_catamaran_secure_status)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Stern RIB Secure</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.deck_stern_rib_secure_status)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Bow RIB Secure</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.deck_bow_rib_secure_status)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">RS Cat Mast Secure to Toe Rail</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.deck_rs_cat_mast_secure_to_toe_rail_status)}</TableCell>
                      </TableRow>
                      {/* Equipment */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Equipment</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Fuel Cans Secure</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.deck_fuel_cans_secure_status)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Jack Lines Secure</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.deck_jack_lines_secure_status)}</TableCell>
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

              {/* Galley */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Galley</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      {/* Refrigeration */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Refrigeration</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium w-1/3">Forepeak Freezer</TableCell>
                        <TableCell>{selectedLog.forepeak_freezer_temp_f || "—"}°F</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Salon Fridge</TableCell>
                        <TableCell>{selectedLog.salon_fridge_temp_f || "—"}°F</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Galley Top Fridge</TableCell>
                        <TableCell>{selectedLog.galley_top_fridge_temp_f || "—"}°F</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Galley Bottom Freezer</TableCell>
                        <TableCell>{selectedLog.galley_bottom_freezer_temp_f || "—"}°F</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Lazarette Deep Freezer</TableCell>
                        <TableCell>{selectedLog.lazarette_deep_freezer_temp_f || "—"}°F</TableCell>
                      </TableRow>
                      {/* Appliances */}
                      <TableRow className="bg-gray-50/80">
                        <TableCell colSpan={2} className="py-2 text-xs font-medium text-gray-500 uppercase">Appliances</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Propane Solenoid Off</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.propane_solenoid_off)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-muted-foreground font-medium">Oven Breaker Off</TableCell>
                        <TableCell>{getStatusBadge(selectedLog.oven_breaker_off)}</TableCell>
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
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Passage Log</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete passage log #{logToDelete?.id}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 cursor-pointer"
              disabled={deleting}
            >
              {deleting ? <Spinner size="sm" className="mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
