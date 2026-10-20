// Pulls the current student roster from Toddle and upserts it into the
// students table, keyed on toddleID.
//
// - The Toddle API token lives in the TODDLE_API_TOKEN environment variable
//   (Xano > Settings > Environment Variables). Toddle tokens expire, so when
//   the sync starts failing with HTTP 401 generate a new token in Toddle and
//   replace the env value; no code change needed.
// - If Toddle rejects the request or returns no students, nothing in the
//   database is touched and the error is surfaced to the caller.
// - Only Toddle-sourced rows (non-empty toddleID) are archived before the
//   upsert. Manually added students (empty toddleID) are never modified.
function toddle_get_students {
  description = "Sync the student roster from Toddle into the students table"

  input {
  }

  stack {
    var $toddle_token {
      value = $env.TODDLE_API_TOKEN
    }
  
    precondition (($toddle_token|strlen) > 0) {
      error_type = "standard"
      error = "Toddle sync is not configured: set the TODDLE_API_TOKEN environment variable in Xano."
    }
  
    api.request {
      url = "https://us-east-1-production-apis.toddleapp.com/public/v2/students?curriculumId=175768895871796763"
      method = "GET"
      headers = ["Authorization: Bearer " ~ $toddle_token, "Content-Type: application/json"]
      timeout = 60
    } as $student_call
  
    var $toddle_status {
      value = $student_call.response.status
    }
  
    var $toddle_error {
      value = ""
    }
  
    conditional {
      if ($toddle_status != 200) {
        var $toddle_errors {
          value = $student_call.response.result|get:"errors":[]
        }
      
        conditional {
          if (($toddle_errors|count) > 0) {
            var $first_error {
              value = $toddle_errors|first
            }
          
            var.update $toddle_error {
              value = $first_error|get:"userMessage":""
            }
          }
        }
      }
    }
  
    precondition ($toddle_status == 200) {
      error_type = "standard"
      error = "Toddle API returned HTTP " ~ ($toddle_status|to_text) ~ ". " ~ $toddle_error ~ " If this is a 401, the Toddle API token has expired: generate a new one in Toddle and update TODDLE_API_TOKEN in Xano."
    }
  
    var $results_students {
      value = $student_call.response.result|get:"response":{}|get:"students":[]
    }
  
    precondition (($results_students|count) > 0) {
      error_type = "standard"
      error = "Toddle returned no students, so the student table was left unchanged."
    }
  
    // Archive every Toddle-sourced student first. Anyone still enrolled is
    // un-archived by the upsert below; anyone Toddle no longer returns
    // (graduated, withdrawn) stays archived. Manual students are skipped.
    db.query students {
      where = $db.students.toddleID != null && $db.students.toddleID != ""
      return = {type: "list"}
    } as $tracked_toddle_students
  
    foreach ($tracked_toddle_students) {
      each as $tracked_student {
        db.edit students {
          field_name = "id"
          field_value = $tracked_student.id
          enforce_hidden_fields = false
          data = {isArchived: true}
        } as $archived_student
      }
    }
  
    foreach ($results_students) {
      each as $toddle_student_item {
        db.add_or_edit students {
          field_name = "toddleID"
          field_value = $toddle_student_item.id
          enforce_hidden_fields = false
          data = {
            isArchived  : $toddle_student_item|get:"isArchived":false
            firstName   : $toddle_student_item|get:"firstName":""
            lastName    : $toddle_student_item|get:"lastName":""
            yearGroup   : $toddle_student_item|get:"yearGroup":""
            families    : $toddle_student_item|get:"families":""
            grade       : $toddle_student_item|get:"grade":""
            crew_name   : $toddle_student_item|get:"first_name_locale":""
            contact_info: $toddle_student_item|get:"contact_info":""
            profileImage: $toddle_student_item|get:"profileImage":""
            studentEmail: $toddle_student_item|get:"email":""
          }
        } as $upserted_student
      }
    }
  
    var $sync_summary {
      value = {
        synced            : ($results_students|count)
        previously_tracked: ($tracked_toddle_students|count)
        synced_at         : now
      }
    }
  }

  response = $sync_summary
  guid = "Eb0w_R8DIoz5_NSCraJH5a9N34I"
}
