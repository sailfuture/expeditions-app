import type { Metadata } from "next"
import {
  COMPLETION_CATEGORIES,
  DEFAULT_AWARD_SETTINGS,
  RATED_CATEGORIES,
  computeDailyAward,
  formatAwardDollars,
  formatAwardPercent,
  roundToCents,
  type DailyScores,
  type AwardCategory,
} from "@/lib/expedition-award"
import { PrintButton } from "./print-button"

export const metadata: Metadata = {
  title: "How Your Expedition Award Works · SailFuture Academy",
  description: "A student guide to how the daily expedition award is calculated.",
}

// A printable, student-facing explanation of the expedition award for
// residential expeditions. Deliberately plain: one column, black on white,
// every number in a table. All values come from DEFAULT_AWARD_SETTINGS and the
// worked examples run through the real calculator in lib/expedition-award.ts,
// so this page cannot drift from the awards tab. Public route (no sign-in).

const SETTINGS = DEFAULT_AWARD_SETTINGS
const DOLLARS = formatAwardDollars(SETTINGS.dollarsPerCategory)
const MAX_PER_DAY = formatAwardDollars(
  SETTINGS.dollarsPerCategory * (RATED_CATEGORIES.length + COMPLETION_CATEGORIES.length)
)

const CATEGORY_LABELS: Record<AwardCategory, string> = {
  school: "School",
  job: "Job Duties",
  service: "Service",
  crew: "Crew",
  journaling: "Journaling",
}

const CATEGORY_HOW: Record<AwardCategory, string> = {
  school: `Score ${SETTINGS.ratedThreshold} or higher out of 5`,
  job: `Score ${SETTINGS.ratedThreshold} or higher out of 5`,
  service: `Score ${SETTINGS.ratedThreshold} or higher out of 5`,
  crew: `Score ${SETTINGS.ratedThreshold} or higher out of 5`,
  journaling: "Journal marked Complete",
}

// Worked examples, run through the real calculator so the math is always right.
const GREAT_DAY: DailyScores = {
  date: "example-great",
  school: 4,
  job: 4,
  service: 3,
  crew: null,
  journaling: SETTINGS.completionValue,
  citizenship: 5,
}

const ROUGH_DAY: DailyScores = {
  date: "example-rough",
  school: 2,
  job: 3,
  service: 3,
  crew: null,
  journaling: 50,
  citizenship: 3,
}

const TH = "border border-gray-400 px-3 py-1.5 text-left text-sm font-semibold"
const TD = "border border-gray-400 px-3 py-1.5 text-sm"
const TD_NUM = TD + " text-right tabular-nums"

function describeTier(index: number) {
  const tier = SETTINGS.performanceTiers[index]
  const above = SETTINGS.performanceTiers[index - 1]
  const low = tier.value.toFixed(2)
  if (!above) return tier.op === "gt" ? `More than ${low}` : `${low} or more`
  const high = above.value.toFixed(2)
  const lowWord = tier.op === "gt" ? `More than ${low}` : low
  const highWord = above.op === "gt" ? `up to ${high}` : `to just under ${high}`
  return `${lowWord} ${highWord}`
}

function scoreText(value: number | null, completion: boolean) {
  if (value === null) return "Blank"
  if (completion) return value === SETTINGS.completionValue ? "Complete" : "Not complete"
  return String(value)
}

