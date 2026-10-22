// Refund a whole order by order_ref. Called by the Next.js server (app/api/accounts), which holds the secret.
query refund_order verb=POST {
  api_group = "Expedition App"

  input {
    text secret
    text order_ref filters=trim
    text? note? filters=trim
  }

  stack {
    function.run expedition_app_guard {
      input = {secret: $input.secret}
    } as $allowed

    function.run refund_order {
      input = {order_ref: $input.order_ref, note: $input.note}
    } as $result
  }

  response = $result
  guid = "o8zh2oB4CgkC-6Sl0aMcM2gz1KI"
}
