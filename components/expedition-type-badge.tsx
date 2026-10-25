import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getExpeditionType, getExpeditionTypeLabel } from "@/lib/expedition-type"

const TYPE_CLASSES = {
  academy: "bg-sky-50 text-sky-700 border-sky-200",
  residential: "bg-amber-50 text-amber-700 border-amber-200",
} as const

interface ExpeditionTypeBadgeProps {
  expedition: { expedition_type?: string | null } | null | undefined
  className?: string
}

/** Small pill showing whether an expedition is an Academy or Residential expedition. */
export function ExpeditionTypeBadge({ expedition, className }: ExpeditionTypeBadgeProps) {
  const type = getExpeditionType(expedition)
  return (
    <Badge variant="outline" className={cn("font-medium", TYPE_CLASSES[type], className)}>
      {getExpeditionTypeLabel(type)}
    </Badge>
  )
}
