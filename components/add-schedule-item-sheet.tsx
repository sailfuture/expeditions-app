"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TimePicker } from "@/components/ui/time-picker"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ResponsiveSheet, ResponsiveSheetContent, ResponsiveSheetFooter } from "@/components/responsive-sheet"
import { MobilePicker, type PickerOption } from "@/components/mobile-picker"
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
import { RecipeThumb } from "@/components/recipe-thumb"
import { Check, X, Trash2, ExternalLink } from "lucide-react"
import { createExpeditionScheduleItem, updateExpeditionScheduleItem, deleteExpeditionScheduleItem, getExpeditionCookbook } from "@/lib/xano"
import { useExpeditionScheduleItemTypes, revalidateScheduleItemRanges } from "@/lib/hooks/use-expeditions"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import { cn, getPhotoUrl } from "@/lib/utils"

interface AddScheduleItemSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduleId: number
  date: string
  staff?: any[]
  students?: any[] // Students for this expedition
  editItem?: any // If provided, sheet is in edit mode
  expeditionsId?: number // For cache invalidation
}

function staffInitials(name: string) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2)
}

function studentInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?"
}

function studentName(student: any) {
  return `${student.firstName || ""} ${student.lastName || ""}`.trim() || "Unknown"
}

/** Round check used as the selected marker in the multi-select lists. */
function SelectionDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        selected ? "border-gray-800 bg-gray-800" : "border-gray-300"
      )}
    >
      {selected && <Check className="h-3 w-3 text-white" />}
    </span>
  )
}

// Led By: one staff member or none
function StaffCombobox({
  value,
  onChange,
  staff,
}: {
  value: number
  onChange: (value: number) => void
  staff: any[]
}) {
  const selectedStaff = staff.find((s) => s.id === value) || null
  const options: PickerOption[] = [
    { value: 0, label: "None" },
    ...staff.map((s) => ({ value: s.id, label: s.name, data: s })),
  ]

  return (
    <MobilePicker
      title="Led by"
      searchPlaceholder="Search staff..."
      emptyText="No staff found"
      options={options}
      value={value}
      onChange={(v) => onChange(Number(v))}
      triggerClassName="h-14"
      renderValue={() =>
        selectedStaff ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {selectedStaff.photo_url && <AvatarImage src={selectedStaff.photo_url} alt={selectedStaff.name} />}
              <AvatarFallback className="text-xs bg-gray-100 text-gray-800">{staffInitials(selectedStaff.name)}</AvatarFallback>
            </Avatar>
            <span className="text-base">{selectedStaff.name}</span>
          </div>
        ) : (
          <span className="text-base text-gray-500">Select staff member</span>
        )
      }
      renderOption={(option, selected) =>
        option.data ? (
          <>
            <Avatar className="h-8 w-8">
              {option.data.photo_url && <AvatarImage src={option.data.photo_url} alt={option.label} />}
              <AvatarFallback className="text-xs bg-gray-100 text-gray-800">{staffInitials(option.label)}</AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-sm font-medium">{option.label}</span>
            {selected && <Check className="h-4 w-4 shrink-0 text-gray-600" />}
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-gray-500">{option.label}</span>
            {selected && <Check className="h-4 w-4 shrink-0 text-gray-600" />}
          </>
        )
      }
    />
  )
}

// Color mapping for activity types
const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  orange: "#f97316",
  blue: "#3b82f6",
  green: "#22c55e",
  purple: "#a855f7",
  red: "#ef4444",
  yellow: "#eab308",
  gray: "#9ca3af",
  pink: "#ec4899",
  indigo: "#6366f1",
  teal: "#14b8a6",
  cyan: "#06b6d4",
}

function TypeDot({ color }: { color?: string }) {
  if (!color) return null
  return <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: ACTIVITY_TYPE_COLORS[color] || color }} />
}

