table expedition_performance_reviews {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    int expeditions_id? {
      table = "expeditions"
    }
  
    int students_id? {
      table = "students"
    }
  
    text report_name? filters=trim
    date? startDate?
    date? endDate?
    text notes? filters=trim
    decimal? crew?
    decimal? service?
    decimal? job?
    decimal? citizenship?
    decimal? journaling?
    decimal? academics?
    text? crew_evaluation? filters=trim
    text? service_evaluation? filters=trim
    text? job_evaluation? filters=trim
    text? citizenship_evaluation? filters=trim
    text? journaling_evaluation? filters=trim
    text? academics_evaluation? filters=trim
    int expedition_staff_id? {
      table = "expedition_staff"
    }
  
    bool is_final?

    // The review period this review belongs to (one review per student per period).
    int? expedition_review_periods_id? {
      table = "expedition_review_periods"
    }

    // Award amounts frozen when the period was finalized (residential expeditions).
    int? award_days?
    decimal? award_earned?
    decimal? award_withheld?
    decimal? award_total?
    json? award_daily?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {
      type : "btree|unique"
      field: [
        {name: "expedition_review_periods_id", op: "asc"}
        {name: "students_id", op: "asc"}
      ]
    }
  ]

  tags = ["expeditions"]
  guid = "BecsMjhnABpm4-64ZGlOfzGcC-E"
}