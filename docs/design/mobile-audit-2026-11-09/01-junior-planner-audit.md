# Junior mobile audit — Planner pages

Scope: `/planner` (Weekly Planner) and `/dashboard` (Trip Planner) inside the expedition tab shell, plus `components/navbar.tsx` and `components/expedition-header.tsx`. Audited by reading the code and by loading both pages in the in-app browser at 375×812 and 768×1024 against the dev server already running on port 3000 (the `expeditions-dev-3011` launch config failed with "Unable to acquire lock", so I reused the live instance; it had a signed-in session). All line numbers are from the files as they are on disk today (uncommitted working tree). No source files were changed.

Three corrections to the brief before the findings, because they change what the audit is about:

1. **The Weekly Planner has no drag and drop.** `app/(expedition-tabs)/planner/page.tsx` never imports `DraggableScheduleItem`, `ScheduleDragContext` or anything from `@dnd-kit`. dnd-kit is used only by the Daily View (`app/(expedition-tabs)/schedule/[date]/schedule-view-client.tsx:63-64, 987, 1024`). I audited the sensors anyway (see "Daily View drag, for the record" under Weekly Planner) since they are the only touch-DnD in the app.
2. **It is a 5-day grid, not 7.** `days` is `[center-1, center, center+1, center+2, center+3]` (`planner/page.tsx:829-837`) rendered with `grid grid-cols-5` (`:1178`, `:1370`).
3. **`/dashboard` does not render `expedition-calendar`, `expedition-stats-cards`, `expedition-route-map` or `today-schedule`.** Those are used by `/home` (`app/home/home-dashboard.tsx:12,14`), the overview `/expedition/[id]` and `/map`. `ExpeditionCalendar` is used by the Weekly Planner's date popover (`planner/page.tsx:71, 1115`). I note `today-schedule.tsx` below because it is the best existing model for what the phone planner should look like.

Severity key: P0 = the page does not do its phone job at all; P1 = the job is possible but error-prone or painful one-handed on deck; P2 = polish / legibility / consistency.

---

## Shell (navbar + expedition header)

What a phone user sees before any page content (confirmed in the 375px screenshot): navbar 56px → breadcrumb that wraps to two lines (~70px) → tab bar that wraps to two rows of 13 icon-only buttons (~90px). That is roughly 216px of chrome, a third of a 375×667 screen, before the page starts.

### Findings

**S1 — P1. The 13 expedition tabs are 28px tall, icon-only below 1024px, and carry no visible label on any touch device.**
`components/expedition-header.tsx:88` `TAB_BUTTON_CLASS = "cursor-pointer h-7 px-2 rounded-md text-xs min-w-0"`; `:183-184` `<Icon className="h-3.5 w-3.5 flex-shrink-0 lg:mr-1" /> <span className="hidden lg:inline truncate">{label}</span>`. The only text is `title={PAGE_TITLES[page]}` (`:205`), which touch browsers never show. Thirteen 14px glyphs (Home, Map, Route, ClipboardList, Eye, Users, PlusCircle, FileText, AlertTriangle, ClipboardCheck, IdCard, Trophy, BookMarked) in 28px buttons is below the 44px minimum and requires memorising the icon set. Several are ambiguous on a boat (Map vs Route; ClipboardList vs ClipboardCheck). Why it matters: this is the only way to move between Weekly, Daily, Scores and Awards on a phone, and it is the control a supervising staff member hits most.

**S2 — P1. At tablet width (768–~1100px) the admin navbar overflows horizontally and the hamburger is gone.**
`components/navbar.tsx:170` `<NavigationMenu className="hidden md:flex">` shows Records / Passage Planning / Galley / Ship Inventory / Public Pages next to the Dashboard and All Expeditions pills, while `:366` hides the mobile menu with `md:hidden`. In the 768px screenshot the last trigger reads "Ship Inve" and is clipped at the right edge; there is no way to reach "Public Pages" at that width. (Non-admins only get Dashboard + My Expeditions, so this is admin-only.)

**S3 — P2. The viewport-filling layout uses `100vh`, not `100dvh`, and assumes a 64px navbar.**
`app/(expedition-tabs)/layout.tsx:74` `h-[calc(100vh-64px)] overflow-hidden`. The navbar is `h-14` (56px, `navbar.tsx:112`) plus a 1px border, so the fill is already 7px short; more importantly `100vh` on iOS Safari / Android Chrome is the large viewport, so when the planner is ever shown on a phone (see W1) its bottom ~60–100px sit behind the browser toolbar. The navbar's own Sheet already uses `max-h-[100dvh]` (`navbar.tsx:373`), so the project knows the unit.

**S4 — P2. Breadcrumb and tab bar both wrap at phone width.**
`components/ui/breadcrumb.tsx:21` `flex flex-wrap`; the header renders "All Expeditions › {expedition.name} [RESIDENTIAL] › Weekly Planner" (`expedition-header.tsx:128-167`), which wraps to two lines at 375px (screenshot). The tab `<nav>` is `inline-flex gap-1 … flex-wrap` (`:177`) and wraps to 8 + 5. Neither is horizontally scrollable, so the chrome grows vertically instead.

**S5 — P2. Navbar hides the expedition name on phones.**
`navbar.tsx:351` `hidden sm:flex`. Fine in itself (the breadcrumb shows it), but it means the breadcrumb is load-bearing and cannot be shortened to a chevron without losing context.

