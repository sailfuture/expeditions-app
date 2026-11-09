"use client"

import { useEffect, useState } from "react"

// Phones end where Tailwind's `md` breakpoint starts (768px). Use this only
// where the *component* differs on a phone (a redirect, a sheet side, a
// toaster position); plain layout differences belong in `md:` classes.
const PHONE_QUERY = "(max-width: 767px)"

/** `undefined` until mounted (so server and first client render agree), then true on phones. */
export function useIsPhone(): boolean | undefined {
  const [isPhone, setIsPhone] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(PHONE_QUERY)
    const update = () => setIsPhone(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [])

  return isPhone
}
