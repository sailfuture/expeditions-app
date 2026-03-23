"use client"

import { useRouter } from "next/navigation"
import { useMemo } from "react"
import { format } from "date-fns"
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
import { ExternalLink, Calendar, MapPin } from "lucide-react"
import { useExpeditions } from "@/lib/hooks/use-expeditions"
import { useCurrentUser } from "@/lib/contexts/user-context"

export default function MyExpeditionsPage() {
  const router = useRouter()
  const { currentUser, isLoading: userLoading } = useCurrentUser()
  const { data: allExpeditions, isLoading } = useExpeditions()

  // Filter expeditions to only show ones the user is assigned to
  const userExpeditions = useMemo(() => {
    if (!allExpeditions || !currentUser?.expeditions_id) return []
    return allExpeditions
      .filter((e: any) => currentUser.expeditions_id?.includes(e.id))
      .sort((a: any, b: any) => {
        const dateA = new Date(a.startDate)
        const dateB = new Date(b.startDate)
        return dateB.getTime() - dateA.getTime() // Descending
      })
  }, [allExpeditions, currentUser?.expeditions_id])

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

  // Show loading while checking auth
  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="border-b bg-white">
          <div className="container mx-auto px-4 py-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <main className="container mx-auto px-4 py-6">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Dates</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Duration</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Status</TableHead>
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
                    <TableCell className="h-16 px-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Expeditions</h1>
              <p className="text-muted-foreground mt-2">
                Expeditions you are assigned to
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {userExpeditions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-600">No expeditions assigned</p>
              <p className="text-sm text-gray-500 mt-1">
                You haven't been assigned to any expeditions yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Name</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Dates</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Duration</TableHead>
                  <TableHead className="h-10 px-6 text-xs font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="h-10 px-6 text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userExpeditions.map((expedition: any) => {
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
                        <Badge 
                          variant={expedition.isActive ? "default" : "outline"} 
                          className={expedition.isActive 
                            ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-100" 
                            : "bg-gray-100 text-gray-600 border-gray-200"
                          }
                        >
                          {expedition.isActive ? "Active" : "Past"}
                        </Badge>
                      </TableCell>
                      <TableCell className="h-16 px-6 text-right">
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
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  )
}
