// Creates or refreshes the reviews of a draft review period: exactly one
// review per active student. Existing reviews keep their notes and reviewer;
// only the calculated scores are refreshed. Refuses finalized periods.
function review_period_generate {
  input {
    int review_periods_id
  }

  stack {
    db.get expedition_review_periods {
      field_name = "id"
      field_value = $input.review_periods_id
    } as $period

    precondition ($period != null) {
      error_type = "notfound"
      error = "Review period not found"
    }

    precondition ($period.status != "finalized") {
      error_type = "inputerror"
      error = "This review period is finalized. Reopen it before changing its reviews."
    }

    db.query students {
      where = `$period.expeditions_id` in $db.students.expeditions_id && $db.students.isArchived == false
      return = {type: "list"}
      output = ["id"]
    } as $students

    db.query expedition_performance_reviews {
      where = $db.expedition_performance_reviews.expedition_review_periods_id == $period.id
      return = {type: "list"}
      output = ["id", "students_id"]
    } as $existing

    var $created {
      value = 0
    }

    var $updated {
      value = 0
    }

    foreach ($students) {
      each as $student {
        function.run professionalism_averages {
          input = {
            expeditions_id: $period.expeditions_id
            students_id   : $student.id
            startDate     : $period.startDate
            endDate       : $period.endDate
          }
        } as $avg

        var $current {
          value = $existing|find:$$.students_id == $student.id
        }

        var $scores {
          value = {
            crew                  : $avg.crew
            service               : $avg.service
            job                   : $avg.job
            citizenship           : $avg.citizenship
            journaling            : $avg.journal
            academics             : $avg.academics
            crew_evaluation       : $avg.crew_evaluation
            service_evaluation    : $avg.service_evaluation
            job_evaluation        : $avg.job_evaluation
            citizenship_evaluation: $avg.citizenship_evaluation
            journaling_evaluation : $avg.journal_evaluation
            academics_evaluation  : $avg.academics_evaluation
            report_name           : $period.name
            startDate             : $period.startDate
            endDate               : $period.endDate
            is_final              : $period.kind == "final"
          }
        }

        conditional {
          if ($current != null) {
            db.patch expedition_performance_reviews {
              field_name = "id"
              field_value = $current.id
              data = $scores
            } as $patched_review

            var.update $updated {
              value = $updated + 1
            }
          }

          else {
            db.add expedition_performance_reviews {
              enforce_hidden_fields = false
              data = {
                created_at                  : now
                expeditions_id              : $period.expeditions_id
                students_id                 : $student.id
                expedition_review_periods_id: $period.id
                report_name                 : $period.name
                startDate                   : $period.startDate
                endDate                     : $period.endDate
                is_final                    : $period.kind == "final"
                notes                       : null
                crew                        : $avg.crew
                service                     : $avg.service
                job                         : $avg.job
                citizenship                 : $avg.citizenship
                journaling                  : $avg.journal
                academics                   : $avg.academics
                crew_evaluation             : $avg.crew_evaluation
                service_evaluation          : $avg.service_evaluation
                job_evaluation              : $avg.job_evaluation
                citizenship_evaluation      : $avg.citizenship_evaluation
                journaling_evaluation       : $avg.journal_evaluation
                academics_evaluation        : $avg.academics_evaluation
              }
            } as $added_review

            var.update $created {
              value = $created + 1
            }
          }
        }
      }
    }
  }

  response = {
    review_periods_id: $period.id
    created          : $created
    updated          : $updated
  }
  guid = "wTOXl8O4VSvSNiBQpP3qnbwqesw"
}
