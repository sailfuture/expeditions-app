// RETIRED 2026-10-25: reviews are created only through review periods
// (POST review_periods), which enforce one review per student per period.
query calculate_student_evaluation_performance_evaluation verb=POST {
  api_group = "Expedition App"

  input {
    int expeditions_id
    int students_id?
    date? startDate?
    date? endDate?
    text report_name? filters=trim
  }

  stack {
    precondition (false) {
      error_type = "inputerror"
      error = "Performance reviews are now created from review periods (POST review_periods), which prevents duplicates."
    }
  }

  response = null
  guid = "T2bcy5WHDckrXuGdfmoPNcXMafk"
}