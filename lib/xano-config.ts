// Where the app reaches its Xano API group ("Expedition App"). Xano only answers calls that carry
// the app's key, so the key never goes to the browser: there every call goes through /api/xano
// (app/api/xano/[...path]/route.ts), which checks the staff session and adds it. On the server the
// app calls Xano itself and adds the key with xanoKeyHeaders().
export const XANO_DIRECT_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y"

export const XANO_BASE_URL = typeof window === "undefined" ? XANO_DIRECT_URL : "/api/xano"

export const XANO_KEY_HEADER = "X-Expeditions-Key"

/** The key header for a call made on the server; empty in the browser, where the proxy adds it. */
export function xanoKeyHeaders(): Record<string, string> {
  const key = typeof window === "undefined" ? process.env.XANO_EXPEDITIONS_APP_KEY : undefined
  return key ? { [XANO_KEY_HEADER]: key } : {}
}
