# Junior mobile audit — all other pages

Scope: every staff-facing page except `/planner`, `/dashboard`, `app/tv/*`, `app/public/*`, and the expedition-tab shell (`app/(expedition-tabs)/layout.tsx`, `components/expedition-header.tsx`). Widths audited: 375–430px phone, 768px small tablet. Code audit only (no dev server, no source edits). Line numbers are from the files as read on 2026-11-09; `path:line` always refers to the repo root `C:\Users\hunte\GitHub\expeditions-app`.

Baseline facts that shape every finding:

- shadcn `Table` wraps every table in `<div class="relative w-full overflow-x-auto">` (`components/ui/table.tsx:9`), so wide tables never break the page; they scroll sideways inside their card. That hides the problem rather than solving it: on a 375px phone the user sees 1–3 columns and has to drag to find the rest.
- `DialogContent` is `max-w-[calc(100%-2rem)] p-6` centred with `translate-y-[-50%]` (`components/ui/dialog.tsx:64`), so a phone dialog has **343px** of content width and sits mid-screen; `DialogFooter` stacks `flex-col-reverse sm:flex-row` (`components/ui/dialog.tsx:112`).
- `Button` default is `h-9` (36px) and `icon` is `size-9` (`components/ui/button.tsx:24,28`); `size="sm"` is `h-8` (32px) (`:26`). Nothing in the system reaches the 44px touch minimum by default.
- `Input`/`Textarea` are `text-base md:text-sm` (`components/ui/input.tsx:11`, `components/ui/textarea.tsx:10`), which correctly avoids iOS focus-zoom — unless a page overrides it with `text-sm` (one does, on the scoring card).
- Navbar is `sticky top-0 z-50 h-14` (`components/navbar.tsx:109-112`); anything else sticky must offset by 56px (inventory's bulk bar does, `app/inventory/page.tsx:756`).
- `container mx-auto px-4` is used everywhere, giving a 16px gutter: 343px usable at 375, 398px at 430, 736px at 768.

---

## Cross-cutting patterns

### X1. "Every list is a 5–11 column `<Table>` with `px-6` cells" — P1 (P0 where widths are hard-coded)

**Pattern.** Pages render the desktop table at all widths. The shadcn container adds horizontal scroll, but the first column is never sticky, cells carry `px-6` (48px of padding per column), and text columns are `truncate`d so they vanish rather than wrap. On a 375px phone the user sees roughly the first two columns.

**Files affected (table header lines):**
`app/my-expeditions/page.tsx:78-83` (6 cols) · `app/expeditions/page.tsx:260-266` (7) · `app/students/page.tsx:483-487, 531-535, 669-673, 745-750` (5–6) · `app/staff/page.tsx:181-185` (5) · `app/staff/[id]/page.tsx:470-473` (4) · `app/student/[id]/page.tsx:948-950, 1499-1503` · `app/passage-logs/page.tsx:196-202` (7) · `app/(expedition-tabs)/discipline/page.tsx:396-403` (8) · `app/(expedition-tabs)/applications/page.tsx:221-226` (6) · `app/(expedition-tabs)/performance-reviews/page.tsx:936-940` (5, repeated per student) · `app/(expedition-tabs)/expedition/[id]/assignments/page.tsx:865-868, 893-897, 975-981, 1289-1292` · `app/(expedition-tabs)/expedition/[id]/passport-manifest/page.tsx:461-471, 505-515` (11) · `app/(expedition-tabs)/awards/page.tsx:721-726` (6) + nested `:164-173` (10–11) · `app/(expedition-tabs)/grades/page.tsx:310-316` (3 + N classes) · `app/(expedition-tabs)/expedition/[id]/page.tsx:438-440, 531-535` · `components/expedition-participants.tsx:384-389` (6) · `components/student-evaluations-table.tsx:134-141` (7–8, used on Home and Overview) · `app/intake-records/page.tsx:287-291` (5).

**Counter-example already in the repo.** The galley pages solved this: `table-fixed` with percentage widths, `hidden md:table-cell` on secondary columns, and `px-2 md:px-6` cells — `app/inventory/page.tsx:900-909`, `app/supplies/page.tsx:616-622`, `app/galley-equipment/page.tsx:219-222`, `app/linen-inventory/page.tsx:339-345`, `app/uniform-inventory/page.tsx:370-375`, `app/meal-planning/[id]/page.tsx:723-730`.

**Recommended shared fix.** One of two, chosen per table:
1. Adopt the galley pattern everywhere: `className="table-fixed w-full"`, percentage widths, `hidden md:table-cell` on anything not needed to identify the row or act on it, `px-3 md:px-6`.
2. For tables whose rows are "a thing you tap to open" (students, staff, expeditions, discipline, applications, passport, reviews), add a `components/mobile-card-list.tsx` primitive and render it under `md:hidden`, keeping the `<Table>` as `hidden md:block`. Card = avatar/name + 2–3 key fields + status badge; tap = existing row `onClick`.
Where a matrix genuinely needs to scroll (Grades, Awards breakdown), make the first column `sticky left-0` with a right shadow so the user can read values against names.

### X2. Hard pixel column widths on `table-fixed` tables — P0 on phones

**Pattern.** `style={{ width: "150px" }}` or `w-[220px] min-w-[220px]` on headers of a `table-fixed w-full` table. Fixed widths add up to more than the viewport, so `auto` columns collapse to zero and their `truncate`d text disappears entirely (not even a scroll reveals it, since the column has no width).

**Files.** `app/(expedition-tabs)/discipline/page.tsx:396-403` (80+90+150+100+120+100 = 640px fixed; Reason and Consequence are the `auto` columns that die) · `app/(expedition-tabs)/applications/page.tsx:221-226` (520px fixed; Career Goals dies) · `app/(expedition-tabs)/expedition/[id]/passport-manifest/page.tsx:461-471` (1150px of `min-w`) · `app/intake-records/page.tsx:287-291` (780px) · `app/(expedition-tabs)/expedition/[id]/assignments/page.tsx:866, 975-981` (300px dept column; 1060px dish-team table) · `app/students/page.tsx:745-750` (1020px admin table) · `components/today-schedule.tsx:289-291` (`w-[120px]` + `w-[150px]` inside a `w-full` phone sheet, leaving ~75px for the activity name).

**Shared fix.** Replace px with % (`w-[22%]`), drop `min-w-*` below `md:` (`md:min-w-[180px]`), and hide the lowest-priority columns `hidden md:table-cell`. For Discipline/Applications/Passport/Intake-records use the card list from X1 under `md`.

### X3. Page-header rows that cannot wrap — P1

**Pattern.** `flex items-center justify-between` with an `h1 text-3xl` on the left and two or more controls on the right, with no `flex-col`/`flex-wrap` at phone widths. The right group overflows the 343px container and the page gains a horizontal scrollbar.

**Files.** `app/students/page.tsx:430-470` (Add Student + Reload Toddle Students + Switch/label ≈ 560px in one row) · `app/passage-logs/page.tsx:150-185` (Select `w-[220px]` + Map View + New Log ≈ 460px) · `app/(expedition-tabs)/discipline/page.tsx:378-389` (fits at 375 only because the button is short) · `app/(expedition-tabs)/applications/page.tsx:194-215` · `app/(expedition-tabs)/schedule/[date]/schedule-view-client.tsx:675` (`flex-nowrap` on the whole action bar, see A2) · `app/(expedition-tabs)/expedition/[id]/page.tsx:386` and `app/home/home-dashboard.tsx:193` (title + timestamp + button; `flex-wrap` on Home but not Overview) · `app/(expedition-tabs)/expedition/[id]/passport-manifest/page.tsx:431`.

**Counter-examples in the repo.** `app/expeditions/page.tsx:215-250` (`flex-col gap-3 md:flex-row md:items-center md:justify-between`, buttons `flex-1 min-w-0 shrink md:flex-none`) and `app/linen-inventory/page.tsx:423`, `app/uniform-inventory/page.tsx:343`, `app/locations/page.tsx:186`.

**Shared fix.** Extract `components/page-header.tsx` with the expeditions-page classes and move title size to `text-2xl md:text-3xl`. Actions: `flex flex-wrap gap-2 w-full md:w-auto`, primary button `flex-1 md:flex-none`.

### X4. Dialog forms laid out as `grid grid-cols-2|3 gap-4` with no breakpoint — P1

**Pattern.** Inside a 343px dialog, two columns are ~155px and three are ~100px; Select triggers `line-clamp-1` their value (`components/ui/select.tsx:22`) so student names, reasons and consequences become unreadable, and labels wrap onto 2–3 lines.

**Files.** `app/(expedition-tabs)/discipline/page.tsx:500, 539, 593, 671, 710` · `app/(expedition-tabs)/applications/page.tsx:332` · `app/(expedition-tabs)/performance-reviews/page.tsx:382` · `components/review-periods-panel.tsx:238, 354 (grid-cols-3)` · `app/staff/page.tsx:319, 373` · `app/staff/[id]/page.tsx:534, 588` · `app/student/[id]/page.tsx:1933, 1998` (dialogs) and `:1297, 1322, 1359, 1413, 1438, 1568, 1587, 1671, 1696, 1733, 1787, 1812` (`<dl>` detail grids) · `app/staff/[id]/page.tsx:355, 392` · `app/expeditions/page.tsx:460` · `app/intake/page.tsx:704, 753, 791` · `app/intake-records/page.tsx:515, 571 (grid-cols-3), 616, 785, 844, 877 (grid-cols-3), 920` · `components/add-schedule-item-sheet.tsx:1176` (`grid-cols-2 gap-6` inside `p-8`).

**Shared fix.** `grid grid-cols-1 sm:grid-cols-2` (and `sm:grid-cols-3`). Exceptions that are fine as two columns on phone: paired short fields like Start/End date and Phone/Email (`intake:704`, `review-periods-panel:238`). For long forms entered on a phone (Discipline create, Add schedule item) prefer `Sheet side="bottom"` with `h-[92dvh]` and a sticky footer over a centred Dialog, because the on-screen keyboard pushes a centred dialog's footer off-screen.

### X5. Desktop controls hidden with `hidden sm:|lg:` instead of relocated — P0 on Add Scores, P1 elsewhere

**Pattern.** Controls disappear below a breakpoint with no mobile equivalent.

**Files.** `components/date-navigation.tsx:249, 289` (prev/next day chevrons `hidden sm:flex` — only the Daily view adds a mobile bottom bar; Add Scores does not) · `app/(expedition-tabs)/evaluate/[date]/evaluate-client.tsx:541-575` (location, counts, View schedule, Reason categories) and `:601` (the "N reasons needed" explanation `hidden md:inline-flex` while Submit stays disabled) · `app/(expedition-tabs)/schedule/[date]/schedule-view-client.tsx:798` (template apply `hidden sm:flex`), `:833` (Add activity; replaced by the FAB, fine), `:843` (Add scores `hidden lg:flex`), `:852-868` (edit mode `hidden lg:flex`, acceptable: drag editing is a desktop task) · `app/(expedition-tabs)/grades/page.tsx:263` ("as of" freshness `hidden md:inline`) · `app/(expedition-tabs)/awards/page.tsx:312` (formula text, acceptable).

**Shared fix.** A `components/mobile-tab-actions.tsx`: fixed bottom bar under `md:hidden` (the Daily view already has one at `schedule-view-client.tsx:1350-1380`) holding prev/next day + the page's one primary action, with an overflow `DropdownMenu` for the rest. Reuse on Add Scores and Daily view at least.

### X6. Tap targets under 44px — P1 on the scoring card, P2 elsewhere

**Evidence.** `components/score-control.tsx:64-76` Ban/N-A toggle: `p-0.5` around `h-3.5 w-3.5` ≈ 18×18px · `components/student-card.tsx:273-299` exclude/lock: `p-2` + `h-4 w-4` = 32px · `components/score-control.tsx:90, 111` stepper buttons `h-10` (40px) · `app/(expedition-tabs)/discipline/page.tsx:452, 464` and `components/previous-day-performance.tsx:207, 218` `h-8 w-8` icon buttons · `app/(expedition-tabs)/performance-reviews/page.tsx:967, 975` `h-9 w-9` · `size="sm"` (`h-8`) used for primary phone actions: `app/students/page.tsx:403`, passport export `passport-manifest/page.tsx:447-450`, `awards/page.tsx:695` · galley filter selects `h-8 … text-xs` (`app/supplies/page.tsx:763, 774`, `app/galley-equipment/page.tsx:300, 310`) · custom sheet close buttons `p-1.5` + `h-5 w-5` = 32px (`schedule-view-client.tsx:1066-1071, 1402-1407`) · `size="icon"` default is `size-9` (`components/ui/button.tsx:28`).

**Shared fix.** In `components/ui/button.tsx` add touch-aware sizing: `h-9 max-md:h-11` for `default`, `size-9 max-md:size-11` for `icon` (or use `@media (pointer: coarse)` via a `touch:` variant). For tiny inline toggles (Ban, lock, exclude) add a pseudo-element hit area: `relative before:absolute before:-inset-2.5` so the visual stays small but the target is 44px.

### X7. Micro-typography that fails in sunlight — P1 on the Daily view, P2 elsewhere

**Evidence.** `components/draggable-schedule-item.tsx:173 text-[10px]`, `:236, 240, 244, 252, 262 text-[11px]`, `:258 text-[8px]`, `:270, 276, 288, 294 text-[7px]` · `components/review-periods-panel.tsx:113 text-[10px]`, `:142, 144 text-[11px]` · `app/intake/page.tsx:256, 259 text-[10px]` · `components/previous-day-performance.tsx:255-265, 276 text-[11px]` · `components/today-schedule.tsx:325 text-[8px]` (avatar initials) · `app/(expedition-tabs)/performance-reviews/page.tsx:955 text-[10px]` · every table header and card field label is `text-xs` (12px) in `text-gray-600`/`text-muted-foreground`, and secondary text is frequently `text-gray-400` (≈2.8:1 contrast on white) — e.g. `draggable-schedule-item.tsx:235`, `student-card.tsx:283`, `awards/page.tsx:783`.

**Shared fix.** Floor body text at 12px, anything a staff member must read outdoors (times, names, scores) at 14px; replace `text-gray-400` body text with `text-gray-500`/`-600`. Consider a `high-contrast` class toggle on `<html>` that bumps `--muted-foreground`.

### X8. Phone sheets/dialogs with desktop padding — P2

`SheetContent … p-0` then inner `p-6` or `p-8`: `components/add-schedule-item-sheet.tsx:1135 (p-8 pb-24)`, `schedule-view-client.tsx:1397-1412 (p-6)`, `components/today-schedule.tsx:233-261`, `components/previous-day-performance.tsx:373-393 (px-6 py-5)`, `app/locations/page.tsx:282`, `app/supplies/page.tsx:885`. At 375px, `p-8` leaves 311px for fields. Fix: `p-4 sm:p-6`.

---

## A. Expedition tab pages

Reminder: every page below renders under the shared shell (breadcrumb + 13-tab icon bar that wraps on phones). On a 390×844 phone the shell plus navbar consumes roughly 170–200px before page content starts, so "above the fold" below means the remaining ~620px.

### Add Scores (/evaluate/[date]) — `evaluate-client.tsx`, `student-card.tsx`, `score-control.tsx`, `score-reason-field.tsx`, `journal-status-control.tsx`, `segmented-control.tsx`, `multi-select-dropdown.tsx`, `date-navigation.tsx`

**Intent on mobile.** The single most important phone job in the app: at the end of the day a staff member, probably standing, scores 10–20 students on 3–4 categories (±1 taps), marks journaling and fitness, adds reasons for anything off 3, and submits. Desktop extras: editing reason categories, bulk unlock/unblock, viewing counts.

**Findings.**

1. **P0 — No way to change day on a phone except the calendar popover.** `components/date-navigation.tsx:249` and `:289` put `hidden sm:flex` on the prev/next chevrons. The Daily view compensates with a fixed bottom bar (`schedule-view-client.tsx:1350-1380`); Add Scores has none (`evaluate-client.tsx:518-760` has no `md:hidden` bar). A staff member catching up on yesterday has to tap the date button, wait for the `ExpeditionCalendar` popover, then find the day.
2. **P0 — Submit is disabled with no visible reason on phones.** The amber "N reasons needed" chip is `hidden md:inline-flex` (`evaluate-client.tsx:601-606`) but Submit is disabled whenever `missingReasons.length > 0` (`:609`), with the explanation only in `title=` (`:610`) — a hover tooltip that never shows on touch. The toast fallback in `handleSubmitScores` (`:387-394`) cannot fire because the button cannot be tapped. On a phone the staff member sees a greyed "Submit (12)" and has to scroll through 12 cards looking for the missing reason.
3. **P1 — Submit lives at the top of a very long single column.** Cards are `grid grid-cols-1 items-start md:grid-cols-2 lg:grid-cols-3 gap-4` (`:738`). Each card is roughly 440–560px tall (header 56 + 3–4 steppers at ~70 + journaling 70 + fitness 70 + note 70 + padding; more when reason pickers open). With 15 students the Submit button is 6–8 screens above the last card. There is no sticky footer, so the end-of-flow action requires a long scroll back.
4. **P1 — Tap targets on the card are 18–40px.** Ban/N-A toggle `p-0.5` + `h-3.5 w-3.5` (`score-control.tsx:64-76`) ≈ 18px; exclude and lock buttons `p-2` + `h-4 w-4` (`student-card.tsx:273-299`) = 32px; stepper ± buttons `h-10` (`score-control.tsx:90, 111`) = 40px. One-handed on a moving boat these will be mis-tapped; a mis-tap on Ban silently clears the score and reason (`student-card.tsx:137-147`).
5. **P1 — Note field triggers iOS focus zoom.** `student-card.tsx:326` applies `text-sm` to the `Input`, overriding the system default `text-base md:text-sm` (`components/ui/input.tsx:11`). Safari zooms when a focused input's font-size is under 16px; after blur the page stays zoomed, which breaks the stepper layout.
6. **P1 — Two different destructive-looking `X` buttons.** "Unblock all categories" is an `X` icon button (`evaluate-client.tsx:566-575`) sitting next to Unlock-all and Submit; per-student "Exclude student" is also an `X` (`student-card.tsx:273-283`). Both explain themselves only via `title`. Unblock-all additionally writes `3` into every null score for every student (`:325-339`) — a one-tap bulk overwrite inches from Submit on a phone.
7. **P2 — Long names can push the lock/exclude buttons off the card.** `h3 … truncate` (`student-card.tsx:267`) is inside a `<div>` with no `min-w-0` (`:266`), whose parent `flex items-center gap-3` (`:246`) also lacks `min-w-0`, so `truncate` has no effect and the header's right-hand buttons get squeezed.
8. **P2 — Segment labels truncate with tooltip-only full text.** `segmented-control.tsx:306-307` relies on `title` for truncated labels; at 319px inner card width three journaling segments are ~106px each, so a label like "Incomplete/Late" at `text-sm` clips. On phones there is no tooltip.
9. **P2 — Day-type chip is a bare letter on phones.** `date-navigation.tsx:216-237` shows "S"/"O"/"A"; on desktop the adjacent location chip gives context, but that chip is `hidden sm:flex` (`evaluate-client.tsx:541`), so a phone shows "Mon, Nov 9 · S" and nothing else.
10. **P2 — `py-8` main padding** (`evaluate-client.tsx:627`) spends 32px of a tight fold; `py-4` on phone.

**Recommended mobile layout.**
- Top bar: date button full width (already `truncate`), day-type chip with the full word ("Offshore"), and an overflow `⋯` menu holding Unblock all / Unlock all / Reason categories / View schedule.
- Fixed bottom bar (`md:hidden`): ◀ prev · "Submit (12)" primary · ▶ next; when reasons are missing, show "3 reasons needed" in the bar and keep Submit tappable so the existing toast (`:387-394`) can tell the user who/what.
- Cards full-width, 48px control rows, 44px hit areas on Ban/lock/exclude; the reason picker remains inline.

**Concrete changes.**
- `components/date-navigation.tsx:249, 289`: remove `hidden sm:flex` (keep chevrons at all sizes) **or** render the mobile bottom bar below. The simplest fix is removing `hidden`.
- `evaluate-client.tsx:~760` (before `ReasonCategoriesDialog`): add
  `<div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white p-3 md:hidden"><div className="flex items-center gap-2">prev · <Button className="h-12 flex-1">Submit (N)</Button> · next</div>{missingReasons.length>0 && <p className="mt-1 text-center text-xs text-amber-800">…</p>}</div>` and a `<div className="h-24 md:hidden" />` spacer; mirror the Daily view bar at `schedule-view-client.tsx:1350-1382`.
- `evaluate-client.tsx:601`: `hidden md:inline-flex` → `inline-flex` (or move into the bottom bar). `:609`: drop `missingReasons.length > 0` from `disabled` and let the toast explain.
- `evaluate-client.tsx:566-575`: give Unblock-all a non-`X` icon (`Eraser`/`RotateCcw`) and hide it on phones (`hidden md:flex`) or move it to the overflow menu.
- `components/score-control.tsx:69`: `"relative p-0.5 rounded before:absolute before:-inset-2.5 before:content-['']"`; `:90, 111`: `h-10` → `h-11`; `:102`: `h-10` → `h-11`.
- `components/student-card.tsx:276, 288`: `p-2` → `p-3` (44px); `:266`: add `min-w-0`; `:246`: add `min-w-0 flex-1`; `:326`: remove `text-sm`.
- `components/segmented-control.tsx:300`: `text-sm` → `text-[13px] sm:text-sm` and shorten the label text at the data source if "Incomplete/Late" is the actual label.

### Daily view (/schedule/[date]) — `schedule-view-client.tsx`, `draggable-schedule-item.tsx`, `add-schedule-item-sheet.tsx`, `date-navigation.tsx`

**Intent on mobile.** "What's happening now, what's next, who's leading it, where are we" — read-mostly, glanced at many times a day, plus a quick add. Desktop: apply templates, drag/resize editing, save/delete templates.

**Findings.**

1. **P1 — The date itself truncates on phones.** The action bar is `flex flex-row items-center gap-4 justify-between flex-nowrap` (`:675`); the right group is `flex-shrink-0` (`:689`). When a schedule has galley team and dish day chips (each `truncate max-w-[180px]`, `:719, :754`) plus the day-type chip, the left `DateNavigation` (`flex-shrink min-w-0`, `date-navigation.tsx:242`; date text `truncate`, `:261`) is the only thing allowed to shrink, so at 375px the date reads "Mon, N…". The one thing the page is about is the first thing to go.
2. **P1 — Timeline cards are illegible at phone widths.** Cards are absolutely positioned at `width: 100/totalColumns %` (`:1020-1022`) inside a column that is the viewport minus the `w-16` hour gutter (`:1002`) minus `mx-2` (`draggable-schedule-item.tsx:137`). Two concurrent activities → ~140px cards; three → ~90px. Inside, staff name is `text-[11px] text-gray-500` (`:236`), time range `text-[11px]` (`:240`), participant avatars `h-3.5 w-3.5` with `text-[7px]` initials (`:269-276, 284-294`). None of that is readable in sun.
3. **P1 — An empty day cannot be filled from a phone.** Template select + Apply is `hidden sm:flex` (`:798-830`). The empty state (`:912-916`) just says "No activities for this day". Phone users can only add one activity at a time via the FAB.
4. **P2 — The bottom bar lacks the hand-off to scoring.** The mobile bar (`:1350-1380`) has prev / add / next (good 48–56px targets) but "Add scores for this day" is `hidden lg:flex` (`:843`), so the natural evening flow "check schedule → score" has no phone path except the tab strip.
5. **P2 — Location is `hidden lg:flex`** (`:692`) — on an offshore day "where are we" disappears below 1024px, even on a tablet.
6. **P2 — 16-hour timeline = ~1900px of scrolling.** `minHeight: timelineHoursCount * 120px` (`:1003`). On a phone that is 2.5 screens; a "now" marker/auto-scroll to the current hour isn't evident from the code read.
7. **P2 — Add Activity sheet.** `w-full sm:max-w-xl p-0` with inner `p-8 pb-24` (`add-schedule-item-sheet.tsx:1134-1135`) → 311px for fields at 375; time pickers `grid grid-cols-2 gap-6` (`:1176`); the five custom dropdowns are non-portaled absolute lists `max-h-64` (`:105-106, 201-215, 340-354, 528-543, 685-700, 817-833`) that are clipped by the sheet's `overflow-y-auto` and sit under the keyboard. The `pb-24` suggests a bottom action area; verify it is sticky inside the sheet.
8. **P2 — Item detail dialog** (`:1052`) is fine (`max-h-[85vh] flex flex-col`, inner scroll `:1080`), but its close button is 32px (`:1066-1071`) and the `DialogTitle text-2xl` (`:1058`) wraps long names into the close button's row.

**Recommended mobile layout.**
- Header: date (full), day-type word, location on its own line; galley/dish/staff-off chips in a collapsible "Day info" row under the date rather than in the title bar.
- Timeline: at `<md` fall back to a **list** (time · colour bar · title · lead staff) rather than the absolute-positioned grid; the Home card already has this list (`components/today-schedule.tsx:409-433`) and the schedule sheet has a table version — reuse `ScheduleRow`.
- Bottom bar: ◀ · + · ▶ plus a "Score this day" button; on an empty day the FAB opens a menu "Add activity / Apply template".

**Concrete changes.**
- `schedule-view-client.tsx:675`: `flex-nowrap` → `flex-wrap gap-3 lg:flex-nowrap`; `:689`: `flex-shrink-0` → `flex-shrink-0 w-full lg:w-auto` so chips drop to a second row instead of eating the date. Alternatively wrap the chips block (`:690-795`) in `hidden md:flex`.
- `:798`: `hidden sm:flex` → show the template select inside the empty state (`:912-916`) at all widths.
- `:1350-1380`: add `<Button variant="outline" className="h-12 w-12 rounded-full" onClick={() => router.push(\`/evaluate/${date}…\`)}><ClipboardList/></Button>`.
- `:1002, 1010`: at `<md` render `<ul className="divide-y md:hidden">{scheduledItems.map(item => <ScheduleRow…/>)}</ul>` and wrap the `ScheduleDragContext` block in `hidden md:block`.
- `draggable-schedule-item.tsx:236, 240, 244, 252`: `text-[11px]` → `text-xs`; `:258-294`: wrap the avatar stacks in `hidden md:flex`.
- `add-schedule-item-sheet.tsx:1135`: `p-8 pb-24` → `p-4 pb-24 sm:p-8`; `:1176`: `gap-6` → `gap-3`; replace the custom absolute dropdowns with `Popover`/`Command` (portaled, `max-h-[min(16rem,var(--radix-popover-content-available-height))]`) as `multi-select-dropdown.tsx:99-104` already does.

### Overview (/expedition/[id]) — `page.tsx`, `expedition-stats-cards.tsx`, `expedition-participants.tsx`, `student-evaluations-table.tsx`

**Intent on mobile.** Glance: stats, who is on board, who is in which department. Scores summary and destinations are desktop/admin.

**Findings.**
1. **P1 — Student Evaluations table is 7–8 columns.** `components/student-evaluations-table.tsx:134-141` (Student, Academics, Citizenship, Job Duties, Crew, Service, Journaling, View) at `h-14 px-4`, name cell `max-w-[180px]` (`:91`). ≈ 760px wide, horizontal scroll, no sticky name → score columns can't be read against names. Same component is on Home.
2. **P1 — Participants table 6 columns `px-4`** (`components/expedition-participants.tsx:384-389`: Name, Type, Role/Grade, Department, Bunk, Status) — the roster is the one list a phone user wants here, and it scrolls sideways.
3. **P2 — Destinations table 4–5 columns `px-4`** with a Coordinates column (`page.tsx:531-535`) — admin data, fine to hide Coordinates/Timezone under `md`.
4. **P2 — Department table `px-6` cells** (`:438-440, 458-482`): only 3 columns, but 48px padding per cell wastes a third of the width; the avatar chips inside already `flex-wrap`.
5. **P2 — Section header doesn't wrap** (`:386` `flex items-center justify-between`) with "Updated 3 minutes ago" + "Update Scores" (`:388-404`); at 375 the timestamp collapses. Home's version wraps (`home-dashboard.tsx:193`).
6. OK — Stats `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` (`expedition-stats-cards.tsx:49`).

**Recommended mobile layout.** Stats (2×3) → Participants as a grouped list (Staff / Students, avatar + name + role/department badge, bunk small) → Evaluations as stacked rows (name + 3–4 score pills, tap for the full record) → Departments as chips → Destinations as a simple port list.

**Concrete changes.**
- `student-evaluations-table.tsx:134-141`: add `hidden md:table-cell` to Crew, Service, Journaling; change `HEAD_CLASS` `px-4` → `px-3 md:px-4`; or render a `StudentEvaluationCards` under `md:hidden`.
- `expedition-participants.tsx:384-389`: `hidden md:table-cell` on Type (already obvious from grouping), Bunk, Status; `headerCell` `px-4` → `px-3`.
- `page.tsx:531-535`: `hidden md:table-cell` on Coordinates and Timezone; `:438-440, 458-482`: `px-6` → `px-3 md:px-6`.
- `page.tsx:386`: add `flex-wrap gap-3`.

### Awards (/awards) — `awards/page.tsx`

**Intent on mobile.** Quick check: "how much has Maya earned this week?" and "did she lose anything?" The per-day breakdown and the worked-example explainer are laptop reading.

**Findings.**
1. **P1 — Summary table 6 columns with sub-text.** Header `:721-726` (chevron `w-8`, Student `px-3 sm:px-6`, Days scored, Potential, Deductions, Earned). Deductions carries an inline `(78% kept)` (`:766-768`) and Earned a second line "locked · still open" (`:783`); with avatar + name the row is ≈ 620px → sideways scroll with the student name scrolled off while reading dollars.
2. **P1 — Expanded breakdown is a 10–11 column table inside a row.** `:160-173` (Day, each category, Potential, Perf. score, Perf. %, Cit. %, Deductions, Earned) in its own `overflow-x-auto` (`:160`) nested inside the outer table's scroll container — two horizontal scrollers stacked.
3. **P2 — Filter controls are 32px tall.** Period `SelectTrigger h-8 w-[15rem]` (`:650`), two `type=date` inputs `h-8` (`:673-690`), Clear `h-8` (`:695`). `flex-wrap` saves the layout, but native date pickers on a 32px input are fiddly.
4. OK — HowItWorks header (`:299-323`) swaps label `sm:hidden` / `hidden sm:inline` and its explainer tables use `grid gap-4 md:grid-cols-2` (`:331`).

**Recommended mobile layout.** Card per student: avatar, name, **Earned** large and green, "Potential $X · −$Y deductions · N days" small; chevron opens a vertical per-day list (date, category pills, earned). Keep the matrix at `md+`.

**Concrete changes.**
- `:721-726`: `hidden md:table-cell` on Days scored and Potential; move `(kept)` and lock sub-text under `md:` (`hidden md:inline`/`md:block`).
- `:160-212`: under `md:hidden` render `d.days.map(d => <div className="flex items-center justify-between py-2">…`) and keep the table `hidden md:block`.
- `:650, 673, 685, 695`: `h-8` → `h-10 md:h-8`.

