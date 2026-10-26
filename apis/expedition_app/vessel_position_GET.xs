// Latest known position of the vessel sailing an expedition.
// Defaults to the active expedition when no expeditions_id is given.
// Returns the vessel record (its last_* fields are the fallback position),
// the newest vessel_telemetry row, and a short recent track (newest first).
query vessel_position verb=GET {
  api_group = "Expedition App"

  input {
    int expeditions_id? {
      table = "expeditions"
    }
  }

  stack {
    function.run expedition_app_guard {
      input = {}
    } as $app_guard

    var $expedition {
      value = null
    }

    var $vessel {
      value = null
    }

    var $latest {
      value = null
    }

    var $track {
      value = []
    }

    conditional {
      if ($input.expeditions_id > 0) {
        db.get expeditions {
          field_name = "id"
          field_value = $input.expeditions_id
        } as $expedition_by_id

        var.update $expedition {
          value = $expedition_by_id
        }
      }

      else {
        db.query expeditions {
          where = $db.expeditions.isActive == true
          return = {type: "single"}
        } as $active_expedition

        var.update $expedition {
          value = $active_expedition
        }
      }
    }

    conditional {
      if ($expedition != null) {
        conditional {
          if ($expedition.vessels_id > 0) {
            db.get vessels {
              field_name = "id"
              field_value = $expedition.vessels_id
            } as $vessel_record

            var.update $vessel {
              value = $vessel_record
            }

            db.query vessel_telemetry {
              where = $db.vessel_telemetry.vessels_id == $expedition.vessels_id
              sort = {vessel_telemetry.ts: "desc"}
              return = {type: "single"}
            } as $latest_telemetry

            var.update $latest {
              value = $latest_telemetry
            }

            db.query vessel_telemetry {
              where = $db.vessel_telemetry.vessels_id == $expedition.vessels_id
              sort = {vessel_telemetry.ts: "desc"}
              return = {type: "list", paging: {page: 1, per_page: 200}}
            } as $recent_telemetry

            var.update $track {
              value = $recent_telemetry.items
            }
          }
        }
      }
    }
  }

  response = {
    expedition: $expedition
    vessel    : $vessel
    latest    : $latest
    track     : $track
  }
}
