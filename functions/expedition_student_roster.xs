// Who counts as a student on an expedition. A student is on the roster when
// their expeditions_id list holds the expedition, and is archived there when
// their own isArchived flag is set (the Students page) or their assignment row
// on this expedition is archived (the Active switch on the expedition's
// Assignments, Participants and Manifest screens). Archived students are left
// out of scores, evaluations, review periods, teams and schedules; this is
// the one place that rule is written, the same one expedition_participant_counts
// uses for the roster count.
function expedition_student_roster {
  input {
    int expeditions_id? {
      table = "expeditions"
    }
  }

  stack {
    db.query students {
      where = `$input.expeditions_id` in $db.students.expeditions_id
      return = {type: "list"}
      output = ["id", "isArchived"]
    } as $students

    db.query expedition_student_assignments {
      where = $db.expedition_student_assignments.expeditions_id == $input.expeditions_id && $db.expedition_student_assignments.isArchived == true
      return = {type: "list"}
      output = ["students_id"]
    } as $archived_assignments

    api.lambda {
      code = """
          const gone = new Set(
            ($var.archived_assignments || []).map((a) => Number(a.students_id)).filter((n) => n > 0)
          );
          const active = [];
          const archived_ids = [];
          ($var.students || []).forEach((s) => {
            if (s.isArchived === true || gone.has(Number(s.id))) archived_ids.push(s.id);
            else active.push({ id: s.id });
          });
          return { active, archived_ids };
        """
      timeout = 10
    } as $roster
  }

  response = $roster
  guid = "iX9QyaGNfwt1Q1ch2UAwQfq6fh4"
}
