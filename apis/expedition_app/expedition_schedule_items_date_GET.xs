// Query all expedition_schedule_items records
query expedition_schedule_items_date verb=GET {
  api_group = "Expedition App"

  input {
    date? date?
    int expeditions_id? {
      table = "expeditions"
    }
  }

  stack {
    function.run expedition_app_guard as $app_guard
    var $output {
      value = ""
    }

    db.query expedition_schedule {
      where = $db.expedition_schedule.expeditions_id == $input.expeditions_id && $db.expedition_schedule.date == $input.date
      return = {type: "list"}
      addon = [
        {
          name : "expedition_dish_days"
          input: {expedition_dish_days_id: $output.expedition_dish_days_id}
          addon: [
            {
              name  : "students"
              output: ["id", "firstName", "lastName", "profileImage"]
              input : {students_id: $output.$this}
              as    : "wash"
            }
            {
              name  : "students"
              output: ["id", "firstName", "lastName", "profileImage"]
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
              output: ["id", "firstName", "lastName", "profileImage"]
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
    } as $expedition_schedule2

    conditional {
      if ($expedition_schedule2 == null) {
        var.update $output {
          value = "No Schedule Record Found"
        }
      }

      else {
        var $expedition_schedule_record {
          value = $expedition_schedule2.id
        }

        db.query expedition_schedule_items {
          where = $expedition_schedule_record[0] == $db.expedition_schedule_items.expedition_schedule_id
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
              output: ["id", "firstName", "lastName", "profileImage"]
              input : {students_id: $output.$this}
              as    : "students_id"
            }
            {
              name : "expedition_cookbook"
              input: {expedition_cookbook_id: $output.expedition_cookbook_id}
              as   : "_expedition_cookbook"
            }
          ]
        } as $expedition_schedule_items

        var.update $output {
          value = "Record Found"
        }
      }
    }

    // Archived students are left out of the dish team, galley team and item participants.
    function.run schedule_hide_archived_students {
      input = {
        schedules: $expedition_schedule2
        items    : $expedition_schedule_items
      }
    } as $visible
  }

  response = {
    out                      : $var.output
    expedition_schedule_items: $visible.items
    expedition               : $visible.schedules
  }

  guid = "_AXBEVI-viUFvsn8lQ3oKAHYD3k"
}