function ExampleDay({ title, note, scores }: { title: string; note: string; scores: DailyScores }) {
  const day = computeDailyAward(scores)
  const ratedUsed = RATED_CATEGORIES.filter(({ key }) => scores[key] !== null)
  const working = `(${ratedUsed.map(({ key }) => scores[key]).join(" + ")}) ÷ ${ratedUsed.length} = ${day.performanceScore.toFixed(2)}`

  return (
    <div className="avoid-break">
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mb-2 text-sm">{note}</p>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH}>Category</th>
            <th className={TH}>Score</th>
            <th className={TH + " text-right"}>Earned</th>
          </tr>
        </thead>
        <tbody>
          {[...RATED_CATEGORIES, ...COMPLETION_CATEGORIES].map(({ key }) => {
            const completion = key === "journaling"
            const earned = day.earnedByCategory[key]
            return (
              <tr key={key}>
                <td className={TD}>{CATEGORY_LABELS[key]}</td>
                <td className={TD}>{scoreText(scores[key], completion)}</td>
                <td className={TD_NUM}>{formatAwardDollars(earned)}</td>
              </tr>
            )
          })}
          <tr>
            <td className={TD}>Citizenship</td>
            <td className={TD}>{scores.citizenship ?? "Blank"}</td>
            <td className={TD_NUM}>—</td>
          </tr>
        </tbody>
      </table>

      <table className="mt-2 w-full border-collapse">
        <tbody>
          <tr>
            <td className={TD}>Step 1 · Dollars earned</td>
            <td className={TD}>{formatAwardDollars(SETTINGS.dollarsPerCategory)} × {Object.values(day.earnedByCategory).filter((v) => v > 0).length} categories</td>
            <td className={TD_NUM}>{formatAwardDollars(day.earned)}</td>
          </tr>
          <tr>
            <td className={TD}>Step 2 · Performance %</td>
            <td className={TD}>{working}</td>
            <td className={TD_NUM}>{formatAwardPercent(day.performancePercent)}</td>
          </tr>
          <tr>
            <td className={TD}>Step 3 · Citizenship %</td>
            <td className={TD}>Citizenship score {scores.citizenship}</td>
            <td className={TD_NUM}>{formatAwardPercent(day.citizenshipPercent)}</td>
          </tr>
          <tr>
            <td className={TD + " font-bold"}>Today&apos;s award</td>
            <td className={TD}>
              {formatAwardDollars(day.earned)} × {formatAwardPercent(day.performancePercent)} × {formatAwardPercent(day.citizenshipPercent)}
            </td>
            <td className={TD_NUM + " font-bold"}>{formatAwardDollars(roundToCents(day.award))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function AwardGuidePage() {
  const citizenshipRows = Object.entries(SETTINGS.citizenshipPercents)
    .map(([score, percent]) => ({ score: Number(score), percent }))
    .sort((a, b) => b.score - a.score)

  return (
    <>
      <style>{`
        @page { size: letter; margin: 0.6in; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .page-break { break-before: page; page-break-before: always; }
        }
      `}</style>

      <main className="min-h-screen bg-white py-8 text-black print:py-0">
        <div className="mx-auto max-w-2xl px-6 print:max-w-none print:px-0">
          <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-300 pb-4">
            <p className="text-sm text-gray-600">Print this page, or choose &ldquo;Save as PDF&rdquo; as the printer.</p>
            <PrintButton />
          </div>

          <article className="space-y-8">
            <header className="avoid-break">
              <p className="text-xs uppercase tracking-widest text-gray-600">SailFuture Academy · Residential Expeditions</p>
              <h1 className="mt-1 text-2xl font-bold">How Your Expedition Award Works</h1>
              <p className="mt-2 text-sm">
                On a residential expedition, every day you can earn money toward your award. It takes three steps, and
                you are in control of all three.
              </p>
              <table className="mt-4 w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={TD + " font-semibold"}>Today&apos;s award</td>
                    <td className={TD}>Dollars earned × Performance % × Citizenship %</td>
                  </tr>
                  <tr>
                    <td className={TD + " font-semibold"}>Expedition total</td>
                    <td className={TD}>Every day&apos;s award added together</td>
                  </tr>
                </tbody>
              </table>
            </header>

            <section className="avoid-break">
              <h2 className="text-lg font-bold">Step 1 · Earn your dollars</h2>
              <p className="mt-1 mb-2 text-sm">
                There are five categories. Each one you hit is worth {DOLLARS}. Hit all five and you start the day with{" "}
                {MAX_PER_DAY}. A category that is not part of your day (for example Crew on a day in port) is blank: it
                earns nothing, but it does not hurt you either.
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Category</th>
                    <th className={TH}>How you earn it</th>
                    <th className={TH + " text-right"}>Worth</th>
                  </tr>
                </thead>
                <tbody>
                  {[...RATED_CATEGORIES, ...COMPLETION_CATEGORIES].map(({ key }) => (
                    <tr key={key}>
                      <td className={TD}>{CATEGORY_LABELS[key]}</td>
                      <td className={TD}>{CATEGORY_HOW[key]}</td>
                      <td className={TD_NUM}>{DOLLARS}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className={TD + " font-semibold"}>Most per day</td>
                    <td className={TD}>All five categories</td>
                    <td className={TD_NUM + " font-semibold"}>{MAX_PER_DAY}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="avoid-break">
              <h2 className="text-lg font-bold">Step 2 · Your performance %</h2>
              <p className="mt-1 mb-2 text-sm">
                Add up your {RATED_CATEGORIES.map((c) => CATEGORY_LABELS[c.key]).join(", ").replace(/, ([^,]*)$/, " and $1")}{" "}
                scores for the day and divide by how many of them you got. That is your performance score. A 0 counts as
                0; blank categories are left out. Find your score in the table to see how much of your money you keep.
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Performance score</th>
                    <th className={TH + " text-right"}>You keep</th>
                  </tr>
                </thead>
                <tbody>
                  {SETTINGS.performanceTiers.map((tier, index) => (
                    <tr key={tier.value}>
                      <td className={TD}>{describeTier(index)}</td>
                      <td className={TD_NUM}>{formatAwardPercent(tier.percent)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className={TD}>Below {SETTINGS.performanceTiers[SETTINGS.performanceTiers.length - 1].value.toFixed(2)}</td>
                    <td className={TD_NUM}>0%</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="avoid-break">
              <h2 className="text-lg font-bold">Step 3 · Your citizenship %</h2>
              <p className="mt-1 mb-2 text-sm">
                Citizenship is how you treat the people around you. Your citizenship score for the day sets one more
                percent. It is the biggest single thing you control.
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Citizenship score</th>
                    <th className={TH}>What it means</th>
                    <th className={TH + " text-right"}>You keep</th>
                  </tr>
                </thead>
                <tbody>
                  {citizenshipRows.map(({ score, percent }) => (
                    <tr key={score}>
                      <td className={TD}>{score}</td>
                      <td className={TD}>
                        {percent > 1
                          ? "Outstanding: you earn a bonus on top"
                          : percent === 1
                            ? "Solid: you keep all of it"
                            : percent === 0
                              ? "Nothing is kept today"
                              : "Part of your money is held back"}
                      </td>
                      <td className={TD_NUM}>{formatAwardPercent(percent)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className={TD}>Blank</td>
                    <td className={TD}>No citizenship score was entered</td>
                    <td className={TD_NUM}>0%</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="page-break space-y-6 print:mt-0">
              <div>
                <h2 className="text-lg font-bold">Two example days</h2>
                <p className="mt-1 text-sm">Same student, two very different days. Both are in port, so Crew is blank.</p>
              </div>
              <ExampleDay
                title="A great day"
                note="Strong scores, journal done, and a 5 in citizenship."
                scores={GREAT_DAY}
              />
              <ExampleDay
                title="A rough day"
                note="A 2 in school, journal not finished, and a 3 in citizenship."
                scores={ROUGH_DAY}
              />
            </section>

            <section className="avoid-break">
              <h2 className="text-lg font-bold">How to earn the most</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                <li>
                  Aim for {SETTINGS.ratedThreshold} or higher in every category. A {SETTINGS.ratedThreshold} means you met
                  expectations, and that is all it takes to earn the {DOLLARS}.
                </li>
                <li>Finish your journal. That is the easiest {DOLLARS} on the list.</li>
                <li>Citizenship multiplies everything. A 5 adds a bonus, a 3 costs you a quarter of the day, a 1 wipes the day out.</li>
                <li>One low score drags your performance average down. If you slip in one area, make it up in the others.</li>
                <li>Every day is a fresh start. Yesterday&apos;s award is already yours.</li>
              </ul>
            </section>

            <footer className="border-t border-gray-300 pt-3 text-xs text-gray-600">
              Scores are 0 to 5 and are entered by your expedition staff each day. Questions? Ask any staff member to walk
              through your day with you.
            </footer>
          </article>
        </div>
      </main>
    </>
  )
}
