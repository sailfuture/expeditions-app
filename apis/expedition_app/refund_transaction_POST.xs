// Refund one purchase line. Called by the Next.js server (app/api/accounts), which holds the secret.
query refund_transaction verb=POST {
  api_group = "Expedition App"

  input {
    text secret
    int expedition_transactions_id {
      table = "expedition_transactions"
    }

    text? note? filters=trim
  }

  stack {
    function.run expedition_app_guard {
      input = {secret: $input.secret}
    } as $allowed

    function.run refund_transaction {
      input = {expedition_transactions_id: $input.expedition_transactions_id, note: $input.note}
    } as $result
  }

  response = $result
  guid = "KPthFMAkAO63suSeOkVmHFUjBPE"
}