### Concrete changes

- S1: give tabs a phone layout: `h-12 min-w-[56px] flex-col gap-0.5 text-[11px] lg:h-7 lg:flex-row` and render the label always (`<span className="truncate">{label}</span>`), with `aria-label` kept. Make the nav a single horizontally snapping row: replace `flex-wrap` with `flex-nowrap overflow-x-auto snap-x [-ms-overflow-style:none] [scrollbar-width:none]` on `<nav>` (`expedition-header.tsx:177`) and `snap-start shrink-0` on each button; scroll the active tab into view on mount with `scrollIntoView({ inline: "center" })`. Alternative: keep 5 primary tabs (Overview, Weekly, Daily, Scores, Awards) and put the rest under a "More" `DropdownMenu` on `< lg`.
- S2: change `hidden md:flex` → `hidden xl:flex` at `navbar.tsx:170` and `md:hidden` → `xl:hidden` at `:366` (the Sheet already lists every admin link), or give `NavigationMenuList` `overflow-x-auto`.
- S3: `h-[calc(100dvh-57px)]` at `layout.tsx:74`, or expose the navbar height as a CSS var (`--navbar-h`) set on `<header>` and use `h-[calc(100dvh-var(--navbar-h))]`.
- S4: on `< sm`, collapse the breadcrumb to "‹ {expedition.name}" (a single `BreadcrumbLink` back to the overview) and move the `ExpeditionTypeBadge` next to the page title; keep the full trail `sm:` and up.

---

## Weekly Planner (/planner)

### Intent on mobile

Who: watch leaders and teachers on deck, galley lead in the galley, usually one-handed, often mid-supervision. Phone jobs, in order: (1) "What is happening today and in the next day or two, where are we, who is off, which team is on dish/galley?" (2) "Add or fix one item quickly" (a shifted dinner, a swapped class). (3) Galley lead: "Which recipe is tonight, and swap it if needed." Desktop-only work: laying out a whole week, adding templates to empty days, comparing five days side by side, editing recipe ingredients.

### What it does today on a phone (top to bottom)

- `< 640px`: the page is replaced by a card: ClipboardList icon, "Desktop Required", "The Weekly Planner requires a larger screen. Please use a tablet or desktop device to access this page." (`planner/page.tsx:1081-1090`). Everything else is `hidden sm:flex` (`:1092`). Confirmed in the 375px screenshot. There is no link to the Daily View, which does work on phones.
- `≥ 640px` (tablet 768 confirmed in screenshot): date bar (prev / "Mon, Nov 9, 2026" calendar popover / next / Today, and a Schedule | Galley toggle pushed right with `ml-auto`), then five equal columns (`grid-cols-5`, each ≈136px at 768). Each column: an 88px header (weekday + location, "Nov 9", + and open-day 24px icon buttons, then an A/S/O badge, a Dish `Select`, a Galley `Select`, staff-off initials), a scrolling list of item cards (colour bar, truncated title, time, leader avatar, participant avatars, recipe line), and a footer "8 activities". Item titles render as "Bre…", "Ta…", "Ac…", "Lu…", "Di…" at 768 because of `truncate` in a ~100px text column. The today column has a green border.
- Tapping a card opens the detail `Dialog`; the pencil/trash on the card are hover-only. "+" in a header opens `AddScheduleItemSheet` (right-side sheet, `w-full sm:max-w-xl`). Galley toggle shows the same five columns with Breakfast / Lunch / Dinner recipe slots and a `Popover` + `Command` recipe picker; tapping a recipe opens `MealPlanSheet`.

### Findings

**W1 — P0. Phones are blocked outright; the primary phone job is impossible.**
`planner/page.tsx:1081` `<div className="sm:hidden flex flex-col items-center justify-center flex-1 …">` … `:1084` `Desktop Required`; `:1092` `<div className="hidden sm:flex flex-col flex-1 overflow-hidden">`. The staff member on deck cannot see what is next, cannot add an item, and is not even pointed at `/schedule/{date}` which already has a phone layout with a fixed bottom bar (`schedule-view-client.tsx:1350-1382`). The data layer is already phone-friendly: one request for the visible range (`useExpeditionScheduleItemsRange`, `:823-827`). The block is a layout decision, not a data constraint.

**W2 — P1. Five fixed columns make every item title unreadable at tablet width.**
`:1178` and `:1370` `grid grid-cols-5 gap-2 h-full`; title `:1691` `<h4 className="font-medium text-sm text-gray-900 truncate flex-1">`. At 768px a column is (768 − 32 padding − 4×8 gap)/5 ≈ 136px, minus card padding, colour bar and the (hidden) action buttons, leaving ~100px for text: "Breakfast" becomes "Bre…", "Lunch" survives, "Academics" becomes "Ac…". The galley view has the same grid (`:1178`). Staff cannot tell what the activity is without tapping each card.

