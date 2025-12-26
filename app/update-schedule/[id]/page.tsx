import { ScheduleUpdateClient } from "./schedule-update-client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ScheduleUpdatePage({ params }: PageProps) {
  const { id } = await params
  return <ScheduleUpdateClient scheduleId={id} />
}

