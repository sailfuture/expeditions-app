// Query all expeditions_professionalism records
query expeditions_professionalism_by_student_and_date verb=GET {
  api_group = "Expedition App"

  input {
    int students_id? {
      table = "students"
    }
  
    int expeditions_id? {
      table = "expeditions"
    }
  
    date? startDate?
    date? endDate?
  }

  stack {
    db.query expeditions_professionalism {
      where = $db.expeditions_professionalism.students_id == $input.students_id && $db.expeditions_professionalism.expeditions_id == $input.expeditions_id && $db.expeditions_professionalism.date >= $input.startDate && $db.expeditions_professionalism.date <= $input.endDate
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
  guid = "MRYWwlrXBh-4TaXgPa5P0bp6R_4"
}