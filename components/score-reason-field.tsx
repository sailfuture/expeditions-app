"use client"

import { AnimatePresence, motion } from "motion/react"
import { MultiSelectDropdown } from "./multi-select-dropdown"
import type { ExpeditionBonus, ExpeditionPenalty } from "@/lib/types"
import { optionsForCategory, reasonTypeForScore, toReason, type ExpeditionReason, type ScoreKey } from "@/lib/evaluation-reasons"

interface ScoreReasonFieldProps {
  /** Which score this explains; the picker only offers reasons tagged for it. */
  category: ScoreKey
  /** The category's current score; null displays as 3 and needs no reason. */
  score: number | null
  /** Category blocked (N/A) for the day: never shows reasons. */
  blocked?: boolean
  bonusOptions: ExpeditionBonus[]
  penaltyOptions: ExpeditionPenalty[]
  value: ExpeditionReason[]
  onChange: (reasons: ExpeditionReason[]) => void
  disabled?: boolean
}

const REVEAL = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit: { height: 0, opacity: 0 },
}

// One multi-select reason picker per score category. Hidden at exactly 3;
// animates in with penalty reasons when the score drops below 3 and with bonus
// reasons when it rises above 3. The parent clears reasons whenever the score
// crosses back through 3, so the field only ever shows matching ones.
export function ScoreReasonField({
  category,
  score,
  blocked = false,
  bonusOptions,
  penaltyOptions,
  value,
  onChange,
  disabled = false,
}: ScoreReasonFieldProps) {
  const type = blocked ? null : reasonTypeForScore(score)
  const selectedIds = type ? value.filter((r) => r.type === type).map((r) => r.id) : []
  const allOptions = type === "bonus" ? bonusOptions : type === "penalty" ? penaltyOptions : []
  const options = optionsForCategory(allOptions, category, selectedIds)

  return (
    <AnimatePresence initial={false} mode="wait">
      {type && (
        <motion.div
          key={type}
          variants={REVEAL}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="pt-3">
            <MultiSelectDropdown
              label={type === "penalty" ? "Why below 3?" : "Why above 3?"}
              placeholder={type === "penalty" ? "Select penalty reasons" : "Select bonus reasons"}
              options={options}
              selectedIds={selectedIds}
              onChange={(ids) => {
                const chosen = options.filter((o) => ids.includes(o.id)).map((o) => toReason(o, type))
                onChange(chosen)
              }}
              disabled={disabled}
              variant={type}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
