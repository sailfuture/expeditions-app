table expeditions {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    text name? filters=trim
    date? startDate?
    date? endDate?
    int schoolterms_id? {
      table = "schoolTerms"
    }
  
    int schoolyears_id? {
      table = "schoolYears"
    }
  
    bool isActive?
    int number_participants?
  
    // academy = school expedition; residential = residential-program expedition with its own incentive system
    enum expedition_type?=academy {
      values = ["academy", "residential"]
    }
  
    text slug? filters=trim|lower
    text title? filters=trim
    text description?
    json hero_image?
    text hero_image_alt? filters=trim
    int map_path_density?=3600
    bool is_published?
    timestamp? published_at?
    int vessels_id?=1
    text legacy_sanity_id? filters=trim
    text academic_year_text? filters=trim
    int academic_term_number?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree|unique", field: [{name: "slug", op: "asc"}]}
  ]

  tags = ["expeditions"]
  guid = "lpjmuR-pjrYca8zS9BwfWaJRGwM"
}