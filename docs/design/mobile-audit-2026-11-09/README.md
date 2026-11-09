# Mobile design audit — 2026-11-09

Three-stage audit of the staff app on phones (375–430px) and small tablets (768px). No source files were changed.

| File | Author | What it is |
|---|---|---|
| [01-junior-planner-audit.md](01-junior-planner-audit.md) | Junior mobile designer A | Weekly Planner (`/planner`), Trip Planner (`/dashboard`), navbar and the 13-tab expedition header. Code audit confirmed in the browser at 375px and 768px. |
| [02-junior-pages-audit.md](02-junior-pages-audit.md) | Junior mobile designer B | Every other staff page: Add Scores, Daily View, Discipline, Awards, Reviews, Grades, Home, list pages, galley and inventory. |
| [03-senior-review.md](03-senior-review.md) | Senior UX/UI reviewer | Verified 26 junior findings against the code, critiqued the proposed layouts, decided the architecture questions, and produced the **final ordered list of 20 recommendations** with a three-phase delivery order. **Start here.** |

## The short version

**Both junior audits hold up.** Every P0 the senior checked is real. Line numbers drift in a few places and the corrected citations are in the senior's verification table.

**Fix Add Scores first.** On a phone there is no previous/next day (the chevrons are `hidden sm:flex`), Submit goes grey with no visible reason, "Unblock all" silently rewrites N/A into a scored 3 with no confirmation, and the submit loop stops at the first failure. This page feeds the daily cash award.

**Do not build a phone Weekly Planner.** Redirect phones to the Daily View for the centre date, give tablets three columns, and make the Daily View a legible list with a "Now" divider under 768px.

**Trip Planner on phones becomes read-only day cards** that open the existing day sheet. The bulk Generate / Update Dish / Update Galley actions need a confirmation dialog on every device.

**Things nobody had noticed:** no `viewport-fit=cover` (so every safe-area padding is a no-op on iPhones), no web manifest, Tailwind v4 makes hover-revealed controls permanently invisible on touch, toasts render on top of the fixed bottom bars, the Planner and Map tabs have each other's icons, and nothing shows an offline state.

## Delivery order (from the senior review)

1. **This week, on-deck fixes.** Add Scores bottom bar, Submit tappable and the reason chip visible, confirmation on bulk overwrites, partial-failure reporting, Daily View header wrap and "Score this day" button, `?expedition=` on day links, planner wall → Daily View redirect, viewport/manifest/Toaster position.
2. **Planner rework.** Daily View list layout with "Now" divider, three-column tablet planner, labelled scrollable tab strip, Trip Planner phone cards, Discipline list and form, `ResponsiveSheet` + `MobilePicker` for the Add Activity sheet.
3. **List pages and galley.** Percentage column widths with `hidden md:table-cell`, breakpointed dialog grids, a small `RowCard` for the four on-deck lists, type floor at 11px / gray-500, Grades sticky column, galley control heights, `OfflineBanner`.
