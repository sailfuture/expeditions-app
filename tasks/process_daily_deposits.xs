// Nightly at midnight Eastern (05:00 UTC = 00:00 EST / 01:00 EDT; Xano schedules
// are fixed UTC): pay the day that just ended (America/New_York) for every active
// expedition. pay_day is idempotent, so staff can still re-run a date from the
// Orders tab to correct it after score changes.
task process_daily_deposits {
  stack {
    var $yesterday {
      value = "now"|transform_timestamp:"-1 days":"America/New_York"|format_timestamp:"Y-m-d":"America/New_York"
    }

    db.query expeditions {
      where = $db.expeditions.isActive == true
      return = {type: "list"}
      output = ["id", "name"]
    } as $active_expeditions

    var $runs {
      value = []
    }

    foreach ($active_expeditions) {
      each as $expedition {
        function.run pay_day {
          input = {expeditions_id: $expedition.id, date: $yesterday}
        } as $result

        array.push $runs {
          value = {expedition: $expedition.name, paid: $result.paid}
        }
      }
    }
  }

  schedule = [{starts_on: 2026-01-01 05:00:00+0000, freq: 86400}]
  guid = "aAeQDaVEQbYeYXWwOV6oelHH2Ac"
}
