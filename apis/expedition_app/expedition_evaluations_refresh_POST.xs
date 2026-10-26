// Recalculate the whole expedition's evaluations in one call. Only students
// whose numbers changed are written; each keeps a single row.
query expedition_evaluations_refresh verb=POST {
  api_group = "Expedition App"

  input {
    int expeditions_id filters=min:1
  }

  stack {
    function.run expedition_app_guard as $app_guard
    function.run expedition_evaluations_refresh {
      input = {expeditions_id: $input.expeditions_id}
    } as $result
  }

  response = $result
  guid = "_NpJKHXEMXeHF-Yczrw4R3uv3sQ"
}
