// A review period for an expedition: a week ("weekly") or the whole
// expedition ("final"). Each student gets one performance review per period.
// Finalizing a period freezes its reviews and, for residential expeditions,
// the award amounts for those dates; the scores in it are then locked.
table expedition_review_periods {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }

    int expeditions_id {
      table = "expeditions"
    }

    text name filters=trim
    enum kind {
      values = ["weekly", "final"]
    }

    // Week number for weekly periods; 0 for the final evaluation.
    int sequence?

    date startDate
    date endDate
    enum status?="draft" {
      values = ["draft", "finalized"]
    }

    timestamp? finalized_at?
    int? finalized_by_staff_id? {
      table = "expedition_staff"
    }

    // The award settings in force when the period was finalized.
    json? award_settings?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {
      type : "btree"
      field: [
        {name: "expeditions_id", op: "asc"}
        {name: "startDate", op: "asc"}
      ]
    }
  ]

  tags = ["expeditions"]
  guid = "A3fZQKGUDINiP1oQVDrUbfuMuYA"
}
