import "server-only"
// Locks a student's Chromebook to that student in Google Admin (Chrome > Devices > Settings >
// Device settings > Sign-in restriction). Each laptop already sits in an OU of its own named like
// the laptop (A-07); assigning sets that OU's allowlist to the student, unassigning hands the
// setting back to the parent OU. Server only: it acts as a Workspace admin.
//
// The Chromebooks are managed in the sailfuture.org Workspace, so the service account's
// domain-wide delegation is granted in sailfuture.org's Admin console and GOOGLE_ADMIN_SUBJECT is
// a sailfuture.org admin (not the witexpeditions.org one the expeditions site uses for photos).
//
// Needs, in the environment:
//   GOOGLE_SERVICE_ACCOUNT_KEY   the service account's JSON key (or GOOGLE_SERVICE_ACCOUNT_EMAIL +
//                                GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
//   GOOGLE_ADMIN_SUBJECT         the admin the service account acts as (domain-wide delegation)
//   CHROMEBOOK_OU                optional: the OU that holds the laptop OUs, as a name found
//                                anywhere (Expeditions) or a full path (/Students/Expeditions);
//                                needed only when another OU elsewhere has a laptop's name too
//   CHROMEBOOK_ALWAYS_ALLOWED    optional, comma-separated accounts allowed on every student laptop
// and these scopes granted to the service account's client ID under domain-wide delegation:
//   https://www.googleapis.com/auth/chrome.management.policy
//   https://www.googleapis.com/auth/admin.directory.orgunit.readonly
import { google } from "googleapis"
import { findLaptopOu, signInAllowlist } from "@/lib/chromebook-signin"

const SCOPES = [
  "https://www.googleapis.com/auth/chrome.management.policy",
  "https://www.googleapis.com/auth/admin.directory.orgunit.readonly",
]
const CUSTOMER = "my_customer"
const SIGN_IN_SCHEMA = "chrome.devices.SignInRestriction"
// The API takes the full enum name; GAM and the docs show only the part after "_ENUM_".
const RESTRICTED_LIST = "ALLOW_NEW_USERS_ENUM_RESTRICTED_LIST"

/** Why Chromebook sign-in can't be managed here, or null when it's set up. */
export function chromebookSetupProblem(): string | null {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY && !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return "Google Admin isn't connected (GOOGLE_SERVICE_ACCOUNT_KEY is empty in this deploy)"
  }
  if (!process.env.GOOGLE_ADMIN_SUBJECT) return "Google Admin isn't connected (GOOGLE_ADMIN_SUBJECT is not set)"
  return null
}

function clients() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n")
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) as { client_email: string; private_key: string }
    email = parsed.client_email
    key = parsed.private_key
  }
  const auth = new google.auth.JWT({ email, key, scopes: SCOPES, subject: process.env.GOOGLE_ADMIN_SUBJECT })
  return { directory: google.admin({ version: "directory_v1", auth }), policy: google.chromepolicy({ version: "v1", auth }) }
}

/** Google's own message for a failed call, without the stack. */
export function googleErrorMessage(error: unknown): string {
  const e = error as { response?: { data?: { error?: { message?: string } | string; error_description?: string } }; message?: string }
  const data = e?.response?.data
  if (data && typeof data.error === "object" && data.error?.message) return data.error.message
  if (data?.error_description) return data.error_description
  if (typeof data?.error === "string") return data.error
  return e?.message || "Unknown Google error"
}

type Clients = ReturnType<typeof clients>

/** The laptop's own OU: its path, and its ID as the Chrome Policy API wants it (no "id:" prefix). */
async function laptopOu(directory: Clients["directory"], laptop: string) {
  const parent = process.env.CHROMEBOOK_OU || undefined
  // Every OU in the account; CHROMEBOOK_OU narrows the match, so it can be a name or a path
  const res = await directory.orgunits.list({ customerId: CUSTOMER, type: "all" })
  const ou = findLaptopOu(res.data.organizationUnits ?? [], laptop, parent)
  return { path: ou.orgUnitPath ?? "", id: (ou.orgUnitId ?? "").replace(/^id:/, "") }
}