### Performance Reviews (/performance-reviews) — `performance-reviews/page.tsx`, `review-periods-panel.tsx`

**Intent on mobile.** Weekly, mostly laptop (writing narrative). Phone: read a student's review, download/email the PDF.

**Findings.**
1. **P1 — One 5-column table per student** (`:936-940`: Created, Report Name, Start Date, End Date, Actions; `px-6`) repeated N times; with 2–3 rows each the date columns are wasted and the Actions column (three `h-9 w-9` buttons, `:967-990`) scrolls off-screen.
2. **P1 — Review dialog is a desktop document.** `w-full sm:max-w-3xl max-h-[90vh]` (`:346-347`): an 8-column Daily Scores table (`:589-599`) with Reasons `min-w-[14rem]` (`:639`) inside `overflow-x-auto` (`:588`); `Textarea min-h-[120px]` (`:662`) — when the keyboard opens, the centred dialog's footer (Close / Email to Parent / Save, stacked `flex-col-reverse`, `components/ui/dialog.tsx:112`) is off-screen, so saving requires dismissing the keyboard first.
3. **P2 — Review periods panel.** Timeline segments carry `text-[10px]` labels (`review-periods-panel.tsx:113`) and the legend is `text-[11px]` (`:142-144`); periods table is 6–7 columns in `overflow-x-auto` (`:591-601`). Header buttons `flex-wrap` (`:548`) — good.
4. **P2 — Finalize dialog** `grid grid-cols-3 gap-2` stat tiles (`:354`) ≈ 100px each at 343 — OK for three numbers; `max-h-[90vh] overflow-y-auto` (`:341`) fine.
5. **P2 — Dialog header title is one long string** ("Firstname Lastname — Final Expedition Evaluation", `:351-356`) → three lines on a phone before any content.

