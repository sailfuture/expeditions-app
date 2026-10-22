# Student Accounts Audit: purchases, pay day, and scores

> **Status (2026-10-21): implemented.** Option A was chosen for the pay formula. The streamlined design in section 4 is live in Xano workspace 3 and wired into the app. What changed:
>
> - New Xano functions: `expedition_app_guard`, `professionalism_averages`, `pay_day`, `student_balances`, `purchase`, `refund_lines`, `refund_order`, `refund_transaction` (copies in `functions/`).
> - New endpoints `POST pay_day`, `POST purchase`, `POST refund_order`, `POST refund_transaction`; they require a shared secret, so the browser calls them through `app/api/accounts/[action]/route.ts`, which checks the staff session and adds `XANO_EXPEDITION_SECRET` from `.env.local` (the same value must be set in Vercel). `students_with_balance`, `pay_students`, `daily_deposit_by_date` and both `calculate_student_evaluation*` endpoints were rewired onto the functions.
> - `expedition_transactions` gained `order_ref`, `refund_of_id`, `note`, a nullable `expeditions_store_id`, and two indexes. Refunds are offsetting `Refund` rows, not deletes.
> - Daily pay is now `round(mean of included category scores) + bonuses + penalties`, and the mean is written to `daily_average`. Historical rows were **not** re-paid; re-running Pay Day on an old date will recompute it with the new formula.
> - The nightly task `process_daily_deposits` runs at 05:00 UTC (midnight EST, 1am EDT) and pays the day that just ended (New York) for every active expedition. The Pay Day button stays as a re-run tool for corrections.
> - Balances still carry over between expeditions (decision 2 left as is); `students_with_balance?scope_to_expedition=true` is available if that should change.
> - Not deleted (needs a confirmed `--delete` push): the two old `task_daily_transactions_by_date_FINAL*` functions and the unused `pay_day_transactions` endpoint.

Audited 2026-10-20 against the live Xano workspace **Passage Logs** (ID 3, branch v1, API group `Expedition App` = `api:bXFdqx8y`) and the `main` branch of this repo. Live data was sampled from expedition 6 (Term 1, 577 Daily Pay rows system-wide) and expedition 14 (the active 2026-27 Term 2 expedition, 9 students, no transactions yet).

## 1. Headline findings

| # | Finding | Severity |
|---|---------|----------|
| 1 | **Scores never affect pay.** Pay day reads `expeditions_professionalism.daily_average`, but nothing in Xano or the frontend ever writes that column. It is `0` on every row in the database. A day's deposit is therefore only `Σ bonuses + Σ penalties`. 296 of 577 Daily Pay rows are $0. Example: Charles Todd, 2026-05-06, scored 3/3/3 with three $1 bonuses and was paid $3. | Critical (or intended: see decision 1) |
| 2 | **Every money endpoint is unauthenticated.** The whole API group is `auth = false`, and the browser calls Xano directly. Anyone with the URL can run `pay_students`, POST or DELETE `expedition_transactions`, or PATCH store stock. | Critical |
| 3 | **Balances are not scoped to an expedition.** `students_with_balance` filters students by expedition but sums *all* their transactions. Charles Todd shows $14 in the new Term 2 expedition that he earned in Term 1. | High (or intended: see decision 2) |
| 4 | **Purchases are assembled in the browser, not the server.** One POST per cart line plus a read-modify-write PATCH of store stock per line. No atomicity, no server-side balance or stock check, race-prone between two staff phones. Refunds and edits do the same stock math client-side. | High |
| 5 | **The nightly deposit task cannot work as scheduled.** `process_daily_deposits` fires at 04:30 UTC (00:30 ET) and pays "now", a date no one has scored yet. In expedition 6, 301 of 316 Daily Pay rows were created on a different day than their pay date, i.e. by staff pressing Pay Day manually. | High |
| 6 | **`pay_students` ignores the expedition you pass it.** It pays whichever expedition is `isActive` (and silently takes the first if several are active). The Orders tab sends `expeditions_id`, which is dropped. | Medium |
| 7 | Orders are not a first-class record. The Orders tab reconstructs them by clustering purchase rows per student within a time window. Editing one line's amount does not adjust stock. | Medium |
| 8 | Dead or duplicated backend: two byte-identical pay functions (`…FINAL` and `…FINAL_DAILY`), `daily_deposit_by_date` calls an empty function name, `pay_day_transactions` is unused, the evaluation lambda is copy-pasted into two endpoints, several GETs declare the same addon twice. | Low |
| 9 | `expeditions_professionalism` POST hard-codes `isCitizenshipUsed: true, isJobUsed: true`, while the app treats `isXUsed = true` as "excluded". Only hit when a row doesn't pre-exist, so rare, but it is the opposite of the frontend's meaning. | Low |

