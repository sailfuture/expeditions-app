"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateExpeditionSchedule } from "@/lib/xano"
import { useExpeditionLocations } from "@/lib/hooks/use-expeditions"
import { mutate } from "swr"
import { toast } from "sonner"

interface EditScheduleDialogProps {
  schedule: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditScheduleDialog({ schedule, open, onOpenChange }: EditScheduleDialogProps) {
  const router = useRouter()
  const { data: locations } = useExpeditionLocations(schedule?.expeditions_id)
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    isOffshore: false,
    isService: false,
    current_location: 0,
    destination: 0,
    expeditions_id: 0,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (schedule) {
      setFormData({
        name: schedule.name || "",
        date: schedule.date || "",
        isOffshore: schedule.isOffshore || false,
        isService: schedule.isService || false,
        current_location: schedule.current_location || 0,
        destination: schedule.destination || 0,
        expeditions_id: schedule.expeditions_id || 0,
      })
    }
  }, [schedule])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schedule) return

    setSaving(true)
    try {
      await updateExpeditionSchedule(schedule.id, {
        expedition_schedule_id: schedule.id,
        ...formData,
      })
      
      // Refresh schedules data
      mutate("expedition_schedules")
      onOpenChange(false)
      toast.success("Schedule updated successfully")
    } catch (error) {
      console.error("Failed to update schedule:", error)
      toast.error("Failed to update schedule")
    } finally {
      setSaving(false)
    }
  }

  const formatLocation = (location: any) => {
    if (!location) return "No Location"
    return `${location.port}, ${location.country}`
  }

  const currentLocationName = useMemo(() => {
    if (!schedule?._expedition_current_location) return "No Location"
    return formatLocation(schedule._expedition_current_location)
  }, [schedule])

  if (!schedule) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name" className="text-xs uppercase tracking-wide">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="date" className="text-xs uppercase tracking-wide">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="mt-1 cursor-not-allowed opacity-60"
              disabled
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isOffshore" className="text-xs uppercase tracking-wide">Offshore</Label>
            <Switch
              id="isOffshore"
              checked={formData.isOffshore}
              onCheckedChange={(checked) => setFormData({ ...formData, isOffshore: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isService" className="text-xs uppercase tracking-wide">Service Learning</Label>
            <Switch
              id="isService"
              checked={formData.isService}
              onCheckedChange={(checked) => setFormData({ ...formData, isService: checked })}
            />
          </div>

          <div>
            <Label htmlFor="current_location" className="text-xs uppercase tracking-wide">Current Location</Label>
            <Select
              value={formData.current_location.toString()}
              onValueChange={(value) => setFormData({ ...formData, current_location: Number(value) })}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue>
                  {currentLocationName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-full">
                {locations?.map((location: any) => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.port}, {location.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.isOffshore && (
            <div>
              <Label htmlFor="destination" className="text-xs uppercase tracking-wide">Destination</Label>
              <Select
                value={formData.destination.toString()}
                onValueChange={(value) => setFormData({ ...formData, destination: Number(value) })}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectItem value="0">No destination</SelectItem>
                  {locations?.map((location: any) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.port}, {location.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

