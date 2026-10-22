// Read-only preview of what pay_day would pay for a date, without writing anything.
query daily_deposit_by_date verb=GET {
  api_group = "Expedition App"

  input {
    int expeditions_id {
      table = "expeditions"
    }

    date date
  }

  stack {
    db.query expeditions_professionalism {
      where = $db.expeditions_professionalism.expeditions_id == $input.expeditions_id && $db.expeditions_professionalism.date == $input.date
      return = {type: "list"}
    } as $prof_rows

    api.lambda {
      code = """
        const categories = ['academics', 'citizenship', 'job', 'crew', 'service'];
        function sumValues(list) {
          const arr = Array.isArray(list) ? list : (list ? [list] : []);
          return arr.reduce((acc, item) => (item && typeof item === 'object' && item.value != null) ? acc + Number(item.value) : acc, 0);
        }
        return ($var.prof_rows || []).map((row) => {
          let sum = 0, count = 0;
          categories.forEach((cat) => {
            const usedKey = 'is' + cat.charAt(0).toUpperCase() + cat.slice(1) + 'Used';
            if (row[usedKey] !== true && row[cat] != null) { sum += Number(row[cat]); count++; }
          });
          const average = count > 0 ? sum / count : 0;
          const base = Math.round(average);
          const bonusTotal = sumValues(row.bonus);
          const penaltyTotal = sumValues(row.penalty);
          return {
            students_id: row.students_id,
            date: row.date,
            categories_counted: count,
            daily_average: Math.round(average * 100) / 100,
            base, bonus_total: bonusTotal, penalty_total: penaltyTotal,
            amount: base + bonusTotal + penaltyTotal
          };
        });
      """
      timeout = 10
    } as $preview
  }

  response = $preview
  guid = "wHbXGjA3FJks1t9IT4ksK20jJkU"
}
