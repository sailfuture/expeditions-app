// Students of an expedition with their balance (sum of all their transactions).
query students_with_balance verb=GET {
  api_group = "Expedition App"

  input {
    int expeditions_id {
      table = "expeditions"
    }

    bool scope_to_expedition?=false
  }

  stack {
    function.run student_balances {
      input = {expeditions_id: $input.expeditions_id, scope_to_expedition: $input.scope_to_expedition}
    } as $students
  }

  response = $students
  guid = "EpLm3KBJlErUbkOYTFB57FAS3tg"
}