/** Lets only this student (and CHROMEBOOK_ALWAYS_ALLOWED) sign in to the laptop. */
export async function lockChromebookToStudent(args: { laptop: string; studentEmail: string }) {
  const { directory, policy } = clients()
  const ou = await laptopOu(directory, args.laptop)
  const allowlist = signInAllowlist(args.studentEmail, process.env.CHROMEBOOK_ALWAYS_ALLOWED)
  await policy.customers.policies.orgunits.batchModify({
    customer: `customers/${CUSTOMER}`,
    requestBody: {
      requests: [
        {
          policyTargetKey: { targetResource: `orgunits/${ou.id}` },
          policyValue: { policySchema: SIGN_IN_SCHEMA, value: { deviceAllowNewUsers: RESTRICTED_LIST, userAllowlist: allowlist } },
          updateMask: "deviceAllowNewUsers,userAllowlist",
        },
      ],
    },
  })
  return { ouPath: ou.path, allowlist }
}

/**
 * Read-only: each laptop's OU and the sign-in setting that applies to it (set on its own OU or
 * inherited), plus the setting's field names as Google defines them. Changes nothing.
 */
export async function chromebookSignInStatus(laptops: string[]) {
  const { directory, policy } = clients()
  const parent = process.env.CHROMEBOOK_OU || undefined
  const res = await directory.orgunits.list({ customerId: CUSTOMER, type: "all" })
  const units = res.data.organizationUnits ?? []
  const schema = await policy.customers.policySchemas.get({ name: `customers/${CUSTOMER}/policySchemas/${SIGN_IN_SCHEMA}` })
  const fields = (schema.data.definition?.messageType?.[0]?.field ?? []).map((f) => ({
    name: f.name,
    type: f.type,
    repeated: f.label === "LABEL_REPEATED",
    values: schema.data.fieldDescriptions?.find((d) => d.field === f.name)?.knownValueDescriptions?.map((k) => k.value) ?? [],
  }))

  const rows = []
  for (const laptop of laptops) {
    try {
      const ou = findLaptopOu(units, laptop, parent)
      const target = `orgunits/${(ou.orgUnitId ?? "").replace(/^id:/, "")}`
      const resolved = await policy.customers.policies.resolve({
        customer: `customers/${CUSTOMER}`,
        requestBody: { policySchemaFilter: SIGN_IN_SCHEMA, policyTargetKey: { targetResource: target } },
      })
      const p = resolved.data.resolvedPolicies?.[0]
      rows.push({ laptop, ouPath: ou.orgUnitPath, setHere: p?.sourceKey?.targetResource === target, value: p?.value?.value ?? null })
    } catch (error) {
      rows.push({ laptop, error: googleErrorMessage(error) })
    }
  }
  return { parentOu: parent ?? null, ouCount: units.length, fields, laptops: rows }
}

/**
 * Clears the laptop's own sign-in restriction, so it follows its parent OU's setting again. Only
 * when the laptop's OU still names this student: a laptop already given to someone else is left alone.
 */
export async function clearChromebookSignIn(args: { laptop: string; studentEmail: string }) {
  const { directory, policy } = clients()
  const ou = await laptopOu(directory, args.laptop)
  const target = `orgunits/${ou.id}`
  const resolved = await policy.customers.policies.resolve({
    customer: `customers/${CUSTOMER}`,
    requestBody: { policySchemaFilter: SIGN_IN_SCHEMA, policyTargetKey: { targetResource: target } },
  })
  const own = resolved.data.resolvedPolicies?.find((p) => p.sourceKey?.targetResource === target)
  const listed = ((own?.value?.value?.userAllowlist as string[] | undefined) ?? []).map((e) => e.toLowerCase())
  const student = signInAllowlist(args.studentEmail)
  if (!student.some((e) => listed.includes(e))) return { cleared: false, ouPath: ou.path }

  await policy.customers.policies.orgunits.batchInherit({
    customer: `customers/${CUSTOMER}`,
    requestBody: {
      requests: [{ policyTargetKey: { targetResource: target }, policySchema: SIGN_IN_SCHEMA }],
    },
  })
  return { cleared: true, ouPath: ou.path }
}
