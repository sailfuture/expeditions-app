// Delete an expedition row. Refuses the active expedition (set another one
// active first). Linked rows (schedule, scores, destinations, site posts...)
// are left in place; the staff app warns about them before calling this.
query "expeditions/{expeditions_id}" verb=DELETE {
  api_group = "Expedition App"

  input {
    int expeditions_id filters=min:1
  }

  stack {
    db.get expeditions {
      field_name = "id"
      field_value = $input.expeditions_id
    } as $expedition

    precondition ($expedition != null) {
      error_type = "notfound"
      error = "Expedition not found"
    }

    precondition ($expedition.isActive != true) {
      error_type = "inputerror"
      error = "This is the active expedition. Set another expedition active before deleting it."
    }

    db.del expeditions {
      field_name = "id"
      field_value = $input.expeditions_id
    }
  }

  response = null
  guid = "XbGa9aFGjFbl5lJQhAnU43u4aOA"
}
