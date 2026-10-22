// Pay one expedition day. Called by the Next.js server (app/api/accounts), which holds the secret.
query pay_day verb=POST {
  api_group = "Expedition App"

  input {
    text secret
    int expeditions_id {
      table = "expeditions"
    }

    date date
  }

  stack {
    function.run expedition_app_guard {
      input = {secret: $input.secret}
    } as $allowed

    function.run pay_day {
      input = {expeditions_id: $input.expeditions_id, date: $input.date}
    } as $result
  }

  response = $result
  guid = "3FjIHJFB6IS5dx2ZEdBrbqImk7c"
}