// Activity type, grouped into Meals and Activities
function ActivityTypeSelector({
  value,
  onChange,
  options,
}: {
  value: number
  onChange: (value: number, option?: any) => void
  options: { value: number; label: string; data?: any }[]
}) {
  const selectedOption = options.find((o) => o.value === value) || null
  const pickerOptions: PickerOption[] = options
    .filter((o) => o.value !== 0)
    .map((o) => ({ value: o.value, label: o.label, data: o.data, group: o.data?.isMeal ? "Meals" : "Activities" }))
    // Meals first, as before
    .sort((a, b) => (a.group === b.group ? 0 : a.group === "Meals" ? -1 : 1))

  return (
    <MobilePicker
      title="Activity type"
      searchPlaceholder="Search types..."
      emptyText="No types found"
      options={pickerOptions}
      value={value}
      onChange={(v, option) => onChange(Number(v), option)}
      triggerClassName="h-12"
      renderValue={() => (
        <div className="flex min-w-0 items-center gap-2">
          <TypeDot color={selectedOption?.data?.color} />
          <span className={cn("truncate", selectedOption ? "text-gray-900" : "text-gray-500")}>
            {selectedOption?.label || "Select activity type..."}
          </span>
        </div>
      )}
      renderOption={(option, selected) => (
        <>
          <TypeDot color={option.data?.color} />
          <span className="flex-1 truncate text-sm">{option.label}</span>
          {selected && <Check className="h-4 w-4 shrink-0 text-gray-600" />}
        </>
      )}
    />
  )
}

// Multi-select for staff participants with avatars and search
function StaffParticipantSelector({
  staff,
  selectedIds,
  onChange,
}: {
  staff: any[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
}) {
  const selectedStaff = staff?.filter((s) => selectedIds.includes(s.id)) || []
  const options: PickerOption[] = (staff || []).map((s) => ({ value: s.id, label: s.name, data: s }))

  const toggle = (id: number) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((sid) => sid !== id) : [...selectedIds, id])
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Participants (Staff)</Label>
      <MobilePicker
        multiple
        title="Staff participants"
        description="Tap to add or remove; close when done."
        searchPlaceholder="Search staff..."
        emptyText="No staff found"
        options={options}
        value={selectedIds}
        onChange={(v) => toggle(Number(v))}
        renderValue={() => (
          <div className="flex items-center justify-between gap-2">
            {selectedStaff.length === 0 ? (
              <span className="text-base text-gray-500">Select staff participants...</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedStaff.slice(0, 3).map((member) => (
                  <span key={member.id} className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-800">
                    <Avatar className="h-5 w-5">
                      {member.photo_url && <AvatarImage src={member.photo_url} alt={member.name} />}
                      <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">{staffInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    {member.name.split(" ")[0]}
                  </span>
                ))}
                {selectedStaff.length > 3 && (
                  <span className="inline-flex items-center rounded-md bg-gray-200 px-2.5 py-1 text-sm font-medium text-gray-700">
                    +{selectedStaff.length - 3} more
                  </span>
                )}
              </div>
            )}
            {selectedStaff.length > 0 && (
              <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-gray-800 px-1.5 text-xs font-semibold text-white">
                {selectedStaff.length}
              </span>
            )}
          </div>
        )}
        renderOption={(option, selected) => (
          <>
            <SelectionDot selected={selected} />
            <Avatar className="h-8 w-8">
              {option.data?.photo_url && <AvatarImage src={option.data.photo_url} alt={option.label} />}
              <AvatarFallback className="text-xs bg-gray-100 text-gray-800">{staffInitials(option.label)}</AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-sm font-medium">{option.label}</span>
          </>
        )}
      />
    </div>
  )
}

