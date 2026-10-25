// The public expeditions site (the expeditions-sfa repo) reads the same Xano
// `expeditions` table as this app, but it only lists a row when it is
// published and has a title and a URL slug:
//
//   is_published  true to show it on the site
//   published_at  when it was first published (epoch ms)
//   title         the name shown on the site (falls back to `name`, but only when null)
//   slug          the URL, /expedition/<slug>; unique across the table
//
// The site works out the status itself: "Current" when isActive is true,
// "Upcoming" before the start date, "Past" or "Archived" after. So keeping
// isActive and the dates right here gives the site the right status.

/** Same rules as the site's lib/slug.ts: lowercase letters, digits and single hyphens. */
export function slugify(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "expedition"
  )
}

/** A slug for `name` that no other expedition uses ("fall-expedition", then "fall-expedition-2", ...). */
export function uniqueSlug(
  name: string,
  expeditions: ReadonlyArray<{ id: number; slug?: string | null }>,
  excludeId?: number
): string {
  const taken = new Set(
    expeditions.filter((e) => e.id !== excludeId && e.slug).map((e) => String(e.slug))
  )
  const base = slugify(name)
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

interface SiteRow {
  id: number
  name?: string | null
  title?: string | null
  slug?: string | null
  is_published?: boolean | null
  published_at?: number | string | null
}

export interface SiteFields {
  title?: string
  slug?: string
  is_published?: boolean
  published_at?: number
}

/** Site fields for a new expedition created in this app. */
export function siteFieldsForCreate(
  name: string,
  showOnSite: boolean,
  expeditions: ReadonlyArray<{ id: number; slug?: string | null }>
): SiteFields {
  return {
    title: name,
    slug: uniqueSlug(name, expeditions),
    is_published: showOnSite,
    ...(showOnSite ? { published_at: Date.now() } : {}),
  }
}

/**
 * Site fields to send when an expedition is edited here. Fills a missing title
 * or slug, keeps the title following the name unless someone gave it its own
 * title on the site, and never changes an existing slug (it is the page URL).
 */
export function siteFieldsForUpdate(
  existing: SiteRow,
  name: string,
  showOnSite: boolean,
  expeditions: ReadonlyArray<{ id: number; slug?: string | null }>
): SiteFields {
  const fields: SiteFields = { is_published: showOnSite }
  const title = (existing.title ?? "").trim()
  if (!title || title === (existing.name ?? "").trim()) fields.title = name
  if (!(existing.slug ?? "").trim()) fields.slug = uniqueSlug(name, expeditions, existing.id)
  if (showOnSite && !existing.published_at) fields.published_at = Date.now()
  return fields
}

/** The expedition's view on the public site (the site selects it with ?expedition=<slug>). */
export function expeditionSiteUrl(slug?: string | null): string | null {
  return slug ? `https://expeditions.sailfuture.org/?expedition=${encodeURIComponent(slug)}` : null
}
