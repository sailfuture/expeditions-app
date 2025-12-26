import { EvaluateClient } from "./evaluate-client"

interface PageProps {
  params: Promise<{ date: string }>
}

export default async function EvaluatePage({ params }: PageProps) {
  const { date } = await params
  return <EvaluateClient date={date} />
}

