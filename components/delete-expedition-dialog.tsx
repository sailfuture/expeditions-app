"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  deleteExpedition,
  getExpeditionLocations,
  getExpeditionSchedules,
  getStudentsByExpedition,
  getTeachersByExpedition,
} from "@/lib/xano"

interface LinkedCounts {
  scheduleDays: number
  students: number
  staff: number
  destinations: number
}

async function loadLinkedCounts(expeditionId: number): Promise<LinkedCounts> {
  const [schedules, students, staff, locations] = await Promise.all([
    getExpeditionSchedules(expeditionId).catch(() => []),
    getStudentsByExpedition(expeditionId).catch(() => []),
    getTeachersByExpedition(expeditionId).catch(() => []),
    getExpeditionLocations(expeditionId).catch(() => []),
  ])
  const own = (rows: any[]) => (Array.isArray(rows) ? rows.filter((r) => r?.expeditions_id === expeditionId).length : 0)
  return {
    scheduleDays: own(schedules),
    students: Array.isArray(students) ? students.length : 0,
    staff: Array.isArray(staff) ? staff.length : 0,
    destinations: own(locations),
  }
}

/**
 * Confirms and deletes an expedition. The active expedition can't be deleted.
 * When anything is attached (schedule, people, destinations) the staff member
 * has to type the expedition's name before the delete button unlocks.
 */
export function DeleteExpeditionDialog({
  expedition,
  open,
  onOpenChange,
  onDeleted,
}: {
  expedition: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const [confirmText, setConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (open) setConfirmText("")
  }, [open, expedition?.id])

  const { data: counts, isLoading } = useSWR(
    open && expedition?.id ? `expedition_linked_counts_${expedition.id}` : null,
    () => loadLinkedCounts(expedition.id),
    { revalidateOnFocus: false }
  )

  if (!expedition) return null

  const name: string = expedition.name || expedition.title || `Expedition ${expedition.id}`
  const isActive = Boolean(expedition.isActive)
  const linked = counts ? counts.scheduleDays + counts.students + counts.staff + counts.destinations : 0
  const needsTypedName = linked > 0
  const nameMatches = confirmText.trim() === name.trim()
  const canDelete = !isActive && !isLoading && (!needsTypedName || nameMatches) && !deleting

  const handleDelete = async () => {
    if (!canDelete) return
    setDeleting(true)
    try {
      await deleteExpedition(expedition.id)
      toast.success(`Deleted ${name}`)
      onOpenChange(false)
      onDeleted?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the expedition")
    } finally {
      setDeleting(false)
    }
  }

  const rows: Array<[string, number]> = counts
    ? [
        ["Schedule days", counts.scheduleDays],
        ["Students", counts.students],
        ["Staff", counts.staff],
        ["Destinations", counts.destinations],
      ]
    : []

  return (
    <Dialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[460px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Delete {name}?
          </DialogTitle>
          <DialogDescription>
            This permanently removes the expedition and can&apos;t be undone.
            {expedition.is_published && " It will also disappear from the expeditions site."}
          </DialogDescription>
        </DialogHeader>

        {isActive ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            This is the active expedition. Set another expedition active first, then delete this one.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200">
              <p className="border-b bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">Attached to this expedition</p>
              {isLoading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500">
                  <Spinner size="sm" /> Checking…
                </div>
              ) : (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-3 py-3 text-sm">
                  {rows.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between">
                      <dt className="text-gray-600">{label}</dt>
                      <dd className={value > 0 ? "font-semibold text-gray-900" : "text-gray-400"}>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            {needsTypedName && (
              <>
                <p className="text-sm text-gray-600">
                  These records stay in the database but can no longer be reached from the app. Scores, reviews and
                  assignments for this expedition will be hidden too.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-expedition-name" className="text-sm">
                    Type <span className="font-semibold">{name}</span> to confirm
                  </Label>
                  <Input
                    id="confirm-expedition-name"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    autoComplete="off"
                    placeholder={name}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          {!isActive && (
            <Button variant="destructive" className="cursor-pointer" onClick={handleDelete} disabled={!canDelete}>
              {deleting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Deleting…
                </>
              ) : (
                "Delete expedition"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