**Recommended mobile layout.** Student accordion: avatar + name + "3 reviews"; rows "Week 2 · Nov 2–8 · Finalized" with a single `⋯` for Preview/PDF/Email. Review dialog on phones: `Sheet side="bottom" h-[95dvh]`, Notes textarea first, Daily Scores as a vertical day list, sticky Save.

**Concrete changes.**
- `:936-940`: `hidden md:table-cell` on Created, Start Date, End Date; put the date range under Report Name as a `text-xs` line at `md:hidden`.
- `:346-347`: `className="w-full sm:max-w-3xl max-h-[90vh] max-md:h-[100dvh] max-md:max-h-none max-md:top-0 max-md:translate-y-0 max-md:rounded-none flex flex-col overflow-hidden"` so the keyboard doesn't push the footer away; or switch to `Sheet` under `md`.
- `:589-599`: wrap in `hidden md:block` and add a `md:hidden` stacked list.
- `review-periods-panel.tsx:113`: `text-[10px]` → `text-xs` and hide labels on segments narrower than ~48px.

### Discipline (/discipline) — `discipline/page.tsx`, `discipline-fields.tsx`

**Intent on mobile.** Core on-boat job #3: an incident just happened; a staff member on a phone picks the student, the reason (which sets severity), the consequence (+days), types a summary, and saves. Also: glance at a student's recent records. Desktop: PDF export, editing.

