// Query all expeditions records. Each row carries number_participants,
// number_staff and number_students counted from the roster (see the
// expedition_participant_counts function); the table's number_participants
// column is no longer used.
query expeditions verb=GET {
  api_group = "Expedition App"

  input {
  }

  stack {
    function.run expedition_app_guard as $app_guard
    db.query expeditions {
      return = {type: "list"}
      addon = [
        {
          name : "schoolTerms"
          input: {schoolTerms_id: $output.schoolterms_id}
          as   : "_schoolterms"
        }
        {
          name : "schoolTerms"
          input: {schoolTerms_id: $output.schoolterms_id}
          as   : "_schoolterms"
        }
        {
          name : "schoolTerms"
          input: {schoolTerms_id: $output.schoolterms_id}
          as   : "_schoolterms"
        }
        {
          name : "schoolYears"
          input: {schoolYears_id: $output.schoolterms_id.schoolyear_id}
          as   : "_schoolyears"
        }
        {
          name : "schoolYears"
          input: {schoolYears_id: $output.schoolyears_id}
          as   : "_schoolyears"
        }
      ]
    } as $expeditions

    function.run expedition_participant_counts {
      input = {expeditions: $expeditions}
    } as $expeditions_with_counts
  }

  response = $expeditions_with_counts
  guid = "gE0fpCiz4fV4X57rMxao6JCEEOE"
}
