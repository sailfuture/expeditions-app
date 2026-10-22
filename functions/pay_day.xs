// Pays every student who has a professionalism row for the given expedition and
// date. Daily pay = round(average of the included category scores) + bonuses +
// penalties (penalty values are already negative). The average is also written
// back to the row's daily_average. Re-running a date overwrites the amounts, so
// staff can re-pay after correcting scores.
function pay_day {
  input {
    int expeditions_id
    date date
  }

  stack {
    db.get expeditions {
      field_name = "id"
      field_value = $input.expeditions_id
    } as $expedition

    precondition ($expedition != null) {
      error_type = "notfound"
      error = "Expedition not found"
    }

    db.query expeditions_professionalism {
      where = $db.expeditions_professionalism.expeditions_id == $input.expeditions_id && $db.expeditions_professionalism.date == $input.date
      return = {type: "list"}
    } as $prof_rows

    db.query expedition_transactions {
      where = $db.expedition_transactions.expeditions_id == $input.expeditions_id && $db.expedition_transactions.date == $input.date && $db.expedition_transactions.transaction == "Daily Pay"
      return = {type: "list"}
    } as $existing_pay

    api.lambda {
      code = """
        const rows = $var.prof_rows || [];
        const existing = $var.existing_pay || [];
        const categories = ['academics', 'citizenship', 'job', 'crew', 'service'];

        const existingByStudent = {};
        existing.forEach((t) => { existingByStudent[t.students_id] = t.id; });

        function sumValues(list) {
          const arr = Array.isArray(list) ? list : (list ? [list] : []);
          return arr.reduce((acc, item) => {
            if (item && typeof item === 'object' && item.value !== null && item.value !== undefined) {
              return acc + Number(item.value);
            }
            return acc;
          }, 0);
        }

        const seen = {};
        const results = [];
        rows.forEach((row) => {
          if (seen[row.students_id]) return; // one pay row per student per day
          seen[row.students_id] = true;

          let sum = 0;
          let count = 0;
          categories.forEach((cat) => {
            const usedKey = 'is' + cat.charAt(0).toUpperCase() + cat.slice(1) + 'Used';
            if (row[usedKey] !== true && row[cat] !== null && row[cat] !== undefined) {
              sum += Number(row[cat]);
              count++;
            }
          });
          const average = count > 0 ? sum / count : 0;
          const base = Math.round(average);
          const bonusTotal = sumValues(row.bonus);
          const penaltyTotal = sumValues(row.penalty);

          results.push({
            students_id: row.students_id,
            professionalism_id: row.id,
            existing_transaction_id: existingByStudent[row.students_id] || null,
            categories_counted: count,
            daily_average: Math.round(average * 100) / 100,
            base: base,
            bonus_total: bonusTotal,
            penalty_total: penaltyTotal,
            amount: base + bonusTotal + penaltyTotal
          });
        });
        return results;
      """
      timeout = 10
    } as $plan

    db.transaction {
      description = "Write daily pay for one expedition day"
      stack {
        foreach ($plan) {
          each as $item {
            db.edit expeditions_professionalism {
              field_name = "id"
              field_value = $item.professionalism_id
              data = {daily_average: $item.daily_average}
            }

            conditional {
              if ($item.existing_transaction_id != null) {
                db.edit expedition_transactions {
                  field_name = "id"
                  field_value = $item.existing_transaction_id
                  data = {amount: $item.amount}
                }
              }

              else {
                db.add expedition_transactions {
                  data = {
                    date                : $input.date
                    transaction         : "Daily Pay"
                    amount              : $item.amount
                    students_id         : $item.students_id
                    expeditions_id      : $input.expeditions_id
                    expeditions_store_id: null
                    quantity            : 0
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  response = {
    expeditions_id: $input.expeditions_id
    date          : $input.date
    paid          : $plan|count
    results       : $plan
  }
  guid = "NWLt0XQkkf3PNIcqTKLziSwwEpQ"
}