## 2. How the system works today

### Tables (all `auth = false`)

- **`expedition_transactions`** is the ledger. Columns: `date`, `transaction` (free text; only `"Daily Pay"` and `"Purchase"` are used), `amount` (integer dollars, negative for purchases), `students_id`, `expeditions_id`, `expeditions_store_id` (`0` on pay rows, a dangling reference), `quantity`.
- **`expeditions_store`** is one global catalog with live stock in `quantity` and a `price` integer. There is no expedition scoping, so stock and prices are shared across all expeditions.
- **`expeditions_professionalism`** holds one row per student per day: five category scores 0–5 (`academics`, `citizenship`, `job`, `crew`, `service`) with `isXUsed` flags (`true` = excluded from averages), `journaling` status text, `bonus[]` and `penalty[]` JSON snapshots of catalog rows, `isLocked`, and the never-written `daily_average`.
- **`expedition_bonus`** (+1 each, Fitness Participant +3) and **`expedition_penalty`** (-1 to -3) are catalogs; the row is copied into the professionalism JSON at scoring time.
- **`expedition_journal_status`** maps journal text to a weight: Completed 1, Late Entry 0.75, Incomplete 0.5, Not Started 0, Excused null.
- **`expedition_student_evaluations`** and **`expedition_performance_reviews`** store computed averages and labels.

### Flow A: scoring (Scores tab)

1. `GET add_students_to_professionalism?date&expeditions_id` creates a blank row per active student for the date (all `isXUsed` false, `bonus: {}`).
2. Staff adjust scores, pick bonuses/penalties, and press Submit. The client PATCHes each row with scores, the full `bonus`/`penalty` arrays, and `isLocked: true`. Categories hidden for the day type are sent as `null`.
3. Nothing computes an average at this point.

### Flow B: pay day (Orders tab → Pay Day dialog)

1. Client calls `GET pay_students?target_date=YYYY-MM-DD&expeditions_id=N` (the second parameter is ignored).
2. `task_daily_transactions_by_date_FINAL` loads all active expeditions, takes the first, loads its students, and for each student with a professionalism row on that date computes `daily_average + Σbonus.value + Σpenalty.value`, then upserts one `"Daily Pay"` transaction for student + date. Re-running a date overwrites the amount (idempotent, good).
3. `process_daily_deposits` runs the identical `…FINAL_DAILY` copy every day at 04:30 UTC with `target_date = now`.

### Flow C: purchases (Orders tab → New Order)

1. Client loads `students_with_balance?expeditions_id=N` (N+1 queries: one per student, then a per-transaction loop) and the store catalog.
2. Client enforces "can afford" and stock in React state only.
3. On submit, for each cart line: `POST expedition_transactions` with a negative amount, then `PATCH expeditions_store/{id}` with `quantity = clientStock - qty`.
4. Delete transaction / delete order: client reads the store item, adds the quantity back, PATCHes it. Edit transaction: changes amount and quantity only.

### Flow D: evaluations and performance reviews

- `POST calculate_student_evaluation` and `POST calculate_student_evaluation_performance_evaluation` each embed the same JavaScript lambda: average of each included category, journal average from the status weights, labels at fixed thresholds (3.21 Exceeded, 2.751 Met, 2.251 Developing, 1.1 Needs Improvement). The performance version loops every student in the expedition even when a `students_id` is supplied, creates one review row per student, and returns only the last one.
- The Reviews page reads the student's transactions in the review window to list bonuses and penalties by day. Because pay rows are the only non-purchase rows, "earned" on that page equals bonuses minus penalties.

## 3. Decisions needed before streamlining

