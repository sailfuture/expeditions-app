"use client"

import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Pencil, ArrowLeft } from "lucide-react"
import { useTeachers, useExpeditions } from "@/lib/hooks/use-expeditions"
import { updateTeacher } from "@/lib/xano"
import { toast } from "sonner"
import { mutate } from "swr"
import { Spinner } from "@/components/ui/spinner"

export default function StaffDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const staffId = parseInt(params.id as string)
  const expeditionId = searchParams.get('expedition')
  
  const { data: staff, isLoading } = useTeachers()
  const { data: allExpeditions } = useExpeditions()
  const staffMember = staff?.find((s: any) => s.id === staffId)
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    expeditions_id: [] as number[],
  })
  
  useEffect(() => {
    if (staffMember) {
      setFormData({
        name: staffMember.name || "",
        role: staffMember.role || "",
        expeditions_id: Array.isArray(staffMember.expeditions_id) ? staffMember.expeditions_id : [staffMember.expeditions_id].filter(Boolean),
      })
    }
  }, [staffMember])
  
  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Staff name is required")
      return
    }
    
    setIsSubmitting(true)
    try {
      await updateTeacher(staffId, formData)
      mutate("teachers")
      toast.success("Staff member updated successfully")
      setDialogOpen(false)
    } catch (error) {
      console.error("Failed to update staff member:", error)
      toast.error("Failed to update staff member")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-3">
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    )
  }
  
  if (!staffMember) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-600">Staff member not found</p>
          <Button onClick={() => router.back()} className="mt-4 cursor-pointer">
            Go Back
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/staff" className="cursor-pointer">Staff Records</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{staffMember.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-lg bg-gray-200 text-gray-600">
                    {staffMember.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold">{staffMember.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {staffMember._expeditions?.name || "—"}
                    </span>
                    {staffMember.role && (
                      <>
                        <span className="text-gray-300">|</span>
                        <Badge variant="outline">{staffMember.role}</Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="cursor-pointer">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Staff
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Staff Information</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{staffMember.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1 text-sm text-gray-900">{staffMember.role || "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm font-medium text-gray-500">Assigned Expeditions</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {Array.isArray(staffMember.expeditions_id) 
                  ? staffMember.expeditions_id.length > 0 
                    ? `${staffMember.expeditions_id.length} expedition(s)` 
                    : "No expeditions assigned"
                  : staffMember._expeditions?.name || "—"}
              </dd>
            </div>
          </dl>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff information and expedition assignments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="staff_name">Staff Name *</Label>
              <Input
                id="staff_name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Staff member name"
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="e.g. Captain, Instructor, Admin"
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label htmlFor="expeditions">Expedition Assignments</Label>
              <div className="mt-1.5 space-y-2">
                {allExpeditions?.map((expedition: any) => {
                  const isSelected = formData.expeditions_id.includes(expedition.id)
                  return (
                    <div key={expedition.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormData(prev => ({
                              ...prev,
                              expeditions_id: prev.expeditions_id.filter(id => id !== expedition.id)
                            }))
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              expeditions_id: [...prev.expeditions_id, expedition.id]
                            }))
                          }
                        }}
                        className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${
                          isSelected ? "bg-gray-800 border-gray-800" : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <label className="text-sm text-gray-700 cursor-pointer" onClick={() => {
                        const isSelected = formData.expeditions_id.includes(expedition.id)
                        if (isSelected) {
                          setFormData(prev => ({
                            ...prev,
                            expeditions_id: prev.expeditions_id.filter(id => id !== expedition.id)
                          }))
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            expeditions_id: [...prev.expeditions_id, expedition.id]
                          }))
                        }
                      }}>
                        {expedition.name}
                      </label>
                    </div>
                  )
                })}
                {(!allExpeditions || allExpeditions.length === 0) && (
                  <p className="text-sm text-gray-400">No expeditions available</p>
                )}
              </div>
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
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

