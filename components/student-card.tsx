"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { X, Lock, LockOpen } from "lucide-react"
import { ScoreControl } from "./score-control"
import { ScoreReasonField } from "./score-reason-field"
import { CARD_FIELD_BOX, CARD_FIELD_LABEL } from "./segmented-control"
import { JournalStatusControl } from "./journal-status-control"
import type {
  ExpeditionProfessionalism,
  ExpeditionBonus,
  ExpeditionPenalty,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { BLOCK_FLAG_BY_KEY, reconcileReasons, type ExpeditionReason, type ScoreKey } from "@/lib/evaluation-reasons"
import type { JournalStatus } from "@/lib/journal-status"

interface StudentCardProps {
  record: ExpeditionProfessionalism
  bonusOptions: ExpeditionBonus[]
  penaltyOptions: ExpeditionPenalty[]
  isOffshore: boolean
  isService: boolean
  onUpdate: (updated: ExpeditionProfessionalism) => void
}

function getScoreCategories(isOffshore: boolean, isService: boolean): Array<{ key: ScoreKey; label: string }> {
  // Service Learning day (in port)
  if (!isOffshore && isService) {
    return [
      { key: "school", label: "SCHOOL" },
      { key: "job", label: "JOB" },
      { key: "citizenship", label: "CITIZENSHIP" },
      { key: "service_learning", label: "SERVICE" },
    ]
  }
  // Offshore + Service Learning
  else if (isOffshore && isService) {
    return [
      { key: "crew", label: "CREW" },
      { key: "job", label: "JOB" },
      { key: "citizenship", label: "CITIZENSHIP" },
      { key: "service_learning", label: "SERVICE" },
    ]
  }
  // Offshore (no service)
  else if (isOffshore && !isService) {
    return [
      { key: "crew", label: "CREW" },
      { key: "job", label: "JOB" },
      { key: "citizenship", label: "CITIZENSHIP" },
    ]
  }
  // Regular day (anchored, no service)
  return [
    { key: "school", label: "SCHOOL" },
    { key: "job", label: "JOB" },
    { key: "citizenship", label: "CITIZENSHIP" },
  ]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// Map score category key to the corresponding "isUsed" boolean field
function getCategoryDisabledFlag(record: ExpeditionProfessionalism, key: ScoreKey): boolean {
  // If the boolean flag is true, the category is disabled/inactive
  return record[BLOCK_FLAG_BY_KEY[key]] === true
}

export function StudentCard({
  record,
  bonusOptions,
  penaltyOptions,
  isOffshore,
  isService,
  onUpdate,
}: StudentCardProps) {
  const studentName = `${record._students?.firstName || ""} ${record._students?.lastName || ""}`.trim() || "Unknown Student"
  const initials = getInitials(studentName)
  // Check both possible field names for profile image
  const photoUrl = record._students?.profileImage || record._students?.photo_url

  const scoreCategories = getScoreCategories(isOffshore, isService)
  const performanceCategories = scoreCategories.filter((c) => c.key !== "citizenship")
  const citizenshipCategory = scoreCategories.find((c) => c.key === "citizenship")
  const isExcluded = record.isFlagged

  const handleScoreChange = (key: ScoreKey, value: number | null) => {
    // Reasons only survive while they still match the score's direction
    // (bonus above 3, penalty below 3); crossing 3 clears them.
    const reasons = { ...record.reasons, [key]: reconcileReasons(record.reasons[key], value) }
    // Also unlock the record when changing a score so it can be re-submitted
    onUpdate({ ...record, [key]: value, reasons, isLocked: false })
  }

  const handleReasonChange = (key: ScoreKey, reasons: ExpeditionReason[]) => {
    onUpdate({ ...record, reasons: { ...record.reasons, [key]: reasons }, isLocked: false })
  }

  const handleExcludeToggle = () => {
    onUpdate({ ...record, isFlagged: !record.isFlagged })
  }

  const handleLockToggle = () => {
    onUpdate({ ...record, isLocked: !record.isLocked })
  }

  const handleJournalingChange = (status: JournalStatus | null) => {
    onUpdate({ ...record, journaling: status, isLocked: false })
  }

  // Toggle the isXUsed flag for a category
  // When blocking (setting isXUsed to true), also clear the score and its reason
  // Also unlock the record so it can be re-submitted
  const handleBlockToggle = (key: ScoreKey) => {
    const flag = BLOCK_FLAG_BY_KEY[key]
    const blocking = !record[flag]
    onUpdate({
      ...record,
      [flag]: blocking,
      [key]: blocking ? null : record[key], // Clear to null when blocking
      reasons: blocking ? { ...record.reasons, [key]: [] } : record.reasons,
      isLocked: false, // Unlock so changes can be submitted
    })
  }

  // A full-width score control plus its reason picker, which animates in
  // whenever the score moves above or below 3 (bonus reasons above, penalty
  // reasons below) and allows several reasons.
  const renderCategory = ({ key, label }: { key: ScoreKey; label: string }) => {
    const isCategoryBlocked = getCategoryDisabledFlag(record, key)
    const score = record[key] ?? null
    return (
      <div key={key} className="flex flex-col">
        <ScoreControl
          label={label}
          value={score}
          onChange={(value) => handleScoreChange(key, value)}
          disabled={record.isLocked}
          isBlocked={isCategoryBlocked}
          onBlockToggle={() => handleBlockToggle(key)}
          min={0}
          max={5}
        />
        <ScoreReasonField
          category={key}
          score={score}
          blocked={isCategoryBlocked}
          bonusOptions={bonusOptions}
          penaltyOptions={penaltyOptions}
          value={record.reasons[key]}
          onChange={(reason) => handleReasonChange(key, reason)}
          disabled={record.isLocked}
        />
      </div>
    )
  }

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...record, note: e.target.value })
  }

  if (isExcluded) {
    return (
      <Card className="w-full relative bg-gray-100 min-h-[320px] p-0">
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-gray-200 mb-3 bg-gray-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <span className="relative flex shrink-0 overflow-hidden rounded-full h-10 w-10 border-2 border-gray-300">
              {photoUrl ? (
                <img
                  className="aspect-square h-full w-full object-cover"
                  alt={studentName}
                  src={photoUrl || "/placeholder.svg"}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-slate-700 text-white font-medium text-sm">
                  {initials}
                </span>
              )}
            </span>
            <div>
              <h3 className="text-lg font-bold truncate">{studentName}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn("p-2 rounded-full cursor-pointer transition-colors duration-200", "bg-red-50")}
              title="Include student"
              onClick={handleExcludeToggle}
            >
              <X className="h-4 w-4 text-red-500" />
            </button>
            <button
              type="button"
              className={cn(
                "p-2 rounded-full cursor-pointer transition-colors duration-200",
                record.isLocked ? "bg-gray-200" : "bg-green-50",
              )}
              title={record.isLocked ? "Locked - click to unlock" : "Unlocked - can edit"}
              onClick={handleLockToggle}
            >
              {record.isLocked ? (
                <Lock className="h-4 w-4 text-gray-500" />
              ) : (
                <LockOpen className="h-4 w-4 text-green-500" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center px-4 pb-10 pt-6">
          <p className="text-gray-500 text-center">Scores will not be submitted for this student.</p>
        </div>
      </Card>
    )
  }

  const gridCols = scoreCategories.length <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"

  return (
    <Card className={cn("w-full relative p-0", record.isLocked && "bg-gray-50")}>
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-gray-200 mb-3 bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-3">
          <span className={cn(
            "relative flex shrink-0 overflow-hidden rounded-full h-10 w-10 border-2",
            record.isLocked ? "border-gray-300 grayscale" : "border-gray-300"
          )}>
            {photoUrl ? (
              <img
                className="aspect-square h-full w-full object-cover"
                alt={studentName}
                src={photoUrl || "/placeholder.svg"}
              />
            ) : (
              <span className={cn(
                "flex h-full w-full items-center justify-center font-medium text-sm",
                record.isLocked ? "bg-gray-400 text-white" : "bg-slate-700 text-white"
              )}>
                {initials}
              </span>
            )}
          </span>
          <div>
            <h3 className={cn("text-lg font-bold truncate", record.isLocked && "text-gray-500")}>
              {studentName}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn(
              "p-2 rounded-full cursor-pointer transition-colors duration-200",
              record.isLocked ? "bg-gray-100" : "bg-gray-50 hover:bg-red-50 group",
            )}
            title="Exclude student"
            onClick={handleExcludeToggle}
            disabled={record.isLocked}
          >
            <X className={cn("h-4 w-4", record.isLocked ? "text-gray-400" : "text-gray-400 group-hover:text-red-500")} />
          </button>
          <button
            type="button"
            className={cn(
              "p-2 rounded-full cursor-pointer transition-colors duration-200",
              record.isLocked ? "bg-gray-100" : "bg-green-50",
            )}
            title={record.isLocked ? "Locked - click to unlock" : "Unlocked - can edit"}
            onClick={handleLockToggle}
          >
            {record.isLocked ? (
              <Lock className="h-4 w-4 text-gray-400" />
            ) : (
              <LockOpen className="h-4 w-4 text-green-500" />
            )}
          </button>
        </div>
      </div>

      {/* One even rhythm: every field is 44px tall with 12px between fields (the reason pickers carry their own pt-3) */}
      <div className="px-3 sm:px-4 pb-4 space-y-3">
        {/* Performance categories, one full-width row each: CREW (offshore) or SCHOOL (in port), JOB, SERVICE (if applicable), then CITIZENSHIP */}
        {performanceCategories.map(renderCategory)}
        {citizenshipCategory && renderCategory(citizenshipCategory)}

        <JournalStatusControl
          value={record.journaling}
          onChange={handleJournalingChange}
          disabled={record.isLocked}
        />

        <div className="flex w-full flex-col gap-1.5">
          <label className={CARD_FIELD_LABEL}>NOTE</label>
          <Input
            className={cn(CARD_FIELD_BOX, "h-11 w-full cursor-text border-gray-200 text-sm shadow-none focus-visible:border-gray-400 focus-visible:ring-0")}
            placeholder="Add a note..."
            value={record.note ?? ""}
            onChange={handleNoteChange}
            disabled={record.isLocked}
          />
        </div>
      </div>
    </Card>
  )
}
