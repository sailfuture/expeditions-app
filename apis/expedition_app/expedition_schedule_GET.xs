// The schedule days of one expedition, with their locations, dish day and galley team.
// The expedition row itself is not embedded: it was repeated on every day and made up over
// half of the response, and every caller already has the expedition.
query expedition_schedule verb=GET {
  api_group = "Expedition App"

  input {
    int expeditions_id? {
      table = "expeditions"
    }
  }

  stack {
    function.run expedition_app_guard as $app_guard
    db.query expedition_schedule {
      where = $db.expedition_schedule.expeditions_id == $input.expeditions_id
      return = {type: "list"}
      addon = [
        {
          name : "expedition_locations"
          input: {expedition_locations_id: $output.current_location}
          as   : "_expedition_current_location"
        }
        {
          name : "expedition_locations_destination"
          input: {expedition_locations_id: $output.destination}
          as   : "_expedition_destination"
        }
        {
          name : "expedition_dish_days"
          input: {expedition_dish_days_id: $output.expedition_dish_days_id}
          as   : "_expedition_dish_days"
        }
        {
          name : "expeditions_galley_team"
          input: {
            expeditions_galley_team_id: $output.expeditions_galley_team_id
          }
          as   : "_expeditions_galley_team"
        }
      ]
    } as $expedition_schedule
  }

  response = $expedition_schedule
  guid = "IkClHsek1xY3MbjLxEeb5jnn_Sg"
}