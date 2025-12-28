"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { ExternalLink, Users } from "lucide-react"
import { useTeachers } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function StaffPage() {
  const router = useRouter()
  const { currentUser } = useCurrentUser()
  const { data: staff, isLoading } = useTeachers()

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
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Expedition</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Role</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="h-16 px-6"><Skeleton className="h-4 w-32" /></TableCell>
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
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Expedition</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Role</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStaff.map((staffMember: any) => (
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
                      <span className="text-sm text-gray-600">
                        {staffMember._expeditions?.name || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="h-16 px-6">
                      <Badge variant="outline" className="bg-white border-gray-200 text-gray-700">
                        {staffMember.role || "Staff"}
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
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  )
}

