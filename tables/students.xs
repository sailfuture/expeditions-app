table students {
  auth = false

  schema {
    int id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    bool isArchived?
    text toddleID? filters=trim
    text firstName? filters=trim
    text lastName? filters=trim
    text crew_name? filters=trim
    text yearGroup? filters=trim
    int[] expeditions_id? {
      table = "expeditions"
    }
  
    int expeditions_student_information_id? {
      table = "expeditions_student_information"
    }
  
    json families?
    text grade? filters=trim
    json contact_info?
    text profileImage? filters=trim
    text studentEmail? filters=trim
    text crew_position? filters=trim
    text crew_status? filters=trim
    text passport_number? filters=trim
    date? issue_date?
    date? expiration_date?
    text gender? filters=trim
    text nationality? filters=trim
    text passport_photo? filters=trim
  
    // Date of birth, set from the passport manifest
    date? dob?
  
    // Password for the school email account, so staff can help a student sign in
    text email_password? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]

  tags = ["expeditions"]
  guid = "0T-bYqUXV2prh2nC26khK4ChcEY"
}