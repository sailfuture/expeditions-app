table expedition_student_evaluations {
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
  
    decimal total?
    text total_evaluation? filters=trim
    text crew_evaluation? filters=trim
    text service_evaluation? filters=trim
    text job_evaluation? filters=trim
    text academics_evaluation? filters=trim
    text citizenship_evaluation? filters=trim
    decimal crew?
    decimal service?
    decimal job?
    decimal academics?
    decimal citizenship?
    decimal? journal?
    text journal_evaluation? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {
      type : "btree|unique"
      field: [
        {name: "expeditions_id", op: "asc"}
        {name: "students_id", op: "asc"}
      ]
    }
  ]

  tags = ["expeditions"]
  guid = "5XtBMuHv35p0ZxM09TaoA2AtPhA"
}