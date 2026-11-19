// Makes sure every active student on the expedition has a score row for the
// day. Archived students (expedition_student_roster) do not get one.
query add_students_to_professionalism verb=GET {
  api_group = "Expedition App"

  input {
    date? date?
    int expeditions_id? {
      table = "expeditions"
    }
  }

  stack {
    function.run expedition_app_guard as $app_guard
    db.query expedition_schedule {
      where = $db.expedition_schedule.date == $input.date && $db.expedition_schedule.expeditions_id == $input.expeditions_id
      return = {type: "list"}
    } as $expedition_schedule2

    var $expedition_schedule_id {
      value = $expedition_schedule2.id
    }

    db.query students {
      where = `$input.expeditions_id` in $db.students.expeditions_id && $db.students.isArchived == false
      return = {type: "list"}
    } as $roster_students

    function.run expedition_student_roster {
      input = {expeditions_id: $input.expeditions_id}
    } as $roster

    api.lambda {
      code = """
          const archived = new Set((($var.roster || {}).archived_ids || []).map(Number));
          return ($var.roster_students || []).filter((s) => !archived.has(Number(s.id)));
        """
      timeout = 10
    } as $students1

    foreach ($students1) {
      each as $item {
        db.query expeditions_professionalism {
          where = $db.expeditions_professionalism.date == $input.date && $db.expeditions_professionalism.students_id == $item.id
          return = {type: "list"}
        } as $expeditions_professionalism2

        conditional {
          if ($expeditions_professionalism2 == null) {
            db.add expeditions_professionalism {
              enforce_hidden_fields = false
              data = {
                created_at            : "now"
                expedition_schedule_id: $expedition_schedule_id[0]
                expeditions_id        : $input.expeditions_id
                students_id           : $item.id
                date                  : $input.date
                academics             : null
                isAcademicsUsed       : false
                citizenship           : null
                isCitizenshipUsed     : false
                job                   : null
                isJobUsed             : false
                crew                  : null
                isCrewUsed            : false
                service               : null
                isServiceUsed         : false
                journaling            : ""
                isFlagged             : false
                isLocked              : false
                bonus                 : {}
                penalty               : {}
              }
            } as $expeditions_professionalism1
          }
        }
      }
    }
  }

  response = $students1
  guid = "mW6S5T8FnG-UioqTe9JHEwMto_g"
}
