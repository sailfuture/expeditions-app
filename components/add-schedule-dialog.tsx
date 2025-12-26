"use client"

import { useState } from "react"
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
import { createExpeditionSchedule, createExpeditionScheduleItem } from "@/lib/xano"
import { useExpeditionLocations, useExpeditionScheduleTemplates } from "@/lib/hooks/use-expeditions"
import { useExpeditionContext } from "@/lib/contexts/expedition-context"
import { mutate } from "swr"
import { toast } from "sonner"

interface AddScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddScheduleDialog({ open, onOpenChange }: AddScheduleDialogProps) {
  const router = useRouter()
  const { selectedExpeditionId } = useExpeditionContext()
  const { data: locations } = useExpeditionLocations(selectedExpeditionId || undefined)
  const { data: templates } = useExpeditionScheduleTemplates()
  
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    isOffshore: false,
    isService: false,
    current_location: 1,
    destination: 0,
    template_id: 0,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedExpeditionId) return

    setSaving(true)
    try {
      // Create the schedule
      const newSchedule = await createExpeditionSchedule({
        name: formData.name,
        date: formData.date,
        isOffshore: formData.isOffshore,
        isService: formData.isService,
        current_location: formData.current_location,
        destination: formData.destination,
        expeditions_id: selectedExpeditionId,
      })

      // If template selected, create schedule items
      if (formData.template_id > 0 && templates) {
        const selectedTemplate = templates.find((t: any) => t.id === formData.template_id)
        if (selectedTemplate?.expedition_schedule_items_id) {
          for (const templateItem of selectedTemplate.expedition_schedule_items_id) {
            await createExpeditionScheduleItem({
              name: templateItem.name,
              expedition_schedule_item_types_id: templateItem.expedition_schedule_item_types_id,
              expedition_schedule_id: newSchedule.id,
              time_in: templateItem.time_in,
              time_out: templateItem.time_out,
              participants: templateItem.participants || [],
              led_by: templateItem.led_by,
              notes: templateItem.notes || "",
              address: templateItem.address || "",
              things_to_bring: templateItem.things_to_bring || "",
            })
          }
        }
      }
      
      // Refresh schedules data
      mutate("expedition_schedules")
      onOpenChange(false)
      
      // Reset form
      setFormData({
        name: "",
        date: "",
        isOffshore: false,
        isService: false,
        current_location: 1,
        destination: 0,
        template_id: 0,
      })

      // Navigate to the new schedule
      router.push(`/schedule/${formData.date}`)
    } catch (error) {
      console.error("Failed to create schedule:", error)
      // Check if it's a duplicate date error (500 error)
      if (error instanceof Error && error.message.includes("500")) {
        toast.error("This date already exists and can't be added")
      } else {
        toast.error("Failed to create schedule")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name" className="text-xs uppercase tracking-wide">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Mon, Jan 12"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="date" className="text-xs uppercase tracking-wide">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="template" className="text-xs uppercase tracking-wide">Template (Optional)</Label>
            <Select
              value={formData.template_id.toString()}
              onValueChange={(value) => setFormData({ ...formData, template_id: Number(value) })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="No template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No template</SelectItem>
                {templates?.map((template: any) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.template_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.template_id > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Activities from this template will be added automatically
              </p>
            )}
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
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
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
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select destination" />
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
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Creating..." : "Create Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

