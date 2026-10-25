// Edit one day's scores. Refused when the day is inside a finalized review period.
query "expeditions_professionalism/{expeditions_professionalism_id}" verb=PATCH {
  api_group = "Expedition App"

  input {
    int expeditions_professionalism_id? filters=min:1
    dblink {
      table = "expeditions_professionalism"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.get expeditions_professionalism {
      field_name = "id"
      field_value = $input.expeditions_professionalism_id
    } as $existing_score
  
    conditional {
      if ($existing_score != null) {
        function.run review_period_assert_open {
          input = {expeditions_id: $existing_score.expeditions_id, date: $existing_score.date}
        } as $score_period_open
      }
    }
  
    db.patch expeditions_professionalism {
      field_name = "id"
      field_value = $input.expeditions_professionalism_id
      data = `$input|pick:($raw_input|keys)`
    } as $expeditions_professionalism
  }

  response = $expeditions_professionalism
  guid = "9GqDOnvfDzoFgrY2eTVQbPtchCc"
}