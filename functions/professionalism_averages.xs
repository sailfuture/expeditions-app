// Single source of truth for professionalism averages. Used by the student
// evaluation and performance review endpoints. A category counts toward its
// average only when it has a score and its isXUsed flag is not true (true means
// the category was excluded for that day). Journal uses the weights in
// expedition_journal_status. Dates are optional: omit both for the whole expedition.
function professionalism_averages {
  input {
    int expeditions_id
    int students_id
    date? startDate?
    date? endDate?
  }

  stack {
    db.query expeditions_professionalism {
      where = $db.expeditions_professionalism.expeditions_id == $input.expeditions_id && $db.expeditions_professionalism.students_id == $input.students_id && $db.expeditions_professionalism.date >=? $input.startDate && $db.expeditions_professionalism.date <=? $input.endDate
      return = {type: "list"}
    } as $scores

    db.query expedition_journal_status {
      return = {type: "list"}
    } as $journal_statuses

    api.lambda {
      code = """
        const scores = $var.scores || [];
        const journalStatuses = $var.journal_statuses || [];

        const journalMap = {};
        journalStatuses.forEach((status) => {
          if (status.name) journalMap[status.name] = status.value;
        });

        const categories = ['academics', 'citizenship', 'job', 'crew', 'service'];

        function getCategory(val) {
          if (val === null || val === undefined) return null;
          if (val >= 3.21) return 'Exceeded Expectations';
          if (val >= 2.751) return 'Met Expectations';
          if (val >= 2.251) return 'Developing';
          if (val >= 1.1) return 'Needs Improvement';
          return 'Critical Intervention';
        }

        const response = { days_scored: scores.length };
        let grandTotalSum = 0;
        let grandTotalCount = 0;

        categories.forEach((cat) => {
          const usedKey = 'is' + cat.charAt(0).toUpperCase() + cat.slice(1) + 'Used';
          let sum = 0;
          let count = 0;
          scores.forEach((score) => {
            if (score[usedKey] !== true && score[cat] !== null && score[cat] !== undefined) {
              sum += Number(score[cat]);
              count++;
            }
          });
          const avg = count > 0 ? sum / count : null;
          response[cat] = avg;
          response[cat + '_evaluation'] = getCategory(avg);
          if (avg !== null) {
            grandTotalSum += avg;
            grandTotalCount++;
          }
        });

        let journalSum = 0;
        let journalCount = 0;
        scores.forEach((score) => {
          const statusName = score.journaling;
          if (statusName && Object.prototype.hasOwnProperty.call(journalMap, statusName)) {
            const val = journalMap[statusName];
            if (val !== null && val !== undefined) {
              journalSum += Number(val);
              journalCount++;
            }
          }
        });
        const journalAvg = journalCount > 0 ? journalSum / journalCount : null;
        response.journal = journalAvg;
        if (journalAvg === null) {
          response.journal_evaluation = null;
        } else {
          const percentage = journalAvg * 100;
          if (percentage > 90) response.journal_evaluation = 'Strong Satisfactory';
          else if (percentage >= 70) response.journal_evaluation = 'Satisfactory';
          else response.journal_evaluation = 'Unsatisfactory';
        }

        const totalAvg = grandTotalCount > 0 ? grandTotalSum / grandTotalCount : null;
        response.total = totalAvg;
        response.total_evaluation = getCategory(totalAvg);
        return response;
      """
      timeout = 10
    } as $results
  }

  response = $results
  guid = "7hZJXF91rn42_IZzTrIJbBeadE4"
}