**Findings.**
1. **P0 — Reason and Consequence columns disappear on phones.** The table is `table-fixed w-full` (`:393`) with hard widths 80+90+150+100+120+100 = 640px (`:396-403`) and Reason/Consequence as the two `auto` columns. At 375 (or 430) the fixed columns already exceed the width, the auto columns get ~0px, and their `truncate` (`:441, 444`) shows nothing. The record list on a phone shows when/who/date/staff but not **what happened**.
2. **P1 — Create/Edit form grids.** `w-full sm:max-w-2xl max-h-[90vh] flex flex-col` (`:486, 662`) with three `grid grid-cols-2 gap-4` rows (`:500, 539, 593` / `:671, 710`). At 343px: Student `Select` and Date button in 155px columns (names like "Christopher Hernandez" line-clamp, `components/ui/select.tsx:22`); Reason select + Consequence field — `DisciplineConsequenceField` reserves `w-[6.5rem]` for the days input (`discipline-fields.tsx:116`), leaving ~50px for the consequence `Select` when days are shown. The `SeverityTag` in each reason item is `ml-auto … text-[10px]` (`discipline-fields.tsx:38-46`) and will wrap under the reason text in a 155px list.
3. **P1 — Keyboard vs. centred dialog.** Two `Textarea`s `rows={4}` and `rows={3}` (`:744-760`) are the last fields; the dialog is `top-[50%] translate-y-[-50%]` (`components/ui/dialog.tsx:64`). On iOS the visual viewport shrinks by ~300px when typing, so the "Create Record" footer (`:764-771`) is hidden and the user has to dismiss the keyboard to save.
4. **P2 — Row action buttons are 32px** (`:452, 464` `h-8 w-8`), with Download first — a mis-tap generates a PDF. The row itself opens the record (`:431`), so the buttons could be `md:` only.
5. **P2 — Header** `flex items-start justify-between` (`:378`) with `text-2xl` + "New Record" fits at 375, but the description (`:380-382`) wraps under the button. Fine with X3's shared header.

