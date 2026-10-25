// Add expeditions_professionalism record
query expeditions_professionalism verb=POST {
  api_group = "Expedition App"

  input {
    int expedition_schedule_id {
      table = "expedition_schedule"
    }
  
    int expeditions_id {
      table = "expeditions"
    }
  
    int students_id {
      table = "students"
    }
  
    date date
    int academics?
    int citizenship?
    int job?
    int crew?
    int service?
    text journaling?
    json bonus?
    json penalty?
    json[] academics_reason?
    json[] citizenship_reason?
    json[] job_reason?
    json[] crew_reason?
    json[] service_reason?
  
    // Type of day (Anchored, Offshore, Service Learning)
    text day_type?
  }

  stack {
    db.get expedition_schedule {
      field_name = "id"
      field_value = $input.expedition_schedule_id
    } as $schedule
  
    var $isCrewUsed {
      value = false
    }
  
    var $isServiceUsed {
      value = false
    }
  
    var $isAcademicsUsed {
      value = false
    }
  
    var $day_type {
      value = ($schedule.isOffshore ? "Offshore" : ($schedule.isService ? "Service Learning" : "Anchored"))
    }
  
    conditional {
      if ($day_type == "Anchored") {
        var.update $isAcademicsUsed {
          value = true
        }
      
        var.update $isCrewUsed {
          value = true
        }
      }
    
      elseif ($day_type == "Offshore") {
        var.update $isCrewUsed {
          value = true
        }
      }
    
      elseif ($day_type == "Service Learning") {
        var.update $isServiceUsed {
          value = true
        }
      
        var.update $isCrewUsed {
          value = true
        }
      }
    }
  
    db.add expeditions_professionalism {
      enforce_hidden_fields = false
      data = {
        created_at            : "now"
        expedition_schedule_id: $input.expedition_schedule_id
        expeditions_id        : $input.expeditions_id
        students_id           : $input.students_id
        date                  : $input.date
        academics             : $input.academics
        isAcademicsUsed       : $isAcademicsUsed
        citizenship           : $input.citizenship
        isCitizenshipUsed     : true
        job                   : $input.job
        isJobUsed             : true
        crew                  : $input.crew
        isCrewUsed            : $isCrewUsed
        service               : $input.service
        isServiceUsed         : $isServiceUsed
        journaling            : $input.journaling
        isFlagged             : false
        isLocked              : false
        bonus                 : $input.bonus
        penalty               : $input.penalty
        academics_reason      : $input.academics_reason
        citizenship_reason    : $input.citizenship_reason
        job_reason            : $input.job_reason
        crew_reason           : $input.crew_reason
        service_reason        : $input.service_reason
      }
    } as $new_record
  }

  response = $new_record
  guid = "tFd97P-MCT1H-lH8cM5XggB1RKQ"
}