1. **Pay formula.** Pick one and I will implement it in a single Xano function:
   - A. `round(mean of included category scores) + bonuses + penalties` (what the `daily_average` column implies was intended).
   - B. `Σ included category scores + bonuses + penalties` (a 3/3/3 day pays $9 + extras).
   - C. Bonuses and penalties only (today's behaviour, formalised: drop `daily_average`).
2. **Carry-over.** Should a balance reset per expedition, or follow the student across expeditions?
3. **Automation.** Keep Pay Day manual, or have the nightly task pay the previous day automatically (staff can still re-run a date to correct it)?

## 4. Recommended streamlined design

Keep the ledger table; move every rule into Xano; have the frontend call one endpoint per user action.

### Schema

- `expedition_transactions`: add `type` enum (`daily_pay | purchase | refund | adjustment`), `order_ref` (uuid, groups one checkout), `note` text; make `expeditions_store_id` nullable and stop writing `0`; add a btree index on (`students_id`, `expeditions_id`, `date`).
- `expeditions_professionalism`: either compute `daily_average` on every PATCH/POST, or drop the column and compute at pay time (preferred: fewer places to drift).
- Optional: `expeditions_store.expeditions_id[]` if catalogs or stock should differ per expedition.

### Xano functions (one source of truth each)

| Function | Replaces | Behaviour |
|---|---|---|
| `professionalism_averages(expeditions_id, students_id, startDate?, endDate?)` | the duplicated lambda in both `calculate_*` endpoints | Returns category averages, journal average, labels. Used by evaluations, reviews, and pay day. |
| `pay_day(expeditions_id, date)` | `…FINAL`, `…FINAL_DAILY`, `pay_students`, `daily_deposit_by_date` | Takes the expedition explicitly. Computes the chosen formula per student. Upserts one `daily_pay` row per student + date. Returns a per-student summary. |
| `student_balance(students_id, expeditions_id?)` and `students_with_balance(expeditions_id)` | current N+1 loop | One aggregate query per call (sum of `amount` grouped by student). |
| `purchase(students_id, expeditions_id, items[{store_id, qty}])` | New Order dialog logic | Inside one `db.transaction`: re-check balance and stock on the server, decrement stock, insert one `purchase` row per line sharing an `order_ref`. Reject if the student cannot afford it or stock is short. |
| `refund_order(order_ref)` / `refund_line(transaction_id)` | client-side delete + stock restore | Inserts offsetting `refund` rows (keeps history) and restores stock in the same transaction. |

### Schedule

- One task, 23:30 America/New_York (03:30 UTC during EDT, 04:30 UTC during EST), calling `pay_day(expedition, today)` for each active expedition, only if decision 3 is "automate". Otherwise delete the task.

### Security

- Turn on authentication for the mutating endpoints (`pay_day`, `purchase`, `refund_*`, store PATCH/POST/DELETE, transaction PATCH/DELETE) and call them from Next.js route handlers under `app/api/` so the Xano key never reaches the browser. The existing NextAuth session already gates those routes.

### Frontend cleanup once the above lands

- New Order dialog: one `purchase` call; drop the per-line loop and stock PATCH.
- Orders tab: group by `order_ref`; delete order calls `refund_order`; pass the expedition to `pay_day`.
- Remove `editExpeditionsProfessionalism` (calls a nonexistent endpoint) and the unused `pay_day_transactions` / `evaluation_by_student_all` / `get_expedition_professionalism` client wrappers if nothing picks them up.

## 5. Where the student-facing version is

There is **no student-facing account view in this repo**. The only unauthenticated student-visible surface is `/public/store`, a read-only catalog (name, image, price, stock) with no login, no balance, and no purchase button. The Store page's "Copy URL" button shares that link.

The separate app at https://v0-sfa-student-app.vercel.app (repo `sailfuture/v0-sfa-student-app`, last commit 2026-10-06) is the school-year student app. It runs against a different Xano workspace (`sfa`, with `bank_transactions` and `school_store`) and does not read expedition transactions, so students cannot see their expedition balance or purchases anywhere today. If you want one, the natural shape is a `/public/account/[token]` or student-email login page that shows balance, daily pay history with the scores and bonuses behind each day, purchases, and the catalog.

## 6. Files involved

Xano (pulled copy in this session's scratchpad; live in workspace 3):

- `function/task_daily_transactions_by_date_final.xs`, `function/task_daily_transactions_by_date_final_daily.xs`, `task/process_daily_deposits.xs`
- `api/expedition_app/pay_students_GET.xs`, `students_with_balance_GET.xs`, `expedition_transactions_*.xs`, `expeditions_store_*.xs`
- `api/expedition_app/expeditions_professionalism_POST.xs`, `add_students_to_professionalism_GET.xs`, `calculate_student_evaluation_POST.xs`, `calculate_student_evaluation_performance_evaluation_POST.xs`
- `table/expedition_transactions.xs`, `expeditions_store.xs`, `expeditions_professionalism.xs`, `expedition_bonus.xs`, `expedition_penalty.xs`, `expedition_journal_status.xs`

Frontend:

- `components/new-order-dialog.tsx` (purchase flow)
- `app/(expedition-tabs)/expedition/[id]/store/transactions/page.tsx` (orders, refunds, Pay Day)
- `app/(expedition-tabs)/evaluate/[date]/evaluate-client.tsx` (scoring submit)
- `app/(expedition-tabs)/performance-reviews/page.tsx` (bonus/penalty history)
- `app/store/page.tsx` (catalog admin), `app/public/store/page.tsx` (public catalog)
- `lib/xano.ts` lines 826–915 and 1136–1148 (API wrappers)
