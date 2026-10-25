/**
 * Display title for an expedition schedule item.
 *
 * The item type ("Breakfast", "Lights Out") is the title, except for the
 * catch-all "Other" type (or no type), where the item's own name ("Clear
 * Customs") says what the activity is. `subtitle` is the item name when the
 * type is the title and the name adds something, so nothing is lost.
 */
export function scheduleItemTitle(item: any): { title: string; subtitle: string | null } {
  const typeName: string = item?._expedition_schedule_item_types?.name?.trim() || ""
  const name: string = item?.name?.trim() || ""
  const isGeneric = !typeName || typeName.toLowerCase() === "other"

  if (isGeneric) {
    return { title: name || typeName || "Untitled", subtitle: null }
  }
  return {
    title: typeName,
    subtitle: name && name.toLowerCase() !== typeName.toLowerCase() ? name : null,
  }
}
