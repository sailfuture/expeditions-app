// Who may sign in to a student's Chromebook. Device policies such as "Sign-in restriction" can
// only be set per org unit, so each laptop has an OU of its own in Google Admin, named like the
// laptop (A-07), and its allowlist names the student it's assigned to. Pure helpers here; the
// Google calls are in google-chromebooks.ts.

// Chromebooks are managed in the sailfuture.org Workspace, where students sign in with the
// roster address (studentEmail, name@sailfuture.org), so that is the one allowed.

/** Admin accounts that may sign in to every student laptop, on top of the student. */
export const ADMINS_ALWAYS_ALLOWED = [
  "admin@sailfuture.org",
  "hthompson@sailfuture.org",
  "whateverittakes@sailfuture.org",
  "mlong@sailfuture.org",
]

/**
 * The student's email first, then the admins above and anyone in `alwaysAllowed`
 * (comma-separated, from CHROMEBOOK_ALWAYS_ALLOWED), lowercased, no repeats.
 */
export function signInAllowlist(studentEmail: string, alwaysAllowed = ""): string[] {
  const own = studentEmail.trim().toLowerCase()
  const extra = alwaysAllowed
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set([own, ...ADMINS_ALWAYS_ALLOWED, ...extra].filter(Boolean))]
}

/** "/Expedition/" -> "/Expedition"; "Expedition" -> "/Expedition". */
export function normalizeOuPath(path: string): string {
  const trimmed = path.trim().replace(/\/+$/, "")
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

type OrgUnit = { name?: string | null; orgUnitPath?: string | null; orgUnitId?: string | null }

/**
 * Whether an OU sits inside `parent`: a path starting with "/" (/Students/Expeditions) means
 * exactly that OU; a bare name (Expeditions) means any OU of that name, wherever it is.
 */
function isInside(orgUnitPath: string, parent: string): boolean {
  const path = normalizeOuPath(orgUnitPath).toLowerCase()
  const wanted = parent.trim().replace(/\/+$/, "").toLowerCase()
  if (wanted.startsWith("/")) return path.startsWith(`${wanted}/`)
  return path.split("/").slice(1, -1).includes(wanted)
}

/**
 * The laptop's OU among all of the account's OUs: the one named like the laptop (any case),
 * inside `parentOu` when that's given. More than one match is an error, so nothing is guessed.
 */
export function findLaptopOu<T extends OrgUnit>(units: T[], laptop: string, parentOu?: string): T {
  const label = laptop.trim().toLowerCase()
  const parent = parentOu?.trim() || null
  const named = units.filter((u) => (u.name ?? "").trim().toLowerCase() === label)
  const matches = parent ? named.filter((u) => isInside(u.orgUnitPath ?? "", parent)) : named
  if (matches.length === 0) {
    const elsewhere = parent && named.length ? ` (there is one at ${named.map((m) => m.orgUnitPath).join(", ")})` : ""
    throw new Error(`No org unit named ${laptop}${parent ? ` inside ${parent}` : ""}${elsewhere}`)
  }
  if (matches.length > 1) {
    throw new Error(`More than one org unit is named ${laptop} (${matches.map((m) => m.orgUnitPath).join(", ")}); set CHROMEBOOK_OU to the full path of the one that holds the laptops`)
  }
  return matches[0]
}
