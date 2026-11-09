/** Addresses of pages in Toddle's own web app, for "open in Toddle" links.
 *  The same helper the professionalism dashboard uses (lib/toddle-links.ts
 *  there); keep the two in step. */

/** Toddle's id for the school's programme: the first id in a class's address. */
const TODDLE_CURRICULUM_ID = "175768895871796763"

/** A class's classroom page in Toddle, the one that lists its assignments.
 *  Toddle's address for it is made of the programme, the course the class
 *  belongs to ("learning-course" in the address, teacherCourseId in the API,
 *  teacher_course_id on a grade row) and the class section (courseIds[0] in
 *  the API, course_toddle_id on a grade row). Null when either id is missing,
 *  so no link is drawn rather than one to a page that is not there. Staff
 *  must be signed in to Toddle. */
export function toddleClassUrl(
  teacherCourseId: string | null | undefined,
  classId: string | null | undefined,
): string | null {
  if (!teacherCourseId || !classId) return null
  return (
    `https://web.toddleapp.com/platform/${TODDLE_CURRICULUM_ID}` +
    `/learning-course/${encodeURIComponent(teacherCourseId)}/class/${encodeURIComponent(classId)}/classroom`
  )
}
