// Adds roster counts to a list of expedition rows: number_students,
// number_staff and number_participants (their sum). Nothing is stored; the
// expeditions GET endpoints call this so the staff app never has to type the
// number in by hand. Someone counts when their expeditions_id list holds the
// expedition and they are not archived (students) / inactive (staff) and have
// no archived assignment row on that expedition, which is the same rule the
// expedition page's Participants table uses for its Status badge.
function expedition_participant_counts {
  input {
    json expeditions
  }

  stack {
    // Whole tables with a few columns each: a few hundred small rows, and
    // null flags are easier to treat as "active" here than in a where clause.
    db.query students {
      return = {type: "list"}
      output = ["id", "expeditions_id", "isArchived"]
    } as $students

    db.query expedition_staff {
      return = {type: "list"}
      output = ["id", "expeditions_id", "isActive"]
    } as $staff

    db.query expedition_student_assignments {
      where = $db.expedition_student_assignments.isArchived == true
      return = {type: "list"}
      output = ["students_id", "expedition_staff_id", "expeditions_id"]
    } as $archived_assignments

    api.lambda {
      code = """
          const students = $var.students || [];
          const staff = $var.staff || [];
          const archived = $var.archived_assignments || [];
          // expeditions_id comes back as a list of ids, or of {id} objects when
          // the row was fetched with an addon; a bare id is an old single value.
          const ids = (v) => (Array.isArray(v) ? v : v ? [v] : [])
            .map((e) => (e && typeof e === 'object' ? e.id : e))
            .map(Number)
            .filter((n) => Number.isFinite(n) && n > 0);

          return ($input.expeditions || []).map((exp) => {
            const id = Number(exp.id);
            const here = archived.filter((a) => Number(a.expeditions_id) === id);
            const archivedStudents = new Set(here.filter((a) => a.students_id).map((a) => Number(a.students_id)));
            const archivedStaff = new Set(here.filter((a) => a.expedition_staff_id).map((a) => Number(a.expedition_staff_id)));
            const number_students = students.filter((s) =>
              s.isArchived !== true && ids(s.expeditions_id).includes(id) && !archivedStudents.has(Number(s.id))
            ).length;
            const number_staff = staff.filter((t) =>
              t.isActive !== false && ids(t.expeditions_id).includes(id) && !archivedStaff.has(Number(t.id))
            ).length;
            return Object.assign({}, exp, {
              number_students,
              number_staff,
              number_participants: number_students + number_staff,
            });
          });
        """
      timeout = 10
    } as $with_counts
  }

  response = $with_counts
  guid = "PoZtdCjdjs6rJg3K96fyxbfDjxI"
}
