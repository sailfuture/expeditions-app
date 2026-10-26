// Delete one day's scores. Refused when the day is inside a finalized review period.
query "expeditions_professionalism/{expeditions_professionalism_id}" verb=DELETE {
  api_group = "Expedition App"

  input {
    int expeditions_professionalism_id? filters=min:1
  }

  stack {
    function.run expedition_app_guard {
      input = {}
    } as $app_guard

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
  
    db.del expeditions_professionalism {
      field_name = "id"
      field_value = $input.expeditions_professionalism_id
    }
  }

  response = null
  guid = "TbfqzEcm6Algo-cnb_sagUMYheU"
}