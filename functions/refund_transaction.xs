// Refund a single Purchase line (one expedition_transactions row).
function refund_transaction {
  input {
    int expedition_transactions_id
    text? note? filters=trim
  }

  stack {
    db.get expedition_transactions {
      field_name = "id"
      field_value = $input.expedition_transactions_id
    } as $line

    precondition ($line != null) {
      error_type = "notfound"
      error = "Transaction not found"
    }

    precondition ($line.transaction == "Purchase") {
      error_type = "inputerror"
      error = "Only purchases can be refunded"
    }

    function.run refund_lines {
      input = {lines: $line|safe_array, note: $input.note}
    } as $result
  }

  response = $result
  guid = "7hUnWYi_V51qTxJcMkKlJGGM6Yg"
}
