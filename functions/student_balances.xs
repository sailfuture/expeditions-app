// Balances for every active student in an expedition, in two queries instead of
// one per student. A balance is the sum of every transaction the student has
// (Daily Pay, Purchase, Refund, ...). By default that spans all expeditions, so a
// balance carries over; pass scope_to_expedition = true to count only this
// expedition's transactions.
function student_balances {
  input {
    int expeditions_id
    bool scope_to_expedition?=false
  }

  stack {
    db.query students {
      where = `$input.expeditions_id` in $db.students.expeditions_id && $db.students.isArchived == false
      return = {type: "list"}
      output = [
        "id"
        "isArchived"
        "firstName"
        "lastName"
        "crew_name"
        "expeditions_id"
        "profileImage"
        "crew_position"
      ]
    } as $students

    api.lambda {
      code = """
        return ($var.students || []).map((s) => s.id);
      """
      timeout = 10
    } as $student_ids

    db.query expedition_transactions {
      where = $db.expedition_transactions.students_id in $var.student_ids
      return = {type: "list"}
      output = ["students_id", "expeditions_id", "transaction", "amount"]
    } as $transactions

    api.lambda {
      code = """
        const scope = $input.scope_to_expedition === true;
        const expeditionId = $input.expeditions_id;
        const totals = {};
        ($var.transactions || []).forEach((t) => {
          if (scope && t.expeditions_id !== expeditionId) return;
          const bucket = totals[t.students_id] || { balance: 0, earned: 0, spent: 0, refunded: 0 };
          const amount = Number(t.amount) || 0;
          bucket.balance += amount;
          if (t.transaction === 'Purchase') bucket.spent += Math.abs(amount);
          else if (t.transaction === 'Refund') bucket.refunded += amount;
          else bucket.earned += amount;
          totals[t.students_id] = bucket;
        });
        return ($var.students || []).map((s) => {
          const b = totals[s.id] || { balance: 0, earned: 0, spent: 0, refunded: 0 };
          return Object.assign({}, s, {
            checking_account_total: b.balance,
            total_earned: b.earned,
            total_spent: b.spent,
            total_refunded: b.refunded
          });
        });
      """
      timeout = 10
    } as $result
  }

  response = $result
  guid = "pme4EP-N9LV0oPOlpslN5mLV0gY"
}
