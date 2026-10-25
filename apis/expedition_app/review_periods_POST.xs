// Create a review period and its reviews. Rules, checked here so no screen can
// skip them: dates inside the expedition, start on or before end, weekly
// periods never overlap each other, and only one final evaluation per
// expedition. A blank name becomes "Week N" (or "Final Expedition Evaluation").
query review_periods verb=POST {
  api_group = "Expedition App"

  input {
    int expeditions_id filters=min:1
    enum kind {
      values = ["weekly", "final"]
    }

    text? name? filters=trim
    date? startDate?
    date? endDate?
  }

  stack {
    db.get expeditions {
      field_name = "id"
      field_value = $input.expeditions_id
    } as $expedition

    precondition ($expedition != null) {
      error_type = "notfound"
      error = "Expedition not found"
    }

    db.query expedition_review_periods {
      where = $db.expedition_review_periods.expeditions_id == $input.expeditions_id
      return = {type: "list"}
    } as $periods

    api.lambda {
      code = """
        const exp = $var.expedition;
        const kind = $input.kind;
        const periods = $var.periods || [];
        const expStart = exp.startDate, expEnd = exp.endDate;
        const start = $input.startDate || (kind === "final" ? expStart : null);
        const end = $input.endDate || (kind === "final" ? expEnd : null);
        const fail = (error) => ({ error });

        if (!start || !end) return fail("Choose a start and end date.");
        if (start > end) return fail("The start date must be on or before the end date.");
        if (expStart && start < expStart) return fail("The period starts before the expedition (" + expStart + ").");
        if (expEnd && end > expEnd) return fail("The period ends after the expedition (" + expEnd + ").");

        if (kind === "final") {
          if (periods.some((p) => p.kind === "final")) return fail("This expedition already has a final evaluation.");
          return { error: null, name: $input.name || "Final Expedition Evaluation", sequence: 0, startDate: start, endDate: end };
        }

        const clash = periods.find((p) => p.kind === "weekly" && p.startDate <= end && start <= p.endDate);
        if (clash) return fail("These dates overlap " + clash.name + " (" + clash.startDate + " to " + clash.endDate + ").");

        const next = periods.filter((p) => p.kind === "weekly").reduce((m, p) => Math.max(m, Number(p.sequence) || 0), 0) + 1;
        return { error: null, name: $input.name || ("Week " + next), sequence: next, startDate: start, endDate: end };
      """
      timeout = 10
    } as $plan

    precondition ($plan.error == null) {
      error_type = "inputerror"
      error = $plan.error
    }

    db.add expedition_review_periods {
      data = {
        created_at    : now
        expeditions_id: $input.expeditions_id
        name          : $plan.name
        kind          : $input.kind
        sequence      : $plan.sequence
        startDate     : $plan.startDate
        endDate       : $plan.endDate
        status        : "draft"
      }
    } as $period

    function.run review_period_generate {
      input = {review_periods_id: $period.id}
    } as $generated
  }

  response = {period: $period, generated: $generated}
  guid = "Hq2qb5ermj5IK9qXUKoOn_Q-NX8"
}
