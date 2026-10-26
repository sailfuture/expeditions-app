import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { XANO_DIRECT_URL, XANO_KEY_HEADER } from "@/lib/xano-config"

// The browser's way to Xano (see lib/xano-config.ts). Xano only answers calls that carry the app's
// key, which lives here on the server. Signed-in staff may call anything. Without a staff session
// only what the public pages (/public/*, /apply, /intake, /tv) need goes through, and personal
// fields are taken out of what comes back.

export const dynamic = "force-dynamic"

/** Reads the public pages make, by Xano path (no leading slash, no query string). */
const PUBLIC_READS: RegExp[] = [
  /^active_expedition$/,
  /^active_expedition_students$/,
  /^active_expedition_staff$/,
  /^expeditions$/,
  /^expeditions\/\d+$/,
  /^expedition_locations$/,
  /^expedition_schedule$/,
  /^expedition_schedule_by_date$/,
  /^expedition_schedule_items_date$/,
  /^expeditions_inventory$/,
  /^expedition_inventory_locations$/,
  // The day's schedule names the staff on duty; their private fields are taken out below.
  /^teachers$/,
  /^expedition_cookbook$/,
  /^expedition_cookbook\/\d+$/,
  /^expedition_galley_equipment$/,
  /^expedition_dish_days$/,
  /^expedition_galley_team$/,
  /^expeditions_galley_team$/,
  /^expedition_ingredient_types$/,
  /^expeditions_ingredient_types$/,
  /^expedition_meal_types$/,
  /^expedition_passage_logs$/,
  /^schoolyears$/,
  /^schoolterms$/,
]

/** Forms a visitor without an account may send: the application, family intake and passage log. */
const PUBLIC_WRITES = new Set([
  "POST expedition_student_applications",
  "POST expeditions_student_information",
  "POST expedition_passage_logs",
])

/** Never sent to a visitor without a staff session, whichever endpoint they come from. */
const PRIVATE_FIELDS = new Set([
  "passport_number",
  "passport_photo",
  "issue_date",
  "expiration_date",
  "dob",
  "date_of_birth",
  "nationality",
  "gender",
  "email",
  "studentEmail",
  "contact_info",
  "families",
  "phone",
  "phone_number",
  "address",
  "medical",
  "medical_notes",
  "allergies",
  "toddleID",
])

function withoutPrivateFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutPrivateFields)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !PRIVATE_FIELDS.has(k))
        .map(([k, v]) => [k, withoutPrivateFields(v)]),
    )
  }
  return value
}

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const route = path.join("/")
  const method = request.method

  const session = await auth()
  const staff = Boolean(session?.user?.staffId)
  if (!staff) {
    const allowed = method === "GET" ? PUBLIC_READS.some((r) => r.test(route)) : PUBLIC_WRITES.has(`${method} ${route}`)
    if (!allowed) {
      console.warn(`[xano-proxy] refused ${method} /${route} without a staff session`)
      return NextResponse.json({ message: "Sign in to continue." }, { status: 401 })
    }
  }

  const key = process.env.XANO_EXPEDITIONS_APP_KEY
  const headers: Record<string, string> = { accept: request.headers.get("accept") ?? "application/json" }
  if (key) headers[XANO_KEY_HEADER] = key
  const contentType = request.headers.get("content-type")
  if (contentType) headers["content-type"] = contentType

  const target = `${XANO_DIRECT_URL}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`
  const res = await fetch(target, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer(),
    cache: "no-store",
  })

  const type = res.headers.get("content-type") ?? ""
  if (staff || !type.includes("application/json")) {
    return new Response(res.body, { status: res.status, headers: { "content-type": type || "application/octet-stream", "cache-control": "no-store" } })
  }
  const text = await res.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return new Response(text, { status: res.status, headers: { "content-type": type, "cache-control": "no-store" } })
  }
  return NextResponse.json(withoutPrivateFields(data), { status: res.status, headers: { "cache-control": "no-store" } })
}

export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE }
