// Finalize a period: refresh its reviews one last time, then (for residential
// expeditions) freeze each student's award for the period onto their review,
// and lock the period. Scores on its days can't change until it is reopened.
query "review_periods/{review_periods_id}/finalize" verb=POST {
  api_group = "Expedition App"

  input {
    int review_periods_id filters=min:1
    int? expedition_staff_id?
  }

  stack {
    function.run expedition_app_guard {
      input = {}
    } as $app_guard

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
      error = "This review period is already finalized."
    }

    // A day can only be paid once: a week can't be finalized while it overlaps
    // another finalized week (older data has a few overlapping ranges).
    conditional {
      if ($period.kind == "weekly") {
        db.query expedition_review_periods {
          where = $db.expedition_review_periods.expeditions_id == $period.expeditions_id && $db.expedition_review_periods.kind == "weekly" && $db.expedition_review_periods.status == "finalized" && $db.expedition_review_periods.id != $period.id && $db.expedition_review_periods.startDate <= $period.endDate && $db.expedition_review_periods.endDate >= $period.startDate
          return = {type: "list"}
          output = ["id", "name"]
        } as $paid_overlap

        var $paid_overlap_name {
          value = (($paid_overlap|first) ?? {})|get:"name":"another week"
        }

        precondition (($paid_overlap|count) == 0) {
          error_type = "inputerror"
          error = "These dates overlap " ~ $paid_overlap_name ~ ", which is already finalized. Change the dates so no day is paid twice."
        }
      }
    }

    function.run review_period_generate {
      input = {review_periods_id: $period.id}
    } as $generated

    db.get expeditions {
      field_name = "id"
      field_value = $period.expeditions_id
    } as $expedition

    var $residential {
      value = $expedition.expedition_type == "residential"
    }

    var $award {
      value = {settings: null, students: []}
    }

    conditional {
      if ($residential) {
        function.run review_period_award {
          input = {
            expeditions_id: $period.expeditions_id
            startDate     : $period.startDate
            endDate       : $period.endDate
          }
        } as $computed

        var.update $award {
          value = $computed
        }
      }
    }

    db.query expedition_performance_reviews {
      where = $db.expedition_performance_reviews.expedition_review_periods_id == $period.id
      return = {type: "list"}
      output = ["id", "students_id"]
    } as $reviews

    db.transaction {
      description = "Freeze award amounts and lock the review period"
      stack {
        conditional {
          if ($residential) {
            foreach ($reviews) {
              each as $review {
                var $mine {
                  value = $award.students|find:$$.students_id == $review.students_id
                }

                db.edit expedition_performance_reviews {
                  field_name = "id"
                  field_value = $review.id
                  data = {
                    award_days    : $mine.days ?? 0
                    award_earned  : $mine.earned ?? 0
                    award_withheld: $mine.withheld ?? 0
                    award_total   : $mine.total ?? 0
                    award_daily   : $mine.daily ?? []
                  }
                } as $frozen_review
              }
            }
          }
        }

        db.edit expedition_review_periods {
          field_name = "id"
          field_value = $period.id
          data = {
            status               : "finalized"
            finalized_at         : now
            finalized_by_staff_id: $input.expedition_staff_id
            award_settings       : $award.settings
          }
        } as $finalized
      }
    }
  }

  response = {
    period   : $finalized
    reviews  : $reviews|count
    generated: $generated
  }
  guid = "h2qAWCvzBV4vZasfuRm6wtBRuyY"
}
