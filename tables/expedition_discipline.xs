table expedition_discipline {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    int expeditions_id? {
      table = "expeditions"
    }
  
    int students_id? {
      table = "students"
    }
  
    date? date?
    bool isReferral?
    text reason? filters=trim
    text summary_of_incident? filters=trim
    text consequence? filters=trim

    // How many days the consequence lasts (e.g. shore leave revoked for 3 days).
    int? consequence_days?
    int expedition_staff_id? {
      table = "expedition_staff"
    }
  
    text action_taken? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]

  guid = "0eeQ0nCgYBVv2LCZzKOyIiL91Lc"
}