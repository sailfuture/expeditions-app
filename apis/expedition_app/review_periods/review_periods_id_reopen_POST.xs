// Reopen a finalized period so its scores and reviews can be corrected. The
// frozen award amounts stay on the reviews until the period is finalized again.
query "review_periods/{review_periods_id}/reopen" verb=POST {
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

    precondition ($period.status == "finalized") {
      error_type = "inputerror"
      error = "This review period is not finalized."
    }

    db.edit expedition_review_periods {
      field_name = "id"
      field_value = $period.id
      data = {status: "draft", finalized_at: null, finalized_by_staff_id: null}
    } as $reopened
  }

  response = $reopened
  guid = "YFu0c-O4x5Jv-y1WzmLWTeC9MNk"
}
