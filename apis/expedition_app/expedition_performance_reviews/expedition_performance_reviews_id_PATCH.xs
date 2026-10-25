// Edit a performance review. Once its review period is finalized only the notes
// and the reviewer can change; scores, dates and frozen award amounts are locked.
query "expedition_performance_reviews/{expedition_performance_reviews_id}" verb=PATCH {
  api_group = "Expedition App"

  input {
    int expedition_performance_reviews_id? filters=min:1
    dblink {
      table = "expedition_performance_reviews"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.get expedition_performance_reviews {
      field_name = "id"
      field_value = $input.expedition_performance_reviews_id
    } as $review
  
    precondition ($review != null) {
      error_type = "notfound"
      error = "Review not found"
    }
  
    var $changes {
      value = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    }
  
    conditional {
      if ($review.expedition_review_periods_id != null) {
        db.get expedition_review_periods {
          field_name = "id"
          field_value = $review.expedition_review_periods_id
        } as $period
      
        conditional {
          if ($period != null && $period.status == "finalized") {
            var.update $changes {
              value = $changes|pick:["notes", "expedition_staff_id"]
            }
          }
        }
      }
    }
  
    db.patch expedition_performance_reviews {
      field_name = "id"
      field_value = $input.expedition_performance_reviews_id
      data = $changes
    } as $expedition_performance_reviews
  }

  response = $expedition_performance_reviews
  guid = "hsXAZhb4LQ7srTTtBgmupPIQDPw"
}