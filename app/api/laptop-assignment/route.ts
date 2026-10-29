import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { XANO_DIRECT_URL, xanoKeyHeaders } from "@/lib/xano-config"
import {
  chromebookSetupProblem,
  chromebookSignInStatus,
  clearChromebookSignIn,
  googleErrorMessage,
  lockChromebookToStudent,
} from "@/lib/google-chromebooks"

// Gives a student a laptop (or takes it back) from the Assignments tab: saves the assignment in
// Xano, then sets the sign-in restriction on the laptop's own OU in Google Admin to that student
// (lib/google-chromebooks.ts).
// The assignment is saved even when Google fails; the reply says what happened on each side.

export const dynamic = "force-dynamic"

type GoogleResult = { status: "ok" | "skipped" | "error"; message: string }

async function xano<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${XANO_DIRECT_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", accept: "application/json", ...xanoKeyHeaders() },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Xano ${path}: ${res.status} ${await res.text().catch(() => "")}`.trim())
  return res.json() as Promise<T>
}

/** Read-only: every laptop's OU in Google Admin and the sign-in setting it has now. */
export async function GET() {
  const session = await auth()
  if (!session?.user?.staffId) return NextResponse.json({ message: "Sign in to continue." }, { status: 401 })
  const problem = chromebookSetupProblem()
  if (problem) return NextResponse.json({ message: problem }, { status: 503 })
  try {
    const laptops = await xano<{ laptop_number?: string }[]>("/expedition_laptops")
    const labels = laptops.map((l) => (l.laptop_number ?? "").trim()).filter(Boolean).sort()
    return NextResponse.json(await chromebookSignInStatus(labels), { headers: { "cache-control": "no-store" } })
  } catch (error) {
    return NextResponse.json({ message: `Google Admin: ${googleErrorMessage(error)}` }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.staffId) return NextResponse.json({ message: "Sign in to continue." }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { assignmentId?: number; laptop?: string | null }
  const assignmentId = Number(body.assignmentId)
  const next = (body.laptop ?? "").trim()
  if (!assignmentId) return NextResponse.json({ message: "assignmentId is required" }, { status: 400 })

  let previous = ""
  let studentsId = 0
  try {
    const assignment = await xano<{ laptop?: string | null; students_id?: number }>(`/expedition_student_assignments/${assignmentId}`)
    previous = (assignment.laptop ?? "").trim()
    studentsId = assignment.students_id ?? 0
    await xano(`/expedition_student_assignments/${assignmentId}`, {
      method: "PATCH",
      body: JSON.stringify({ expedition_student_assignments_id: assignmentId, laptop: next || null }),
    })
  } catch (error) {
    console.error("[laptop-assignment] saving the assignment failed:", error)
    return NextResponse.json({ message: "Couldn't save the laptop assignment" }, { status: 502 })
  }

  const google = await applyToGoogle(previous, next, studentsId)
  if (google.status === "error") console.error(`[laptop-assignment] assignment ${assignmentId}: ${google.message}`)
  return NextResponse.json({ laptop: next, google })
}

async function applyToGoogle(previous: string, next: string, studentsId: number): Promise<GoogleResult> {
  if (previous === next) return { status: "ok", message: "No change" }
  const problem = chromebookSetupProblem()
  if (problem) return { status: "skipped", message: `${problem}, so Chromebook sign-in wasn't changed` }
  if (!studentsId) return { status: "skipped", message: "Not a student, so Chromebook sign-in wasn't changed" }

  try {
    const student = await xano<{ studentEmail?: string; firstName?: string; lastName?: string }>(`/students/${studentsId}`)
    const email = (student.studentEmail ?? "").trim()
    const studentName = `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim()
    if (!email) return { status: "error", message: `${studentName || "This student"} has no email, so Chromebook sign-in wasn't changed` }

    const done: string[] = []
    if (next) {
      const locked = await lockChromebookToStudent({ laptop: next, studentEmail: email })
      done.push(`${next} now only lets ${locked.allowlist[0]} sign in`)
    }
    if (previous) {
      const cleared = await clearChromebookSignIn({ laptop: previous, studentEmail: email })
      if (cleared.cleared) done.push(`${previous}'s sign-in restriction was cleared`)
      else done.push(`${previous} was left as it is (its sign-in list no longer names ${studentName || email})`)
    }
    return { status: "ok", message: done.join("; ") }
  } catch (error) {
    return { status: "error", message: `Google Admin: ${googleErrorMessage(error)}` }
  }
}
