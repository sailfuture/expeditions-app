// Refund every Purchase line of one order (by order_ref).
function refund_order {
  input {
    text order_ref filters=trim
    text? note? filters=trim
  }

  stack {
    db.query expedition_transactions {
      where = $db.expedition_transactions.order_ref == $input.order_ref && $db.expedition_transactions.transaction == "Purchase"
      return = {type: "list"}
    } as $lines

    precondition (($lines|count) > 0) {
      error_type = "notfound"
      error = "Order not found"
    }

    function.run refund_lines {
      input = {lines: $lines, note: $input.note}
    } as $result
  }

  response = $result|set:"order_ref":$input.order_ref
  guid = "F_ATKFmOq0Vxp5l1HUVIxP_2HI4"
}
