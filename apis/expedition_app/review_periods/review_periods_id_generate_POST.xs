// Refresh a draft period's reviews: adds any missing students and recalculates
// scores. Never duplicates and never touches notes. Refuses finalized periods.
query "review_periods/{review_periods_id}/generate" verb=POST {
  api_group = "Expedition App"

  input {
    int review_periods_id filters=min:1
  }

  stack {
    function.run expedition_app_guard {
      input = {}
    } as $app_guard

    function.run review_period_generate {
      input = {review_periods_id: $input.review_periods_id}
    } as $generated
  }

  response = $generated
  guid = "0ywxL1omiEHb6fYEyiL-dCZH5OI"
}
