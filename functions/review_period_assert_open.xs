// Stops a score change on a day that falls inside a finalized review period,
// so frozen award amounts and reviews can't drift from the scores behind them.
function review_period_assert_open {
  input {
    int? expeditions_id?
    date? date?
  }

  stack {
    conditional {
      if ($input.expeditions_id != null && $input.date != null) {
        db.query expedition_review_periods {
          where = $db.expedition_review_periods.expeditions_id == $input.expeditions_id && $db.expedition_review_periods.status == "finalized" && $db.expedition_review_periods.startDate <= $input.date && $db.expedition_review_periods.endDate >= $input.date
          return = {type: "list"}
          output = ["id", "name"]
        } as $locked

        var $locked_name {
          value = (($locked|first) ?? {})|get:"name":"a review period"
        }
      
        precondition (($locked|count) == 0) {
          error_type = "inputerror"
          error = "This day is in a finalized review period (" ~ $locked_name ~ "). Reopen the period to change its scores."
        }
      }
    }
  }

  response = true
  guid = "MjE6UeWPl0Gr8ZrQXxTxQEg-cRU"
}
