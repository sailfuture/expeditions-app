// Query all expeditions_professionalism records
query expeditions_professionalism_by_student verb=GET {
  api_group = "Expedition App"

  input {
    int students_id? {
      table = "students"
    }
  
    int expeditions_id? {
      table = "expeditions"
    }
  }

  stack {
    db.query expeditions_professionalism {
      where = $db.expeditions_professionalism.students_id == $input.students_id && $db.expeditions_professionalism.expeditions_id == $input.expeditions_id
      return = {type: "list"}
      output = [
        "date"
        "academics"
        "isAcademicsUsed"
        "citizenship"
        "isCitizenshipUsed"
        "job"
        "isJobUsed"
        "crew"
        "isCrewUsed"
        "service"
        "isServiceUsed"
        "journaling"
        "fitness"
        "bonus"
        "penalty"
      ]
    
      addon = [
        {
          name : "expedition_schedule"
          input: {expedition_schedule_id: $output.expedition_schedule_id}
          as   : "_expedition_schedule"
        }
        {
          name : "students"
          input: {students_id: $output.students_id}
          as   : "_students"
        }
        {
          name : "expedition_schedule"
          input: {expedition_schedule_id: $output.expedition_schedule_id}
          as   : "_expedition_schedule"
        }
        {
          name : "students"
          input: {students_id: $output.students_id}
          as   : "_students"
        }
      ]
    } as $expeditions_professionalism
  }

  response = $expeditions_professionalism
  guid = "IwY-_Wuf6HcbI3rmlr9_BFltD30"
}