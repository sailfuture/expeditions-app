import { ScheduleViewClient } from "./schedule-view-client"

interface PageProps {
  params: Promise<{ date: string }>
  searchParams: Promise<{ expedition?: string }>
}

export default async function ScheduleViewPage({ params, searchParams }: PageProps) {
  const { date } = await params
  const { expedition } = await searchParams
  const expeditionId = expedition ? parseInt(expedition) : undefined
  return <ScheduleViewClient date={date} expeditionId={expeditionId} />
}

