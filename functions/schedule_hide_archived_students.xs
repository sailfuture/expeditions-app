// Takes archived students out of schedule days and their items before they
// are sent to the app: the dish team's wash and dry lists, the galley team's
// students, and each activity's student participants. The rows in the database
// are not changed, so a student who is made active again is back on their
// teams. "Archived" is the rule in expedition_student_roster: the student's
// own isArchived flag, or an archived assignment row on the day's expedition.
// The student objects must carry their id (see the addon outputs of the
// schedule endpoints).
function schedule_hide_archived_students {
  input {
    json schedules?
    json items?
  }

  stack {
    db.query students {
      where = $db.students.isArchived == true
      return = {type: "list"}
      output = ["id"]
    } as $archived_students

    db.query expedition_student_assignments {
      where = $db.expedition_student_assignments.isArchived == true
      return = {type: "list"}
      output = ["students_id", "expeditions_id"]
    } as $archived_assignments

    api.lambda {
      code = """
          const everywhere = new Set(($var.archived_students || []).map((s) => Number(s.id)));
          const perExpedition = {};
          ($var.archived_assignments || []).forEach((a) => {
            const sid = Number(a.students_id);
            if (!(sid > 0)) return;
            const key = String(a.expeditions_id);
            if (!perExpedition[key]) perExpedition[key] = new Set();
            perExpedition[key].add(sid);
          });

          // A list entry is a student object, a bare id, or null for a deleted
          // student; only archived students are dropped.
          const keeper = (expeditionId) => {
            const here = perExpedition[String(expeditionId)];
            return (s) => {
              if (s === null || s === undefined) return true;
              const id = Number(typeof s === 'object' ? s.id : s);
              if (!(id > 0)) return true;
              return !(everywhere.has(id) || (here && here.has(id)));
            };
          };
          const only = (list, keep) => (Array.isArray(list) ? list.filter(keep) : list);

          const expeditionOf = {};
          const schedules = Array.isArray($input.schedules)
            ? $input.schedules.map((row) => {
                if (!row || typeof row !== 'object') return row;
                expeditionOf[String(row.id)] = row.expeditions_id;
                const keep = keeper(row.expeditions_id);
                const out = Object.assign({}, row);
                const dish = out._expedition_dish_days;
                if (dish && typeof dish === 'object') {
                  out._expedition_dish_days = Object.assign({}, dish, {
                    wash: only(dish.wash, keep),
                    dry: only(dish.dry, keep),
                  });
                }
                const galley = out._expeditions_galley_team;
                if (galley && typeof galley === 'object') {
                  out._expeditions_galley_team = Object.assign({}, galley, {
                    students_id: only(galley.students_id, keep),
                  });
                }
                return out;
              })
            : $input.schedules;

          const items = Array.isArray($input.items)
            ? $input.items.map((item) => {
                if (!item || typeof item !== 'object') return item;
                const keep = keeper(expeditionOf[String(item.expedition_schedule_id)]);
                return Object.assign({}, item, { students_id: only(item.students_id, keep) });
              })
            : $input.items;

          return { schedules, items };
        """
      timeout = 10
    } as $visible
  }

  response = $visible
  guid = "OtUiXFuBdue6b18Otg7aogMrxtY"
}
