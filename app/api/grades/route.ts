import { NextRequest, NextResponse } from "next/server"
import { NO_STORE, gradesSchoolYearId, gradesUnavailable, requireStaff, xanoGrades } from "@/lib/xano-grades"

export const dynamic = "force-dynamic"

/** The stored Toddle grades (every grading period of a school year) for the
 *  students on an expedition, for the Grades tab.
 *
 *  Query: school_year — the expedition's school year by name ("2026-2027");
 *         students — comma-separated Toddle ids of the roster.
 *  Only rows for those students come back, with the pull's last_run summary.
 *  Staff only. */
export async function GET(request: NextRequest) {
  const refused = await requireStaff()
  if (refused) return refused

  const q = request.nextUrl.searchParams
  const schoolYear = (q.get("school_year") ?? "").trim()
  const students = new Set(
    (q.get("students") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^\d{1,32}$/.test(s)),
  )
  if (!schoolYear) {
    return NextResponse.json({ message: "school_year is required" }, { status: 400, headers: NO_STORE })
  }
  if (students.size === 0) {
    return NextResponse.json({ grades: [], last_run: null }, { headers: NO_STORE })
  }

  try {
    const schoolyearsId = await gradesSchoolYearId(schoolYear)
    if (schoolyearsId == null) {
      return NextResponse.json({ grades: [], last_run: null, unknown_year: schoolYear }, { headers: NO_STORE })
    }
    const res = await xanoGrades(`term_grades?schoolyears_id=${schoolyearsId}`)
    if (!res.ok) {
      const text = await res.text()
      console.error("term_grades failed:", res.status, text.slice(0, 500))
      return NextResponse.json({ message: "Grades are unavailable right now" }, { status: 502, headers: NO_STORE })
    }
    const data = await res.json()
    const grades = (Array.isArray(data?.grades) ? data.grades : []).filter((r: any) =>
      students.has(String(r?.student_toddle_id ?? "")),
    )
    return NextResponse.json({ grades, last_run: data?.last_run ?? null }, { headers: NO_STORE })
  } catch (error) {
    return gradesUnavailable(error)
  }
}
