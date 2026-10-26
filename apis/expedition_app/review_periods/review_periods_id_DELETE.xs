// Delete a draft period and its reviews. Finalized periods can't be deleted.
query "review_periods/{review_periods_id}" verb=DELETE {
  api_group = "Expedition App"

  input {
    int review_periods_id filters=min:1
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
      error = "A finalized review period can't be deleted. Reopen it first."
    }

    db.query expedition_performance_reviews {
      where = $db.expedition_performance_reviews.expedition_review_periods_id == $period.id
      return = {type: "list"}
      output = ["id"]
    } as $reviews

    db.transaction {
      description = "Delete a draft review period and its reviews"
      stack {
        foreach ($reviews) {
          each as $review {
            db.del expedition_performance_reviews {
              field_name = "id"
              field_value = $review.id
            }
          }
        }

        db.del expedition_review_periods {
          field_name = "id"
          field_value = $period.id
        }
      }
    }
  }

  response = {deleted_reviews: $reviews|count}
  guid = "1s7Bd_X6lKaAwrCTmJzQ6JL7Xgs"
}