**W3 — P1. The day header is a fixed 88px box full of 9px controls that clip when they wrap.**
`:1402` `<div className="px-3 py-2.5 border-b bg-white flex-shrink-0 h-[88px]">`; the tag row is `flex items-center gap-1 flex-wrap` (`:1444`) holding a `text-[9px] … h-5` badge (`:1445`), a Dish `SelectTrigger` `h-5 w-auto min-w-[55px] text-[9px] px-1.5 py-0` (`:1463`), a Galley trigger `h-5 … min-w-[60px] text-[9px]` (`:1532`) and `h-5 w-5` staff-off initials (`:1578`). The column is `overflow-hidden` (`:1395`), so when those wrap to a second line inside the 88px header they are cut off. The location is `text-[9px] text-gray-400 truncate max-w-[60px]` (`:1412`), so "Bridgetown → Roseau" shows as "→ Ros…". These are exactly the facts a watch leader wants (where are we, who's on dish, who's off).

**W4 — P1. Edit and delete on cards are hover-only and 20px.**
`:1694` `<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 …">` with `:1696`/`:1702` `className="h-5 w-5 rounded …"`. On touch there is no hover, so the buttons never appear; the fallback is tap → `Dialog` → 36px icon buttons in its footer (`:2025-2050`, `h-9 w-9`). That works, but it is two taps and nothing on the card signals it.

**W5 — P1. Tooltips carry information that touch cannot reach.**
Dish team members (`:1483-1512`), galley team students (`:1552-1566`) and staff-off full names (`:1583-1585`, `:1596-1598`) live only in `TooltipContent`. Radix tooltips open on hover/focus, not tap; the Select trigger inside the TooltipTrigger steals the tap. So on a tablet the only visible text is "Dish 3" / "Galley 2" and two-letter initials.

**W6 — P1. Fetch errors render as "No activities" with a live "Add Template" control.**
`:823-827` `const { data: weekData, isLoading: weekLoading } = useExpeditionScheduleItemsRange(…)` — `error` is never read. On failure `weekData` is undefined → `allData` is `[undefined × 5]` (`:832-838`) → `items = []` and `isLoadingDay = false` → the empty state at `:1628-1660` shows "No activities" plus the template `Select` and `Add Template` button (`hasSchedule` comes from the separate `allSchedules` call, `:860-866`). With intermittent connectivity on a boat this is the common case, and it invites adding a template on top of an existing day.

