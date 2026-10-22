// One checkout: checks the student's balance and the store stock on the server,
// then in a single transaction decrements stock and writes one Purchase row per
// line, all sharing an order_ref. items = [{expeditions_store_id, quantity}, ...].
function purchase {
  input {
    int students_id
    int expeditions_id
    json items
    text? note? filters=trim
    date? date?
  }

  stack {
    db.get students {
      field_name = "id"
      field_value = $input.students_id
    } as $student

    precondition ($student != null) {
      error_type = "notfound"
      error = "Student not found"
    }

    db.query expedition_transactions {
      where = $db.expedition_transactions.students_id == $input.students_id
      return = {type: "list"}
      output = ["amount"]
    } as $transactions

    db.query expeditions_store {
      return = {type: "list"}
    } as $store

    api.lambda {
      code = """
        const items = Array.isArray($input.items) ? $input.items : [];
        const store = $var.store || [];
        const balance = ($var.transactions || []).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
        const byId = {};
        store.forEach((s) => { byId[s.id] = s; });

        if (items.length === 0) return { error: 'No items in the order', balance, lines: [], total: 0 };

        // merge duplicate lines
        const wanted = {};
        for (const item of items) {
          const id = Number(item && item.expeditions_store_id);
          const qty = Number(item && item.quantity);
          if (!id || !Number.isInteger(qty) || qty <= 0) {
            return { error: 'Each item needs a store item and a whole-number quantity above zero', balance, lines: [], total: 0 };
          }
          wanted[id] = (wanted[id] || 0) + qty;
        }

        const lines = [];
        let total = 0;
        for (const idText of Object.keys(wanted)) {
          const id = Number(idText);
          const qty = wanted[id];
          const s = byId[id];
          if (!s || s.isArchived) return { error: 'Store item ' + id + ' is not available', balance, lines: [], total: 0 };
          const stock = Number(s.quantity) || 0;
          if (stock < qty) return { error: 'Only ' + stock + ' of ' + s.product_name + ' in stock', balance, lines: [], total: 0 };
          const unit = Number(s.price) || 0;
          const lineTotal = unit * qty;
          total += lineTotal;
          lines.push({
            expeditions_store_id: id,
            product_name: s.product_name,
            quantity: qty,
            unit_price: unit,
            line_total: lineTotal,
            new_stock: stock - qty
          });
        }

        if (total > balance) {
          return { error: 'Insufficient balance: order is ' + total + ' but the balance is ' + balance, balance, lines: [], total };
        }
        return { error: null, balance, lines, total };
      """
      timeout = 10
    } as $plan

    precondition ($plan.error == null) {
      error_type = "inputerror"
      error = $plan.error
    }

    security.create_uuid as $order_ref

    var $today {
      value = ($input.date != null ? $input.date : ("now"|format_timestamp:"Y-m-d":"America/New_York"))
    }

    db.transaction {
      description = "Store purchase: decrement stock and write the order lines"
      stack {
        foreach ($plan.lines) {
          each as $line {
            db.edit expeditions_store {
              field_name = "id"
              field_value = $line.expeditions_store_id
              data = {quantity: $line.new_stock}
            }

            db.add expedition_transactions {
              data = {
                date                : $today
                transaction         : "Purchase"
                amount              : 0 - $line.line_total
                students_id         : $input.students_id
                expeditions_id      : $input.expeditions_id
                expeditions_store_id: $line.expeditions_store_id
                quantity            : $line.quantity
                order_ref           : $order_ref
                note                : $input.note
              }
            }
          }
        }
      }
    }
  }

  response = {
    order_ref    : $order_ref
    date         : $today
    students_id  : $input.students_id
    total        : $plan.total
    balance_after: $plan.balance - $plan.total
    lines        : $plan.lines
  }
  guid = "M-cFcqsQtNwT63NWipDe4bAAsAI"
}
