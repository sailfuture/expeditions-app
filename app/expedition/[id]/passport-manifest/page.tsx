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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Download, FileText, ExternalLink } from "lucide-react"
import { ExpeditionHeader } from "@/components/expedition-header"
import { getStudentsByExpedition, getTeachersByExpedition } from "@/lib/xano"
import { useExpeditions } from "@/lib/hooks/use-expeditions"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PassportManifestPage({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)
  const expeditionId = parseInt(id)

  const { data: allExpeditions, isLoading: expeditionsLoading } = useExpeditions()
  const expedition = allExpeditions?.find((e: any) => e.id === expeditionId)

  const { data: students, isLoading: studentsLoading } = useSWR(
    expeditionId ? `students_expedition_${expeditionId}` : null,
    () => getStudentsByExpedition(expeditionId)
  )

  const { data: staff, isLoading: staffLoading } = useSWR(
    expeditionId ? `staff_expedition_${expeditionId}` : null,
    () => getTeachersByExpedition(expeditionId)
  )

  const isLoading = expeditionsLoading || studentsLoading || staffLoading

  // Combine staff and students into one manifest
  const manifestData = [
    ...(staff || []).map((person: any) => ({
      ...person,
      type: "Staff",
      name: person.name,
      crew_role: person.crew_role,
      crew_status: person.crew_status,
      dob: person.dob,
      passport_number: person.passport_number,
      issue_date: person.passport_issue_date,
      expiration_date: person.passport_expiration_date,
      gender: person.gender,
      nationality: person.nationality,
      passport_photo: person.passport_photo,
    })),
    ...(students || []).map((person: any) => ({
      ...person,
      type: "Student",
      name: `${person.firstName || ""} ${person.lastName || ""}`.trim(),
      crew_role: person.crew_position, // Students use crew_position instead of crew_role
      crew_status: person.crew_status,
      dob: person.dob,
      passport_number: person.passport_number,
      issue_date: person.issue_date,
      expiration_date: person.expiration_date,
      gender: person.gender,
      nationality: person.nationality,
      passport_photo: person.passport_photo,
    })),
  ].sort((a, b) => {
    // Sort by type (Staff first) then by name
    if (a.type !== b.type) return a.type === "Staff" ? -1 : 1
    return (a.name || "").localeCompare(b.name || "")
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Expedition Header with Navigation */}
      <ExpeditionHeader expedition={expedition} isLoading={expeditionsLoading} currentPage="passport-manifest" />

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Summary Stats */}
        {!isLoading && manifestData.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-sm font-medium text-gray-500">Total Personnel</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{manifestData.length}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-sm font-medium text-gray-500">Staff Members</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {manifestData.filter(p => p.type === "Staff").length}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-sm font-medium text-gray-500">Students</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {manifestData.filter(p => p.type === "Student").length}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Crew Role</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">DOB</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Gender</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Nationality</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Passport #</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Issue Date</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Expiration</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Photo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !manifestData || manifestData.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-600">No passport data found</p>
              <p className="text-sm text-gray-500 mt-1">
                Staff and students with passport information will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 whitespace-nowrap">Name</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 whitespace-nowrap">Crew Role</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 whitespace-nowrap">DOB</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 whitespace-nowrap">Gender</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 whitespace-nowrap">Nationality</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 whitespace-nowrap">Passport #</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 whitespace-nowrap">Issue Date</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 whitespace-nowrap">Expiration</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 whitespace-nowrap">Status</TableHead>
                    <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600 whitespace-nowrap">Photo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manifestData.map((person: any, index: number) => (
                    <TableRow key={`${person.type}-${person.id || index}`} className="hover:bg-gray-50/50">
                      <TableCell className="h-16 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                              {person.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-900 whitespace-nowrap">{person.name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <span className="text-sm text-gray-600 whitespace-nowrap">{person.crew_role || "—"}</span>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <span className="text-sm text-gray-600 whitespace-nowrap">{person.dob || "—"}</span>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <span className="text-sm text-gray-600 whitespace-nowrap">{person.gender || "—"}</span>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <span className="text-sm text-gray-600 whitespace-nowrap">{person.nationality || "—"}</span>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <span className="text-sm text-gray-900 font-mono whitespace-nowrap">{person.passport_number || "—"}</span>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <span className="text-sm text-gray-600 whitespace-nowrap">{person.issue_date || "—"}</span>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <span className="text-sm text-gray-600 whitespace-nowrap">{person.expiration_date || "—"}</span>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        <span className="text-sm text-gray-600 whitespace-nowrap">{person.crew_status || "—"}</span>
                      </TableCell>
                      <TableCell className="h-16 px-6">
                        {person.passport_photo ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={person.passport_photo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-gray-900 cursor-pointer"
                              title="View passport photo"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            <a
                              href={person.passport_photo}
                              download
                              className="text-gray-600 hover:text-gray-900 cursor-pointer"
                              title="Download passport photo"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