**W7 — P2. Type scale and contrast are below what bright-sun use needs.**
`text-[8px]` (`:1411`, `:1578`, `:1593`, `:1717`), `text-[9px]` (`:1412`, `:1445`, `:1463`, `:1532`), `text-[10px]` (`:1406`, `:1779`, `:1804`), `text-[7px]` avatar initials (`:1731`, `:1759`). Most of it is `text-gray-400` (#9ca3af) on white, about 2.5:1 contrast. The item time is `text-xs text-gray-500` (`:1710`). Under glare none of this survives.

**W8 — P2. Five independent nested scroll regions with hidden scrollbars.**
Each column list is `h-full overflow-y-auto p-2 space-y-1.5 scrollbar-thin` (`:1611`) with the scroll handler assigned via `el.onscroll = …` inside a ref callback (`:1612-1617`); `.scrollbar-thin` hides the bar until hover (`app/globals.css:143-163`). The only cue is an 8px bottom gradient that is also gated on `sortedItems.length > 3` (`:1792-1796`). On a tablet a vertical swipe scrolls whichever column the finger lands on, and the page itself cannot scroll (`overflow-hidden`, `layout.tsx:74`).

**W9 — P2. Secondary controls are under 44px.**
Header `+` and open-day buttons `h-6 w-6` (`:1426`, `:1436`); empty-state template `SelectTrigger … h-8` and `Button … h-7` (`:1640`, `:1655`); galley "change recipe" strip `w-8` (`:1313`); `MealPlanSheet` close is a 20px icon with `p-1.5` → 32px (`:264-269`). The `ExpeditionCalendar` popover uses `[--cell-size:2rem]` (`components/ui/calendar.tsx:28`) → 32px day cells. The date bar buttons themselves are fine (`h-10`, `:1101`, `:1112`, `:1136`, `:1148`).

**W10 — P2. The detail dialog can exceed a short phone screen.**
`DialogContent className="max-w-lg p-0 …"` (`:1822`) with a header (title `text-2xl`, description `text-base`, `:1824-1835`), a body `overflow-y-auto max-h-[60vh]` (`:1849`), a divider and a `px-6 py-4` footer (`:2022`). 60vh body + ~90px header + ~70px footer ≈ 60vh + 160px; on a 667px-tall phone that is ~560px, which fits, but on 375×667 with the browser toolbar (≈ 560px visible) it overflows and `DialogContent` has no `max-h`. The base `DialogContent` is centred with `translate-y-[-50%]` (`components/ui/dialog.tsx:226`), so overflow is clipped top and bottom, not scrolled.

**W11 — P2. `AddScheduleItemSheet` is a desktop form squeezed into 311px.**
- Padding: `flex-1 overflow-y-auto p-8 pb-24` (`components/add-schedule-item-sheet.tsx:1135`) → 32px gutters each side at 375px.
- Header: `SheetTitle className="text-2xl"` + `SheetDescription className="text-base"` with `mb-8` (`:1136-1150`) spends ~110px before the first field.
- Time pickers: `grid grid-cols-2 gap-6` (`:1176`); each `TimePicker` is two `w-14 h-12` inputs, a `text-2xl` colon, an AM/PM column `ml-2` and a `Clock ml-2 h-5 w-5` (`components/ui/time-picker.tsx:236-306`) ≈ 200px wide, in a ~143px cell → the two pickers overlap or overflow.
- Pickers: six bespoke dropdowns (`CustomSelect :48`, `StaffCombobox :131`, `ActivityTypeSelector :277`, `StaffParticipantSelector :427`, `StudentParticipantSelector :582`, `CookbookSelector :741`) each render `absolute z-50 mt-1 w-full … max-h-64 overflow-y-auto` (`:105-106`, `:201`, `:340`, `:528`, `:685`, `:817`) inside the sheet's `overflow-y-auto` container, so a list opened near the bottom is clipped by the sheet and the user must scroll the sheet with the list open. Close-on-outside uses `document.addEventListener("mousedown", …)` (`:74`, `:152`, `:298`, `:447`, `:602`, `:772`), which on touch fires only on tap (compat event), never on scroll. `ActivityTypeSelector` auto-focuses its search input on open (`:317`), which on iOS raises the keyboard over the list immediately.
- Footer: `absolute bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-3` (`:1287`) with no safe-area inset; the `pb-24` on the scroll area is the only keyboard/footer allowance.
- Eleven fields with no grouping; the `Resources` URL field (`:1222-1247`) and `Things to Bring` (`:1271-1282`) are rarely needed on deck but sit at the same level as Type and Time.

**W12 — P2. Galley picker and recipe sheet are close to right but have phone gaps.**
Recipe `PopoverContent className="w-[320px] p-0"` (`:1248`) is fine at 375; the `MealPlanSheet` is `w-full sm:w-[600px]` (`:247`) but its ingredient `Table` (`:542-633`) has three columns with inline `Input className="h-8 text-sm w-16"` (`:559`) and two 32px buttons in the third cell, so inline editing in a 327px-wide sheet is cramped. Editing recipes on a phone in the planner is arguably out of scope; the "Edit in Cookbook" button (`:331-342`) is the right path.

**Daily View drag, for the record (not in this page).** `components/schedule-drag-context.tsx:107-119` configures `MouseSensor { distance: 8 }` and `TouchSensor { delay: 200, tolerance: 5 }`, so a 200ms press starts a drag and a quick swipe scrolls — reasonable. But drag is only wired in `editMode` (`draggable-schedule-item.tsx:147`), the grip hint is `opacity-0 group-hover:opacity-100` (`:152`), and the resize handles listen to `onMouseDown` only (`:183`, `:202`) with `onPointerDown` stopping propagation (`:191`, `:210`) — so there is **no touch resize at all**, and the drag affordance is invisible on touch. There is no non-drag fallback for moving time other than opening the edit sheet. Worth a line in the senior review even though it is outside this page.

### Recommended mobile layout

**Phone (< 768px): a one-day agenda with a day strip, not a grid.**
- Replace the "Desktop Required" card with the same page in a different shape. Top: the existing date bar collapsed to `‹ [Mon, Nov 9] ›` with the Schedule | Galley toggle as a full-width segmented control underneath (44px tall). Below it, a horizontally scrolling strip of 7 day chips (`EEE` + `d`, 48px wide, 44px tall, today ringed green, outside-range chips dimmed) that sets `centerDate`; swiping the agenda left/right also moves one day.
- Day summary card (always visible, not clipped): "Bridgetown → Roseau" in `text-sm`, chips for A/S/O (full word), "Dish 3 · Galley 2" as text with a tap that opens a small sheet listing the team members (this replaces the tooltips), and staff off as first names, not initials.
- Agenda list: one item per row in the `today-schedule.tsx` `ScheduleRow` style (time column left, title `text-sm font-medium` never truncated to fewer than ~24 chars, leader + student count underneath, recipe line for meals). Tap → the existing detail dialog, converted to a bottom sheet on phones. Each row gets a visible 44px "⋯" trailing button for Edit / Delete.
- Empty day: "No activities" plus a single "Add from template" button that opens a sheet with the template list; never show the template picker when the fetch failed (show a retry card instead).
- Bottom: a fixed bar like the Daily View's (`schedule-view-client.tsx:1350`) with prev / big "+" / next, `pb-[env(safe-area-inset-bottom)]`.
- Galley on phone: the same day strip, then three stacked meal cards (Breakfast / Lunch / Dinner) using the existing card markup (`planner/page.tsx:1294-1332`) at full width; the recipe picker opens as a bottom sheet with the `Command` list.

**Tablet (768–1023px):** keep columns but three, not five: `[center-1, center, center+1]`, or keep five and make the row horizontally snap-scrollable with `min-w-[240px]` columns. Show item titles on two lines (`line-clamp-2`) instead of `truncate`. Make the card actions visible when hovering is impossible.

**Desktop (≥ 1024px):** unchanged.

### Concrete changes

- W1: `planner/page.tsx:1081-1092` — delete the `sm:hidden` block and the `hidden sm:flex` wrapper; render `<PlannerAgenda />` (new) when `useMediaQuery("(max-width: 767px)")` and the existing grid otherwise. Minimum viable interim fix, one line: add a `Button asChild` in the block linking to `` `/schedule/${format(centerDate, "yyyy-MM-dd")}?expedition=${effectiveExpeditionId}` `` labelled "Open today's Daily View" so phones are not a dead end.
- W1/S3: `layout.tsx:74` → `h-[calc(100dvh-57px)]`.
- W2: `:1178` and `:1370` `grid grid-cols-5` → `grid grid-cols-3 lg:grid-cols-5` with `days` sliced to 3 on `< lg`, or `flex overflow-x-auto snap-x gap-2` with each column `snap-start shrink-0 w-[min(100%,260px)] lg:w-auto lg:flex-1`. `:1691` `truncate` → `line-clamp-2 leading-snug`.
- W3: `:1402` drop `h-[88px]`; use `min-h-[88px]` and let the column body take the remainder (`flex-1 min-h-0` is already on the list at `:1609`). `:1412` `text-[9px] … max-w-[60px]` → `text-[11px] text-gray-500 truncate max-w-[120px]`. `:1463`/`:1532` `h-5 … text-[9px]` → `h-7 text-xs` on `< lg`.
- W4: `:1694` `opacity-0 group-hover:opacity-100` → `opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100`; `:1696`, `:1702` `h-5 w-5` → `h-8 w-8` (and `-m-1.5` to keep the card height). Or replace both with one `⋯` `DropdownMenu` trigger.
- W5: wrap the Dish/Galley triggers in a `Popover` (tap-friendly) instead of `Tooltip`, or append the member list to the `SelectContent` as a disabled header row. Staff off: render `name.split(" ")[0]` as text on `< lg` instead of initials.
- W6: `:823` destructure `error`; render a `<LoadError onRetry={() => mutate(key)} />` in each column when `error && !weekData`, and gate the template picker on `!error`.
- W7: project-wide floor on these two pages: replace `text-[7px]`–`text-[10px]` with `text-[11px]`/`text-xs`; `text-gray-400` for text → `text-gray-500` (keep gray-400 for icons only).
- W8: give each column list `overscroll-contain` and make the scrollbar visible on touch (`[@media(hover:none)]:scrollbar-auto` or drop `scrollbar-thin` below `lg`). On phones the agenda is a single document scroll, which removes the problem.
- W9: `:1426`, `:1436` `h-6 w-6` → `h-9 w-9 lg:h-6 lg:w-6`; `:1655` `h-7` → `h-9`; `calendar.tsx:28` `[--cell-size:2rem]` → `[--cell-size:2.75rem] lg:[--cell-size:2rem]`.
- W10: `:1822` add `max-h-[calc(100dvh-2rem)] sm:max-w-lg` and change `:1849` `max-h-[60vh]` → remove it (the content div already has `flex-1 min-h-0 overflow-y-auto`). On `< sm` render the same content inside `Sheet side="bottom"`.
- W11 (`add-schedule-item-sheet.tsx`): `:1134` `SheetContent` → `side={isPhone ? "bottom" : "right"} className="w-full sm:max-w-xl p-0 flex flex-col h-[92dvh] rounded-t-2xl sm:h-full sm:rounded-none"`; `:1135` `p-8 pb-24` → `p-5 pb-28 sm:p-8`; `:1138` `text-2xl` → `text-xl`, drop the description on phones; `:1176` `grid grid-cols-2 gap-6` → `grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6`; `:1287` add `pb-[calc(1rem+env(safe-area-inset-bottom))]`. Replace the six absolute dropdowns with one `MobilePicker` (see cross-cutting) that renders `Popover` on `sm+` and `Sheet side="bottom"` + `Command` on phones; remove the `mousedown` listeners. `:317` guard the auto-focus with `if (!isTouch)`. Group the form: "Essentials" (Type, Name, Start, End, Led by) open; "People" and "Details" as `Collapsible`s collapsed by default on phones.
- W12: hide the inline ingredient/instruction editor (`:252-262` Edit button) on `< sm` and keep only "Edit in Cookbook".

---

## Trip Planner (/dashboard)

### Intent on mobile

Who: the captain / programme lead when setting up or re-planning the voyage (desk work), and every staff member who wants to answer "where are we on Thursday, is it an offshore day, who is off?" (phone work). Phone jobs: (1) scan upcoming days: date, port → destination, A/S/O, who is off; (2) jump to a day's schedule or evaluation. Desktop-only: generate all dates, rotate dish/galley teams, bulk-edit locations and types, inline notes, group by location.

### What it does today on a phone (top to bottom)

- Action bar: two `Switch`es labelled "Past" and "Group" (`dashboard/page.tsx:789-803`, labels shortened via `hidden sm:inline` / `sm:hidden`), then three 32px icon-only buttons: Plus (Generate Dates), RefreshCw (Update Dish), RefreshCw (Update Galley) (`:808-849`), labels hidden with `hidden sm:inline`.
- A 7-column table (`Date | Location | Type | Destination | Time Off | Notes | [open]`) in `table-fixed w-full` with percentage widths (`:1184-1193`) inside an `overflow-hidden` div (`:1183`). At 375px (343px inner) that is ≈ 41 / 65 / 41 / 65 / 51 / ~12 / 68 px. Confirmed in the screenshot: "Mon, Nov 9" is painted under the Location select's chevron, the Type cell shows "A S — O" with the Destination select's "—" overlapping the S/O buttons, Time Off shows "S.." / "N..", the Notes column is a few pixels wide, and the header row reads "DestinationTime Off".
- Every row has six live controls (location `Select`, A/S/O buttons, destination `Select`, `StaffOffMultiSelect`, click-to-edit notes, open-day button), each cell `stopPropagation` so only the Date cell opens the day sheet.
- Tapping a Date opens a right-side `Sheet` (`w-full sm:w-[640px]`, `:1430`) with a three-column schedule table, Staff Off chips, a notes `Textarea`, and a footer of three buttons in one row.
- At 768px the table is legible (screenshot) and the action bar shows full labels.

### Findings

**D1 — P0. The schedule table is unreadable on phones; the scroll affordance is dead code.**
`:1184` `<Table className="table-fixed w-full">` (and `:932` in the grouped view) with `style={{ width: "12%" }}` … `"19%"` … `"15%"` … `"68px"` (`:1187-1193`). The wrapper is `className="overflow-hidden"` (`:1183`, `:931`), which overrides the `overflow-x-auto` the shadcn `Table` provides on its own container (`components/ui/table.tsx:9`). `table-fixed w-full` forces all seven columns into 343px, so nothing can scroll and everything overlaps (screenshot). The left/right gradient "scroll indicators" (`:1178-1181`, `:928-929`) compute `scrollLeft < scrollWidth - clientWidth - 1` (`:260`) on an element that can never scroll, so they are permanently `opacity-0`. Net effect: the one phone job (read the upcoming days) fails.

**D2 — P1. Bulk, hard-to-undo admin actions sit on the phone as unlabeled 32px icons.**
`:808-849`: `Button … size="sm" … className="cursor-pointer h-8 sm:h-9 px-2 sm:px-3"` with `<span className="hidden sm:inline">Generate Dates</span>` etc. "Update Dish" and "Update Galley" reassign teams for every day of the expedition (`autoAssignTeamsForExpedition`, `:572-586`, `:618-632`) with no confirmation; "Generate Dates" also auto-assigns (`:503-520`). On a phone they are two identical RefreshCw glyphs beside a Plus, 32px tall, `title` only. A thumb aiming for the "Past" switch is one slip away from rewriting the galley rota.

**D3 — P1. Row controls are far below 44px and the row's "open" target is ~41px wide.**
A/S/O: `px-2 py-1.5 text-xs … min-w-[28px]` in `flex gap-0.5` (`:1242-1282`) ≈ 28×28px with 2px gaps. Notes editor: `Input className="h-7 text-sm"` + two `h-6 w-6 p-0` buttons (`:1364`, `:1377`, `:1385`). Location/destination `SelectTrigger … h-8` (`:1218`, `:1248`). Open-day `h-8 w-8` (`:1411`). Row click → `handleRowClick` (`:1204`) but every other cell has `onClick={(e) => e.stopPropagation()}` (`:1211`, `:1241`, `:1296`, `:1327`, `:1357`), so the only area that opens the day preview is the Date cell (12% ≈ 41px at 375, ~90px at 768).

**D4 — P1. Every cell writes to Xano on first tap; the phone surface should be read-first.**
`handleTypeChange` (`:659-693`) optimistically mutates and PATCHes on a single tap of a 28px button; `handleLocationChange` (`:634-657`) and the staff-off toggle (`:1301-1317`) likewise. On a phone, where the user is scrolling a crushed table with a thumb, accidental type/location changes are likely and there is no undo (only a toast). This is the opposite of the phone intent (scan + jump).

**D5 — P1. Fetch errors render as "No schedules found".**
`:187` `const { data: schedules, isLoading: loadingSchedules } = useExpeditionSchedules(…)` — `error` ignored; `:904-907` shows "No schedules found for this expedition" whenever `filteredSchedules.length === 0`, so an offline moment looks like an un-generated expedition, right next to a live "Generate Dates" button (D2).

**D6 — P2. The day preview sheet does not fit phone widths.**
Footer `:1626` `<div className="flex gap-2 p-4 border-t shrink-0">` with two `flex-1` buttons whose labels "Open Full Schedule" / "Evaluate Students" plus 16px icons are `whitespace-nowrap` (`components/ui/button.tsx:333`) and a third icon button; at 375 each flex child gets ~140px and the text clips. Inner table `TableHead … w-[120px]` and `w-[150px]` (`:1493`, `:1495`) leave the Activity column ~60px at 375 (inner width ≈ 327 after `px-6`). The sheet slides from the right at full width (`:1430`), which is acceptable, but no safe-area inset on the footer.

**D7 — P2. Opening a day drops the expedition from the URL.**
`:449` `router.push(\`/schedule/${schedule.date}\`)` and `:1633`, `:1644` push `/schedule/…` and `/evaluate/…` without `?expedition=${activeExpeditionId}`. The tab layout resolves the expedition from `searchParams.get("expedition")` and otherwise falls back to `activeExpedition` (`layout.tsx:43-58`), so from a non-active expedition's planner you land on the active expedition's day. Not phone-specific, but on a phone the breadcrumb is the only context and it silently changes.

**D8 — P2. `StaffOffMultiSelect` dropdown is clipped and uses mouse-only outside-close.**
`:120` `absolute z-50 mt-1 w-48 …` inside the `overflow-hidden` table wrapper → clipped at the right edge; `:74` `document.addEventListener("mousedown", …)`.

**D9 — P2. Layout and state nits.**
`:773` `min-h-screen` inside a parent that is already `min-h-[calc(100vh-64px)]` (`layout.tsx:75`) adds ~64px of empty grey below the table. `:197-209` `useState(() => localStorage.getItem(…))` runs on the client only, so the first client render can differ from the server HTML (hydration warning; the switch flips after mount). Loading skeleton is a different 5-column table with `px-6` (`:864-900`) so the layout jumps when real data arrives. The empty state (`:904-907`) has no "Generate dates" CTA even though the button exists in the bar.

### Recommended mobile layout

**Phone (< 768px): a card list, read-first, edit in the sheet.**
- Keep the two switches but as full-label `Switch` rows in a compact filter line ("Show past dates", "Group by location"); move Generate / Update Dish / Update Galley into a `⋯` `DropdownMenu` on the right with full labels and an `AlertDialog` confirmation on each (also on desktop, honestly).
- One card per day, 64–72px tall, whole card tappable: line 1 `Mon, Nov 9` (bold) + A/S/O chip with the full word; line 2 `Bridgetown, Barbados → Roseau, Dominica` (destination only when offshore); line 3 muted: `Off: Sheilah, Nick · "review"` (notes snippet). Past days dimmed. A trailing chevron. Today gets the green ring the planner already uses.
- "Group by location" becomes sticky section headers (`Bridgetown, Barbados · 9 days`) with the existing collapse behaviour.
- Tap → the existing day sheet, turned into a bottom sheet (`h-[92dvh]`), with an "Edit day" section at the top: A/S/O as a 44px segmented control, Location and Destination `Select`s at `h-11`, Staff off as a checklist in a nested bottom sheet, Notes textarea with Save. The schedule table inside the sheet becomes the `TodaySchedule` row list (time / title / staff stacked), not a 3-column table.
- Footer: two stacked or `grid-cols-2` buttons ("Open day", "Evaluate") with the delete under the `⋯` menu, `pb-[env(safe-area-inset-bottom)]`.

**Tablet (768–1023px):** keep the table but let it breathe: drop `table-fixed`, set `min-w-[880px]` on the table and let the wrapper scroll horizontally (then the gradients would actually work), or hide `Notes` and `Time Off` with `hidden lg:table-cell` and surface them in the sheet. Make A/S/O 36px.

**Desktop (≥ 1024px):** unchanged, apart from confirmations on the three bulk buttons.

### Concrete changes

- D1: `:1183` and `:931` `className="overflow-hidden"` → `className="overflow-x-auto"` and `:1184`/`:932` `table-fixed w-full` → `min-w-[880px] w-full md:table-fixed md:min-w-0` as the fastest fix (table scrolls on phones, gradients start working). Preferred: `isPhone ? <DayCardList schedules={filteredSchedules} … /> : <table>` with the card described above; the card can be a new `components/day-summary-card.tsx` reused by the grouped view.
- D2: `:808-849` on `< sm` render a single `DropdownMenu` trigger (`MoreHorizontal`, `h-10 w-10`) containing the three actions with full labels; wrap `handleGenerateAllDates`, `handleRotateDishTeams`, `handleRotateGalleyTeams` in an `AlertDialog` ("Reassign dish teams for all 52 days?"). `:789-803` keep the full label text and drop the `sm:hidden` short forms; stack the two switches vertically on `< sm` (`flex-col items-start gap-2 sm:flex-row`).
- D3: `:1242-1282` → `h-9 min-w-9 text-sm` (`lg:h-7 lg:min-w-7 lg:text-xs` if the dense desktop look matters); `gap-0.5` → `gap-1`. `:1364` `h-7` → `h-9`; `:1377`, `:1385` `h-6 w-6` → `h-9 w-9`. Make the whole row open the sheet on `< lg` by removing the per-cell `stopPropagation` there (the inline controls move into the sheet).
- D4: on `< lg`, render the row's values as text (`schedule._expedition_current_location.port`, type chip, `staff_off` first names) and do all edits inside the day sheet; keep inline editing `lg:` and up.
- D5: `:187` destructure `error`; render `<LoadError onRetry={() => mutate(\`expedition_schedules_${activeExpeditionId}\`)} />` instead of the empty state when `error`.
- D6: `:1626` `flex gap-2` → `grid grid-cols-2 gap-2 sm:flex` and move the delete button into the header `⋯`; add `pb-[calc(1rem+env(safe-area-inset-bottom))]`. `:1493`, `:1495` → `w-[88px]` / `hidden sm:table-cell w-[150px]` and show the staff name under the title on phones. `:1430` → `side={isPhone ? "bottom" : "right"}` with `h-[92dvh] rounded-t-2xl sm:h-full`.
- D7: `:449`, `:1633`, `:1644` append `?expedition=${activeExpeditionId}`.
- D8: render `StaffOffMultiSelect`'s list in a `Popover` (portal) instead of an absolute div; replace the `mousedown` listener.
- D9: `:773` `min-h-screen` → `flex-1`; `:197-209` initialise `false` and read `localStorage` in a `useEffect`; make the skeleton use the same 7 columns; add a "Generate dates" button to the empty state.

---

## Cross-cutting patterns worth a shared component or utility

1. **`useIsPhone()` / `useMediaQuery("(max-width: 767px)")` with an SSR-safe default.** Both pages currently branch on Tailwind classes only (`sm:hidden`, `hidden sm:inline`), which means rendering both trees (the planner renders the full five-column grid into the DOM on phones and hides it). One hook lets the planner, the dashboard, the sheets and the header pick a layout once. Also fixes the `localStorage` hydration pattern if it owns the "mounted" flag.

2. **`ResponsiveSheet`**: wraps `Sheet` with `side="right" sm+` / `side="bottom" < sm`, `h-[92dvh] rounded-t-2xl` on phones, a sticky header with a 44px close, and a footer slot that adds `pb-[env(safe-area-inset-bottom)]`. Four sheets need it today: `AddScheduleItemSheet`, `MealPlanSheet`, the dashboard day sheet (`dashboard/page.tsx:1430`), and `today-schedule.tsx:233` `DayScheduleSheet`.

3. **`MobilePicker` (searchable single/multi select)**: `Popover` + `Command` on `sm+`, bottom `Sheet` + `Command` on phones, with `aria` from Radix instead of the hand-rolled `mousedown` outside-click. Replaces seven near-identical implementations: `add-schedule-item-sheet.tsx` `CustomSelect`, `StaffCombobox`, `ActivityTypeSelector`, `StaffParticipantSelector`, `StudentParticipantSelector`, `CookbookSelector`, and `dashboard/page.tsx` `StaffOffMultiSelect`. The galley recipe picker (`planner/page.tsx:1247-1290`) already does the `Popover` + `Command` half.

4. **Hover-revealed controls → `[@media(hover:hover)]` variants.** `opacity-0 group-hover:opacity-100` appears on planner cards (`:1694`), the draggable item's grip and pencil (`draggable-schedule-item.tsx:152`, `:163`) and elsewhere. A tiny utility class in `globals.css` (`.hover-reveal { @media (hover: hover) { opacity: 0 } .group:hover & { opacity: 1 } }`) makes them visible on touch everywhere at once.

5. **`DaySummary` component**: A/S/O chip (full word, consistent colours — today the planner uses letters, the dashboard uses `bg-green-100/red-100/blue-100` chips, and `today-schedule.tsx:182-201` uses teal/violet/amber with icons), `port → destination`, dish/galley team names, staff-off first names. Needed by the planner column header, the planner phone agenda, the dashboard card/row, the dashboard sheet header, and `TodaySchedule`. One component ends the three colour schemes.

6. **`LoadError`**: both pages ignore SWR `error`, and so does `TodaySchedule` only half-way (`today-schedule.tsx:137-138` at least shows a red line). A shared card with the message and a Retry button, used wherever `error && !data`.

7. **Type scale floor and `tabular-nums` on times.** Nothing below 11px on staff-facing pages; `text-gray-500` minimum for text. `formatMilitaryTime` is copied three times (`planner/page.tsx:845-852`, `dashboard/page.tsx:329-336`, `today-schedule.tsx:39-46`) with slightly different 2400 handling; move to `lib/` and have it return a string the UI renders with `tabular-nums`.

8. **Icon button sizing rule.** Add `size: "icon-touch": "size-11 lg:size-9"` to `components/ui/button.tsx:353-356` so phone-visible icon buttons get 44px without per-site overrides (planner `+`/open, dashboard open-day, sheet close buttons, header tabs).

9. **Fixed-height pages**: one `h-[calc(100dvh-var(--navbar-h))]` definition in `layout.tsx`, with `--navbar-h` set on the `<header>`.

---

## Open questions for the senior reviewer

1. **Is the Weekly Planner meant to exist on phones at all**, or is the Daily View the intended phone surface and the "Desktop Required" card should simply deep-link to `/schedule/{today}?expedition=…`? The agenda layout above is the full answer; the one-line link is the minimum.
2. **Who edits the Trip Planner, and when?** If it is the captain pre-trip at a laptop, the phone version can be read-only cards plus "open day / evaluate", and D3/D4 shrink to "hide the controls below `lg`". If watch leaders change A/S/O or staff-off from their phones during the trip, the day sheet needs the edit section.
3. **5 days vs 7.** The brief said a 7-day grid; the code shows yesterday plus four days. Intentional (keeps today second from left) or a leftover? It affects how many columns the tablet layout should keep.
4. **Dropping `?expedition=` when opening a day from the Trip Planner (D7)** — known, or a bug to file? It bites anyone planning the next expedition while the current one is active.
5. **Tab bar policy**: are all 13 tabs needed for every role on a phone? If Applications, Manifest, Grades and Discipline are admin/office tasks, role-filtering the tabs on `< lg` would make S1 far easier to solve than a scrolling strip.
6. **Breakpoint convention**: the planner uses `sm` (640) as its phone/desktop line, the header uses `lg` (1024) for labels, the navbar uses `md` (768) for its menu. Should the project standardise on phone `< 768`, tablet `768–1023`, desktop `≥ 1024` so the three shells agree?
7. **Confirmations on bulk actions** (Generate Dates, Update Dish, Update Galley): acceptable to add an `AlertDialog` on desktop too, or is the one-tap behaviour relied upon?
8. **Touch editing in the Daily View**: resize handles are `onMouseDown` only and the grip is hover-only (`draggable-schedule-item.tsx:152, 183, 202`). If the phone story is "use the Daily View", that page needs a touch pass next; is that in scope for this round?
