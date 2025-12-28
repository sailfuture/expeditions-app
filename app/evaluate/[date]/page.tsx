import { EvaluateClient } from "./evaluate-client"

interface PageProps {
  params: Promise<{ date: string }>
  searchParams: Promise<{ expedition?: string }>
}

export default async function EvaluatePage({ params, searchParams }: PageProps) {
  const { date } = await params
  const { expedition } = await searchParams
  const expeditionId = expedition ? parseInt(expedition) : undefined
  return <EvaluateClient date={date} expeditionId={expeditionId} />
}

