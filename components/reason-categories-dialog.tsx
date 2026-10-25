"use client"

import { useState } from "react"
import { mutate } from "swr"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { REASON_CATEGORIES } from "@/lib/evaluation-reasons"
import { updateExpeditionBonusCategories, updateExpeditionPenaltyCategories } from "@/lib/xano"
import type { ExpeditionBonus, ExpeditionPenalty, ReasonCategory } from "@/lib/types"

type Kind = "bonus" | "penalty"

const SWR_KEY: Record<Kind, string> = { bonus: "expedition_bonus", penalty: "expedition_penalty" }

function currentTags(option: { categories?: ReasonCategory[] | null }): ReasonCategory[] {
  // Untagged means "every category", so show every box ticked.
  return option.categories && option.categories.length > 0 ? option.categories : REASON_CATEGORIES.map((c) => c.value)
}

function ReasonRows({
  kind,
  options,
  savingKey,
  onToggle,
}: {
  kind: Kind
  options: Array<ExpeditionBonus | ExpeditionPenalty>
  savingKey: string | null
  onToggle: (kind: Kind, option: ExpeditionBonus | ExpeditionPenalty, category: ReasonCategory) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-600">
            <th className="px-3 py-2 text-left">{kind === "bonus" ? "Above 3 (bonus)" : "Below 3 (penalty)"}</th>
            {REASON_CATEGORIES.map((c) => (
              <th key={c.value} className="px-2 py-2 text-center">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {options.map((option) => {
            const tags = currentTags(option)
            return (
              <tr key={option.id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <span className="font-medium text-gray-900">{option.name}</span>
                  <span className={cn("ml-2 text-xs tabular-nums", kind === "bonus" ? "text-green-700" : "text-red-600")}>
                    {option.value > 0 ? `+${option.value}` : option.value}
                  </span>
                </td>
                {REASON_CATEGORIES.map((c) => {
                  const checked = tags.includes(c.value)
                  const busy = savingKey === `${kind}-${option.id}`
                  return (
                    <td key={c.value} className="px-2 py-2 text-center">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        aria-label={`${option.name}: ${c.label}`}
                        disabled={busy}
                        onClick={() => onToggle(kind, option, c.value)}
                        className={cn(
                          "inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border text-xs transition-colors",
                          "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-400",
                          checked ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-transparent hover:border-gray-400",
                          busy && "opacity-50"
                        )}
                      >
                        ✓
                      </button>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Edit which score categories each bonus and penalty reason is offered for.
 * Each tick saves straight away; a reason must keep at least one category.
 */
export function ReasonCategoriesDialog({
  open,
  onOpenChange,
  bonusOptions,
  penaltyOptions,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bonusOptions: ExpeditionBonus[]
  penaltyOptions: ExpeditionPenalty[]
}) {
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const toggle = async (kind: Kind, option: ExpeditionBonus | ExpeditionPenalty, category: ReasonCategory) => {
    const tags = currentTags(option)
    const next = tags.includes(category) ? tags.filter((t) => t !== category) : [...tags, category]
    if (next.length === 0) {
      toast.error(`${option.name} needs at least one category`)
      return
    }
    // Keep the category order stable for display.
    const ordered = REASON_CATEGORIES.map((c) => c.value).filter((v) => next.includes(v))
    const key = SWR_KEY[kind]
    setSavingKey(`${kind}-${option.id}`)
    // Optimistic update so the tick moves immediately.
    await mutate(
      key,
      (list: Array<ExpeditionBonus | ExpeditionPenalty> | undefined) =>
        list?.map((o) => (o.id === option.id ? { ...o, categories: ordered } : o)),
      { revalidate: false }
    )
    try {
      if (kind === "bonus") await updateExpeditionBonusCategories(option.id, ordered)
      else await updateExpeditionPenaltyCategories(option.id, ordered)
    } catch (error) {
      toast.error(`Could not save ${option.name}: ${error instanceof Error ? error.message : "unknown error"}`)
    } finally {
      await mutate(key)
      setSavingKey(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Reason categories</DialogTitle>
          <DialogDescription>
            Tick the score categories each reason can explain. A category&apos;s picker only offers its ticked reasons.
            Changes save as you click.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ReasonRows kind="bonus" options={bonusOptions} savingKey={savingKey} onToggle={toggle} />
          <ReasonRows kind="penalty" options={penaltyOptions} savingKey={savingKey} onToggle={toggle} />
        </div>
        {savingKey && (
          <p className="flex items-center gap-2 text-xs text-gray-500"><Spinner size="sm" /> Saving…</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
