import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PerformanceReview {
  id: number
  report_name: string
  startDate: string
  endDate: string
  notes: string
  crew: number | null
  service: number | null
  job: number | null
  citizenship: number | null
  journaling: number | null
  academics: number | null
  crew_evaluation: string | null
  service_evaluation: string | null
  job_evaluation: string | null
  citizenship_evaluation: string | null
  journaling_evaluation: string | null
  academics_evaluation: string | null
  _students: {
    name: string
  }
  _expeditions: {
    name: string
  }
}

export function generatePerformanceReviewPDF(review: PerformanceReview) {
  const doc = new jsPDF()
  
  // Add logo/header space
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Performance Review', pageWidth / 2, 20, { align: 'center' })
  
  // Expedition name
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(review._expeditions.name, pageWidth / 2, 30, { align: 'center' })
  
  let yPosition = 45
  
  // Student Information Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Student Information', 14, yPosition)
  yPosition += 8
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Student Name: ${review._students.name}`, 14, yPosition)
  yPosition += 6
  doc.text(`Report Name: ${review.report_name || 'Untitled'}`, 14, yPosition)
  yPosition += 6
  doc.text(`Review Period: ${formatDate(review.startDate)} - ${formatDate(review.endDate)}`, 14, yPosition)
  yPosition += 12
  
  // Performance Scores Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Performance Scores', 14, yPosition)
  yPosition += 8
  
  // Create table data
  const tableData = [
    ['Academics', formatScore(review.academics), review.academics_evaluation || '—'],
    ['Citizenship', formatScore(review.citizenship), review.citizenship_evaluation || '—'],
    ['Job Duties', formatScore(review.job), review.job_evaluation || '—'],
    ['Crew Responsibilities', formatScore(review.crew), review.crew_evaluation || '—'],
    ['Service Learning', formatScore(review.service), review.service_evaluation || '—'],
    ['Journaling', formatJournaling(review.journaling), review.journaling_evaluation || '—'],
  ]
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Category', 'Score', 'Evaluation']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [249, 250, 251],
      textColor: [55, 65, 81],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [55, 65, 81],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 80 },
    },
  })
  
  // Get the final Y position after the table
  yPosition = (doc as any).lastAutoTable.finalY + 15
  
  // Notes Section
  if (review.notes) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes', 14, yPosition)
    yPosition += 8
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const splitNotes = doc.splitTextToSize(review.notes, pageWidth - 28)
    doc.text(splitNotes, 14, yPosition)
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    )
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    )
  }
  
  // Download the PDF
  const fileName = `${review._students.name.replace(/\s+/g, '_')}_Performance_Review_${review.id}.pdf`
  doc.save(fileName)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '—'
  if (score === 0) return 'Unexcused'
  return score.toFixed(2)
}

function formatJournaling(percentage: number | null | undefined): string {
  if (percentage === null || percentage === undefined) return '—'
  return `${Math.round(percentage)}%`
}

