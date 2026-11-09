/** Server-side access to the Toddle term grades, which live in the
 *  professionalism dashboard's Xano group (api:fJsHVIeC on the same instance),
 *  not in the Expedition App group. Its term_grades and term_grades_pull
 *  endpoints answer only to a service key (Xano's grades_guard compares the
 *  Bearer token with the workspace env var GRADES_API_KEY). The key lives in
 *  XANO_GRADES_KEY on this server, so browsers reach grades through
 *  /api/grades, which checks the staff session, and never talk to that group
 *  directly. Import this only from route handlers. */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export const XANO_GRADES_BASE = "https://xsc3-mvx7-r86m.n7e.xano.io/api:fJsHVIeC"

export async function xanoGrades(path: string, init: RequestInit = {}): Promise<Response> {
  const key = process.env.XANO_GRADES_KEY
  if (!key) console.error("XANO_GRADES_KEY is not set; Xano will refuse the grades request")
  return fetch(`${XANO_GRADES_BASE}/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    cache: "no-store",
  })
}

/** Grades are education records: never let a shared cache hold them. */
export const NO_STORE = { "Content-Type": "application/json", "Cache-Control": "private, no-store, max-age=0, must-revalidate" }

/** The signed-in staff member's session, or a 401 to return. */
export async function requireStaff(): Promise<NextResponse | null> {
  const session = await auth()
  if (session?.user?.staffId) return null
  return NextResponse.json({ message: "Sign in to continue." }, { status: 401, headers: NO_STORE })
}

export function gradesUnavailable(error: unknown): NextResponse {
  console.error("Grades upstream failed:", error)
  return NextResponse.json({ message: "Grades are unavailable right now" }, { status: 502, headers: NO_STORE })
}

/** The dashboard group's schoolyears row id for a school year named like the
 *  Expedition App's ("2026-2027"). The two groups keep separate schoolyears
 *  tables, so they are joined by name, never by id. */
export async function gradesSchoolYearId(schoolYear: string): Promise<number | null> {
  const res = await fetch(`${XANO_GRADES_BASE}/schoolyears`, { cache: "no-store" })
  if (!res.ok) throw new Error(`schoolyears failed (${res.status})`)
  const years: any[] = await res.json()
  const wanted = schoolYear.trim().replace(/\s+/g, "")
  const match = years.find((y) => String(y?.year ?? "").replace(/\s+/g, "") === wanted)
  const id = Number(match?.id)
  return Number.isInteger(id) && id > 0 ? id : null
}
