// Create a performance review per student for a date range. students_id = 0 (or omitted)
// reviews every student in the expedition; a positive students_id reviews just that one.
query calculate_student_evaluation_performance_evaluation verb=POST {
  api_group = "Expedition App"

  input {
    int expeditions_id
    int students_id?
    date? startDate?
    date? endDate?
    text report_name? filters=trim
  }

  stack {
    db.query students {
      where = `$input.expeditions_id` in $db.students.expeditions_id && $db.students.isArchived == false
      return = {type: "list"}
      output = ["id"]
    } as $students1

    var $reviews {
      value = []
    }

    foreach ($students1) {
      each as $item {
        conditional {
          if ($input.students_id == null || $input.students_id == 0 || $input.students_id == $item.id) {
            function.run professionalism_averages {
              input = {
                expeditions_id: $input.expeditions_id
                students_id   : $item.id
                startDate     : $input.startDate
                endDate       : $input.endDate
              }
            } as $results

            db.add expedition_performance_reviews {
              enforce_hidden_fields = false
              data = {
                created_at            : "now"
                expeditions_id        : $input.expeditions_id
                students_id           : $item.id
                report_name           : $input.report_name
                startDate             : $input.startDate
                endDate               : $input.endDate
                notes                 : null
                crew                  : $results.crew
                service               : $results.service
                job                   : $results.job
                citizenship           : $results.citizenship
                journaling            : $results.journal
                academics             : $results.academics
                crew_evaluation       : $results.crew_evaluation
                service_evaluation    : $results.service_evaluation
                job_evaluation        : $results.job_evaluation
                citizenship_evaluation: $results.citizenship_evaluation
                journaling_evaluation : $results.journal_evaluation
                academics_evaluation  : $results.academics_evaluation
              }
            } as $evaluation_record

            array.push $reviews {
              value = $evaluation_record
            }
          }
        }
      }
    }
  }

  response = $reviews
  guid = "T2bcy5WHDckrXuGdfmoPNcXMafk"
}
