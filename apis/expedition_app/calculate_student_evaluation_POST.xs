// Recalculate one student's whole-expedition professionalism averages and save
// them on their single expedition_student_evaluations row (updated in place;
// created only the first time). The home dashboard uses
// expedition_evaluations_refresh to do every student in one call.
query calculate_student_evaluation verb=POST {
  api_group = "Expedition App"

  input {
    int expeditions_id
    int students_id
  }

  stack {
    function.run expedition_app_guard as $app_guard
    function.run professionalism_averages {
      input = {
        expeditions_id: $input.expeditions_id
        students_id   : $input.students_id
      }
    } as $results

    db.query expedition_student_evaluations {
      where = $db.expedition_student_evaluations.expeditions_id == $input.expeditions_id && $db.expedition_student_evaluations.students_id == $input.students_id
      sort = {expedition_student_evaluations.created_at: "desc"}
      return = {type: "single"}
    } as $existing

    conditional {
      if ($existing != null) {
        db.edit expedition_student_evaluations {
          field_name = "id"
          field_value = $existing.id
          data = {
            total                 : $results.total
            total_evaluation      : $results.total_evaluation
            crew                  : $results.crew
            crew_evaluation       : $results.crew_evaluation
            service               : $results.service
            service_evaluation    : $results.service_evaluation
            job                   : $results.job
            job_evaluation        : $results.job_evaluation
            academics             : $results.academics
            academics_evaluation  : $results.academics_evaluation
            citizenship           : $results.citizenship
            citizenship_evaluation: $results.citizenship_evaluation
            journal               : $results.journal
            journal_evaluation    : $results.journal_evaluation
          }
        } as $evaluation_record
      }

      else {
        db.add expedition_student_evaluations {
          enforce_hidden_fields = false
          data = {
            expeditions_id        : $input.expeditions_id
            students_id           : $input.students_id
            total                 : $results.total
            total_evaluation      : $results.total_evaluation
            crew                  : $results.crew
            crew_evaluation       : $results.crew_evaluation
            service               : $results.service
            service_evaluation    : $results.service_evaluation
            job                   : $results.job
            job_evaluation        : $results.job_evaluation
            academics             : $results.academics
            academics_evaluation  : $results.academics_evaluation
            citizenship           : $results.citizenship
            citizenship_evaluation: $results.citizenship_evaluation
            journal               : $results.journal
            journal_evaluation    : $results.journal_evaluation
          }
        } as $evaluation_record
      }
    }
  }

  response = $evaluation_record
  guid = "k5QNQkrPJctD1IQx5aM-58sUdJI"
}
