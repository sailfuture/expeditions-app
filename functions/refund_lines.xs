// Shared by refund_order and refund_transaction. Takes a list of Purchase rows,
// refuses if any of them was already refunded, then in one transaction restores
// stock and writes an offsetting Refund row per line (refund_of_id points at the
// purchase line, order_ref is copied so the order groups together).
function refund_lines {
  input {
    json lines
    text? note? filters=trim
  }

  stack {
    api.lambda {
      code = """
        return (Array.isArray($input.lines) ? $input.lines : []).map((l) => l.id);
      """
      timeout = 10
    } as $line_ids

    precondition (($line_ids|count) > 0) {
      error_type = "notfound"
      error = "Nothing to refund"
    }

    db.query expedition_transactions {
      where = $db.expedition_transactions.refund_of_id in $var.line_ids
      return = {type: "list"}
      output = ["id", "refund_of_id"]
    } as $already

    precondition (($already|count) == 0) {
      error_type = "inputerror"
      error = "Already refunded"
    }

    db.query expeditions_store {
      return = {type: "list"}
    } as $store

    api.lambda {
      code = """
        const store = $var.store || [];
        const byId = {};
        store.forEach((s) => { byId[s.id] = s; });
        const stockAfter = {};
        const plan = [];
        for (const line of ($input.lines || [])) {
          if (line.transaction !== 'Purchase') continue;
          const storeId = line.expeditions_store_id;
          const item = storeId ? byId[storeId] : null;
          let newStock = null;
          if (item) {
            const current = stockAfter[storeId] !== undefined ? stockAfter[storeId] : (Number(item.quantity) || 0);
            newStock = current + (Number(line.quantity) || 1);
            stockAfter[storeId] = newStock;
          }
          plan.push({
            purchase_id: line.id,
            students_id: line.students_id,
            expeditions_id: line.expeditions_id,
            expeditions_store_id: storeId || null,
            quantity: Number(line.quantity) || 1,
            amount: Math.abs(Number(line.amount) || 0),
            order_ref: line.order_ref || null,
            restore_stock: item ? true : false,
            new_stock: newStock
          });
        }
        return plan;
      """
      timeout = 10
    } as $plan

    precondition (($plan|count) > 0) {
      error_type = "inputerror"
      error = "Only Purchase rows can be refunded"
    }

    api.lambda {
      code = """
        return ($var.plan || []).reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
      """
      timeout = 10
    } as $refund_total

    var $today {
      value = "now"|format_timestamp:"Y-m-d":"America/New_York"
    }

    db.transaction {
      description = "Refund purchase lines and restore stock"
      stack {
        foreach ($plan) {
          each as $line {
            conditional {
              if ($line.restore_stock == true) {
                db.edit expeditions_store {
                  field_name = "id"
                  field_value = $line.expeditions_store_id
                  data = {quantity: $line.new_stock}
                }
              }
            }

            db.add expedition_transactions {
              data = {
                date                : $today
                transaction         : "Refund"
                amount              : $line.amount
                students_id         : $line.students_id
                expeditions_id      : $line.expeditions_id
                expeditions_store_id: $line.expeditions_store_id
                quantity            : $line.quantity
                order_ref           : $line.order_ref
                refund_of_id        : $line.purchase_id
                note                : $input.note
              }
            }
          }
        }
      }
    }
  }

  response = {
    date    : $today
    refunded: $plan|count
    total   : $refund_total
    lines   : $plan
  }
  guid = "mPmSLGmMjhUd_zrtEypiQgs7un4"
}
