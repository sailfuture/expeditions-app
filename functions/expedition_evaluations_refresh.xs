// Recalculate every active student's whole-expedition evaluation in one pass:
// one query for the expedition's scores, one calculation for all students
// (same rules as professionalism_averages), and a write only for students
// whose numbers changed. Each student keeps exactly one evaluation row,
// updated in place.
function expedition_evaluations_refresh {
  input {
    int expeditions_id
  }

  stack {
    db.query students {
      where = `$input.expeditions_id` in $db.students.expeditions_id && $db.students.isArchived == false
      return = {type: "list"}
      output = ["id"]
    } as $students

    db.query expeditions_professionalism {
      where = $db.expeditions_professionalism.expeditions_id == $input.expeditions_id
      return = {type: "list"}
      output = [
        "students_id"
        "academics"
        "isAcademicsUsed"
        "citizenship"
        "isCitizenshipUsed"
        "job"
        "isJobUsed"
        "crew"
        "isCrewUsed"
        "service"
        "isServiceUsed"
        "journaling"
      ]
    } as $scores

    db.query expedition_journal_status {
      return = {type: "list"}
    } as $journal_statuses

    db.query expedition_student_evaluations {
      where = $db.expedition_student_evaluations.expeditions_id == $input.expeditions_id
      sort = {expedition_student_evaluations.created_at: "desc"}
      return = {type: "list"}
    } as $existing

    api.lambda {
      code = """
        const scores = $var.scores || [];
        const journalMap = {};
        ($var.journal_statuses || []).forEach((s) => { if (s.name) journalMap[s.name] = s.value; });
        const categories = ['academics', 'citizenship', 'job', 'crew', 'service'];
        const FIELDS = ['total', 'total_evaluation', 'crew', 'crew_evaluation', 'service', 'service_evaluation',
          'job', 'job_evaluation', 'academics', 'academics_evaluation', 'citizenship', 'citizenship_evaluation',
          'journal', 'journal_evaluation'];

        function getCategory(val) {
          if (val === null || val === undefined) return null;
          if (val >= 3.21) return 'Exceeded Expectations';
          if (val >= 2.751) return 'Met Expectations';
          if (val >= 2.251) return 'Developing';
          if (val >= 1.1) return 'Needs Improvement';
          return 'Critical Intervention';
        }

        // Same rules as the professionalism_averages function.
        function averages(rows) {
          const out = {};
          let grandSum = 0, grandCount = 0;
          categories.forEach((cat) => {
            const usedKey = 'is' + cat.charAt(0).toUpperCase() + cat.slice(1) + 'Used';
            let sum = 0, count = 0;
            rows.forEach((r) => {
              if (r[usedKey] !== true && r[cat] !== null && r[cat] !== undefined) { sum += Number(r[cat]); count++; }
            });
            const avg = count > 0 ? sum / count : null;
            out[cat] = avg;
            out[cat + '_evaluation'] = getCategory(avg);
            if (avg !== null) { grandSum += avg; grandCount++; }
          });
          let jSum = 0, jCount = 0;
          rows.forEach((r) => {
            const name = r.journaling;
            if (name && Object.prototype.hasOwnProperty.call(journalMap, name)) {
              const v = journalMap[name];
              if (v !== null && v !== undefined) { jSum += Number(v); jCount++; }
            }
          });
          const jAvg = jCount > 0 ? jSum / jCount : null;
          out.journal = jAvg;
          out.journal_evaluation = jAvg === null ? null : (jAvg * 100 > 90 ? 'Strong Satisfactory' : jAvg * 100 >= 70 ? 'Satisfactory' : 'Unsatisfactory');
          const total = grandCount > 0 ? grandSum / grandCount : null;
          out.total = total;
          out.total_evaluation = getCategory(total);
          return out;
        }

        // The table stores an unscored average as 0 and an empty label as "",
        // so null, undefined, "" and 0 all mean "nothing" when comparing.
        const empty = (v) => v === null || v === undefined || v === '' || v === 0;
        const same = (a, b) => {
          if (empty(a) && empty(b)) return true;
          if (typeof a === 'number' || typeof b === 'number') return Math.abs(Number(a) - Number(b)) < 1e-6;
          return a === b;
        };

        // Newest existing row per student (the list is sorted newest first).
        const latest = {};
        ($var.existing || []).forEach((row) => { if (!latest[row.students_id]) latest[row.students_id] = row; });

        return ($var.students || []).map((s) => {
          const data = averages(scores.filter((r) => r.students_id === s.id));
          const current = latest[s.id] || null;
          const changed = !current || FIELDS.some((f) => !same(current[f], data[f]));
          return { students_id: s.id, existing_id: current ? current.id : null, changed, data };
        });
      """
      timeout = 20
    } as $plan

    var $created {
      value = 0
    }

    var $updated {
      value = 0
    }

    foreach ($plan) {
      each as $item {
        conditional {
          if ($item.existing_id == null) {
            db.add expedition_student_evaluations {
              enforce_hidden_fields = false
              data = {
                created_at            : now
                expeditions_id        : $input.expeditions_id
                students_id           : $item.students_id
                total                 : $item.data.total
                total_evaluation      : $item.data.total_evaluation
                crew                  : $item.data.crew
                crew_evaluation       : $item.data.crew_evaluation
                service               : $item.data.service
                service_evaluation    : $item.data.service_evaluation
                job                   : $item.data.job
                job_evaluation        : $item.data.job_evaluation
                academics             : $item.data.academics
                academics_evaluation  : $item.data.academics_evaluation
                citizenship           : $item.data.citizenship
                citizenship_evaluation: $item.data.citizenship_evaluation
                journal               : $item.data.journal
                journal_evaluation    : $item.data.journal_evaluation
              }
            } as $added_evaluation

            var.update $created {
              value = $created + 1
            }
          }

          elseif ($item.changed) {
            db.edit expedition_student_evaluations {
              field_name = "id"
              field_value = $item.existing_id
              data = {
                total                 : $item.data.total
                total_evaluation      : $item.data.total_evaluation
                crew                  : $item.data.crew
                crew_evaluation       : $item.data.crew_evaluation
                service               : $item.data.service
                service_evaluation    : $item.data.service_evaluation
                job                   : $item.data.job
                job_evaluation        : $item.data.job_evaluation
                academics             : $item.data.academics
                academics_evaluation  : $item.data.academics_evaluation
                citizenship           : $item.data.citizenship
                citizenship_evaluation: $item.data.citizenship_evaluation
                journal               : $item.data.journal
                journal_evaluation    : $item.data.journal_evaluation
              }
            } as $updated_evaluation

            var.update $updated {
              value = $updated + 1
            }
          }
        }
      }
    }
  }

  response = {
    students : $plan|count
    created  : $created
    updated  : $updated
    unchanged: ($plan|count) - $created - $updated
  }
  guid = "8SjuoCgYsrq0BDzTIOZr_LmFxQk"
}
