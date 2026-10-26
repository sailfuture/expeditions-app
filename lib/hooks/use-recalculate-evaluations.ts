"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { mutate } from "swr"
import { refreshExpeditionEvaluations } from "@/lib/xano"

export type RecalculationStatus = "idle" | "running" | "done" | "error"

export interface RecalculationState {
  status: RecalculationStatus
  /** Students whose scores were recalculated in the last run. */
  count: number
  /** Students whose recalculation failed in the last run (0 or all: it is one call). */
  failed: number
  updatedAt: Date | null
}

/** Skip the automatic refresh when one succeeded this recently for the same expedition. */
const FRESH_FOR_MS = 10 * 60 * 1000
const storageKey = (expeditionId: number) => `evaluations_refreshed_${expeditionId}`

function lastRefresh(expeditionId: number): number | null {
  try {
    const raw = window.localStorage.getItem(storageKey(expeditionId))
    const value = raw ? Number(raw) : NaN
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

function rememberRefresh(expeditionId: number) {
  try {
    window.localStorage.setItem(storageKey(expeditionId), String(Date.now()))
  } catch {
    // Private mode or blocked storage: the next load simply refreshes again.
  }
}

/**
 * Keeps an expedition's student evaluations current. On page load it makes one
 * call (expedition_evaluations_refresh) that recalculates every active student
 * and writes only those whose numbers changed, unless that already happened
 * for this expedition in the last 10 minutes. Then it refreshes the
 * `evaluation_by_student_*` SWR entries the evaluations table reads.
 *
 * Returns the run state and a `rerun` for the manual "Update Scores" button,
 * which always calls Xano.
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
    try {
      const result = await refreshExpeditionEvaluations(id)
      rememberRefresh(id)
      // Refresh the table rows so any updated numbers show.
      await Promise.all(active.map((s: any) => mutate(`evaluation_by_student_${s.id}_${id}`)))
      setState({ status: "done", count: result.students, failed: 0, updatedAt: new Date() })
    } catch (error) {
      console.error("Evaluation refresh failed", error)
      setState({ status: "error", count: 0, failed: active.length, updatedAt: null })
    }
  }, [])

  useEffect(() => {
    if (!expeditionId || !students) return
    if (ranForRef.current === expeditionId) return
    ranForRef.current = expeditionId

    const last = lastRefresh(expeditionId)
    if (last && Date.now() - last < FRESH_FOR_MS) {
      // Recently refreshed: show when, and let the button force another run.
      setState({ status: "done", count: students.filter((s: any) => !s.isArchived).length, failed: 0, updatedAt: new Date(last) })
      return
    }
    void run(expeditionId, students)
  }, [expeditionId, students, run])

  const rerun = useCallback(() => {
    if (!expeditionId || !students || state.status === "running") return
    void run(expeditionId, students)
  }, [expeditionId, students, state.status, run])

  return { ...state, rerun }
}
