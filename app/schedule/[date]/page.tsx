import { ScheduleViewClient } from "./schedule-view-client"

interface PageProps {
  params: Promise<{ date: string }>
}

export default async function ScheduleViewPage({ params }: PageProps) {
  const { date } = await params
  return <ScheduleViewClient date={date} />
}

