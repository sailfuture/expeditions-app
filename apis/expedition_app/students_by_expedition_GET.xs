// Every student on an expedition's roster, archived ones included (the roster
// screens list them). Each row says whether the student is archived on this
// expedition (archived_on_expedition, the rule in expedition_student_roster),
// so the app can leave them out of everything else.
query students_by_expedition verb=GET {
  api_group = "Expedition App"

  input {
    int expeditions_id? {
      table = "expeditions"
    }
  }

  stack {
    function.run expedition_app_guard as $app_guard
    db.query students {
      where = $db.students.expeditions_id contains [$input.expeditions_id]
      return = {type: "list"}
    } as $students

    function.run expedition_student_roster {
      input = {expeditions_id: $input.expeditions_id}
    } as $roster

    api.lambda {
      code = """
          const archived = new Set((($var.roster || {}).archived_ids || []).map(Number));
          return ($var.students || []).map((s) =>
            Object.assign({}, s, { archived_on_expedition: archived.has(Number(s.id)) })
          );
        """
      timeout = 10
    } as $with_status
  }

  response = $with_status
  guid = "JsTUGxvmiEVpnTh2un6SLfdAr5g"
}