// Multi-select for student participants with avatars and search
function StudentParticipantSelector({
  students,
  selectedIds,
  onChange,
}: {
  students: any[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
}) {
  const selectedStudents = students?.filter((s) => selectedIds.includes(s.id)) || []
  const options: PickerOption[] = (students || []).map((s) => ({ value: s.id, label: studentName(s), data: s }))

  const toggle = (id: number) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((sid) => sid !== id) : [...selectedIds, id])
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Participants (Students)</Label>
      <MobilePicker
        multiple
        title="Student participants"
        description="Tap to add or remove; close when done."
        searchPlaceholder="Search students..."
        emptyText="No students found"
        options={options}
        value={selectedIds}
        onChange={(v) => toggle(Number(v))}
        renderValue={() => (
          <div className="flex items-center justify-between gap-2">
            {selectedStudents.length === 0 ? (
              <span className="text-base text-gray-500">Select student participants...</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedStudents.slice(0, 3).map((student) => (
                  <span key={student.id} className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-800">
                    <Avatar className="h-5 w-5">
                      {student.profileImage && <AvatarImage src={student.profileImage} alt={studentName(student)} />}
                      <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">
                        {studentInitials(student.firstName, student.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    {student.firstName}
                  </span>
                ))}
                {selectedStudents.length > 3 && (
                  <span className="inline-flex items-center rounded-md bg-gray-200 px-2.5 py-1 text-sm font-medium text-gray-700">
                    +{selectedStudents.length - 3} more
                  </span>
                )}
              </div>
            )}
            {selectedStudents.length > 0 && (
              <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-gray-800 px-1.5 text-xs font-semibold text-white">
                {selectedStudents.length}
              </span>
            )}
          </div>
        )}
        renderOption={(option, selected) => (
          <>
            <SelectionDot selected={selected} />
            <Avatar className="h-8 w-8">
              {option.data?.profileImage && <AvatarImage src={option.data.profileImage} alt={option.label} />}
              <AvatarFallback className="text-xs bg-gray-100 text-gray-800">
                {studentInitials(option.data?.firstName, option.data?.lastName)}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-sm font-medium">{option.label}</span>
          </>
        )}
      />
    </div>
  )
}

// Cookbook/Recipe selector with search
function CookbookSelector({
  selectedId,
  onChange,
  mealTypeName,
}: {
  selectedId: number
  onChange: (id: number) => void
  mealTypeName: string | undefined
}) {
  // Fetch all cookbook recipes and filter by type client-side (supports types[] array)
  const { data: allRecipes = [], isLoading } = useSWR(
    mealTypeName ? "expedition_cookbook_all" : null,
    () => getExpeditionCookbook(),
    { revalidateOnFocus: false }
  )
  const recipes = allRecipes.filter((r: any) => {
    const types = Array.isArray(r.types) && r.types.length > 0 ? r.types : r.type ? [r.type] : []
    return types.includes(mealTypeName || "")
  })
  const selectedRecipe = recipes.find((r: any) => r.id === selectedId)

  const options: PickerOption[] = [
    { value: 0, label: "None" },
    ...recipes.map((r: any) => ({ value: r.id, label: r.recipe_name || `Meal Plan #${r.id}`, data: r })),
  ]

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Meal Plan</Label>
      <MobilePicker
        title="Meal plan"
        searchPlaceholder="Search meal plans..."
        emptyText="No meal plans available"
        loading={isLoading}
        loadingText="Loading meal plans..."
        options={options}
        value={selectedId}
        onChange={(v) => onChange(Number(v))}
        triggerClassName="h-12"
        renderValue={() => (
          <div className="flex min-w-0 items-center gap-2">
            {getPhotoUrl(selectedRecipe?.recipe_photo) && (
              <RecipeThumb photo={selectedRecipe.recipe_photo} name={selectedRecipe.recipe_name} size={28} className="rounded-full" />
            )}
            <span className={selectedRecipe ? "truncate text-base text-gray-900" : "text-base text-gray-500"}>
              {selectedRecipe ? selectedRecipe.recipe_name : "Select a meal plan..."}
            </span>
          </div>
        )}
        renderOption={(option, selected) =>
          option.data ? (
            <>
              <RecipeThumb photo={option.data.recipe_photo} name={option.label} size={32} className="rounded-full" />
              <span className="flex-1 truncate text-sm font-medium">{option.label}</span>
              {selected && <Check className="h-4 w-4 shrink-0 text-gray-700" />}
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-gray-500">{option.label}</span>
              {selected && <Check className="h-4 w-4 shrink-0 text-gray-700" />}
            </>
          )
        }
      />
    </div>
  )
}

