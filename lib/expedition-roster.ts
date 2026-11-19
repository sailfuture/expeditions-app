// Who counts as a student on an expedition.
//
// A student is archived on an expedition when their own isArchived flag is set
// (the Students page) or their assignment on that expedition is switched off
// (the Active switch on the expedition's Assignments, Participants and Manifest
// screens). Xano works the second half out and sends it as
// `archived_on_expedition` on every row of /students_by_expedition
// (function expedition_student_roster).
//
// An archived student is left out of everything about that expedition: scores,
// evaluations, awards, reviews, grades, teams, departments and pickers. Only the
// roster screens, where staff archive and restore people, still list them.

export function isArchivedOnExpedition(student: any): boolean {
  return student?.isArchived === true || student?.archived_on_expedition === true
}

/** The ids of the archived students in an expedition's roster (as /students_by_expedition returns it). */
export function archivedStudentIds(roster: any[] | null | undefined): Set<number> {
  const ids = new Set<number>()
  for (const s of roster ?? []) {
    if (isArchivedOnExpedition(s)) ids.add(Number(s.id))
  }
  return ids
}

/**
 * Whether an expedition assignment row belongs to an archived student: the row
 * itself is switched off, or the student is archived everywhere.
 */
export function isArchivedStudentAssignment(assignment: any): boolean {
  return assignment?.isArchived === true || assignment?._students?.isArchived === true
}
