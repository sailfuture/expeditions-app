import { EvaluateClient } from "./evaluate-client"

interface PageProps {
  params: Promise<{ schedule_id: string }>
}

export default async function EvaluatePage({ params }: PageProps) {
  const { schedule_id } = await params
  return <EvaluateClient scheduleId={Number(schedule_id)} />
}
