// Delete one performance review. Reviews in a finalized period can't be deleted.
query "expedition_performance_reviews/{expedition_performance_reviews_id}" verb=DELETE {
  api_group = "Expedition App"

  input {
    int expedition_performance_reviews_id? filters=min:1
  }

  stack {
    function.run expedition_app_guard {
      input = {}
    } as $app_guard

    db.get expedition_performance_reviews {
      field_name = "id"
      field_value = $input.expedition_performance_reviews_id
    } as $review
  
    conditional {
      if ($review != null && $review.expedition_review_periods_id != null) {
        db.get expedition_review_periods {
          field_name = "id"
          field_value = $review.expedition_review_periods_id
        } as $period
      
        precondition ($period == null || $period.status != "finalized") {
          error_type = "inputerror"
          error = "This review is in a finalized review period and can't be deleted."
        }
      }
    }
  
    db.del expedition_performance_reviews {
      field_name = "id"
      field_value = $input.expedition_performance_reviews_id
    }
  }

  response = null
  guid = "UnOdvfVfvkvEbYKJ1EFpO9Hy0Mk"
}