// Store checkout for one student. Called by the Next.js server (app/api/accounts), which holds the secret.
query purchase verb=POST {
  api_group = "Expedition App"

  input {
    text secret
    int students_id {
      table = "students"
    }

    int expeditions_id {
      table = "expeditions"
    }

    json items
    text? note? filters=trim
    date? date?
  }

  stack {
    function.run expedition_app_guard {
      input = {secret: $input.secret}
    } as $allowed

    function.run purchase {
      input = {
        students_id   : $input.students_id
        expeditions_id: $input.expeditions_id
        items         : $input.items
        note          : $input.note
        date          : $input.date
      }
    } as $result
  }

  response = $result
  guid = "oSd0i8pxTxTTLa2rYL9hcf4ycDA"
}
