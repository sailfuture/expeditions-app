import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Server-side proxy for the money endpoints in Xano. The browser never sees the
// shared secret: a signed-in staff session is required here, and the secret is
// added before forwarding. Each action maps to a POST endpoint in the
// "Expedition App" API group that runs expedition_app_guard first.
const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y"

const ALLOWED_ACTIONS = new Set(["pay_day", "purchase", "refund_order", "refund_transaction"])

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ message: "Unknown action" }, { status: 404 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ message: "Sign in required" }, { status: 401 })
  }

  const secret = process.env.XANO_EXPEDITION_SECRET
  if (!secret) {
    return NextResponse.json(
      { message: "XANO_EXPEDITION_SECRET is not configured on the server" },
      { status: 500 }
    )
  }

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const upstream = await fetch(`${XANO_BASE_URL}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, secret }),
    cache: "no-store",
  })

  const text = await upstream.text()
  let payload: unknown = text
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    // Xano returned something that is not JSON; pass the text through.
  }

  return NextResponse.json(payload, { status: upstream.status })
}
