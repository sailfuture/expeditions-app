// Read-only: the award each student would have frozen for a date range, as
// finalizing would compute it. Used by the finalize confirmation and to check
// the server calculation against the staff app's.
query review_period_award_preview verb=GET {
  api_group = "Expedition App"

  input {
    int expeditions_id filters=min:1
    date startDate
    date endDate
  }

  stack {
    function.run review_period_award {
      input = {
        expeditions_id: $input.expeditions_id
        startDate     : $input.startDate
        endDate       : $input.endDate
      }
    } as $award
  }

  response = $award
  guid = "RJkwQ2Du2ZKwJlYI0ryJoZ4STdI"
}
