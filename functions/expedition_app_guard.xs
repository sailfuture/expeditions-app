// Guard for the money endpoints (pay_day, purchase, refund_order, refund_transaction).
// Only the Next.js server holds XANO_EXPEDITION_SECRET; this function keeps just its
// SHA-256, so the file can live in the repository without letting anyone else in.
function expedition_app_guard {
  input {
    text secret
  }

  stack {
    precondition (($input.secret|sha256) == "b459e9d6e82ed4fd62faca69f6986d7288488944221319dca20be6dd12d29f7e") {
      error_type = "accessdenied"
      error = "Not allowed"
    }
  }

  response = true
  guid = "DVAMglEhmOqxXUjZy-bccPwqAMA"
}
