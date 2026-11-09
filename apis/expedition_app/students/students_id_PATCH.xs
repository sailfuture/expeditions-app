// Edit students record
query "students/{students_id}" verb=PATCH {
  api_group = "Expedition App"

  input {
    int students_id? filters=min:1
    dblink {
      table = "students"
    }
  }

  stack {
    function.run expedition_app_guard as $app_guard
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input

    var $data {
      value = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    }

    // The email password is the one field staff may blank out: without this, filter_empty_text would keep the old one.
    conditional {
      if (`$raw_input|has:"email_password"`) {
        var.update $data {
          value = `$data|set:"email_password":$input.email_password`
        }
      }
    }

    db.patch students {
      field_name = "id"
      field_value = $input.students_id
      data = $data
    } as $students
  }

  response = $students
  guid = "4LjZit_inUoxhuvqy0wF6sxjY74"
}
