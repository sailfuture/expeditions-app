table expeditions_professionalism {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    int expedition_schedule_id? {
      table = "expedition_schedule"
    }
  
    int expeditions_id? {
      table = "expeditions"
    }
  
    int students_id? {
      table = "students"
    }
  
    date? date?
    int? academics?
    bool isAcademicsUsed?
    int? citizenship?
    bool isCitizenshipUsed?
    int? job?
    bool isJobUsed?
    int? crew?
    bool isCrewUsed?
    int? service?
    bool isServiceUsed?
    text? journaling? filters=trim
    bool isFlagged?
    bool isLocked?
    int? fitness?
    json[] bonus?
    json[] penalty?

    // Reasons chosen for each category scored above 3 (bonuses) or below 3
    // (penalties): a list of {type: "bonus"|"penalty", id, name, value}. Empty at 3.
    json[] academics_reason?
    json[] citizenship_reason?
    json[] job_reason?
    json[] crew_reason?
    json[] service_reason?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]

  tags = ["expeditions"]
  guid = "w49vBaXO6_xlOnE4R3ZEI3qlop0"
}