**Recommended mobile layout.**
- List (`md:hidden`): card per record — severity badge + student name (bold), date · staff, reason (full), consequence (+days); tap opens.
- Form on phones as a bottom sheet (`h-[95dvh]`): Student → Date → Reason → Consequence (+days inline) → Summary → Action taken → sticky "Create Record"; one column.
- Keep the table `hidden md:block` with % widths.

**Concrete changes.**
- `:396-403`: replace `style={{ width: "80px" }}` etc. with `className="w-[10%] hidden lg:table-cell"` (Created), `w-[12%]` (Type), `w-[18%]` (Student), `w-[12%] hidden md:table-cell` (Date), Reason/Consequence `w-auto`, Staff `w-[14%] hidden md:table-cell`, Actions `w-[10%] hidden md:table-cell`.
- `:500, 539, 593, 671, 710`: `grid grid-cols-2 gap-4` → `grid grid-cols-1 gap-4 sm:grid-cols-2`.
- `discipline-fields.tsx:111-130`: `flex items-start gap-2` → `flex flex-col gap-2 sm:flex-row sm:items-start`; `:116`: `w-[6.5rem]` → `sm:w-[6.5rem]`.
- `:486, 662`: add `max-md:h-[100dvh] max-md:max-h-none max-md:top-0 max-md:translate-y-0 max-md:rounded-none` (or use `Sheet side="bottom"`), and `DialogFooter` `className="border-t pt-4 max-md:sticky max-md:bottom-0 max-md:bg-white"`.
- `:452, 464`: wrap the actions `div` in `hidden md:flex`.

### Grades (/grades) — `grades/page.tsx`, `grade-cell.tsx`

**Intent on mobile.** Look up one student's GPA/letter quickly; the full class matrix is desktop.

**Findings.**
1. **P1 — Sticky Student column is 220px of a 343px viewport.** `sticky left-0 z-10 … min-w-[220px]` (`:310, 325`) + GPA `w-[70px]` + Average `w-[100px]` + N × `min-w-[120px]` classes (`:311-316`). On a phone about 120px of scrolling content is visible beside the sticky column, the sticky cells are `bg-white` with no edge shadow, and the `overflow-x-auto` wrapper (`:306`) is nested inside shadcn's own (`components/ui/table.tsx:9`).
2. **P2 — Toolbar wraps to 3–4 lines.** `flex flex-wrap` (`:234`) with Select `w-[200px]` + `w-[160px]` (`:236, 248`) + status text + `ml-auto` refresh group (`:262-275`); the "Toddle scores as of …" freshness line is `hidden md:inline` (`:263`) — precisely the thing a phone user wants to know before trusting the number.
3. OK — Legend chips `text-xs` (`grade-cell.tsx:34`), header `flex-col gap-3 sm:flex-row` (`:223`), cells `whitespace-nowrap` (`grade-cell.tsx:49`).