// Helper to convert military time to Date
function militaryToDate(military: number): Date {
  const date = new Date()
  let hours = Math.floor(military / 100)
  const minutes = military % 100
  // Handle 2400 (midnight end of day) as hour 0
  if (hours === 24) hours = 0
  date.setHours(hours, minutes, 0, 0)
  return date
}

// Helper to convert Date to military time
function dateToMilitary(date: Date | undefined, isEndTime: boolean = false): number {
  if (!date) return 800
  const hours = date.getHours()
  const minutes = date.getMinutes()
  // For end time, 12:00 AM (hour 0) should be 2400 (end of day)
  if (isEndTime && hours === 0 && minutes === 0) {
    return 2400
  }
  return hours * 100 + minutes
}

export function AddScheduleItemSheet({
  open,
  onOpenChange,
  scheduleId,
  date,
  staff = [],
  students = [],
  expeditionsId,
  editItem,
}: AddScheduleItemSheetProps) {
  // Fetch item types from API
  const { data: itemTypes = [] } = useExpeditionScheduleItemTypes()

  const isEditMode = !!editItem

  // Check if an activity type is a meal using the isMeal boolean from the type record
  const isMealType = (typeId: number) => {
    if (!typeId) return false
    const type = itemTypes.find((t: any) => t.id === typeId)
    return !!type?.isMeal
  }

  const getInitialFormData = () => {
    // Convert participants (staff) - they come as {name, isActive} objects, need to find IDs
    let participantIds: number[] = []
    if (editItem?.participants && Array.isArray(editItem.participants)) {
      participantIds = editItem.participants
        .map((p: any) => {
          // If it's already a number, use it
          if (typeof p === 'number') return p
          // If it has an id, use it
          if (p?.id) return p.id
          // If it has a name, look up the staff member by name
          if (p?.name && staff) {
            const foundStaff = staff.find((s: any) => s.name === p.name)
            return foundStaff?.id
          }
          return null
        })
        .filter((id: any) => id != null) as number[]
    }

    // Convert students_id - they come as {firstName, lastName, profileImage} objects, need to find IDs
    let studentIds: number[] = []
    if (editItem?.students_id && Array.isArray(editItem.students_id)) {
      studentIds = editItem.students_id
        .map((s: any) => {
          // If it's already a number, use it
          if (typeof s === 'number') return s
          // If it has an id, use it
          if (s?.id) return s.id
          // If it has firstName/lastName, look up the student by name
          if (s?.firstName && s?.lastName && students) {
            const foundStudent = students.find((st: any) =>
              st.firstName === s.firstName && st.lastName === s.lastName
            )
            return foundStudent?.id
          }
          return null
        })
        .filter((id: any) => id != null) as number[]
    }

    return {
      name: editItem?.name || "",
      expedition_schedule_item_types_id: editItem?.expedition_schedule_item_types_id || 0,
      time_in: editItem?.time_in || 800,
      time_out: editItem?.time_out || 900,
      led_by: editItem?.led_by || 0,
      participants: participantIds,
      students_id: studentIds,
      notes: editItem?.notes || "",
      address: editItem?.address || "",
      things_to_bring: editItem?.things_to_bring || "",
      resources: editItem?.resources || "",
      expedition_cookbook_id: editItem?.expedition_cookbook_id || 0,
    }
  }

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
      time_in: dateToMilitary(timeInDate, false),
      time_out: dateToMilitary(timeOutDate, true), // isEndTime = true
    }))
  }, [timeInDate, timeOutDate])

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
        students_id: formData.students_id,
        led_by: formData.led_by,
        notes: formData.notes,
        address: formData.address,
        things_to_bring: formData.things_to_bring,
        resources: formData.resources,
        expedition_cookbook_id: isMealType(formData.expedition_schedule_item_types_id) ? formData.expedition_cookbook_id : 0,
      }

      if (isEditMode && editItem) {
        await updateExpeditionScheduleItem(editItem.id, payload)
        toast.success("Activity updated successfully")
      } else {
        await createExpeditionScheduleItem(payload)
        toast.success("Activity added successfully")
      }

      await mutate(`expedition_schedule_items_date_${date}_${expeditionsId || 'all'}`)
      await revalidateScheduleItemRanges()
      onOpenChange(false)

      // Reset form
      setFormData({
        name: "",
        expedition_schedule_item_types_id: 0,
        time_in: 800,
        time_out: 900,
        led_by: 0,
        participants: [],
        students_id: [],
        notes: "",
        address: "",
        things_to_bring: "",
        resources: "",
        expedition_cookbook_id: 0,
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
      await mutate(`expedition_schedule_items_date_${date}_${expeditionsId || 'all'}`)
      await revalidateScheduleItemRanges()
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
  const typeOptions = itemTypes.map((t: any) => ({ value: t.id, label: t.name, data: t }))

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
    <ResponsiveSheet open={open} onOpenChange={onOpenChange}>
      {/* Right-side sheet from md, bottom sheet on phones; the footer is a flex
          child, not absolutely positioned, so it is never covered or off-screen. */}
      <ResponsiveSheetContent className="w-full sm:max-w-xl">
        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          <SheetHeader className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-2xl">{isEditMode ? "Edit Activity" : "Add Activity"}</SheetTitle>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close"
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
              <ActivityTypeSelector
                value={formData.expedition_schedule_item_types_id}
                onChange={(val, opt) => handleTypeChange(val, opt)}
                options={typeOptions}
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

            {/* Time Selectors: stacked on phones, side by side from sm */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <TimePicker
                label="Start Time"
                date={timeInDate}
                setDate={setTimeInDate}
              />
              <TimePicker
                label="End Time"
                date={timeOutDate}
                setDate={setTimeOutDate}
                maxHour={24}
              />
            </div>

            {/* Led By - Staff Selector Combobox with search */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Led By</Label>
              <StaffCombobox
                value={formData.led_by}
                onChange={(value) => setFormData({ ...formData, led_by: value })}
                staff={staff}
              />
            </div>

            {/* Participants Selector (Staff) */}
            <StaffParticipantSelector
              staff={staff}
              selectedIds={formData.participants}
              onChange={(ids) => setFormData({ ...formData, participants: ids })}
            />

            {/* Participants Selector (Students) */}
            <StudentParticipantSelector
              students={students}
              selectedIds={formData.students_id}
              onChange={(ids) => setFormData({ ...formData, students_id: ids })}
            />

            {/* Meal Plan - Only show for meal types (Breakfast, Lunch, Dinner) */}
            {isMealType(formData.expedition_schedule_item_types_id) && (
              <CookbookSelector
                selectedId={formData.expedition_cookbook_id}
                onChange={(id) => setFormData({ ...formData, expedition_cookbook_id: id })}
                mealTypeName={itemTypes.find((t: any) => t.id === formData.expedition_schedule_item_types_id)?.name}
              />
            )}

            {/* Resources URL */}
            <div className="space-y-2">
              <Label htmlFor="resources" className="text-sm font-medium">Resources</Label>
              <div className="flex gap-2">
                <Input
                  id="resources"
                  type="url"
                  value={formData.resources}
                  onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                  placeholder="https://example.com/resource"
                  className="h-12 text-base flex-1"
                />
                {formData.resources && (
                  <a
                    href={formData.resources}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 w-12 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
                  >
                    <ExternalLink className="h-4 w-4 text-gray-600" />
                  </a>
                )}
              </div>
            </div>

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

        {/* Footer - Trash | Cancel | Save Changes (flexible) */}
        <ResponsiveSheetFooter>
          {/* Delete button - only in edit mode */}
          {isEditMode && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteClick}
              disabled={saving || deleting}
              className="h-11 w-11 shrink-0 cursor-pointer border-gray-300 px-0 sm:h-10 sm:w-auto sm:px-3"
              aria-label="Delete activity"
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
            className="h-11 text-sm cursor-pointer px-4 sm:h-10"
          >
            Cancel
          </Button>

          {/* Save button - flexible width */}
          <Button
            type="submit"
            form="add-activity-form"
            disabled={saving || deleting}
            className="h-11 text-sm cursor-pointer flex-1 sm:h-10"
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
        </ResponsiveSheetFooter>

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
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  )
}
