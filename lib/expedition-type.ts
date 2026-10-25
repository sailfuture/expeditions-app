import type { ExpeditionType } from "@/lib/types"

export const EXPEDITION_TYPES: ReadonlyArray<{ value: ExpeditionType; label: string; description: string }> = [
  { value: "academy", label: "Academy", description: "School expedition for SailFuture Academy students" },
  { value: "residential", label: "Residential", description: "Residential-program expedition with its own incentive system" },
]

export const DEFAULT_EXPEDITION_TYPE: ExpeditionType = "academy"

// Expeditions created before the type existed have no value; treat them as academy.
export function getExpeditionType(expedition: { expedition_type?: string | null } | null | undefined): ExpeditionType {
  return expedition?.expedition_type === "residential" ? "residential" : DEFAULT_EXPEDITION_TYPE
}

export function isResidentialExpedition(expedition: { expedition_type?: string | null } | null | undefined): boolean {
  return getExpeditionType(expedition) === "residential"
}

export function getExpeditionTypeLabel(type: ExpeditionType): string {
  return EXPEDITION_TYPES.find((t) => t.value === type)?.label ?? "Academy"
}