**Recommended mobile layout.** Sticky column 140px (name truncated, GPA under it in `text-xs`), class columns 96px, right-edge shadow on the sticky cells; freshness line visible; or a per-student card with class chips at `<md`.

**Concrete changes.**
- `:310, 325, 353`: `min-w-[220px]` → `min-w-[140px] md:min-w-[220px]`; add `shadow-[inset_-1px_0_0_theme(colors.gray.200)]`.
- `:311`: hide GPA on phone and show it under the name inside the sticky cell (`md:hidden text-xs`).
- `:314`: `min-w-[120px]` → `min-w-[96px] md:min-w-[120px]`.
- `:263`: `hidden md:inline` → `basis-full text-xs md:basis-auto md:text-sm`.
- `:306`: remove the extra `overflow-x-auto` div (shadcn already provides it) so there is one scroll container for the sticky column.

### Applications (/applications) — `applications/page.tsx`

**Intent on mobile.** Pre-expedition admin; phone use is reading one application.

**Findings.**
1. **P1 — Career Goals column has no width on phones.** `table-fixed` with 80+120+120+100+100 = 520px fixed (`:218-226`); the `auto` Career Goals column collapses and its `truncate` (`:263`) hides it.
2. **P2 — Detail dialog** `w-full sm:max-w-2xl max-h-[90vh] flex flex-col` (`:319`) with `flex-1 overflow-y-auto` (`:330`) is fine; `grid grid-cols-2` (`:332`) holds two short department names — acceptable.
3. **P2 — Header** `flex items-center justify-between gap-4` (`:194`) with `text-2xl` + "Copy apply link" `size="sm"` — fits; the button is 32px.

**Concrete changes.** `:221-226`: `style={{width}}` → `%` widths; `hidden md:table-cell` on 2nd Choice, Resume; Actions `hidden md:table-cell` (row is clickable at `:249-252`).

### Assignments (/expedition/[id]/assignments) — `assignments/page.tsx`

**Intent on mobile.** Look up a bunk/laptop/department; the editing (department multi-select, dish teams, galley teams) is pre-departure desktop work.

**Findings.**
1. **P1 — Department column forces 300px** (`:866, 670` `w-[300px] min-w-[300px]`) with inner `w-[220px]` select/popover triggers (`:682, 709`); the dish-team table pins 1060px of `min-w` (`:975-981`); every cell `px-6`.
2. **P2 — Galley team table** uses `%` widths (`:1289-1292`) — good — but its popover triggers are `w-full h-10` in a 50% column, fine.
3. **P2 — Section headers** `flex items-center justify-between` (`:946`) fit (one `size="sm"` button).

**Concrete changes.** `:866, 670`: `w-[300px] min-w-[300px]` → `md:w-[300px] md:min-w-[300px]`; `:682, 709`: `w-[220px] …` → `w-full md:w-[220px]`; `:975-981`: drop `min-w`/`max-w` below `md`, `hidden md:table-cell` on Support/Supervisor; at `<md` render an accordion per student (Department / Bunk / Laptop stacked, read-only unless admin).

### Passport manifest (/expedition/[id]/passport-manifest) — `passport-manifest/page.tsx`

**Intent on mobile.** At a dock or customs desk: find a person's passport number, expiry and status, hand over the PDF. This page is plausibly used on a phone more than on a laptop.

**Findings.**
1. **P1 — 11 columns, 1150px of `min-w`, `px-6` cells.** `:461-471` / `:505-515`: Name 180, Crew Role 110, DOB 110, Gender 90, Nationality 110, Passport # 120, Issue 110, Expiration 110, Status 90, Photo 70, 50. Passport # and Expiration — the fields an official asks for — are ~700px to the right with no sticky name.
2. **P2 — Stats are three stacked full-width cards** `grid grid-cols-1 md:grid-cols-3` (`:407`) — ~300px of the fold for three integers; `grid-cols-3` fits them on phone.
3. **P2 — Toolbar** `px-6 py-3 flex items-center justify-between` (`:431`) with Select `h-8 w-[130px] text-xs` and Export `h-8 text-xs` (`:434, 447-450`) — 32px targets, 12px text.

