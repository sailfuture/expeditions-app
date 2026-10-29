// Replays the "Example Week" tab of the Expedition award spreadsheet against
// lib/expedition-award.ts, row by row. Run with:
//   npx tsc --module nodenext --moduleResolution nodenext --target es2022 --outDir <tmp> lib/expedition-award.ts lib/__tests__/expedition-award.test.ts
//   node --test <tmp>/__tests__/expedition-award.test.js
import { test } from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_AWARD_SETTINGS,
  computeDailyAward,
  summarizeStudentAwards,
  dailyScoresFromProfessionalism,
  journalingScoreFromStatus,
  performancePercentFor,
  formatAwardDollars,
  type DailyScores,
} from "../expedition-award.js"

const day = (n: number, s: Partial<Omit<DailyScores, "date">>): DailyScores => ({
  date: `2026-06-0${n}`,
  school: null,
  job: null,
  service: null,
  crew: null,
  journaling: null,
  citizenship: null,
  ...s,
})

// Daily scores as entered on the Example Week tab (blank = null), minus the
// Fitness column, which no longer earns.
const EXAMPLE_WEEK: DailyScores[] = [
  day(1, { school: 2, job: 3, service: 3, journaling: 100, citizenship: 3 }),
  day(2, { school: 3, job: 4, service: 0, journaling: 100, citizenship: 1 }),
  day(3, { school: 2, job: 3, service: 3, crew: 3, journaling: 100, citizenship: 3 }),
  day(4, { school: 2, job: 3, service: 3, crew: 3, journaling: 100, citizenship: 3 }),
  day(5, { school: 2, job: 3, service: 3, crew: 3, journaling: 100, citizenship: 4 }),
  day(6, { crew: 3, journaling: 100, citizenship: 2 }),
  day(7, { crew: 3, journaling: 100, citizenship: 2 }),
]

// Expected intermediate values from the spreadsheet (percents as fractions).
const EXPECTED = [
  { earned: 15, perf: 2.67, perfPct: 0.5, citPct: 0.75, award: 5.625 },
  { earned: 15, perf: 2.33, perfPct: 0, citPct: 0, award: 0 },
  { earned: 20, perf: 2.75, perfPct: 0.7, citPct: 0.75, award: 10.5 },
  { earned: 20, perf: 2.75, perfPct: 0.7, citPct: 0.75, award: 10.5 },
  { earned: 20, perf: 2.75, perfPct: 0.7, citPct: 1.0, award: 14 },
  { earned: 10, perf: 3.0, perfPct: 0.8, citPct: 0.4, award: 3.2 },
  { earned: 10, perf: 3.0, perfPct: 0.8, citPct: 0.4, award: 3.2 },
]

const close = (a: number, b: number, msg?: string) => assert.ok(Math.abs(a - b) < 1e-9, `${msg ?? ""} expected ${b}, got ${a}`)

test("each day of the Example Week matches the spreadsheet", () => {
  EXAMPLE_WEEK.forEach((scores, i) => {
    const d = computeDailyAward(scores)
    const e = EXPECTED[i]
    const label = `Day ${i + 1}`
    close(d.earned, e.earned, `${label} earned`)
    close(Math.round(d.performanceScore * 100) / 100, e.perf, `${label} performance score`)
    close(d.performancePercent, e.perfPct, `${label} performance percent`)
    close(d.citizenshipPercent, e.citPct, `${label} citizenship percent`)
    close(d.award, e.award, `${label} award`)
    close(d.withheld, e.earned - e.award, `${label} withheld`)
  })
})

test("per-category dollars on Day 2 (School, Job, Journaling earn; Service 0 and blank Crew do not)", () => {
  const d = computeDailyAward(EXAMPLE_WEEK[1])
  assert.deepEqual(d.earnedByCategory, { school: 5, job: 5, service: 0, crew: 0, journaling: 5 })
})

