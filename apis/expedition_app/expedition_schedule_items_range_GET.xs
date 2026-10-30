// Weekly planner: every schedule day of an expedition between two dates, each with the same
// schedule row (dish days, galley team, location) and item addons that
// expedition_schedule_items_date returns for a single day. One call replaces five per-day calls.
query expedition_schedule_items_range verb=GET {
  api_group = "Expedition App"

  input {
    int expeditions_id? {
      table = "expeditions"
    }
    date start_date
    date end_date
  }

  stack {
    function.run expedition_app_guard as $app_guard

    db.query expedition_schedule {
      where = $db.expedition_schedule.expeditions_id ==? $input.expeditions_id && $db.expedition_schedule.date >= $input.start_date && $db.expedition_schedule.date <= $input.end_date
      sort = {expedition_schedule.date: "asc"}
      return = {type: "list"}
      addon = [
        {
          name : "expedition_dish_days"
          input: {expedition_dish_days_id: $output.expedition_dish_days_id}
          addon: [
            {
              name  : "students"
              output: ["firstName", "lastName", "profileImage"]
              input : {students_id: $output.$this}
              as    : "wash"
            }
            {
              name  : "students"
              output: ["firstName", "lastName", "profileImage"]
              input : {students_id: $output.$this}
              as    : "dry"
            }
            {
              name  : "expedition_staff"
              output: ["name", "isActive"]
              input : {expedition_staff_id: $output.supervisor}
              as    : "supervisor_staff_dishes"
            }
            {
              name  : "expedition_staff"
              output: ["name", "isActive"]
              input : {expedition_staff_id: $output.support}
              as    : "support_staff_dishes"
            }
          ]
          as   : "_expedition_dish_days"
        }
        {
          name : "expeditions_galley_team"
          input: {
            expeditions_galley_team_id: $output.expeditions_galley_team_id
          }
          addon: [
            {
              name  : "students"
              output: ["firstName", "lastName", "profileImage"]
              input : {students_id: $output.$this}
              as    : "students_id"
            }
            {
              name  : "expedition_staff"
              output: ["name", "isActive"]
              input : {expedition_staff_id: $output.expedition_staff_id}
              as    : "_galley_supervisor"
            }
          ]
          as   : "_expeditions_galley_team"
        }
        {
          name : "expedition_locations_1"
          input: {expedition_locations_id: $output.current_location}
          as   : "_expedition_locations"
        }
      ]
    } as $schedules

    // All items of those days in one query, matched to their day through the schedule row.
    db.query expedition_schedule_items {
      join = {
        expedition_schedule: {
          table: "expedition_schedule"
          type : "inner"
          where: $db.expedition_schedule_items.expedition_schedule_id == $db.expedition_schedule.id
        }
      }
      where = $db.expedition_schedule.expeditions_id ==? $input.expeditions_id && $db.expedition_schedule.date >= $input.start_date && $db.expedition_schedule.date <= $input.end_date
      return = {type: "list"}
      addon = [
        {
          name  : "expedition_staff"
          output: ["name", "isActive"]
          input : {expedition_staff_id: $output.$this}
          as    : "participants"
        }
        {
          name  : "expedition_staff"
          output: ["name", "isActive"]
          input : {expedition_staff_id: $output.led_by}
          as    : "_expedition_staff"
        }
        {
          name : "expedition_schedule_item_types"
          input: {
            expedition_schedule_item_types_id: $output.expedition_schedule_item_types_id
          }
          as   : "_expedition_schedule_item_types"
        }
        {
          name  : "students"
          output: ["firstName", "lastName", "profileImage"]
          input : {students_id: $output.$this}
          as    : "students_id"
        }
        {
          name : "expedition_cookbook"
          input: {expedition_cookbook_id: $output.expedition_cookbook_id}
          as   : "_expedition_cookbook"
        }
      ]
    } as $items

    var $days {
      value = []
    }

    foreach ($schedules) {
      each as $schedule {
        var $schedule_id {
          value = $schedule.id
        }

        var $day_items {
          value = $items|filter:$$.expedition_schedule_id == $schedule_id
        }

        array.push $days {
          value = {
            date    : $schedule.date
            schedule: $schedule
            items   : $day_items
          }
        }
      }
    }
  }

  response = {
    start_date: $input.start_date
    end_date  : $input.end_date
    days      : $days
  }
  guid = "eJYNodbF1VlzyOgLxrZs_wFel4U"
}
