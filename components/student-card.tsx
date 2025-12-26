"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { X, Lock, LockOpen } from "lucide-react"
import { ScoreControl } from "./score-control"
import { MultiSelectDropdown } from "./multi-select-dropdown"
import { SingleSelectDropdown } from "./single-select-dropdown"
import type {
  ExpeditionProfessionalism,
  ExpeditionBonus,
  ExpeditionPenalty,
  ExpeditionJournalStatus,
} from "@/lib/types"
import { cn } from "@/lib/utils"

interface StudentCardProps {
  record: ExpeditionProfessionalism
  bonusOptions: ExpeditionBonus[]
  penaltyOptions: ExpeditionPenalty[]
  journalStatusOptions: ExpeditionJournalStatus[]
  isOffshore: boolean
  isService: boolean
  onUpdate: (updated: ExpeditionProfessionalism) => void
}

function getScoreCategories(isOffshore: boolean, isService: boolean) {
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
      { key: "citizenship", label: "CITIZENSHIP" },
      { key: "service_learning", label: "SERVICE" },
    ]
  }
  // Offshore (no service)
  else if (isOffshore && !isService) {
    return [
      { key: "crew", label: "CREW" },
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
function getCategoryDisabledFlag(record: ExpeditionProfessionalism, key: string): boolean {
  // If the boolean flag is true, the category is disabled/inactive
  switch (key) {
    case "school":
      return record.isAcademicsUsed === true
    case "job":
      return record.isJobUsed === true
    case "citizenship":
      return record.isCitizenshipUsed === true
    case "crew":
      return record.isCrewUsed === true
    case "service_learning":
      return record.isServiceUsed === true
    default:
      return false
  }
}

export function StudentCard({
  record,
  bonusOptions,
  penaltyOptions,
  journalStatusOptions,
  isOffshore,
  isService,
  onUpdate,
}: StudentCardProps) {
  const studentName = record._students?.name ?? "Unknown Student"
  const initials = getInitials(studentName)
  const photoUrl = record._students?.photo_url

  const scoreCategories = getScoreCategories(isOffshore, isService)
  const isExcluded = record.isFlagged

  const handleScoreChange = (key: string, value: number | null) => {
    onUpdate({ ...record, [key]: value })
  }

  const handleExcludeToggle = () => {
    onUpdate({ ...record, isFlagged: !record.isFlagged })
  }

  const handleLockToggle = () => {
    onUpdate({ ...record, isLocked: !record.isLocked })
  }

  const handleBonusChange = (selectedIds: number[]) => {
    const selectedBonuses = bonusOptions.filter((b) => selectedIds.includes(b.id))
    onUpdate({ ...record, bonuses: selectedBonuses })
  }

  const handlePenaltyChange = (selectedIds: number[]) => {
    const selectedPenalties = penaltyOptions.filter((p) => selectedIds.includes(p.id))
    onUpdate({ ...record, penalties: selectedPenalties })
  }

  const handleJournalStatusChange = (statusId: number | null) => {
    onUpdate({ ...record, journal_status_id: statusId })
  }

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...record, note: e.target.value })
  }

  if (isExcluded) {
    return (
      <Card className="w-full relative bg-gray-100 min-h-[400px]">
        <div className="flex items-start justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-start gap-4">
            <span className="relative flex shrink-0 overflow-hidden rounded-full h-12 w-12 border-2 border-gray-300">
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
            <div className="pt-2">
              <h3 className="text-xl font-bold truncate">{studentName}</h3>
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

        <div className="flex flex-col items-center justify-center px-6 pb-12 pt-8">
          <p className="text-gray-500 text-center">Scores will not be submitted for this student.</p>
        </div>
      </Card>
    )
  }

  const gridCols = scoreCategories.length <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"

  return (
    <Card className={cn("w-full relative", record.isLocked && "bg-gray-50")}>
      <div className="flex items-start justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-start gap-4">
          <span className={cn(
            "relative flex shrink-0 overflow-hidden rounded-full h-12 w-12 border-2",
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
          <div className="pt-2">
            <h3 className={cn("text-xl font-bold truncate", record.isLocked && "text-gray-500")}>
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

      <div className="px-4 sm:px-6 pb-2">
        {isOffshore ? (
          <>
            {/* Offshore: First Row - CREW, CITIZENSHIP */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {scoreCategories
                .filter(({ key }) => key === "crew" || key === "citizenship")
                .map(({ key, label }) => {
                  const isCategoryBlocked = getCategoryDisabledFlag(record, key)
                  return (
                    <ScoreControl
                      key={key}
                      label={label}
                      value={(record as Record<string, number | null | undefined>)[key] ?? null}
                      onChange={(value) => handleScoreChange(key, value)}
                      disabled={record.isLocked}
                      isBlocked={isCategoryBlocked}
                      min={0}
                      max={5}
                    />
                  )
                })}
            </div>
            
            {/* Offshore: Second Row - SERVICE (if applicable) */}
            {isService && (
              <div className="grid grid-cols-2 gap-3">
                {scoreCategories
                  .filter(({ key }) => key === "service_learning")
                  .map(({ key, label }) => {
                    const isCategoryBlocked = getCategoryDisabledFlag(record, key)
                    return (
                      <ScoreControl
                        key={key}
                        label={label}
                        value={(record as Record<string, number | null | undefined>)[key] ?? null}
                        onChange={(value) => handleScoreChange(key, value)}
                        disabled={record.isLocked}
                        isBlocked={isCategoryBlocked}
                        min={0}
                        max={5}
                      />
                    )
                  })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* In Port: First Row - SCHOOL, JOB */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {scoreCategories
                .filter(({ key }) => key === "school" || key === "job")
                .map(({ key, label }) => {
                  const isCategoryBlocked = getCategoryDisabledFlag(record, key)
                  return (
                    <ScoreControl
                      key={key}
                      label={label}
                      value={(record as Record<string, number | null | undefined>)[key] ?? null}
                      onChange={(value) => handleScoreChange(key, value)}
                      disabled={record.isLocked}
                      isBlocked={isCategoryBlocked}
                      min={0}
                      max={5}
                    />
                  )
                })}
            </div>
            
            {/* In Port: Second Row - CITIZENSHIP, SERVICE (if applicable) */}
            <div className="grid grid-cols-2 gap-3">
              {scoreCategories
                .filter(({ key }) => key === "citizenship" || key === "service_learning")
                .map(({ key, label }) => {
                  const isCategoryBlocked = getCategoryDisabledFlag(record, key)
                  return (
                    <ScoreControl
                      key={key}
                      label={label}
                      value={(record as Record<string, number | null | undefined>)[key] ?? null}
                      onChange={(value) => handleScoreChange(key, value)}
                      disabled={record.isLocked}
                      isBlocked={isCategoryBlocked}
                      min={0}
                      max={5}
                    />
                  )
                })}
            </div>
          </>
        )}
      </div>

      <div className="px-4 sm:px-6 pb-4 space-y-3 relative">
        <SingleSelectDropdown
          label="JOURNALING"
          placeholder="Select Status"
          options={journalStatusOptions}
          selectedId={record.journal_status_id ?? null}
          onChange={handleJournalStatusChange}
          disabled={record.isLocked}
        />

        <MultiSelectDropdown
          label="BONUS"
          placeholder="Select Bonus"
          options={bonusOptions}
          selectedIds={record.bonuses?.map((b) => b.id) ?? []}
          onChange={handleBonusChange}
          disabled={record.isLocked}
          variant="bonus"
        />

        <MultiSelectDropdown
          label="PENALTY"
          placeholder="Select Penalty"
          options={penaltyOptions}
          selectedIds={record.penalties?.map((p) => p.id) ?? []}
          onChange={handlePenaltyChange}
          disabled={record.isLocked}
          variant="penalty"
        />

        <div className="w-full">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">NOTE</label>
          <Input
            className="mt-1.5 h-11 w-full rounded-lg border-gray-200 cursor-text"
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
