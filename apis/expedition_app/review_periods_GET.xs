// Review periods for an expedition in date order, each with how many active
// students have a review, how many reviews have notes, and the frozen award.
query review_periods verb=GET {
  api_group = "Expedition App"

  input {
    int expeditions_id filters=min:1
  }

  stack {
    function.run expedition_app_guard as $app_guard
    db.query expedition_review_periods {
      where = $db.expedition_review_periods.expeditions_id == $input.expeditions_id
      sort = {expedition_review_periods.startDate: "asc"}
      return = {type: "list"}
    } as $periods

    db.query expedition_performance_reviews {
      where = $db.expedition_performance_reviews.expeditions_id == $input.expeditions_id
      return = {type: "list"}
      output = [
        "id"
        "students_id"
        "expedition_review_periods_id"
        "notes"
        "expedition_staff_id"
        "award_total"
      ]
    } as $reviews

    // Active students only: not archived, and no archived assignment on this expedition.
    function.run expedition_student_roster {
      input = {expeditions_id: $input.expeditions_id}
    } as $roster

    var $students {
      value = $roster.active
    }

    api.lambda {
      code = """
          const reviews = $var.reviews || [];
          const active = new Set(($var.students || []).map((s) => s.id));
          return ($var.periods || []).map((p) => {
            // An archived student's old reviews stay in the table but are not counted.
          const mine = reviews.filter((r) => r.expedition_review_periods_id === p.id && active.has(r.students_id));
            const reviewed = new Set(mine.map((r) => r.students_id));
            const missing = [...active].filter((id) => !reviewed.has(id));
            const awardTotal = mine.reduce((sum, r) => sum + (Number(r.award_total) || 0), 0);
            return {
              ...p,
              review_count: mine.length,
              with_notes: mine.filter((r) => typeof r.notes === "string" && r.notes.trim() !== "").length,
              with_reviewer: mine.filter((r) => r.expedition_staff_id).length,
              missing_students: missing,
              award_total: Math.round(awardTotal * 100) / 100
            };
          });
        """
      timeout = 10
    } as $result
  }

  response = {
    periods         : $result
    active_students : $students|count
    unassigned_count: ($reviews|filter:$$.expedition_review_periods_id == null)|count
  }

  guid = "11TgZvV_r1VJw2METLZeajydS9I"
}
