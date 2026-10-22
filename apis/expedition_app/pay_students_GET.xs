// Legacy alias of POST pay_day. Now requires the shared secret and an explicit expedition.
query pay_students verb=GET {
  api_group = "Expedition App"

  input {
    text secret
    int expeditions_id {
      table = "expeditions"
    }

    date target_date
  }

  stack {
    function.run expedition_app_guard {
      input = {secret: $input.secret}
    } as $allowed

    function.run pay_day {
      input = {expeditions_id: $input.expeditions_id, date: $input.target_date}
    } as $result
  }

  response = $result
  guid = "YYN7igAnSQ8ClEAsyI2XzoJjMWQ"
}
