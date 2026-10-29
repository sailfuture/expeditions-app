// The expedition award for every student over a date range, used to freeze
// amounts when a review period is finalized. Server copy of the staff app's
// lib/expedition-award.ts: keep SETTINGS and the rules identical (the app's
// parity check compares the two on real data).
function review_period_award {
  input {
    int expeditions_id
    date startDate
    date endDate
  }

  stack {
    db.query expeditions_professionalism {
      where = $db.expeditions_professionalism.expeditions_id == $input.expeditions_id && $db.expeditions_professionalism.date >= $input.startDate && $db.expeditions_professionalism.date <= $input.endDate
      return = {type: "list"}
    } as $rows

    db.query expedition_journal_status {
      return = {type: "list"}
    } as $statuses

    api.lambda {
      code = """
        const SETTINGS = {
          dollarsPerCategory: 5,
          ratedThreshold: 3,
          completionValue: 100,
          performanceTiers: [
            { op: "gt", value: 3.25, percent: 1.0 },
            { op: "gte", value: 3.0, percent: 0.8 },
            { op: "gte", value: 2.75, percent: 0.7 },
            { op: "gte", value: 2.5, percent: 0.5 }
          ],
          citizenshipPercents: { 5: 1.1, 4: 1.0, 3: 0.75, 2: 0.4, 1: 0 }
        };
        const RATED = ["school", "job", "service", "crew"];
        const COMPLETION = ["journaling", "fitness"];

        const journalValue = {};
        ($var.statuses || []).forEach((s) => {
          if (s && typeof s.name === "string") journalValue[s.name.trim().toLowerCase()] = s.value;
        });

        const rated = (value, excluded) => (excluded === true || value === null || value === undefined ? null : Number(value));
        const journaling = (name) => {
          const key = (name || "").trim().toLowerCase();
          if (!key || !(key in journalValue)) return null;
          const v = journalValue[key];
          return v === null || v === undefined ? null : Math.round(Number(v) * 100);
        };
        const cents = (n) => Math.round(Number((n * 100).toPrecision(13))) / 100;
        const perfPercent = (score) => {
          for (const t of SETTINGS.performanceTiers) {
            if (t.op === "gt" ? score > t.value : score >= t.value) return t.percent;
          }
          return 0;
        };
        const citPercent = (score) => (score === null || !Number.isFinite(score) ? 0 : (SETTINGS.citizenshipPercents[score] ?? 0));

        const byStudent = {};
        ($var.rows || []).forEach((row) => {
          if (!row || !row.date) return;
          const s = {
            school: rated(row.academics, row.isAcademicsUsed),
            job: rated(row.job, row.isJobUsed),
            service: rated(row.service, row.isServiceUsed),
            crew: rated(row.crew, row.isCrewUsed),
            journaling: journaling(row.journaling),
            fitness: row.fitness === null || row.fitness === undefined ? null : Number(row.fitness),
            citizenship: rated(row.citizenship, row.isCitizenshipUsed)
          };
          const anyScore = Object.values(s).some((v) => v !== null);
          if (!anyScore) return;

          let earned = 0;
          RATED.forEach((k) => { if (s[k] !== null && s[k] >= SETTINGS.ratedThreshold) earned += SETTINGS.dollarsPerCategory; });
          COMPLETION.forEach((k) => { if (s[k] !== null && s[k] === SETTINGS.completionValue) earned += SETTINGS.dollarsPerCategory; });
          const ratedValues = RATED.map((k) => s[k]).filter((v) => v !== null);
          const performance = ratedValues.length ? ratedValues.reduce((a, b) => a + b, 0) / ratedValues.length : 0;
          const pp = perfPercent(performance);
          const cp = citPercent(s.citizenship);
          const award = earned * pp * cp;

          const list = byStudent[row.students_id] || (byStudent[row.students_id] = []);
          list.push({
            date: row.date,
            earned,
            performance_score: Math.round(performance * 100) / 100,
            performance_percent: pp,
            citizenship_percent: cp,
            award: cents(award)
          });
          list.sort((a, b) => String(a.date).localeCompare(String(b.date)));
          list._raw = (list._raw || 0) + award;
          list._earned = (list._earned || 0) + earned;
        });

        const students = Object.keys(byStudent).map((id) => {
          const days = byStudent[id];
          const total = cents(days._raw || 0);
          const earned = cents(days._earned || 0);
          return {
            students_id: Number(id),
            days: days.length,
            earned,
            withheld: cents(earned - (days._raw || 0)),
            total,
            daily: days.map((d) => d)
          };
        });
        return { settings: SETTINGS, students };
      """
      timeout = 10
    } as $result
  }

  response = $result
  guid = "foKg_zQAlvUrJm5swlgCocrLT1w"
}
