// Dish-day rotations, for one expedition when expeditions_id is given, else all of them.
query expedition_dish_days verb=GET {
  api_group = "Expedition App"

  input {
    int expeditions_id? {
      table = "expeditions"
    }
  }

  stack {
    function.run expedition_app_guard as $app_guard
    db.query expedition_dish_days {
      where = $db.expedition_dish_days.expeditions_id ==? $input.expeditions_id
      return = {type: "list"}
    } as $expedition_dish_days
  }

  response = $expedition_dish_days
  guid = "gBbRYay_Vbgt68-dJo29Mew5Kh0"
}