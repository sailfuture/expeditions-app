"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TimePicker } from "@/components/ui/time-picker"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, ChevronDown, X, Trash2 } from "lucide-react"
import { createExpeditionScheduleItem, updateExpeditionScheduleItem, deleteExpeditionScheduleItem } from "@/lib/xano"
import { useExpeditionScheduleItemTypes } from "@/lib/hooks/use-expeditions"
import { mutate } from "swr"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AddScheduleItemSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduleId: number
  date: string
  staff?: any[]
  editItem?: any // If provided, sheet is in edit mode
}

// Custom dropdown component
function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  renderValue,
  renderOption,
  className,
}: {
  value: string | number
  onChange: (value: string | number, option?: any) => void
  options: { value: string | number; label: string; data?: any }[]
  placeholder: string
  renderValue?: (option: { value: string | number; label: string; data?: any } | null) => React.ReactNode
  renderOption?: (option: { value: string | number; label: string; data?: any }) => React.ReactNode
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = options.find(o => o.value.toString() === value.toString()) || null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full rounded-lg border border-gray-200 bg-white px-4 flex items-center justify-between gap-2 text-left cursor-pointer",
          "hover:bg-gray-50 transition-colors",
          isOpen && "ring-2 ring-gray-400 ring-offset-2",
          className
        )}
      >
        <div className="flex-1 min-w-0">
          {renderValue ? (
            renderValue(selectedOption)
          ) : (
            <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
              {selectedOption?.label || placeholder}
            </span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value, option)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left cursor-pointer",
                  option.value.toString() === value.toString() && "bg-gray-50"
                )}
              >
                {renderOption ? renderOption(option) : <span className="text-sm">{option.label}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Multi-select for staff participants with avatars (grayscale)
function StaffParticipantSelector({
  staff,
  selectedIds,
  onChange,
}: {
  staff: any[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedStaff = staff?.filter((s) => selectedIds.includes(s.id)) || []

  const toggleParticipant = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <Label className="text-sm font-medium">Participants (Staff)</Label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full min-h-12 rounded-lg border border-gray-200 bg-white px-4 py-2 flex items-center justify-between gap-2 text-left cursor-pointer",
          "hover:bg-gray-50 transition-colors",
          isOpen && "ring-2 ring-gray-400 ring-offset-2"
        )}
      >
        {selectedStaff.length === 0 ? (
          <span className="text-gray-500 text-base">Select staff participants...</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selectedStaff.slice(0, 3).map((member) => (
              <span
                key={member.id}
                className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md text-sm font-medium"
              >
                <Avatar className="h-5 w-5">
                  {member.photo_url && <AvatarImage src={member.photo_url} alt={member.name} />}
                  <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                {member.name.split(" ")[0]}
              </span>
            ))}
            {selectedStaff.length > 3 && (
              <span className="inline-flex items-center bg-gray-200 text-gray-700 px-2.5 py-1 rounded-md text-sm font-medium">
                +{selectedStaff.length - 3} more
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {selectedStaff.length > 0 && (
            <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-gray-800 text-white text-xs font-semibold">
              {selectedStaff.length}
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-2">
            {staff?.length === 0 && (
              <div className="px-4 py-3 text-gray-500 text-sm">No staff members available</div>
            )}
            {staff?.map((member) => {
              const isSelected = selectedIds.includes(member.id)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleParticipant(member.id)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left cursor-pointer"
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "border-gray-800 bg-gray-800" : "border-gray-300"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <Avatar className="h-8 w-8">
                    {member.photo_url && <AvatarImage src={member.photo_url} alt={member.name} />}
                    <AvatarFallback className="text-xs bg-gray-100 text-gray-800">{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{member.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper to convert military time to Date
function militaryToDate(military: number): Date {
  const date = new Date()
  const hours = Math.floor(military / 100)
  const minutes = military % 100
  date.setHours(hours, minutes, 0, 0)
  return date
}

// Helper to convert Date to military time
function dateToMilitary(date: Date | undefined): number {
  if (!date) return 800
  return date.getHours() * 100 + date.getMinutes()
}

export function AddScheduleItemSheet({ 
  open, 
  onOpenChange, 
  scheduleId, 
  date,
  staff = [],
  editItem,
}: AddScheduleItemSheetProps) {
  // Fetch item types from API
  const { data: itemTypes = [] } = useExpeditionScheduleItemTypes()
  
  const isEditMode = !!editItem
  
  const getInitialFormData = () => ({
    name: editItem?.name || "",
    expedition_schedule_item_types_id: editItem?.expedition_schedule_item_types_id || 0,
    time_in: editItem?.time_in || 800,
    time_out: editItem?.time_out || 900,
    led_by: editItem?.led_by || 0,
    participants: editItem?.participants?.map((p: any) => p.id || p) || [],
    notes: editItem?.notes || "",
    address: editItem?.address || "",
    things_to_bring: editItem?.things_to_bring || "",
  })
  
  const [formData, setFormData] = useState(getInitialFormData())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Time state as Date objects for the picker
  const [timeInDate, setTimeInDate] = useState<Date | undefined>(militaryToDate(editItem?.time_in || 800))
  const [timeOutDate, setTimeOutDate] = useState<Date | undefined>(militaryToDate(editItem?.time_out || 900))

  // Reset form when editItem changes or sheet opens
  useEffect(() => {
    if (open) {
      const initial = getInitialFormData()
      setFormData(initial)
      setTimeInDate(militaryToDate(initial.time_in))
      setTimeOutDate(militaryToDate(initial.time_out))
    }
  }, [open, editItem])

  // Sync time picker changes to form data
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      time_in: dateToMilitary(timeInDate),
      time_out: dateToMilitary(timeOutDate),
    }))
  }, [timeInDate, timeOutDate])

  const getInitials = (name: string) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name) {
      toast.error("Please enter an activity name")
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        isTemplate: false,
        expedition_schedule_item_types_id: formData.expedition_schedule_item_types_id,
        expedition_schedule_id: scheduleId,
        time_in: formData.time_in,
        time_out: formData.time_out,
        participants: formData.participants,
        led_by: formData.led_by,
        notes: formData.notes,
        address: formData.address,
        things_to_bring: formData.things_to_bring,
      }

      if (isEditMode && editItem) {
        await updateExpeditionScheduleItem(editItem.id, payload)
        toast.success("Activity updated successfully")
      } else {
        await createExpeditionScheduleItem(payload)
        toast.success("Activity added successfully")
      }
      
      await mutate(`expedition_schedule_items_date_${date}`)
      onOpenChange(false)
      
      // Reset form
      setFormData({
        name: "",
        expedition_schedule_item_types_id: 0,
        time_in: 800,
        time_out: 900,
        led_by: 0,
        participants: [],
        notes: "",
        address: "",
        things_to_bring: "",
      })
      setTimeInDate(militaryToDate(800))
      setTimeOutDate(militaryToDate(900))
    } catch (error) {
      console.error("Failed to save activity:", error)
      toast.error(isEditMode ? "Failed to update activity" : "Failed to add activity")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!editItem) return

    setDeleting(true)
    setShowDeleteConfirm(false)
    try {
      await deleteExpeditionScheduleItem(editItem.id)
      await mutate(`expedition_schedule_items_date_${date}`)
      toast.success("Activity deleted")
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to delete activity:", error)
      toast.error("Failed to delete activity")
    } finally {
      setDeleting(false)
    }
  }

  // Prepare options for dropdowns
  const typeOptions = [
    { value: 0, label: "None" },
    ...itemTypes.map((t: any) => ({ value: t.id, label: t.name, data: t }))
  ]

  const staffOptions = [
    { value: 0, label: "None" },
    ...staff.map(s => ({ value: s.id, label: s.name, data: s }))
  ]

  // Handle activity type change - auto-fill name
  const handleTypeChange = (value: string | number, option?: any) => {
    const typeId = Number(value)
    setFormData(prev => ({
      ...prev,
      expedition_schedule_item_types_id: typeId,
      // Auto-fill name with type name if type is selected and name is empty or was auto-filled
      name: typeId !== 0 && option?.label ? option.label : prev.name
    }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-8 pb-24">
          <SheetHeader className="mb-8">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-2xl">{isEditMode ? "Edit Activity" : "Add Activity"}</SheetTitle>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <SheetDescription className="text-base">
              {isEditMode ? "Update activity details" : "Create a new activity for this schedule"}
            </SheetDescription>
          </SheetHeader>

          <form id="add-activity-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Activity Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Activity Type</Label>
              <CustomSelect
                value={formData.expedition_schedule_item_types_id}
                onChange={handleTypeChange}
                options={typeOptions}
                placeholder="Select type"
                className="h-12 text-base"
                renderValue={(option) => (
                  <span className={option && option.value !== 0 ? "text-gray-900 text-base" : "text-gray-500 text-base"}>
                    {option?.label || "Select type"}
                  </span>
                )}
              />
            </div>

            {/* Custom Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Custom Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Morning Orientation"
                className="h-12 text-base"
              />
            </div>

            {/* Time Selectors */}
            <div className="grid grid-cols-2 gap-6">
              <TimePicker
                label="Start Time"
                date={timeInDate}
                setDate={setTimeInDate}
              />
              <TimePicker
                label="End Time"
                date={timeOutDate}
                setDate={setTimeOutDate}
              />
            </div>

            {/* Led By - Staff Selector with Avatar (grayscale) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Led By</Label>
              <CustomSelect
                value={formData.led_by}
                onChange={(value) => setFormData({ ...formData, led_by: Number(value) })}
                options={staffOptions}
                placeholder="Select staff member"
                className="h-14 text-base"
                renderValue={(option) => {
                  if (!option || option.value === 0) {
                    return <span className="text-gray-500 text-base">Select staff member</span>
                  }
                  return (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {option.data?.photo_url && <AvatarImage src={option.data.photo_url} alt={option.label} />}
                        <AvatarFallback className="text-xs bg-gray-100 text-gray-800">{getInitials(option.label)}</AvatarFallback>
                      </Avatar>
                      <span className="text-base">{option.label}</span>
                    </div>
                  )
                }}
                renderOption={(option) => {
                  if (option.value === 0) {
                    return <span className="text-gray-500 text-sm">None</span>
                  }
                  return (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {option.data?.photo_url && <AvatarImage src={option.data.photo_url} alt={option.label} />}
                        <AvatarFallback className="text-xs bg-gray-100 text-gray-800">{getInitials(option.label)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                  )
                }}
              />
            </div>

            {/* Participants Selector (Staff) */}
            <StaffParticipantSelector
              staff={staff}
              selectedIds={formData.participants}
              onChange={(ids) => setFormData({ ...formData, participants: ids })}
            />

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Location address"
                className="h-12 text-base"
              />
            </div>

            {/* Notes - Textarea with larger text */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this activity..."
                className="min-h-28 text-base resize-none"
              />
            </div>

            {/* Things to Bring - Textarea with larger text */}
            <div className="space-y-2">
              <Label htmlFor="things_to_bring" className="text-sm font-medium">Things to Bring</Label>
              <Textarea
                id="things_to_bring"
                value={formData.things_to_bring}
                onChange={(e) => setFormData({ ...formData, things_to_bring: e.target.value })}
                placeholder="Items needed for this activity..."
                className="min-h-28 text-base resize-none"
              />
            </div>
          </form>
        </div>

        {/* Fixed Bottom Buttons - Trash | Cancel | Save Changes (flexible) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-3 items-center">
          {/* Delete button - only in edit mode */}
          {isEditMode && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteClick}
              disabled={saving || deleting}
              className="h-10 text-sm cursor-pointer px-3 border-gray-300"
            >
              {deleting ? (
                <Spinner size="sm" className="h-4 w-4 text-gray-500" />
              ) : (
                <Trash2 className="h-4 w-4 text-gray-500" />
              )}
            </Button>
          )}
          
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving || deleting}
            className="h-10 text-sm cursor-pointer px-4"
          >
            Cancel
          </Button>
          
          {/* Save button - flexible width */}
          <Button
            type="submit"
            form="add-activity-form"
            disabled={saving || deleting}
            className="h-10 text-sm cursor-pointer flex-1"
          >
            {saving ? (
              <>
                <Spinner size="sm" className="h-3 w-3 mr-2" />
                {isEditMode ? "Saving..." : "Adding..."}
              </>
            ) : (
              isEditMode ? 'Save Changes' : 'Add Activity'
            )}
          </Button>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Activity</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this activity? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 cursor-pointer"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
}
