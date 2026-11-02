// The active expedition (as a one-item list). Carries number_participants,
// number_staff and number_students counted from the roster, which the galley
// pages use to scale recipes.
query active_expedition verb=GET {
  api_group = "Expedition App"

  input {
  }

  stack {
    function.run expedition_app_guard as $app_guard
    db.query expeditions {
      where = $db.expeditions.isActive == true
      return = {type: "list"}
    } as $expeditions1

    function.run expedition_participant_counts {
      input = {expeditions: $expeditions1}
    } as $expeditions_with_counts
  }

  response = $expeditions_with_counts
  guid = "Qa4IEug8FgMC2cNWe8_bk2P4smE"
}
