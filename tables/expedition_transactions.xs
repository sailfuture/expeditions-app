table expedition_transactions {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }

    date? date?
    text transaction? filters=trim
    int amount?
    int students_id? {
      table = "students"
    }

    int expeditions_id? {
      table = "expeditions"
    }

    int? expeditions_store_id? {
      table = "expeditions_store"
    }

    int quantity?
    text? order_ref? filters=trim
    int? refund_of_id? {
      table = "expedition_transactions"
    }

    text? note? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "students_id", op: "asc"}, {name: "expeditions_id", op: "asc"}, {name: "date", op: "asc"}]}
    {type: "btree", field: [{name: "order_ref", op: "asc"}]}
  ]

  view = {
    Date: {
      sort: {date: "asc"}
      id  : "c5fdc2b2-49df-4fb8-bd1e-b9899255491d"
    }
  }

  guid = "vmxMC1umU6bTEM3C2Ks4CX77jPg"
}
