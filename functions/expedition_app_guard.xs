function expedition_app_guard {
  description = "First statement of every Expedition App endpoint: reject a call without the app's key in its X-Expeditions-Key header. Only the key's SHA-256 is kept here. The app's browser code reaches Xano only through its /api/xano proxy, which checks the staff session and adds the key; its server code, the expeditions site, sailfuture-quiz and student-incentives send it themselves (env XANO_EXPEDITIONS_APP_KEY). To change the key, set the new value in those four Vercel projects and its SHA-256 here."

  input {
  }

  stack {
    // Xano hands headers over title-cased, whatever case the caller sent.
    var $headers {
      value = $env.$http_headers ?? {}
    }

    var $sent {
      value = $headers|get:"X-Expeditions-Key":""
    }

    var $sent_hash {
      value = $sent|sha256
    }

    precondition ($sent_hash == "b8f990c625c58a734645e22f30d6b6789ad51383baceda5b19e227cbf3c027b1") {
      error_type = "accessdenied"
      error = "Unauthorized"
    }
  }

  response = true
}
