import { NextResponse } from "next/server"
import { NO_STORE, gradesUnavailable, requireStaff, xanoGrades } from "@/lib/xano-grades"

export const dynamic = "force-dynamic"

/** Runs the grades-only Toddle pull now (Xano throttles it to once a minute
 *  and answers with skipped: true when it was checked more recently). The
 *  pull covers the whole school, so the result is shared with the dashboard.
 *  Staff only. */
export async function POST() {
  const refused = await requireStaff()
  if (refused) return refused
  try {
    const res = await xanoGrades("term_grades_pull", { method: "POST", body: "{}" })
    return new NextResponse(await res.text(), { status: res.status, headers: NO_STORE })
  } catch (error) {
    return gradesUnavailable(error)
  }
}
