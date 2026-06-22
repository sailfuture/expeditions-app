#!/usr/bin/env node
// One-time backfill: create missing expedition_student_assignments rows.
//
// Background: students can be linked to expeditions two ways that must stay in
// sync — (1) the `expeditions_id` array on the student record, and (2) a row in
// the `expedition_student_assignments` join table. The expedition "Assignment"
// tab reads ONLY from the join table. A bug in the manual "Add Student" flow set
// the student's `expeditions_id` array but never created the join row, so those
// students never appeared in the Assignment tab. The flow is fixed going
// forward; this script repairs the records created while it was broken.
//
// What it does: for every student, for every expedition in their `expeditions_id`
// array, it ensures a matching (students_id, expeditions_id) row exists in
// expedition_student_assignments and creates any that are missing.
//
// Usage (from repo root):
//   node scripts/backfill-student-assignments.mjs            # dry run (default) — prints what WOULD be created
//   node scripts/backfill-student-assignments.mjs --apply    # actually create the missing rows
//
// The Xano API used here is unauthenticated (same as the app's lib/xano.ts).

const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y"

const APPLY = process.argv.includes("--apply")

async function xanoFetch(endpoint, options) {
  const res = await fetch(`${XANO_BASE_URL}${endpoint}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Xano ${res.status} on ${endpoint}: ${text.slice(0, 500)}`)
  }
  return res.json()
}

// A student's expeditions_id can come back as an array of ids or an array of
// full expedition objects (Xano populated relationship). Normalize to ids.
function expeditionIdsFor(student) {
  const raw = student?.expeditions_id
  if (!Array.isArray(raw)) return []
  return raw
    .map((e) => (e && typeof e === "object" ? e.id : e))
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY (will create rows)" : "DRY RUN (no changes)"}\n`)

  const [students, assignments] = await Promise.all([
    xanoFetch("/students"),
    xanoFetch("/expedition_student_assignments"),
  ])

  console.log(`Fetched ${students.length} students and ${assignments.length} assignment rows.\n`)

  // Existing student<->expedition pairs already present in the join table.
  const existing = new Set()
  for (const a of assignments) {
    const sid = Number(a.students_id)
    const eid = Number(a.expeditions_id)
    if (sid > 0 && eid > 0) existing.add(`${sid}:${eid}`)
  }

  // Determine the missing pairs.
  const missing = []
  for (const s of students) {
    const sid = Number(s.id)
    if (!(sid > 0)) continue
    for (const eid of expeditionIdsFor(s)) {
      const key = `${sid}:${eid}`
      if (!existing.has(key)) {
        missing.push({ studentId: sid, expeditionId: eid, name: `${s.firstName || ""} ${s.lastName || ""}`.trim() })
        // Guard against duplicate expedition ids on a single student.
        existing.add(key)
      }
    }
  }

  if (missing.length === 0) {
    console.log("Nothing to backfill — every student/expedition link already has a join row. ✅")
    return
  }

  console.log(`Found ${missing.length} missing assignment row(s):`)
  for (const m of missing) {
    console.log(`  - student #${m.studentId} (${m.name || "unknown"}) -> expedition #${m.expeditionId}`)
  }
  console.log("")

  if (!APPLY) {
    console.log("Dry run complete. Re-run with --apply to create these rows.")
    return
  }

  let created = 0
  const failures = []
  for (const m of missing) {
    try {
      await xanoFetch("/expedition_student_assignments", {
        method: "POST",
        body: JSON.stringify({
          expedition_staff_id: 0,
          students_id: m.studentId,
          expeditions_id: m.expeditionId,
          department: "",
          dish_day: "",
          laptop: "",
          bunk: "",
        }),
      })
      created++
      console.log(`  ✅ created: student #${m.studentId} -> expedition #${m.expeditionId}`)
    } catch (err) {
      failures.push({ ...m, error: String(err?.message || err) })
      console.error(`  ❌ failed:  student #${m.studentId} -> expedition #${m.expeditionId}: ${err?.message || err}`)
    }
  }

  console.log(`\nDone. Created ${created}/${missing.length} row(s).`)
  if (failures.length) {
    console.log(`${failures.length} failure(s) — review the errors above and re-run (already-created rows are skipped).`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err?.message || err)
  process.exitCode = 1
})