**Recommended mobile layout.** Search box + person cards (photo, name, role; **Passport # · Exp. date** as the second line; status badge; tap for DOB/nationality/issue date), Export PDF as a full-width primary button at top. Table `hidden md:block`.

**Concrete changes.** `:407`: `grid-cols-1 md:grid-cols-3` → `grid-cols-3`; `:434, 447`: `h-8 text-xs` → `h-10 text-sm md:h-8 md:text-xs`; `:505-515`: keep Name, Passport #, Expiration, Status at `<md`, `hidden md:table-cell` on the rest, `px-6` → `px-3 md:px-6`, make Name `sticky left-0 bg-white`.

### Route map (/map) — `map/page.tsx`

**Intent on mobile.** "Where are we, what's next" — a phone page by nature.

**Findings.**
1. **P2 — Fold.** Title + boat status paragraph (`:150-180`) is ~110px before the map; map `h-[60vh] min-h-[420px]` (`:188`) = 506px on an 844px phone, then legend `text-xs` (`:222`), then the stops list. Reasonable; could collapse the status line into a chip over the map.
2. OK — Stop rows `py-2.5` with `h-7 w-7` index bubble ≈ 44px (`:291-296`), `flex-wrap` legend, `truncate` with `min-w-0` (`:310`), badges `text-[11px]` (`:300` → bump to `text-xs`).

**Concrete changes.** `:188`: `h-[60vh] min-h-[420px]` → `h-[55vh] min-h-[360px] md:h-[60vh]`; `:300` badge `text-[11px]` → `text-xs`.

---

## B. Top-level pages

### Home (/home) — `home-dashboard.tsx`, `today-schedule.tsx`, `previous-day-performance.tsx`, `student-evaluations-table.tsx`

**Intent on mobile.** First screen after login: today's schedule and how yesterday went. Stats and the full evaluations table are secondary on a phone.

1. **P1 — Today's schedule starts ~700px down.** Order is `ExpeditionStatsCards` (2 cols × 3 rows ≈ 300px, `expedition-stats-cards.tsx:49`) then the `grid gap-6 lg:grid-cols-5` with `TodaySchedule` first (`home-dashboard.tsx:168-189`). Add navbar 56 + shell ~120 + expedition header ~110 (`:128-166`) and the schedule heading is below the fold on 390×844.
2. **P1 — Day sheet table squeezes the activity name.** `components/today-schedule.tsx:289-291`: Time `w-[120px]`, Staff `w-[150px]` in a `w-full` phone sheet (`:233`) → ~75px for Activity; titles wrap one word per line.
3. **P1 — StudentEvaluationsTable** (`home-dashboard.tsx:234`) — same 7-column table as Overview (see A/Overview #1).
4. **P2 — PreviousDayPerformance table** is `table-fixed` with Student `w-[30%]` + 6–8 `px-1` score columns (`previous-day-performance.tsx:272-284`): at 343px that's a 103px name and ~34px per score pill — it works, but headers "Citz/Jrnl/Fit" are `text-[11px]` and the prev/next buttons are `h-8 w-8` (`:207, 218`).
5. OK — `TodaySchedule` list rows (`:409-433`) and empty/error states; Home header wraps (`:137`, `:193 flex-wrap`).

**Concrete changes.**
- `home-dashboard.tsx:170`: add `order-2 lg:order-none` to stats and `order-1` to the schedule/performance grid (or `className="hidden md:grid"` on stats with a compact one-line summary at `<md`).
- `today-schedule.tsx:289-291`: `w-[120px]` → `w-[72px] sm:w-[120px]`, `w-[150px]` → `hidden sm:table-cell sm:w-[150px]` and show the staff initials chip under the title at `sm:hidden`.
- `previous-day-performance.tsx:207, 218`: `h-8 w-8` → `h-10 w-10`.

### My Expeditions (/my-expeditions)

**Intent.** Pick the expedition I'm on — a phone entry point. 6-column table `px-6` (`:78-83`, `:136-141`: Name, Type, Dates, Duration, Status, Actions) → P1; a Name + Status row is all a phone needs. Fix: `hidden md:table-cell` on Type, Duration, Actions; `px-6` → `px-4`.

### All Expeditions (/expeditions)

**Intent.** Admin; phone use rare. Header already responsive (`:215-250`). Table 7 columns `px-6` (`:260-266`) → P1 same fix. Dialog `grid grid-cols-2 gap-4` (`:460`) for Start/End dates is acceptable; footer already `flex-col-reverse sm:flex-row` (`:676`).

### Students (/students)

**Intent.** Staff view (per expedition): roster with department/dish-day quick edits — plausible on a phone. Admin view: desktop.
1. **P1 — Admin header overflows the viewport.** `flex items-center justify-between` (`:430`) with Add Student + "Reload Toddle Students" + Switch/label in a `gap-4` row (`:438-470`) ≈ 560px → page scrolls horizontally.
2. **P1 — Tables.** Staff view 5 cols with inline `Select` triggers `w-[120px] h-8` / `w-[110px] h-8` (`:563, 588`); admin table with `w-[240px]…w-[280px]` fixed widths (`:745-750`) ≈ 1020px.
3. OK — Expedition filter bar (`:395-418`) fits (switch + small button).

**Concrete changes.** `:430`: → `flex flex-col gap-3 md:flex-row md:items-center md:justify-between`; `:745-750`: `%` widths + `hidden md:table-cell` on Email, Expeditions; `:483-487`: `hidden md:table-cell` on Application; Select triggers `h-8` → `h-10 md:h-8`.

### Student detail (/student/[id]) — skimmed

**Intent.** Read a student's profile/scores; occasionally edit. Phone: read.
1. **P2 — Hero badges don't wrap.** `flex items-center gap-2` (`:809-830`) with up to five badges (grade, department, dish day, laptop, bunk) → overflow at 375. Add `flex-wrap`.
2. **P1 — Requirements table** 3 cols `px-6 py-4` with `truncate max-w-[400px]` descriptions (`:945-1101`) → the description text is the point; on phone let it wrap (`whitespace-normal`) and stack Average/Evaluation under the requirement.
3. **P2 — `<dl class="grid grid-cols-2 gap-x-6">` ×10** (`:1297…1812`) — fine for short values; emails/phones will wrap mid-string; `break-all` on those `dd`s.
4. **P2 — Edit dialog** `sm:max-w-[700px]` with `max-h-[70vh] overflow-y-auto` and `grid grid-cols-2` (`:1921-1998`) → single column at `<sm`; review dialog (`:2333-2509`) mirrors Performance Reviews #2.
5. OK — Chart `h-[300px] w-full` (`:1134`).

### Staff (/staff) and Staff detail (/staff/[id])

**Intent.** Admin directory; phone: look up a phone/email. Table 5 cols `px-6` (`staff/page.tsx:181-185`) with expedition chips `flex-wrap` (`:248`) → P1 hide Expeditions/Status at `<md`. Dialog `sm:max-w-[700px]` with `max-h-[70vh] overflow-y-auto` and two `grid grid-cols-2 gap-4` blocks of 8+ inputs (`:319-446`; `staff/[id]/page.tsx:534-661`) → P2 `sm:grid-cols-2`. Detail `dl grid grid-cols-2 gap-4` (`staff/[id]/page.tsx:355, 392`) OK.

### Students & Staff (/students-staff)

`app/students-staff/page.tsx:1-18` renders "Coming soon..." under a `text-3xl` header. P2: if it's linked from the nav, unlink it or redirect to `/students`; a dead page on a phone is a wasted tap.

### Passage Logs (/passage-logs)

**Intent.** Reviewing logs after a passage; entry happens on `/public/passage-logs` (out of scope). Phone: read one log.
1. **P1 — Header overflows.** `flex items-center justify-between` (`:150`) with Select `w-[220px]` + Map View + New Log (`:159-185`) ≈ 460px.
2. **P1 — 7-column table `px-6`** incl. an ID column (`:196-202`); Departure/Destination `truncate max-w-[140px]` (`:254, 259`).
3. OK — Detail sheet `w-full sm:w-[75vw] sm:max-w-[1200px] sm:min-w-[600px]` (`:339`) with a two-column key/value `Table` (`:355-376`) reads well on a phone.

**Concrete changes.** `:150`: X3 header; `:160`: `w-[220px]` → `w-full md:w-[220px]`; `:196-202`: hide ID, Supervisor, Status at `<md`, `px-6` → `px-3 md:px-6`.

### Locations (/locations)

Already mobile-aware: `px-4 sm:px-6`, header `flex-col sm:flex-row` (`:186`), `table-fixed` `%` widths (`:200-205`), sheet `w-full sm:w-[480px]` (`:282`), textarea `min-h-[88px]` (`:326`). P2: Actions column `w-[15%]` (`:205`) is ~51px at 343 — verify the action buttons in `:254-270` fit side by side; if not, `w-[20%]` and `px-1`.

---

## C. Galley / inventory pages

These already follow the better pattern (`table-fixed`, `%` widths, `hidden md:table-cell`, `px-2 md:px-6`, stacked headers, `w-full sm:w-[…]` sheets). Findings are mostly about targets and the phone edit path.

### Galley Inventory (/inventory)

**Intent.** Counting stock at the galley counter on a phone/tablet; admin adds items and locations.
1. **P2 — Phone shows checkbox 12% + Name 30% + Pkg/Qty 28% + Total Oz 30%** (`:900-909`): Name ≈ 103px at 343 and `overflow-hidden` (`:1005`) truncates "Whole wheat spaghetti" etc. Consider Name 42% / Pkg-Qty 28% / Total 30% and moving the checkbox into a long-press or `md:` only.
2. **P2 — Row actions are `hidden md:table-cell`** (`:961, 1058`). If the row's `onClick` (`:985`) opens the item sheet this is fine; otherwise phones have no edit path. Verify.
3. OK — Search full width `h-9` (`:860-868`), admin buttons `flex-1` (`:873-893`), bulk bar `sticky top-14 z-30` (`:756`) correctly offsets the `h-14` navbar, help Popover `w-80` (`:824`) fits at 375.

### Supplies (/supplies), Galley Equipment (/galley-equipment), Linen (/linen-inventory), Uniforms (/uniform-inventory)

Same pattern (`supplies:616-622`, `galley-equipment:219-222`, `linen:339-345`, `uniform:370-375`).
1. **P2 — Filter selects are `h-8 … text-xs`** (`supplies:763, 774`; `galley-equipment:300, 310`) — 32px/12px on a page used standing at a counter. → `h-10 text-sm md:h-8 md:text-xs`.
2. **P2 — Actions `hidden md:table-cell`** (`supplies:622, 681`; `galley-equipment:222, 251`; `linen:345, 385`; `uniform:375, 473`) — same "verify row tap opens the sheet" note; the photo thumb in Supplies is already `touch-manipulation` and 40px (`supplies:219`).
3. OK — Rows `h-12`/`h-14` (48–56px), `w-1/3` phone columns in linen/uniform, headers `flex-col gap-3 md:flex-row` (`linen:423`, `uniform:343`), sheets `w-full sm:w-[520px]` with `aspect-[4/3]` photo (`supplies:929`).

### Meal Planning (/meal-planning) and Recipe (/meal-planning/[id])

1. OK — `container px-4 sm:px-6 lg:px-8`, `text-xl sm:text-2xl` (`meal-planning:504-507`), search + buttons `flex-col sm:flex-row` with `h-10` (`:513-548`), `%`-width table with Equipment `hidden lg:table-cell` (`:401-405`) — `table-fixed` re-normalises the remaining percentages so Photo/Edit still get ~45px.
2. OK — Recipe hero `flex-col sm:flex-row`, photo `w-full sm:w-48 h-48` (`[id]:625-636`), ingredients table 8 cols pruned to 4 on phone (`:723-730`), sheets `w-full sm:max-w-lg`.
3. **P2 — `overflow-x-hidden` on the ingredients wrapper** (`[id]:719`) deliberately disables sideways scroll, so any overflow is simply cut. Fine as long as the `%`s add to 100 at every breakpoint (they do: 40+25+20+15).
4. **P2 — Ingredient search dropdown** uses a `fixed inset-0 z-40` backdrop (`:1078`) and `sticky bottom-0` footer (`:1129`) inside the sheet — works, but with the keyboard open the list's `max-h` is unknown; verify it stays reachable.

### Student Intake (/intake)

**Intent.** Long multi-section form, often filled by a parent/student on a phone.
1. **P2 — Sticky progress bar `top-0 z-10`** (`:252`) will sit under the navbar (`sticky top-0 z-50 h-14`, `components/navbar.tsx:109-112`) if the navbar renders on this route — verify; if so `top-14`.
2. **P2 — Progress labels `text-[10px]`** (`:256, 259`).
3. **P2 — Fixed bottom nav** (`:840-876`) good; buttons `min-w-[100px]` at default `h-9` → `h-11` on phones. `pb-24` spacer present (`:272`).
4. OK — Single-column fields with `grid grid-cols-2` only for phone/email pairs (`:704, 753, 791`), inputs `bg-white` on `bg-gray-50`.

### Intake Records (/intake-records)

1. **P1 — `table-fixed` with 780px of hard widths** (`:287-291`: 200+140+100+220+120) → Link-to-student and Actions off-screen.
2. **P1 — Record dialog** `sm:max-w-3xl max-h-[90vh] p-0` (`:501`) with seven `grid grid-cols-2|3 gap-4` blocks (`:515-920`) — medical/medication text in ~100px columns is hard to read when it matters (nurse on a phone).
3. **P2** — Link popover `w-[280px]` (`:417`) fits.

**Concrete changes.** `:287-291`: `%` widths, `hidden md:table-cell` on Submitted and Link; `:515-920`: `grid-cols-1 sm:grid-cols-2`/`sm:grid-cols-3`.

---

## Priority list (top 15, ordered by impact on scoring → today's schedule → discipline entry)

1. **Add Scores: mobile bottom bar** with ◀ ▶ day navigation and Submit — `evaluate-client.tsx` (add after `:760`), or at minimum drop `hidden sm:flex` at `components/date-navigation.tsx:249, 289`. (P0)
2. **Add Scores: explain the disabled Submit on phones** — `evaluate-client.tsx:601` show the "N reasons needed" chip at all widths and/or remove `missingReasons.length > 0` from `:609` so the toast at `:387-394` runs. (P0)
3. **Add Scores: 44px targets on the card** — `score-control.tsx:69` (Ban hit area), `:90, 102, 111` (`h-11`), `student-card.tsx:276, 288` (`p-3`). (P1)
4. **Add Scores: stop iOS zoom** — remove `text-sm` from the Note input at `student-card.tsx:326`. (P1)
5. **Add Scores: de-risk "Unblock all"** — `evaluate-client.tsx:566-575`: new icon, hide under `md`, or confirm. (P1)
6. **Discipline: fix the dead Reason/Consequence columns** — `discipline/page.tsx:396-403` `%` widths + `hidden md:table-cell`; card list at `<md`. (P0)
7. **Discipline: phone-friendly form** — `discipline/page.tsx:500, 539, 593, 671, 710` → `grid-cols-1 sm:grid-cols-2`; `discipline-fields.tsx:111-116` stack consequence + days; full-height/bottom-sheet dialog with sticky footer at `:486, 662`. (P1)
8. **Daily view: keep the date legible** — `schedule-view-client.tsx:675` `flex-wrap`, chips `:690-795` to a second row or `hidden md:flex`. (P1)
9. **Daily view: list layout under `md`** — reuse `ScheduleRow` from `today-schedule.tsx:409-433` in place of the absolute timeline (`schedule-view-client.tsx:1000-1040`); raise `text-[11px]`/`[7px]` in `draggable-schedule-item.tsx:236-294`. (P1)
10. **Daily view: phone paths for templates and scoring** — template select out of `hidden sm:flex` (`:798`) into the empty state; "Score this day" in the bottom bar (`:1350-1380`). (P1/P2)
11. **Home: schedule first on phones** — `home-dashboard.tsx:170-189` reorder; fix `today-schedule.tsx:289-291` column widths. (P1)
12. **Shared: `StudentEvaluationsTable` stacked at `<md`** — `components/student-evaluations-table.tsx:134-141` (Home + Overview). (P1)
13. **Shared: kill hard px column widths** — `applications:221-226`, `passport-manifest:461-471/505-515`, `intake-records:287-291`, `assignments:866, 975-981`, `students:745-750`. (P1)
14. **Shared: header wrap pattern** from `expeditions/page.tsx:215-250` applied to `students:430`, `passage-logs:150`, `applications:194`, `discipline:378`. (P1)
15. **Shared: dialog grids `grid-cols-1 sm:grid-cols-2`** across the X4 list, and touch-size `Button` variants in `components/ui/button.tsx:24-31`. (P1/P2)

---

## Open questions for the senior reviewer

1. **Device reality for scoring.** Is end-of-day scoring actually done on phones, or on the saloon laptop/iPad? If a 768px+ tablet is the norm, items 1–5 drop from P0/P1 to P2 (at `md` the action bar fits and chevrons show), and the `lg:grid-cols-3` card grid is the real target.
2. **Discipline entry timing.** Same question: same-day on a phone, or written up later? This decides whether the form should become a bottom sheet (item 7) or just get `sm:` grid prefixes.
3. **Should "Unblock all categories" exist on mobile at all?** It bulk-writes `3` into null scores (`evaluate-client.tsx:325-339`) with no confirmation; on desktop it has a tooltip, on phones nothing.
4. **Galley tables hide the action column under `md`** (`inventory:961`, `supplies:622`, `galley-equipment:222`, `linen:345`, `uniform:375`). Does a row tap open the edit sheet on every one of these? If not, phone users cannot edit stock — a P1 I could not confirm from the grep alone.
5. **Shared primitive vs. per-page fixes.** Twenty-plus tables share the same shape; is there appetite for a `components/mobile-card-list.tsx` + `ResponsiveTable` wrapper, or should fixes stay local (the galley `hidden md:table-cell` pattern)?
6. **Breakpoint convention.** Pages mix `sm:` (640) and `md:` (768) as "the phone cut-off". A 430px phone in landscape is 932px — `lg:`-gated edit tools appear while touch targets stay small. Should we standardise on `md:` as "tablet and up" and treat `lg:` as "has a pointer"?
7. **Sun legibility.** There is no high-contrast mode; `text-gray-400` is used for secondary text throughout. Is a `prefers-contrast`/manual "bright" toggle in scope, or do we just floor at `gray-500` and 12px?
8. **`/students-staff`** is a "Coming soon" page (`app/students-staff/page.tsx`). Is it linked from the nav? If so, unlink.
9. **Does the navbar render on `/intake`?** If yes, the form's `sticky top-0 z-10` progress bar (`app/intake/page.tsx:252`) is hidden behind the `h-14 z-50` navbar.
10. **Offline/intermittent connectivity on Add Scores.** Submissions loop sequentially (`evaluate-client.tsx:398-480`) and throw on the first failure; a half-submitted day on a flaky connection leaves some students locked and some not, with only a toast. Out of layout scope but worth a product decision (queue + retry, or per-card save).