test("week totals: earned $110.00, withheld $62.98, award $47.03", () => {
  const s = summarizeStudentAwards(EXAMPLE_WEEK)
  assert.equal(s.daysScored, 7)
  close(s.earned, 110)
  close(s.withheld, 62.975)
  close(s.total, 47.025)
  // Displayed the way the spreadsheet shows them (half-up to cents).
  assert.equal(formatAwardDollars(s.withheld), "$62.98")
  assert.equal(formatAwardDollars(s.total), "$47.03")
  assert.equal(formatAwardDollars(s.days[0].award), "$5.63")
})

test("edge cases from the spec", () => {
  // A rated category scored 1 or 2 earns nothing but still counts in the performance score.
  const low = computeDailyAward(day(1, { school: 1, job: 5, citizenship: 4 }))
  assert.equal(low.earnedByCategory.school, 0)
  close(low.performanceScore, 3)
  // Journaling at 50 earns nothing; blank journaling has no other effect.
  const partial = computeDailyAward(day(1, { job: 4, journaling: 50, citizenship: 4 }))
  assert.equal(partial.earnedByCategory.journaling, 0)
  close(partial.award, 5)
  // The performance score is not rounded before the tier lookup: 2.67 keeps 50%.
  close(performancePercentFor(8 / 3), 0.5)
  // Exactly 3.25 keeps 80%; the top tier needs more than 3.25.
  close(performancePercentFor(3.25), 0.8)
  close(performancePercentFor(3.26), 1.0)
  // No rated categories entered -> score 0 -> 0%.
  const none = computeDailyAward(day(1, { journaling: 100, citizenship: 5 }))
  close(none.performanceScore, 0)
  close(none.award, 0)
  // Citizenship 5 adds 10%: max day is $27.50.
  const max = computeDailyAward(day(1, { school: 5, job: 5, service: 5, crew: 5, journaling: 100, citizenship: 5 }))
  close(max.award, 27.5)
  // Blank citizenship keeps 0%.
  const noCit = computeDailyAward(day(1, { school: 5, job: 5 }))
  close(noCit.award, 0)
  // Settings are read, not hardcoded.
  const custom = computeDailyAward(day(1, { school: 5, citizenship: 4 }), { ...DEFAULT_AWARD_SETTINGS, dollarsPerCategory: 7 })
  close(custom.earned, 7)
})

test("mapping from a Xano professionalism row", () => {
  const statuses = [
    { name: "Excused", value: null },
    { name: "Completed", value: 1 },
    { name: "Incomplete", value: 0.5 },
    { name: "Late Entry", value: 0.75 },
    { name: "Not Started", value: 0 },
  ]
  assert.equal(journalingScoreFromStatus("Completed", statuses), 100)
  assert.equal(journalingScoreFromStatus("Incomplete", statuses), 50)
  assert.equal(journalingScoreFromStatus("Late Entry", statuses), 75)
  assert.equal(journalingScoreFromStatus("Not Started", statuses), 0)
  assert.equal(journalingScoreFromStatus("Excused", statuses), null)
  assert.equal(journalingScoreFromStatus("", statuses), null)

  const scores = dailyScoresFromProfessionalism(
    {
      date: "2026-10-27",
      academics: 4,
      isAcademicsUsed: false,
      job: 3,
      isJobUsed: true, // excluded for the day -> blank even though a number is stored
      service: null,
      isServiceUsed: false,
      crew: 2,
      isCrewUsed: false,
      citizenship: 5,
      isCitizenshipUsed: false,
      journaling: "Completed",
    },
    statuses
  )
  assert.deepEqual(scores, {
    date: "2026-10-27",
    school: 4,
    job: null,
    service: null,
    crew: 2,
    journaling: 100,
    citizenship: 5,
  })
  const d = computeDailyAward(scores)
  close(d.earned, 10) // school + journaling
  close(d.performanceScore, 3) // (4 + 2) / 2
  close(d.award, 10 * 0.8 * 1.1)
})
