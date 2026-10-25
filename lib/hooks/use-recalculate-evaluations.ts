"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { mutate } from "swr"
import { calculateStudentEvaluation } from "@/lib/xano"

export type RecalculationStatus = "idle" | "running" | "done" | "error"

export interface RecalculationState {
  status: RecalculationStatus
  /** Students whose scores were recalculated in the last run. */
  count: number
  /** Students whose recalculation failed in the last run. */
  failed: number
  updatedAt: Date | null
}

/**
 * Recalculates every active student's evaluation scores for an expedition
 * once per page load (guarded per expedition id, so SWR revalidations and
 * React strict-mode re-runs do not trigger it again), then refreshes the
 * `evaluation_by_student_*` SWR entries the evaluations table reads.
 *
 * Returns the run state and a `rerun` for a manual refresh button.
 */
export function useRecalculateEvaluations(expeditionId: number | null | undefined, students: any[] | null | undefined) {
  const ranForRef = useRef<number | null>(null)
  const [state, setState] = useState<RecalculationState>({ status: "idle", count: 0, failed: 0, updatedAt: null })

  const run = useCallback(async (id: number, list: any[]) => {
    const active = list.filter((s: any) => !s.isArchived)
    if (active.length === 0) {
      setState({ status: "done", count: 0, failed: 0, updatedAt: new Date() })
      return
    }
    setState((prev) => ({ ...prev, status: "running" }))
    const results = await Promise.allSettled(active.map((s: any) => calculateStudentEvaluation(s.id, id)))
    const failed = results.filter((r) => r.status === "rejected").length
    if (failed > 0) console.error("Some evaluation recalculations failed", results)
    // Refresh the table rows regardless; even partially updated scores should show.
    await Promise.all(active.map((s: any) => mutate(`evaluation_by_student_${s.id}_${id}`)))
    setState({
      status: failed === active.length ? "error" : "done",
      count: active.length - failed,
      failed,
      updatedAt: new Date(),
    })
  }, [])

  useEffect(() => {
    if (!expeditionId || !students) return
    if (ranForRef.current === expeditionId) return
    ranForRef.current = expeditionId
    void run(expeditionId, students)
  }, [expeditionId, students, run])

  const rerun = useCallback(() => {
    if (!expeditionId || !students || state.status === "running") return
    void run(expeditionId, students)
  }, [expeditionId, students, state.status, run])

  return { ...state, rerun }
}
