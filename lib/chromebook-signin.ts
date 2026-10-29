// Who may sign in to a student's Chromebook. Device policies such as "Sign-in restriction" can
// only be set per org unit, so each laptop has an OU of its own in Google Admin, named like the
// laptop (A-07), and its allowlist names the student it's assigned to. Pure helpers here; the
// Google calls are in google-chromebooks.ts.

// The roster has name@sailfuture.org; students sign in to Google as name@witexpeditions.org.
// Both addresses are the same person, so both go on the allowlist.
const LINKED_EMAIL_DOMAINS = ["witexpeditions.org", "sailfuture.org"]

/** The student's address on every linked domain, plus anyone always allowed (comma-separated). */
export function signInAllowlist(studentEmail: string, alwaysAllowed = ""): string[] {
  const email = studentEmail.trim().toLowerCase()
  const at = email.lastIndexOf("@")
  const name = email.slice(0, at)
  const domain = email.slice(at + 1)
  const own = LINKED_EMAIL_DOMAINS.includes(domain) ? LINKED_EMAIL_DOMAINS.map((d) => `${name}@${d}`) : [email]
  const extra = alwaysAllowed
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set([...own, ...extra])]
}

/** "/Expedition/" -> "/Expedition"; "Expedition" -> "/Expedition". */
export function normalizeOuPath(path: string): string {
  const trimmed = path.trim().replace(/\/+$/, "")
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

type OrgUnit = { name?: string | null; orgUnitPath?: string | null; orgUnitId?: string | null }

/**
 * The laptop's OU among all of the account's OUs: the one named like the laptop (any case),
 * inside `parentOu` when that's given. More than one match is an error, so nothing is guessed.
 */
export function findLaptopOu<T extends OrgUnit>(units: T[], laptop: string, parentOu?: string): T {
  const label = laptop.trim().toLowerCase()
  const parent = parentOu ? normalizeOuPath(parentOu).toLowerCase() : null
  const matches = units.filter((u) => {
    if ((u.name ?? "").trim().toLowerCase() !== label) return false
    if (!parent) return true
    return normalizeOuPath(u.orgUnitPath ?? "").toLowerCase().startsWith(`${parent}/`)
  })
  if (matches.length === 0) throw new Error(`No org unit named ${laptop}${parentOu ? ` inside ${normalizeOuPath(parentOu)}` : ""}`)
  if (matches.length > 1) {
    throw new Error(`More than one org unit is named ${laptop} (${matches.map((m) => m.orgUnitPath).join(", ")}); set CHROMEBOOK_OU to the one that holds the laptops`)
  }
  return matches[0]
}
