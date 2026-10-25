"use client"

import { useRouter } from "next/navigation"
import { ExternalLink } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useEvaluationByStudent } from "@/lib/hooks/use-expeditions"

// Score colour bands: 5.0–3.21 blue, 3.20–2.751 green, 2.75–2.251 yellow, 2.25–1.1 red, <1.1 gray
export function getEvaluationColorClass(score: number | null | undefined) {
  if (score === null || score === undefined) return "bg-gray-50"
  if (score >= 3.21) return "bg-blue-50"
  if (score >= 2.751) return "bg-green-50"
  if (score >= 2.251) return "bg-yellow-50"
  if (score >= 1.1) return "bg-red-50"
  return "bg-gray-50"
}

// Journal colour bands: 100–90 blue, <90–70 green, <70–50 yellow, <50–20 red, <20 gray
export function getJournalColorClass(percentage: number | null | undefined) {
  if (percentage === null || percentage === undefined) return "bg-gray-50"
  const pct = percentage <= 1 ? percentage * 100 : percentage
  if (pct >= 90) return "bg-blue-50"
  if (pct >= 70) return "bg-green-50"
  if (pct >= 50) return "bg-yellow-50"
  if (pct >= 20) return "bg-red-50"
  return "bg-gray-50"
}

// Colour for the free-text journaling status on individual records
export function getJournalStringColor(value: string | null | undefined) {
  if (!value) return ""
  const lowerValue = value.toLowerCase()
  if (lowerValue.includes("complete") && !lowerValue.includes("incomplete")) return "bg-green-50"
  if (lowerValue.includes("incomplete") || lowerValue.includes("late")) return "bg-yellow-50"
  if (lowerValue.includes("not started") || lowerValue.includes("missing")) return "bg-red-50"
  if (lowerValue.includes("excused")) return "bg-blue-50"
  return ""
}

const HEAD_CLASS = "h-10 px-4 text-xs font-semibold text-gray-600"

function ScoreCell({ score }: { score: number | null | undefined }) {
  return (
    <TableCell className={`h-14 px-4 text-center ${getEvaluationColorClass(score)}`}>
      {score !== null && score !== undefined ? (
        <span className="text-xs font-medium text-gray-700">{score.toFixed(2)}</span>
      ) : (
        <span className="text-xs text-gray-400">—</span>
      )}
    </TableCell>
  )
}

function StudentEvaluationRow({
  student,
  expeditionId,
  onViewRecords,
}: {
  student: any
  expeditionId: number
  onViewRecords?: (student: any) => void
}) {
  const router = useRouter()
  const { data: evaluation } = useEvaluationByStudent(student.id, expeditionId)
  const fullName = `${student.firstName || ""} ${student.lastName || ""}`.trim()
  const journal = evaluation?.journal

  return (
    <TableRow className="border-b last:border-0 hover:bg-gray-50/50">
      <TableCell
        className="h-14 px-4 cursor-pointer"
        onClick={() => router.push(`/student/${student.id}?expedition=${expeditionId}`)}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={student.profileImage} alt={fullName} />
            <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
              {`${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-gray-900 truncate max-w-[180px]" title={fullName}>
            {fullName}
          </span>
        </div>
      </TableCell>
      <ScoreCell score={evaluation?.academics} />
      <ScoreCell score={evaluation?.citizenship} />
      <ScoreCell score={evaluation?.job} />
      <ScoreCell score={evaluation?.crew} />
      <ScoreCell score={evaluation?.service} />
      <TableCell className={`h-14 px-4 text-center ${getJournalColorClass(journal)}`}>
        {journal !== null && journal !== undefined ? (
          <span className="text-xs font-medium text-gray-700">
            {`${(journal <= 1 ? journal * 100 : journal).toFixed(2)}%`}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>
      {onViewRecords && (
        <TableCell className="h-14 px-4 text-right">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onViewRecords(student)
            }}
            title="View all records"
          >
            <ExternalLink className="h-4 w-4 text-gray-500" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  )
}

function EvaluationsHeader({ withView }: { withView: boolean }) {
  return (
    <TableHeader>
      <TableRow className="border-b bg-gray-50/30 hover:bg-gray-50/30">
        <TableHead className={HEAD_CLASS}>Student</TableHead>
        <TableHead className={`${HEAD_CLASS} text-center`}>Academics</TableHead>
        <TableHead className={`${HEAD_CLASS} text-center`}>Citizenship</TableHead>
        <TableHead className={`${HEAD_CLASS} text-center`}>Job Duties</TableHead>
        <TableHead className={`${HEAD_CLASS} text-center`}>Crew</TableHead>
        <TableHead className={`${HEAD_CLASS} text-center`}>Service</TableHead>
        <TableHead className={`${HEAD_CLASS} text-center`}>Journaling</TableHead>
        {withView && <TableHead className={`${HEAD_CLASS} text-right`}>View</TableHead>}
      </TableRow>
    </TableHeader>
  )
}

/** Placeholder rows while the student list loads. */
export function StudentEvaluationsTableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Table>
      <EvaluationsHeader withView={false} />
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i}>
            <TableCell className="h-14 px-4"><Skeleton className="h-4 w-32" /></TableCell>
            {Array.from({ length: 5 }).map((_, j) => (
              <TableCell key={j} className="h-14 px-4"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
            ))}
            <TableCell className="h-14 px-4"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

interface StudentEvaluationsTableProps {
  students: any[]
  expeditionId: number
  /** When given, each row gets a "View all records" button. */
  onViewRecords?: (student: any) => void
}

/**
 * Per-student evaluation summary (academics, citizenship, job duties, crew,
 * service, journaling). Each row reads the student's latest
 * expedition_student_evaluations record through SWR, so calling
 * `mutate("evaluation_by_student_<studentId>_<expeditionId>")` refreshes it.
 */
export function StudentEvaluationsTable({ students, expeditionId, onViewRecords }: StudentEvaluationsTableProps) {
  return (
    <Table>
      <EvaluationsHeader withView={Boolean(onViewRecords)} />
      <TableBody>
        {students.map((student: any) => (
          <StudentEvaluationRow key={student.id} student={student} expeditionId={expeditionId} onViewRecords={onViewRecords} />
        ))}
      </TableBody>
    </Table>
  )
}
