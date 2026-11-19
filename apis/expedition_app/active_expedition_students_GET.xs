// The students on board the active expedition (the public passage log's crew
// picker). Archived students are left out: their own isArchived flag, or an
// archived assignment row on the active expedition.
query active_expedition_students verb=GET {
  api_group = "Expedition App"

  input {
  }

  stack {
    function.run expedition_app_guard as $app_guard
    db.query expeditions {
      where = $db.expeditions.isActive == true
      return = {type: "list"}
    } as $expeditions1

    var $current_expedition {
      value = $expeditions1
    }

    db.query students {
      where = $db.students.expeditions_id contains $current_expedition.id
      return = {type: "list"}
    } as $students1

    db.query expedition_student_assignments {
      where = $db.expedition_student_assignments.isArchived == true
      return = {type: "list"}
      output = ["students_id", "expeditions_id"]
    } as $archived_assignments

    api.lambda {
      code = """
          const activeExpeditions = new Set(($var.expeditions1 || []).map((e) => Number(e.id)));
          const gone = new Set(
            ($var.archived_assignments || [])
              .filter((a) => activeExpeditions.has(Number(a.expeditions_id)))
              .map((a) => Number(a.students_id))
          );
          return ($var.students1 || []).filter((s) => s.isArchived !== true && !gone.has(Number(s.id)));
        """
      timeout = 10
    } as $on_board
  }

  response = $on_board
  guid = "0uP0FKIf61OueQ8vb3OJXZnn9XI"
}
