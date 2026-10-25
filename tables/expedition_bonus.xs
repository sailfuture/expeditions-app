table expedition_bonus {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    text name? filters=trim
    int value?

    // Score categories this reason can explain: school, job, crew, service,
    // citizenship. Empty means it is offered for every category.
    text[] categories?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]

  tags = ["expeditions"]
  guid = "Hrz0Fvb-OcNUOO87nofaHNZnoIA"
}